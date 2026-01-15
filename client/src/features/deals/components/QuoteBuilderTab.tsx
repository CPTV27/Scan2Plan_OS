/**
 * QuoteBuilderTab - CPQ Quote Builder Component
 * 
 * Provides inline CPQ quote building functionality within the DealWorkspace.
 * Supports quote versioning and editing from historical versions.
 */

import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Building2,
  Calculator,
  DollarSign,
  History,
  Loader2,
  MapPin,
  Plus,
  Save,
  Sparkles,
  Trash2,
  TreePine,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useUpdateLead } from "@/hooks/use-leads";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Lead, CpqQuote, CpqCalculateResponse } from "@shared/schema";
import {
  CPQ_BUILDING_TYPES,
  CPQ_API_DISCIPLINES,
  CPQ_API_LODS,
  CPQ_API_SCOPES,
  CPQ_API_RISKS,
  CPQ_API_DISPATCH_LOCATIONS,
  CPQ_PAYMENT_TERMS,
  CPQ_PAYMENT_TERMS_DISPLAY
} from "@shared/schema";
import {
  calculatePricing,
  type Area as PricingArea,
  type TravelConfig,
  type PricingResult
} from "@/features/cpq/pricing";
import { FY26_GOALS } from "@shared/businessGoals";

// Discipline display labels - site discipline shows as "GRADE" in UI
const DISCIPLINE_LABELS: Record<string, string> = {
  arch: "ARCH",
  mepf: "MEPF",
  structure: "STRUCTURE",
  site: "GRADE",
};

export interface QuoteBuilderArea {
  id: string;
  name: string;
  buildingType: string;
  squareFeet: string;
  disciplines: string[];
  disciplineLods: Record<string, { discipline: string; lod: string; scope: string }>;
}

export interface QuoteBuilderTabProps {
  lead: Lead;
  leadId: number;
  toast: ReturnType<typeof useToast>["toast"];
  onQuoteSaved: () => void;
  existingQuotes?: CpqQuote[];
  sourceQuote?: CpqQuote | null;
  onClearSourceQuote?: () => void;
  onPaymentTermsChange?: (terms: string) => void;
}

export default function QuoteBuilderTab({ lead, leadId, toast, onQuoteSaved, existingQuotes, sourceQuote, onClearSourceQuote, onPaymentTermsChange }: QuoteBuilderTabProps) {
  const queryClient = useQueryClient();
  const updateLeadMutation = useUpdateLead();
  const [loadedSourceQuoteId, setLoadedSourceQuoteId] = useState<number | null>(null);

  const [areas, setAreas] = useState<QuoteBuilderArea[]>([{
    id: "1",
    name: "",
    buildingType: "1",
    squareFeet: "",
    disciplines: ["arch"],
    disciplineLods: {
      arch: { discipline: "arch", lod: "300", scope: "full" }
    }
  }]);

  // Landscape areas - separate from building areas
  interface LandscapeArea {
    id: string;
    name: string;
    type: "built" | "natural"; // Built = manicured, Natural = unmaintained
    acres: string;
    lod: "200" | "300" | "350";
  }

  const [landscapeAreas, setLandscapeAreas] = useState<LandscapeArea[]>([]);

  const addLandscapeArea = () => {
    setLandscapeAreas(prev => [...prev, {
      id: `landscape-${Date.now()}`,
      name: "",
      type: "built",
      acres: "",
      lod: "300"
    }]);
  };

  const updateLandscapeArea = (id: string, updates: Partial<LandscapeArea>) => {
    setLandscapeAreas(prev => prev.map(area =>
      area.id === id ? { ...area, ...updates } : area
    ));
  };

  const removeLandscapeArea = (id: string) => {
    setLandscapeAreas(prev => prev.filter(area => area.id !== id));
  };

  const [dispatchLocation, setDispatchLocation] = useState<string>((lead as any).dispatchLocation?.toLowerCase() || "woodstock");
  const [distance, setDistance] = useState<string>("");
  const [risks, setRisks] = useState<string[]>([]);
  const [risksAffirmed, setRisksAffirmed] = useState(false);
  const [matterport, setMatterport] = useState(false);
  const [actScan, setActScan] = useState(false);
  const [additionalElevations, setAdditionalElevations] = useState<string>("");
  const [servicesAffirmed, setServicesAffirmed] = useState(false);
  const [paymentTerms, setPaymentTermsLocal] = useState<string>(lead.paymentTerms || "standard");

  // Sync local paymentTerms when lead.paymentTerms changes externally (e.g., from LeadDetails or query refetch)
  useEffect(() => {
    const leadValue = lead.paymentTerms || "standard";
    if (leadValue !== paymentTerms) {
      setPaymentTermsLocal(leadValue);
    }
  }, [lead.paymentTerms]);

  const setPaymentTerms = async (terms: string) => {
    const previousValue = paymentTerms;
    setPaymentTermsLocal(terms);
    // Notify parent to update form state immediately (prevents race condition)
    onPaymentTermsChange?.(terms);

    try {
      await updateLeadMutation.mutateAsync({ id: leadId, paymentTerms: terms });
    } catch (error) {
      // Rollback on failure to prevent data inconsistency
      setPaymentTermsLocal(previousValue);
      onPaymentTermsChange?.(previousValue);
      toast({
        title: "Failed to update payment terms",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [marginTarget, setMarginTarget] = useState<number>(0.45);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => {
    if (sourceQuote && sourceQuote.id !== loadedSourceQuoteId) {
      const quoteAreas = sourceQuote.areas as any[];
      if (quoteAreas && quoteAreas.length > 0) {
        const hydratedAreas: QuoteBuilderArea[] = quoteAreas.map((area: any, idx: number) => {
          const disciplines = area.disciplines || [];
          const disciplineLods: Record<string, { discipline: string; lod: string; scope: string }> = {};

          if (Array.isArray(disciplines)) {
            disciplines.forEach((disc: any) => {
              if (typeof disc === 'string') {
                disciplineLods[disc] = { discipline: disc, lod: "300", scope: "full" };
              } else if (disc.discipline) {
                disciplineLods[disc.discipline] = {
                  discipline: disc.discipline,
                  lod: disc.lod || "300",
                  scope: disc.scope || "full"
                };
              }
            });
          }

          return {
            id: (idx + 1).toString(),
            name: area.name || `Area ${idx + 1}`,
            buildingType: area.buildingType?.toString() || area.typeOfBuilding?.toString() || "1",
            squareFeet: (area.squareFeet || area.sqft || "").toString(),
            disciplines: Object.keys(disciplineLods),
            disciplineLods
          };
        });
        setAreas(hydratedAreas);
      }

      if (sourceQuote.travel) {
        const travelData = typeof sourceQuote.travel === 'string'
          ? JSON.parse(sourceQuote.travel)
          : sourceQuote.travel;
        if (travelData.dispatchLocation) {
          setDispatchLocation(travelData.dispatchLocation.toLowerCase());
        }
        const distValue = travelData.distance ?? travelData.miles;
        if (distValue !== undefined && distValue !== null) {
          const numericDist = typeof distValue === 'string' ? Number(distValue) : distValue;
          if (!isNaN(numericDist)) {
            setDistance(numericDist.toString());
          }
        }
      } else if (sourceQuote.dispatchLocation) {
        setDispatchLocation(sourceQuote.dispatchLocation.toLowerCase());
        if (sourceQuote.distance) {
          setDistance(sourceQuote.distance.toString());
        }
      }

      if (sourceQuote.risks && Array.isArray(sourceQuote.risks)) {
        setRisks(sourceQuote.risks as string[]);
        setRisksAffirmed((sourceQuote.risks as string[]).length > 0);
      }

      if (sourceQuote.services) {
        const services = typeof sourceQuote.services === 'string'
          ? JSON.parse(sourceQuote.services)
          : sourceQuote.services;
        if (services.matterport) setMatterport(true);
        if (services.actScan) setActScan(true);
        if (services.additionalElevations) setAdditionalElevations(services.additionalElevations.toString());
        setServicesAffirmed(true);
      }

      if (sourceQuote.paymentTerms) {
        setPaymentTermsLocal(sourceQuote.paymentTerms);
      }

      const breakdown = sourceQuote.pricingBreakdown as any;
      if (breakdown?.marginTarget) {
        setMarginTarget(breakdown.marginTarget);
      }

      setLoadedSourceQuoteId(sourceQuote.id);
    }
  }, [sourceQuote, loadedSourceQuoteId]);

  useEffect(() => {
    if (lead && !sourceQuote) {
      const sqft = (lead as any).estimatedSqft || (lead as any).sqft || 15000;
      setAreas([{
        id: "1",
        name: lead.projectName || "Main Building",
        buildingType: (lead as any).buildingType || "2",
        squareFeet: sqft.toString(),
        disciplines: ["arch", "mepf"],
        disciplineLods: {
          arch: { discipline: "arch", lod: "300", scope: "full" },
          mepf: { discipline: "mepf", lod: "300", scope: "full" }
        }
      }]);
    }
  }, [lead, sourceQuote]);

  useEffect(() => {
    let distanceApplied = false;
    let dispatchApplied = false;

    // First priority: existing quotes
    if (existingQuotes && existingQuotes.length > 0 && !sourceQuote) {
      const latestQuote = existingQuotes.find(q => q.isLatest) || existingQuotes[0];
      if (latestQuote?.travel) {
        const travelData = typeof latestQuote.travel === 'string'
          ? JSON.parse(latestQuote.travel)
          : latestQuote.travel;
        if (travelData.dispatchLocation) {
          setDispatchLocation(travelData.dispatchLocation.toLowerCase());
          dispatchApplied = true;
        }
        const distValue = travelData.distance ?? travelData.miles;
        if (distValue !== undefined && distValue !== null) {
          const numericDist = typeof distValue === 'string' ? Number(distValue) : distValue;
          if (!isNaN(numericDist) && numericDist > 0) {
            setDistance(numericDist.toString());
            distanceApplied = true;
          }
        }
      }
    }

    // Second priority: lead's googleIntel travel data (auto-calculated from address)
    // Only use if existing quote didn't provide valid data
    if (lead && !sourceQuote) {
      const googleIntel = (lead as any).googleIntel;
      const travelInsights = googleIntel?.travelInsights;

      if (!distanceApplied && travelInsights?.available && travelInsights?.distanceMiles !== undefined) {
        const distMiles = travelInsights.distanceMiles;
        if (typeof distMiles === 'number' && !isNaN(distMiles) && distMiles > 0) {
          setDistance(Math.round(distMiles).toString());
        }
      }

      // Also sync dispatch location from lead if not already set
      if (!dispatchApplied) {
        const leadDispatch = (lead as any).dispatchLocation;
        if (leadDispatch) {
          setDispatchLocation(leadDispatch.toLowerCase());
        }
      }
    }
  }, [existingQuotes, sourceQuote, lead]);

  const addArea = () => {
    const newId = (areas.length + 1).toString();
    setAreas([...areas, {
      id: newId,
      name: `Area ${newId}`,
      buildingType: "1",
      squareFeet: "",
      disciplines: ["arch"],
      disciplineLods: {
        arch: { discipline: "arch", lod: "300", scope: "full" }
      }
    }]);
  };

  const removeArea = (id: string) => {
    if (areas.length > 1) {
      setAreas(areas.filter(a => a.id !== id));
    }
  };

  const updateArea = (id: string, updates: Partial<QuoteBuilderArea>) => {
    setAreas(areas.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const toggleDiscipline = (areaId: string, discipline: string) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    const hasDiscipline = area.disciplines.includes(discipline);
    let newDisciplines: string[];
    let newLods = { ...area.disciplineLods };

    if (hasDiscipline) {
      newDisciplines = area.disciplines.filter(d => d !== discipline);
      delete newLods[discipline];
    } else {
      newDisciplines = [...area.disciplines, discipline];
      newLods[discipline] = { discipline, lod: "300", scope: "full" };
    }

    updateArea(areaId, { disciplines: newDisciplines, disciplineLods: newLods });
  };

  const updateDisciplineLod = (areaId: string, discipline: string, field: "lod" | "scope", value: string) => {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;

    const newLods = {
      ...area.disciplineLods,
      [discipline]: {
        ...area.disciplineLods[discipline],
        [field]: value
      }
    };

    updateArea(areaId, { disciplineLods: newLods });
  };

  const toggleRisk = (risk: string) => {
    if (risks.includes(risk)) {
      setRisks(risks.filter(r => r !== risk));
    } else {
      setRisks([...risks, risk]);
    }
  };

  const handleDispatchLocationChange = async (newLocation: string) => {
    setDispatchLocation(newLocation);

    // Recalculate distance from new dispatch location
    const projectAddress = lead?.projectAddress;
    if (!projectAddress) return;

    try {
      const response = await fetch(
        `/api/location/travel-distance?destination=${encodeURIComponent(projectAddress)}&dispatchLocation=${encodeURIComponent(newLocation)}`
      );
      const data = await response.json();

      if (data.available && data.distanceMiles) {
        setDistance(data.distanceMiles.toString());
      }
    } catch (error) {
      console.error("Failed to recalculate travel distance:", error);
    }
  };

  const inferCategory = (label: string, isTotal?: boolean, isDiscount?: boolean): "discipline" | "risk" | "area" | "travel" | "service" | "subtotal" | "total" => {
    if (isTotal) return "total";
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("risk premium")) return "risk";
    if (lowerLabel.includes("travel") || lowerLabel.includes("mileage") || lowerLabel.includes("hotel")) return "travel";
    if (lowerLabel.includes("matterport") || lowerLabel.includes("cad") || lowerLabel.includes("elevation") || lowerLabel.includes("facade")) return "service";
    if (lowerLabel.includes("discount") || lowerLabel.includes("terms") || lowerLabel.includes("adjustment")) return "subtotal";
    return "discipline";
  };

  const pricingMemo = useMemo((): { result: CpqCalculateResponse | null; error: string | null } => {
    const hasBuildings = areas.some(a => a.squareFeet && parseInt(a.squareFeet) > 0);
    const hasLandscape = landscapeAreas.some(a => a.acres && parseFloat(a.acres) > 0);

    if (!hasBuildings && !hasLandscape) {
      return { result: null, error: null };
    }

    try {
      // Building areas
      const pricingAreas: PricingArea[] = areas
        .filter(a => a.squareFeet && parseInt(a.squareFeet) > 0)
        .map(a => ({
          id: a.id,
          name: a.name,
          buildingType: a.buildingType,
          squareFeet: a.squareFeet,
          lod: "300",
          disciplines: a.disciplines,
          disciplineLods: a.disciplineLods,
          scope: "full",
        }));

      // Landscape areas - use buildingType 14 (built) or 15 (natural)
      const landscapePricingAreas: PricingArea[] = landscapeAreas
        .filter(a => a.acres && parseFloat(a.acres) > 0)
        .map(a => ({
          id: a.id,
          name: a.name || "Landscape",
          buildingType: a.type === "built" ? "14" : "15",
          squareFeet: a.acres, // For landscape, this is treated as acres
          lod: a.lod,
          disciplines: ["site"],
          disciplineLods: { site: { discipline: "site", lod: a.lod, scope: "full" } },
          scope: "full",
        }));

      const allAreas = [...pricingAreas, ...landscapePricingAreas];

      const travel: TravelConfig | null = dispatchLocation ? {
        dispatchLocation,
        distance: distance ? parseFloat(distance) : 0,
      } : null;

      const servicesConfig: Record<string, number> = {};
      if (matterport) servicesConfig.matterport = 1;
      if (actScan) servicesConfig.actScan = 1;
      if (additionalElevations) servicesConfig.additionalElevations = parseInt(additionalElevations);

      const result: PricingResult = calculatePricing(
        allAreas,
        servicesConfig,
        travel,
        risks,
        paymentTerms,
        marginTarget
      );

      const grossMargin = result.totalClientPrice - result.totalUpteamCost;
      const grossMarginPercent = result.totalClientPrice > 0
        ? (grossMargin / result.totalClientPrice) * 100
        : 0;

      let integrityStatus: "pass" | "warning" | "blocked" = "pass";
      const integrityFlags: { code: string; message: string; severity: "warning" | "error" }[] = [];
      const marginFloorPercent = FY26_GOALS.MARGIN_FLOOR * 100;
      const marginGuardrailPercent = FY26_GOALS.MARGIN_STRETCH * 100;

      if (grossMarginPercent < marginFloorPercent) {
        integrityStatus = "blocked";
        integrityFlags.push({
          code: "LOW_MARGIN",
          message: `Gross margin ${grossMarginPercent.toFixed(1)}% is below ${marginFloorPercent.toFixed(0)}% threshold`,
          severity: "error"
        });
      } else if (grossMarginPercent < marginGuardrailPercent) {
        integrityStatus = "warning";
        integrityFlags.push({
          code: "MARGIN_BELOW_GUARDRAIL",
          message: `Gross margin ${grossMarginPercent.toFixed(1)}% is below recommended ${marginGuardrailPercent.toFixed(0)}%`,
          severity: "warning"
        });
      }

      let paymentPremiumTotal = 0;
      result.items.forEach(item => {
        const lowerLabel = item.label.toLowerCase();
        if (lowerLabel.includes("terms") || (lowerLabel.includes("discount") && !lowerLabel.includes("partner"))) {
          paymentPremiumTotal += item.value;
        }
      });

      return {
        result: {
          success: true,
          totalClientPrice: result.totalClientPrice,
          totalUpteamCost: result.totalUpteamCost,
          grossMargin,
          grossMarginPercent,
          lineItems: result.items.map((item, idx) => ({
            id: `item-${idx}`,
            label: item.label,
            category: inferCategory(item.label, item.isTotal, item.isDiscount),
            clientPrice: item.value,
            upteamCost: item.upteamCost || 0,
          })),
          subtotals: {
            modeling: result.disciplineTotals.architecture + result.disciplineTotals.mep + result.disciplineTotals.structural + result.disciplineTotals.site + result.disciplineTotals.scanning,
            travel: result.disciplineTotals.travel,
            riskPremiums: result.disciplineTotals.risk,
            services: result.disciplineTotals.services,
            paymentPremium: paymentPremiumTotal,
          },
          integrityStatus,
          integrityFlags,
          marginTarget,
          calculatedAt: new Date().toISOString(),
          engineVersion: "client-1.0",
        },
        error: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to calculate pricing";
      console.error("Pricing calculation error:", error);
      return { result: null, error: errorMessage };
    }
  }, [areas, landscapeAreas, dispatchLocation, distance, matterport, actScan, additionalElevations, risks, paymentTerms, marginTarget]);

  const pricingResult = pricingMemo.result;

  useEffect(() => {
    if (pricingMemo.error !== pricingError) {
      setPricingError(pricingMemo.error);
    }
  }, [pricingMemo.error, pricingError]);

  useEffect(() => {
    if (pricingError) {
      toast({ title: "Pricing Error", description: pricingError, variant: "destructive" });
    }
  }, [pricingError, toast]);

  const handleSaveQuote = async () => {
    if (!pricingResult) {
      toast({ title: "Error", description: "Please calculate pricing first", variant: "destructive" });
      return;
    }

    if (pricingResult.integrityStatus === "blocked") {
      toast({ title: "Cannot Save", description: "Quote has blocking issues that must be resolved", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const quoteData: Record<string, any> = {
        leadId,
        totalPrice: pricingResult.totalClientPrice,
        totalCost: pricingResult.totalUpteamCost,
        grossMargin: pricingResult.grossMargin,
        grossMarginPercent: pricingResult.grossMarginPercent,
        lineItems: pricingResult.lineItems,
        subtotals: pricingResult.subtotals,
        integrityStatus: pricingResult.integrityStatus,
        integrityFlags: pricingResult.integrityFlags || [],
        requestData: {
          areas,
          dispatchLocation,
          distance: distance ? parseFloat(distance) : null,
          risks,
          services: { matterport, actScan, additionalElevations: additionalElevations ? parseInt(additionalElevations) : 0 },
          paymentTerms,
        },
      };

      if (sourceQuote) {
        quoteData.parentQuoteId = sourceQuote.id;
        quoteData.baseVersionNumber = sourceQuote.versionNumber;
      }

      const response = await apiRequest("POST", `/api/leads/${leadId}/cpq-quotes`, quoteData);
      const responseData = await response.json();

      if (!response.ok) {
        if (responseData.errors && Array.isArray(responseData.errors)) {
          const primaryError = responseData.errors[0];
          const errorCode = primaryError.code;

          if (errorCode === "MARGIN_BELOW_FLOOR") {
            toast({
              title: "Quote Blocked",
              description: primaryError.message,
              variant: "destructive"
            });
          } else if (errorCode === "PRICE_INTEGRITY_FAILED") {
            toast({
              title: "Price Mismatch",
              description: primaryError.message,
              variant: "destructive"
            });
          } else {
            toast({
              title: "Validation Error",
              description: primaryError.message,
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Error",
            description: responseData.message || "Failed to save quote",
            variant: "destructive"
          });
        }
        return;
      }

      if (responseData.warnings && responseData.warnings.length > 0) {
        responseData.warnings.forEach((warning: { code: string; message: string }) => {
          toast({
            title: warning.code === "TIER_A_PROJECT" ? "Tier A Project" : "Quote Warning",
            description: warning.message,
          });
        });
      }

      setLoadedSourceQuoteId(null);

      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "cpq-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });

      const versionMsg = sourceQuote
        ? `New version created from Version ${sourceQuote.versionNumber}`
        : "Quote has been saved successfully";
      toast({ title: "Quote Saved", description: versionMsg });
      onQuoteSaved();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save quote", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isLandscape = (buildingType: string) => buildingType === "14" || buildingType === "15";

  /**
   * Confidence Score Calculation Weights
   * 
   * Each factor contributes a percentage of the total confidence score:
   * - Building type and square footage (15% each) establish project scope
   * - Disciplines selection (20%) defines deliverables
   * - MEP scope details (15%) refines mechanical estimates
   * - Dispatch location and distance (10% + 5%) affect travel costs
   * - Site status risks and services (10% each) capture project complexity
   * 
   * A score of 90%+ indicates high-confidence pricing.
   * A score of 70-89% suggests moderate confidence with some gaps.
   * Below 70% indicates significant missing information.
   */
  const CONFIDENCE_WEIGHTS = {
    buildingType: 0.15,
    sqft: 0.15,
    disciplines: 0.20,
    mepScope: 0.15,
    dispatchLocation: 0.10,
    siteStatus: 0.10,
    actScanning: 0.10,
    distance: 0.05,
  };

  /**
   * Calculates quote confidence score based on field completeness.
   * 
   * @returns A percentage score (0-100) indicating how complete the quote configuration is.
   * Higher scores indicate more reliable pricing estimates.
   */
  const calculateConfidenceScore = useMemo(() => {
    let score = 0;

    const primaryArea = areas[0];
    if (!primaryArea) return 0;

    if (primaryArea.buildingType && primaryArea.buildingType.length > 0) {
      score += CONFIDENCE_WEIGHTS.buildingType * 100;
    }

    const sqftValue = parseInt(primaryArea.squareFeet);
    if (sqftValue && sqftValue > 0) {
      score += CONFIDENCE_WEIGHTS.sqft * 100;
    }

    if (primaryArea.disciplines.length > 0) {
      score += CONFIDENCE_WEIGHTS.disciplines * 100;
    }

    const hasMepf = primaryArea.disciplines.includes("mepf");
    const mepfConfig = primaryArea.disciplineLods["mepf"];
    const mepfHasCustomConfig = hasMepf && mepfConfig && (
      mepfConfig.lod !== "300" || mepfConfig.scope !== "full"
    );
    if (hasMepf && mepfHasCustomConfig) {
      score += CONFIDENCE_WEIGHTS.mepScope * 100;
    } else if (hasMepf) {
      score += (CONFIDENCE_WEIGHTS.mepScope * 100) / 2;
    }

    if (dispatchLocation && dispatchLocation.length > 0) {
      score += CONFIDENCE_WEIGHTS.dispatchLocation * 100;
    }

    if (risks.length > 0 || risksAffirmed) {
      score += CONFIDENCE_WEIGHTS.siteStatus * 100;
    }

    const hasServices = actScan || matterport || (additionalElevations && parseInt(additionalElevations) > 0);
    if (hasServices || servicesAffirmed) {
      score += CONFIDENCE_WEIGHTS.actScanning * 100;
    }

    const distValue = parseFloat(distance);
    if (distValue && distValue > 0) {
      score += CONFIDENCE_WEIGHTS.distance * 100;
    }

    return Math.round(score);
  }, [areas, dispatchLocation, risks, risksAffirmed, actScan, matterport, additionalElevations, servicesAffirmed, distance]);

  const fieldCompletionStatus = useMemo(() => {
    const primaryArea = areas[0];
    const hasServices = actScan || matterport || (additionalElevations && parseInt(additionalElevations) > 0);
    return {
      buildingType: primaryArea?.buildingType && primaryArea.buildingType.length > 0,
      sqft: parseInt(primaryArea?.squareFeet || "0") > 0,
      disciplines: (primaryArea?.disciplines.length || 0) > 0,
      dispatchLocation: dispatchLocation && dispatchLocation.length > 0,
      distance: parseFloat(distance || "0") > 0,
      risks: risks.length > 0 || risksAffirmed,
      services: hasServices || servicesAffirmed,
    };
  }, [areas, dispatchLocation, distance, risks, risksAffirmed, actScan, matterport, additionalElevations, servicesAffirmed]);

  const getHungryFieldClass = (fieldName: keyof typeof fieldCompletionStatus) => {
    const isComplete = fieldCompletionStatus[fieldName];
    if (isComplete) {
      return "transition-all duration-300";
    }
    return "ring-2 ring-amber-400/40 bg-amber-500/5 transition-all duration-300";
  };

  const ConfidenceBadge = () => {
    const score = calculateConfidenceScore;
    const colorClass = score >= 90
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : score >= 70
        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
        : "bg-muted text-muted-foreground border-muted-foreground/30";

    return (
      <Badge variant="outline" className={`${colorClass} gap-1`} data-testid="badge-quote-confidence">
        <span className="text-xs">Confidence:</span>
        <span className="font-semibold">{score}%</span>
      </Badge>
    );
  };

  const getIntegrityBadge = () => {
    if (!pricingResult) return null;
    const status = pricingResult.integrityStatus;
    const colors = status === "pass" ? "bg-green-500/10 text-green-600 border-green-500/30"
      : status === "warning" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
        : "bg-red-500/10 text-red-600 border-red-500/30";

    return (
      <Badge variant="outline" className={colors} data-testid="badge-integrity-status">
        {status === "pass" ? "Pass" : status === "warning" ? "Warning" : "Blocked"}
      </Badge>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {sourceQuote && (
          <Alert className="mb-4 border-primary/50 bg-primary/5">
            <History className="w-4 h-4" />
            <AlertTitle className="flex items-center justify-between">
              <span>Editing from Version {sourceQuote.versionNumber}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onClearSourceQuote?.();
                  setLoadedSourceQuoteId(null);
                }}
                data-testid="button-clear-source-quote"
              >
                <X className="w-4 h-4 mr-1" />
                Start Fresh
              </Button>
            </AlertTitle>
            <AlertDescription className="text-sm">
              Any changes will create a new quote version. Original Quote #{sourceQuote.quoteNumber} will be preserved.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Project Info
                  </span>
                  {lead.requiresOverride && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30" data-testid="badge-tier-a">
                      Tier A
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Client</Label>
                    <div className="font-medium">{lead.clientName}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Project</Label>
                    <div className="font-medium">{lead.projectName || "—"}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <div className="font-medium text-sm">{lead.projectAddress || "—"}</div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Checkbox
                    id="tierA"
                    checked={lead.requiresOverride || false}
                    onCheckedChange={(checked) => updateLeadMutation.mutate({ id: leadId, requiresOverride: checked === true })}
                    data-testid="checkbox-tier-a"
                  />
                  <Label htmlFor="tierA" className="text-sm cursor-pointer">Tier A Job</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Areas
                  </span>
                  <Button size="sm" variant="outline" onClick={addArea} data-testid="button-add-area">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Area
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {areas.map((area, idx) => (
                  <div key={area.id} className="p-3 border rounded-lg space-y-3" data-testid={`area-${area.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        placeholder={`Area ${idx + 1}`}
                        value={area.name}
                        onChange={(e) => updateArea(area.id, { name: e.target.value })}
                        className="flex-1"
                        data-testid={`input-area-name-${area.id}`}
                      />
                      {areas.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeArea(area.id)}
                          data-testid={`button-remove-area-${area.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Building Type</Label>
                        <Select
                          value={area.buildingType}
                          onValueChange={(v) => updateArea(area.id, { buildingType: v })}
                        >
                          <SelectTrigger
                            className={idx === 0 ? getHungryFieldClass("buildingType") : ""}
                            data-testid={`select-building-type-${area.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CPQ_BUILDING_TYPES).map(([id, label]) => (
                              <SelectItem key={id} value={id}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">{isLandscape(area.buildingType) ? "Acres" : "Square Feet"}</Label>
                        <Input
                          type="number"
                          placeholder={isLandscape(area.buildingType) ? "10" : "15000"}
                          value={area.squareFeet}
                          onChange={(e) => updateArea(area.id, { squareFeet: e.target.value })}
                          className={idx === 0 ? getHungryFieldClass("sqft") : ""}
                          data-testid={`input-sqft-${area.id}`}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Disciplines</Label>
                      <div className={`flex flex-wrap gap-2 mt-1 p-2 rounded-md ${idx === 0 ? getHungryFieldClass("disciplines") : ""}`}>
                        {CPQ_API_DISCIPLINES.map((disc) => (
                          <Button
                            key={disc}
                            size="sm"
                            variant={area.disciplines.includes(disc) ? "default" : "outline"}
                            onClick={() => toggleDiscipline(area.id, disc)}
                            className="h-7 text-xs"
                            data-testid={`toggle-discipline-${area.id}-${disc}`}
                          >
                            {DISCIPLINE_LABELS[disc] || disc.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {area.disciplines.length > 0 && (
                      <div className="space-y-2">
                        {area.disciplines.map((disc) => (
                          <div key={disc} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                            <span className="text-xs font-medium w-16">{DISCIPLINE_LABELS[disc] || disc.toUpperCase()}</span>
                            <Select
                              value={area.disciplineLods[disc]?.lod || "300"}
                              onValueChange={(v) => updateDisciplineLod(area.id, disc, "lod", v)}
                            >
                              <SelectTrigger className="h-7 w-20" data-testid={`select-lod-${area.id}-${disc}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CPQ_API_LODS.map((lod) => (
                                  <SelectItem key={lod} value={lod}>LoD {lod}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={area.disciplineLods[disc]?.scope || "full"}
                              onValueChange={(v) => updateDisciplineLod(area.id, disc, "scope", v)}
                            >
                              <SelectTrigger className="h-7 w-24" data-testid={`select-scope-${area.id}-${disc}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CPQ_API_SCOPES.map((scope) => (
                                  <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Landscape Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <TreePine className="w-4 h-4" />
                    Landscape
                  </span>
                  <Button size="sm" variant="outline" onClick={addLandscapeArea} data-testid="button-add-landscape">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Landscape
                  </Button>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Add outdoor/site work priced per acre
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {landscapeAreas.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No landscape areas added
                  </div>
                ) : (
                  landscapeAreas.map((area, idx) => (
                    <div key={area.id} className="p-3 border rounded-lg space-y-3 bg-green-50/30 dark:bg-green-950/10" data-testid={`landscape-${area.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          placeholder={`Landscape ${idx + 1}`}
                          value={area.name}
                          onChange={(e) => updateLandscapeArea(area.id, { name: e.target.value })}
                          className="flex-1"
                          data-testid={`input-landscape-name-${area.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLandscapeArea(area.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          data-testid={`button-remove-landscape-${area.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={area.type}
                            onValueChange={(v: "built" | "natural") => updateLandscapeArea(area.id, { type: v })}
                          >
                            <SelectTrigger className="h-9" data-testid={`select-landscape-type-${area.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="built">Built (Manicured)</SelectItem>
                              <SelectItem value="natural">Natural (Wooded)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Acres</Label>
                          <Input
                            type="number"
                            placeholder="5"
                            value={area.acres}
                            onChange={(e) => updateLandscapeArea(area.id, { acres: e.target.value })}
                            data-testid={`input-landscape-acres-${area.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">LOD</Label>
                          <Select
                            value={area.lod}
                            onValueChange={(v: "200" | "300" | "350") => updateLandscapeArea(area.id, { lod: v })}
                          >
                            <SelectTrigger className="h-9" data-testid={`select-landscape-lod-${area.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="200">LOD 200 - Basic Topo</SelectItem>
                              <SelectItem value="300">LOD 300 - Detailed</SelectItem>
                              <SelectItem value="350">LOD 350 - High Detail</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Travel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Dispatch Location</Label>
                    <Select value={dispatchLocation} onValueChange={handleDispatchLocationChange}>
                      <SelectTrigger
                        className={getHungryFieldClass("dispatchLocation")}
                        data-testid="select-dispatch-location"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CPQ_API_DISPATCH_LOCATIONS.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc.charAt(0).toUpperCase() + loc.slice(1).replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Distance (miles)</Label>
                    <Input
                      type="number"
                      placeholder="25"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      className={getHungryFieldClass("distance")}
                      data-testid="input-distance"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`flex flex-wrap gap-3 p-2 rounded-md ${getHungryFieldClass("risks")}`}>
                  {CPQ_API_RISKS.map((risk) => (
                    <div key={risk} className="flex items-center gap-2">
                      <Checkbox
                        id={`risk-${risk}`}
                        checked={risks.includes(risk)}
                        disabled={risksAffirmed}
                        onCheckedChange={() => {
                          toggleRisk(risk);
                          if (risksAffirmed) setRisksAffirmed(false);
                        }}
                        data-testid={`checkbox-risk-${risk}`}
                      />
                      <label htmlFor={`risk-${risk}`} className={`text-sm cursor-pointer ${risksAffirmed ? "text-muted-foreground" : ""}`}>
                        {risk === "occupied" ? "Occupied" : risk === "hazardous" ? "Hazardous" : "No Power"}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed">
                  <Checkbox
                    id="risks-affirmed"
                    checked={risksAffirmed}
                    onCheckedChange={(checked) => {
                      setRisksAffirmed(!!checked);
                      if (checked) setRisks([]);
                    }}
                    data-testid="checkbox-no-risks"
                  />
                  <label htmlFor="risks-affirmed" className="text-xs text-muted-foreground cursor-pointer italic">
                    No risk factors apply to this project
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Additional Services
                </CardTitle>
              </CardHeader>
              <CardContent className={`space-y-3 p-3 rounded-md ${getHungryFieldClass("services")}`}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="matterport" className={servicesAffirmed ? "text-muted-foreground" : ""}>Matterport Virtual Tour</Label>
                  <Switch
                    id="matterport"
                    checked={matterport}
                    disabled={servicesAffirmed}
                    onCheckedChange={(checked) => {
                      setMatterport(checked);
                      if (checked && servicesAffirmed) setServicesAffirmed(false);
                    }}
                    data-testid="switch-matterport"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="actScan" className={servicesAffirmed ? "text-muted-foreground" : ""}>Above Ceiling Tile Scan</Label>
                  <Switch
                    id="actScan"
                    checked={actScan}
                    disabled={servicesAffirmed}
                    onCheckedChange={(checked) => {
                      setActScan(checked);
                      if (checked && servicesAffirmed) setServicesAffirmed(false);
                    }}
                    data-testid="switch-act-scan"
                  />
                </div>
                <div>
                  <Label className={`text-xs ${servicesAffirmed ? "text-muted-foreground" : ""}`}>Additional Interior Elevations</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={additionalElevations}
                    disabled={servicesAffirmed}
                    onChange={(e) => {
                      setAdditionalElevations(e.target.value);
                      if (e.target.value && parseInt(e.target.value) > 0 && servicesAffirmed) {
                        setServicesAffirmed(false);
                      }
                    }}
                    data-testid="input-additional-elevations"
                  />
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-dashed">
                  <Checkbox
                    id="services-affirmed"
                    checked={servicesAffirmed}
                    onCheckedChange={(checked) => {
                      setServicesAffirmed(!!checked);
                      if (checked) {
                        setMatterport(false);
                        setActScan(false);
                        setAdditionalElevations("");
                      }
                    }}
                    data-testid="checkbox-no-services"
                  />
                  <label htmlFor="services-affirmed" className="text-xs text-muted-foreground cursor-pointer italic">
                    No additional services needed
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Payment Terms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger data-testid="select-payment-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CPQ_PAYMENT_TERMS.filter(term => term !== "other").map((term) => (
                      <SelectItem key={term} value={term}>
                        {CPQ_PAYMENT_TERMS_DISPLAY[term]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Pricing Breakdown
                  </span>
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge />
                    {getIntegrityBadge()}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Margin Target</Label>
                    <span className="text-sm font-semibold text-primary" data-testid="text-margin-target-value">
                      {(marginTarget * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[marginTarget * 100]}
                    onValueChange={(value) => setMarginTarget(value[0] / 100)}
                    min={20}
                    max={65}
                    step={1}
                    className="w-full"
                    data-testid="slider-margin-target"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>20%</span>
                    <span className="text-red-600 dark:text-red-400">40%</span>
                    <span className="text-amber-600 dark:text-amber-400">45%</span>
                    <span>65%</span>
                  </div>
                </div>

                {pricingResult ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {pricingResult.lineItems.filter(li => li.category !== "total").map((item) => (
                        <div key={item.id} className="flex justify-between text-sm py-1 border-b border-dashed last:border-0">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">${item.clientPrice.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Modeling</span>
                        <span>${pricingResult.subtotals.modeling.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Travel</span>
                        <span>${pricingResult.subtotals.travel.toLocaleString()}</span>
                      </div>
                      {pricingResult.subtotals.riskPremiums > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Risk Premiums</span>
                          <span>${pricingResult.subtotals.riskPremiums.toLocaleString()}</span>
                        </div>
                      )}
                      {pricingResult.subtotals.services > 0 && (
                        <div className="flex justify-between">
                          <span>Services</span>
                          <span>${pricingResult.subtotals.services.toLocaleString()}</span>
                        </div>
                      )}
                      {pricingResult.subtotals.paymentPremium > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Payment Premium</span>
                          <span>${pricingResult.subtotals.paymentPremium.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Price</span>
                        <span>${pricingResult.totalClientPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Cost</span>
                        <span>${pricingResult.totalUpteamCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Gross Margin</span>
                        <span className={pricingResult.grossMarginPercent >= 45 ? "text-green-600" : "text-amber-600"}>
                          ${pricingResult.grossMargin.toLocaleString()} ({pricingResult.grossMarginPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {pricingResult.integrityFlags && pricingResult.integrityFlags.length > 0 && (
                      <div className="space-y-2 mt-4">
                        {pricingResult.integrityFlags.map((flag, idx) => (
                          <Alert key={idx} variant={flag.severity === "error" ? "destructive" : "default"} data-testid={`alert-flag-${idx}`}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{flag.code}</AlertTitle>
                            <AlertDescription>{flag.message}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}

                    <Button
                      className="w-full mt-4"
                      onClick={handleSaveQuote}
                      disabled={isSaving || pricingResult.integrityStatus === "blocked"}
                      data-testid="button-save-quote"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Quote
                        </>
                      )}
                    </Button>
                    {pricingResult.integrityStatus === "blocked" && (
                      <p className="text-xs text-destructive text-center">
                        Cannot save: Quote has blocking issues
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Configure project details and click "Calculate Price" to see pricing breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
