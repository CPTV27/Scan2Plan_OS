/**
 * CPQ Calculator Component - Embedded Quote Builder
 * 
 * Client-side pricing calculator for creating and editing quotes.
 * All calculations happen in the browser for instant feedback.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Calculator as CalculatorIcon,
  Building2,
  MapPin,
  FileText,
  DollarSign,
  Plane,
  Mail,
  Copy,
  AlertCircle,
  Link,
  Loader2,
  PenTool,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { BoundaryDrawer } from "@/components/BoundaryDrawer";
import type { Lead, CpqQuote } from "@shared/schema";
import {
  calculatePricing,
  calculateTravelCost,
  BUILDING_TYPES,
  LANDSCAPE_TYPES,
  DISCIPLINES,
  LOD_OPTIONS,
  SCOPE_OPTIONS,
  RISK_FACTORS,
  SERVICE_RATES,
  calculateMarginPercent,
  passesMarginGate,
  getMarginGateError,
  FY26_GOALS,
  TIER_A_THRESHOLD,
  TIER_A_MARGINS,
  ACRES_TO_SQFT,
  calculateTierAPricing,
  calculateTotalSqft,
  getAreaSqft,
  isTierAProject,
  type Area,
  type AreaKind,
  type TravelConfig,
  type PricingResult,
  type BoundaryCoordinate,
} from "./pricing";

// Pricing mode type
type PricingMode = "standard" | "landscape" | "tierA";

interface CalculatorProps {
  leadId?: number;
  quoteId?: number;
  onClose?: () => void;
}

export default function CPQCalculator({ leadId, quoteId, onClose }: CalculatorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pricing mode (standard areas, landscape areas, or Tier A)
  const [pricingMode, setPricingMode] = useState<PricingMode>("standard");
  
  // Form state - areas now include 'kind' property
  const [areas, setAreas] = useState<Area[]>([
    {
      id: "1",
      name: "Area 1",
      kind: "standard",
      buildingType: "1",
      squareFeet: "",
      lod: "200",
      disciplines: ["architecture"],
      scope: "full",
    },
  ]);
  const [services, setServices] = useState<Record<string, number>>({});
  const [travel, setTravel] = useState<TravelConfig>({ dispatchLocation: "WOODSTOCK", distance: 0 });
  const [risks, setRisks] = useState<string[]>([]);
  const [paymentTerms, setPaymentTerms] = useState("standard");
  const [projectNotes, setProjectNotes] = useState("");
  
  // Filter areas by kind for display
  const standardAreas = useMemo(() => areas.filter(a => a.kind === "standard"), [areas]);
  const landscapeAreas = useMemo(() => areas.filter(a => a.kind === "landscape"), [areas]);

  // Building features
  const [hasBasement, setHasBasement] = useState(false);
  const [hasAttic, setHasAttic] = useState(false);

  // Acoustic ceiling tile scanning
  const [actScanning, setActScanning] = useState<"yes" | "no" | "other" | "ask_client">("no");
  const [actScanningNotes, setActScanningNotes] = useState("");

  // Scanning & Registration Only
  const [scanningOnly, setScanningOnly] = useState<"none" | "full_day" | "half_day" | "ask_client">("none");
  
  // Site status (for RFI)
  const [siteStatus, setSiteStatus] = useState<"vacant" | "occupied" | "construction" | "ask_client">("vacant");
  
  // MEP scope (for RFI)
  const [mepScope, setMepScope] = useState<"full" | "partial" | "none" | "ask_client">("full");

  // Custom travel cost override
  const [customTravelCost, setCustomTravelCost] = useState<string>("");
  
  // Distance calculation loading state
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  
  // Boundary drawing state for landscape areas
  const [boundaryDrawerAreaId, setBoundaryDrawerAreaId] = useState<string | null>(null);
  
  // Price adjustment for margin gate compliance
  const [priceAdjustmentPercent, setPriceAdjustmentPercent] = useState<number>(0);

  // Internal cost tracking / Tier A Pricing
  const [tierAScanningCost, setTierAScanningCost] = useState<string>("");
  const [tierAScanningCostOther, setTierAScanningCostOther] = useState<string>("");
  const [tierAModelingCost, setTierAModelingCost] = useState<string>("");
  const [tierAMargin, setTierAMargin] = useState<string>("");
  const [assumedMargin, setAssumedMargin] = useState<string>("");
  const [profitabilityCaveats, setProfitabilityCaveats] = useState("");
  
  // Calculate total sqft for Tier A detection (uses new helper function)
  const totalSqft = useMemo(() => calculateTotalSqft(areas), [areas]);
  
  // Detect if project qualifies for Tier A pricing (auto-suggest)
  const qualifiesForTierA = isTierAProject(totalSqft);
  
  // Actual Tier A mode is either manually selected OR auto-detected
  const isTierA = pricingMode === "tierA";
  
  // Calculate Tier A pricing when enabled
  const tierAPricingResult = useMemo(() => {
    if (!isTierA) return null;
    return calculateTierAPricing(
      {
        scanningCost: tierAScanningCost as any,
        scanningCostOther: parseFloat(tierAScanningCostOther) || undefined,
        modelingCost: parseFloat(tierAModelingCost) || 0,
        margin: tierAMargin as any,
      },
      travel.distance || 0
    );
  }, [isTierA, tierAScanningCost, tierAScanningCostOther, tierAModelingCost, tierAMargin, travel.distance]);

  // Fetch lead data if leadId provided
  const { data: lead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !!leadId,
  });

  // Fetch existing quote if quoteId provided
  const { data: existingQuote } = useQuery<CpqQuote>({
    queryKey: ["/api/cpq/quotes", quoteId],
    enabled: !!quoteId,
  });

  // Load lead data into form
  useEffect(() => {
    if (lead) {
      // Pre-fill from lead data
      if (lead.sqft) {
        setAreas((prev) => [
          {
            ...prev[0],
            squareFeet: lead.sqft?.toString() || "",
            name: lead.projectName || "Main Building",
          },
        ]);
      }
      if (lead.distance) {
        setTravel({
          dispatchLocation: lead.dispatchLocation || "WOODSTOCK",
          distance: lead.distance,
        });
      }
      
      // Auto-populate from Google Intel if available (only when NOT editing existing quote)
      // When editing an existing quote, preserve user-edited values
      if (!quoteId) {
        const googleIntel = lead.googleIntel as any;
        if (googleIntel) {
          // Use Google travel distance if available
          if (googleIntel.travelInsights?.available && googleIntel.travelInsights?.distanceMiles) {
            setTravel({
              dispatchLocation: lead.dispatchLocation || "WOODSTOCK",
              distance: Math.round(googleIntel.travelInsights.distanceMiles),
            });
          }
          // Use Google building insights for SQFT if no lead.sqft
          if (googleIntel.buildingInsights?.available && googleIntel.buildingInsights?.squareFeet && !lead.sqft) {
            setAreas((prev) => [
              {
                ...prev[0],
                squareFeet: googleIntel.buildingInsights.squareFeet.toString(),
                name: lead.projectName || "Main Building",
              },
            ]);
          }
        }
      }
    }
  }, [lead]);

  // Load existing quote data
  useEffect(() => {
    if (existingQuote) {
      if (existingQuote.areas) {
        setAreas(existingQuote.areas as Area[]);
      }
      if (existingQuote.services) {
        setServices(existingQuote.services as Record<string, number>);
      }
      if (existingQuote.travel) {
        const travelData = existingQuote.travel as TravelConfig & { customCost?: number };
        setTravel({ dispatchLocation: travelData.dispatchLocation, distance: travelData.distance });
        if (travelData.customCost) {
          setCustomTravelCost(travelData.customCost.toString());
        }
      }
      if (existingQuote.risks) {
        setRisks(existingQuote.risks as string[]);
      }
      setProjectNotes(existingQuote.notes || "");
      setPaymentTerms(existingQuote.paymentTerms || "standard");

      // Load new CPQ fields
      const quote = existingQuote as any;
      if (quote.buildingFeatures) {
        setHasBasement(quote.buildingFeatures.hasBasement || false);
        setHasAttic(quote.buildingFeatures.hasAttic || false);
      }
      if (quote.actScanning) {
        setActScanning(quote.actScanning);
      }
      if (quote.actScanningNotes) {
        setActScanningNotes(quote.actScanningNotes);
      }
      if (quote.scanningOnly) {
        setScanningOnly(quote.scanningOnly);
      }
      if (quote.siteStatus) {
        setSiteStatus(quote.siteStatus);
      }
      if (quote.mepScope) {
        setMepScope(quote.mepScope);
      }
      if (quote.internalCosts) {
        if (quote.internalCosts.tierAScanningCost != null) {
          setTierAScanningCost(quote.internalCosts.tierAScanningCost.toString());
        }
        if (quote.internalCosts.tierAModelingCost != null) {
          setTierAModelingCost(quote.internalCosts.tierAModelingCost.toString());
        }
        if (quote.internalCosts.assumedMargin) {
          setAssumedMargin(quote.internalCosts.assumedMargin);
        }
        if (quote.internalCosts.profitabilityCaveats) {
          setProfitabilityCaveats(quote.internalCosts.profitabilityCaveats);
        }
      }
      // Load price adjustment
      if (quote.priceAdjustmentPercent != null) {
        setPriceAdjustmentPercent(quote.priceAdjustmentPercent);
      }
    }
  }, [existingQuote]);

  // Dispatch location addresses for distance calculation
  const DISPATCH_LOCATIONS: Record<string, string> = {
    WOODSTOCK: "Woodstock, NY 12498",
    BROOKLYN: "Brooklyn, NY 11201",
  };

  // Calculate distance when dispatch location changes
  const handleDispatchLocationChange = async (locationCode: string) => {
    // For fly-out jobs, distance doesn't apply - set to 0
    if (locationCode === "FLY_OUT") {
      setTravel({ dispatchLocation: locationCode, distance: 0 });
      toast({
        title: "Fly-out selected",
        description: "Travel costs will be calculated based on flight/lodging expenses.",
      });
      return;
    }
    
    setTravel({ dispatchLocation: locationCode, distance: travel?.distance || 0 });
    
    // Only calculate if we have a project address
    if (!lead?.projectAddress) {
      return;
    }

    const originAddress = DISPATCH_LOCATIONS[locationCode];
    if (!originAddress) return;

    setIsCalculatingDistance(true);
    try {
      const result = await apiRequest("POST", "/api/travel/calculate", {
        destination: lead.projectAddress,
        origin: originAddress,
      });
      
      const distanceResult = result as { distanceMiles?: number; durationText?: string };
      if (distanceResult.distanceMiles) {
        setTravel({
          dispatchLocation: locationCode,
          distance: Math.round(distanceResult.distanceMiles),
        });
        toast({
          title: "Distance calculated",
          description: `${Math.round(distanceResult.distanceMiles)} miles from ${locationCode} (${distanceResult.durationText || ""})`,
        });
      }
    } catch (error: any) {
      console.error("Failed to calculate distance:", error);
      toast({
        title: "Distance calculation failed",
        description: "Could not calculate distance. You can enter it manually.",
        variant: "destructive",
      });
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  // Calculate base pricing in real-time (before adjustment)
  const basePricing: PricingResult = useMemo(() => {
    return calculatePricing(areas, services, travel, risks, paymentTerms);
  }, [areas, services, travel, risks, paymentTerms]);

  // Calculate adjusted pricing with markup percentage
  const pricing: PricingResult = useMemo(() => {
    if (priceAdjustmentPercent === 0) return basePricing;
    
    const adjustmentAmount = Math.round(basePricing.totalClientPrice * (priceAdjustmentPercent / 100) * 100) / 100;
    const adjustedTotal = Math.round((basePricing.totalClientPrice + adjustmentAmount) * 100) / 100;
    const adjustedProfit = Math.round((adjustedTotal - basePricing.totalUpteamCost) * 100) / 100;
    
    // Add adjustment as a visible line item
    const adjustmentLineItem = {
      label: `Price Adjustment (+${priceAdjustmentPercent}%)`,
      value: adjustmentAmount,
      upteamCost: 0, // Adjustment is pure margin
    };
    
    return {
      ...basePricing,
      items: [...basePricing.items, adjustmentLineItem],
      subtotal: Math.round((basePricing.subtotal + adjustmentAmount) * 100) / 100,
      totalClientPrice: adjustedTotal,
      profitMargin: adjustedProfit,
    };
  }, [basePricing, priceAdjustmentPercent]);

  // Calculate margin status for GM Hard Gate
  const marginPercent = useMemo(() => calculateMarginPercent(pricing), [pricing]);
  const marginGateError = useMemo(() => getMarginGateError(pricing), [pricing]);
  const isMarginBelowGate = !passesMarginGate(pricing);
  
  // Calculate the minimum adjustment needed to reach 40% margin
  const requiredAdjustmentPercent = useMemo(() => {
    if (!isMarginBelowGate || priceAdjustmentPercent > 0) return 0;
    // To achieve 40% margin: (price - cost) / price = 0.4
    // price = cost / 0.6
    const targetPrice = basePricing.totalUpteamCost / (1 - FY26_GOALS.MARGIN_FLOOR);
    const requiredIncrease = ((targetPrice / basePricing.totalClientPrice) - 1) * 100;
    return Math.ceil(requiredIncrease * 10) / 10; // Round up to 1 decimal place
  }, [basePricing, isMarginBelowGate, priceAdjustmentPercent]);

  // Preview travel cost based on current settings
  const travelCostPreview = useMemo(() => {
    if (!travel || travel.dispatchLocation === "FLY_OUT") return null;
    if (customTravelCost && !isNaN(parseFloat(customTravelCost))) {
      return { cost: parseFloat(customTravelCost), isCustom: true };
    }
    const projectTotalSqft = calculateTotalSqft(areas);
    const cost = calculateTravelCost(
      travel.distance || 0,
      travel.dispatchLocation,
      projectTotalSqft
    );
    return { cost, isCustom: false };
  }, [travel, customTravelCost, areas]);

  // RFI (Request for Information) detection - "I don't know" selections
  const rfiFields = useMemo(() => {
    const fields: { key: string; label: string; question: string }[] = [];
    
    if (actScanning === "ask_client") {
      fields.push({
        key: "actScanning",
        label: "Acoustic Ceiling Tile Scanning",
        question: "Do you need scanning above and below acoustic ceiling tiles, or just the finished ceiling surface?",
      });
    }
    if (scanningOnly === "ask_client") {
      fields.push({
        key: "scanningOnly",
        label: "Scanning & Registration Scope",
        question: "Do you need just raw point cloud data (Scanning & Registration Only), or full Scan-to-BIM modeling?",
      });
    }
    if (siteStatus === "ask_client") {
      fields.push({
        key: "siteStatus",
        label: "Site Status",
        question: "Is the site currently vacant, occupied, or under construction?",
      });
    }
    if (mepScope === "ask_client") {
      fields.push({
        key: "mepScope",
        label: "MEP Scope",
        question: "Do you need MEP (Mechanical/Electrical/Plumbing) modeled, or just the architecture?",
      });
    }
    
    return fields;
  }, [actScanning, scanningOnly, siteStatus, mepScope]);

  const hasRfiItems = rfiFields.length > 0;

  // Generate RFI email body
  const rfiEmailBody = useMemo(() => {
    if (!hasRfiItems) return "";
    
    const leadName = lead?.contactName || "[Client Name]";
    const projectName = lead?.projectName || "your project";
    
    return `Hi ${leadName},

I'm working on your quote for the ${projectName} scanning project. To ensure we give you the most accurate price, could you clarify a few details?

${rfiFields.map((field) => `- ${field.question}`).join("\n")}

Once I have these details, I'll finalize your quote right away.

Thanks!`.trim();
  }, [hasRfiItems, rfiFields, lead]);

  const canSaveQuote = !isMarginBelowGate && !hasRfiItems;

  // Save quote mutation
  const saveQuoteMutation = useMutation({
    mutationFn: async () => {
      // GM HARD GATE CHECK - Block proposal generation if margin < 40%
      if (marginGateError) {
        throw new Error(marginGateError);
      }
      
      // Safely build travel data with custom cost
      let travelData = travel;
      if (customTravelCost) {
        const customCost = parseFloat(customTravelCost);
        if (!isNaN(customCost)) {
          travelData = travel
            ? { ...travel, customCost }
            : { dispatchLocation: "WOODSTOCK", distance: 0, customCost };
        }
      }

      // Parse Tier A costs - use "other" input value when "other" is selected
      const parseTierACost = (val: string) => {
        if (!val) return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      };

      // Get effective Tier A scanning cost (use "other" input if "other" selected)
      const effectiveTierAScanningCost = tierAScanningCost === "other"
        ? tierAScanningCostOther
        : tierAScanningCost;

      const quoteData = {
        leadId: leadId || null,
        areas,
        services,
        travel: travelData,
        risks,
        paymentTerms,
        notes: projectNotes,
        totalClientPrice: pricing.totalClientPrice.toString(),
        totalUpteamCost: pricing.totalUpteamCost.toString(),
        status: "draft" as const,
        // Additional fields
        buildingFeatures: { hasBasement, hasAttic },
        actScanning,
        actScanningNotes,
        scanningOnly,
        siteStatus,
        mepScope,
        internalCosts: {
          tierAScanningCost: parseTierACost(effectiveTierAScanningCost),
          tierAModelingCost: parseTierACost(tierAModelingCost),
          assumedMargin,
          profitabilityCaveats,
        },
        priceAdjustmentPercent: priceAdjustmentPercent > 0 ? priceAdjustmentPercent : null,
        // Full pricing result stored in pricingBreakdown field for QBO estimate sync
        pricingBreakdown: {
          items: pricing.items,
          subtotal: pricing.subtotal,
          totalClientPrice: pricing.totalClientPrice,
          totalUpteamCost: pricing.totalUpteamCost,
          profitMargin: pricing.profitMargin,
          disciplineTotals: pricing.disciplineTotals,
        },
      };

      if (quoteId) {
        return apiRequest("PATCH", `/api/cpq/quotes/${quoteId}`, quoteData);
      } else if (leadId) {
        return apiRequest("POST", `/api/leads/${leadId}/cpq-quotes`, quoteData);
      } else {
        return apiRequest("POST", "/api/cpq/quotes", quoteData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Quote saved",
        description: "Your quote has been saved successfully.",
      });
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      }
    },
    onError: (error: Error) => {
      console.error("[CPQ Save Error]", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate client magic link mutation
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  
  const generateLinkMutation = useMutation({
    mutationFn: async (savedQuoteId: number) => {
      const response = await apiRequest("POST", `/api/cpq-quotes/${savedQuoteId}/generate-link`, {});
      return response.json();
    },
    onSuccess: (data: { token: string; link: string; expiresAt: string }) => {
      const fullLink = `${window.location.origin}${data.link}`;
      setGeneratedLink(fullLink);
      setLinkExpiresAt(data.expiresAt);
      navigator.clipboard.writeText(fullLink);
      toast({
        title: "Link copied!",
        description: "Magic link has been copied to clipboard. Valid for 7 days.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate link",
        variant: "destructive",
      });
    },
  });

  // Save quote with RFI fields and generate link
  const saveAndGenerateLinkMutation = useMutation({
    mutationFn: async () => {
      // Build quote data with RFI fields
      const travelData = customTravelCost && !isNaN(parseFloat(customTravelCost))
        ? { ...travel, customCost: parseFloat(customTravelCost) }
        : travel;

      const quoteData = {
        leadId: leadId || null,
        areas,
        services,
        travel: travelData,
        risks,
        paymentTerms,
        notes: projectNotes,
        totalClientPrice: pricing.totalClientPrice.toString(),
        totalUpteamCost: pricing.totalUpteamCost.toString(),
        status: "draft" as const,
        buildingFeatures: { hasBasement, hasAttic },
        actScanning,
        actScanningNotes,
        scanningOnly,
        siteStatus,
        mepScope,
        priceAdjustmentPercent: priceAdjustmentPercent > 0 ? priceAdjustmentPercent : null,
        pricingBreakdown: {
          items: pricing.items,
          subtotal: pricing.subtotal,
          totalClientPrice: pricing.totalClientPrice,
          totalUpteamCost: pricing.totalUpteamCost,
          profitMargin: pricing.profitMargin,
          disciplineTotals: pricing.disciplineTotals,
        },
      };

      let savedQuote;
      if (quoteId) {
        savedQuote = await apiRequest("PATCH", `/api/cpq/quotes/${quoteId}`, quoteData);
      } else if (leadId) {
        savedQuote = await apiRequest("POST", `/api/leads/${leadId}/cpq-quotes`, quoteData);
      } else {
        savedQuote = await apiRequest("POST", "/api/cpq/quotes", quoteData);
      }
      
      const quoteResult = await savedQuote.json();
      return quoteResult;
    },
    onSuccess: (savedQuote) => {
      // Now generate the link for the saved quote
      generateLinkMutation.mutate(savedQuote.id);
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving quote",
        description: error.message || "Failed to save quote for link generation",
        variant: "destructive",
      });
    },
  });

  // Area management
  // Add a new area based on current pricing mode
  const addArea = (kind: AreaKind = "standard") => {
    const newId = Date.now().toString();
    const isLandscape = kind === "landscape";
    setAreas([
      ...areas,
      {
        id: newId,
        name: isLandscape ? `Landscape ${landscapeAreas.length + 1}` : `Area ${standardAreas.length + 1}`,
        kind,
        buildingType: isLandscape ? "landscape_built" : "1",
        squareFeet: "",
        lod: isLandscape ? "200" : "200",
        disciplines: isLandscape ? ["site"] : ["architecture"],
        scope: "full",
      },
    ]);
  };

  const removeArea = (id: string) => {
    if (areas.length > 1) {
      setAreas(areas.filter((a) => a.id !== id));
    }
  };

  const updateArea = (id: string, field: keyof Area, value: any) => {
    setAreas(areas.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const toggleDiscipline = (areaId: string, discipline: string) => {
    setAreas(
      areas.map((a) => {
        if (a.id !== areaId) return a;
        const current = a.disciplines || [];
        if (current.includes(discipline)) {
          return { ...a, disciplines: current.filter((d) => d !== discipline) };
        } else {
          return { ...a, disciplines: [...current, discipline] };
        }
      })
    );
  };

  const toggleRisk = (riskId: string) => {
    if (risks.includes(riskId)) {
      setRisks(risks.filter((r) => r !== riskId));
    } else {
      setRisks([...risks, riskId]);
    }
  };

  const updateService = (serviceId: string, quantity: number) => {
    setServices({ ...services, [serviceId]: quantity });
  };

  // Update boundary for a landscape area and auto-set acres from calculated area
  const updateAreaBoundary = useCallback((areaId: string, boundary: BoundaryCoordinate[], calculatedAcres: number) => {
    setAreas(areas.map(a => {
      if (a.id !== areaId) return a;
      return {
        ...a,
        boundary,
        squareFeet: calculatedAcres.toFixed(2), // Store acres in squareFeet field for landscape areas
      };
    }));
    setBoundaryDrawerAreaId(null);
  }, [areas]);

  // Get the area being edited for boundary drawing
  const boundaryDrawerArea = boundaryDrawerAreaId 
    ? areas.find(a => a.id === boundaryDrawerAreaId)
    : null;

  // Fetch project coordinates for boundary drawing
  const { data: locationData } = useQuery<{ coordinates?: { lat: number; lng: number } }>({
    queryKey: ["/api/location/preview", { address: lead?.projectAddress }],
    enabled: !!lead?.projectAddress,
  });

  // Get project coordinates from location preview
  const projectCoordinates = locationData?.coordinates || null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-calculator">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <CalculatorIcon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">
              {quoteId ? "Edit Quote" : "New Quote"}
              {lead && ` - ${lead.clientName}`}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isMarginBelowGate && (
            <Badge variant="destructive" className="text-xs" data-testid="badge-margin-gate-warning">
              Margin below 40% gate
            </Badge>
          )}
          <Button
            onClick={() => saveQuoteMutation.mutate()}
            disabled={saveQuoteMutation.isPending || !canSaveQuote}
            data-testid="button-save-quote"
            title={hasRfiItems ? "Answer all 'I don't know' items before saving" : isMarginBelowGate ? "Adjust pricing to meet 40% minimum margin" : undefined}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveQuoteMutation.isPending ? "Saving..." : "Save Quote"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Form */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6 max-w-3xl">
            {/* Pricing Mode Toggle - Tier A option */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-medium">Pricing Mode</h2>
                <Badge variant={qualifiesForTierA ? "default" : "secondary"} data-testid="badge-total-sqft">
                  {totalSqft.toLocaleString()} sqft total
                  {qualifiesForTierA && !isTierA && (
                    <span className="ml-1 text-xs">(Tier A eligible)</span>
                  )}
                </Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  variant={pricingMode !== "tierA" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setPricingMode("standard")}
                  data-testid="button-mode-standard"
                >
                  <Building2 className="h-4 w-4 mr-1" />
                  Areas
                  {areas.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{areas.length}</Badge>
                  )}
                </Button>
                <Button 
                  variant={pricingMode === "tierA" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setPricingMode("tierA")}
                  data-testid="button-mode-tier-a"
                  className={qualifiesForTierA && pricingMode !== "tierA" ? "border-primary" : ""}
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Tier A Pricing
                  {qualifiesForTierA && pricingMode !== "tierA" && (
                    <Badge variant="destructive" className="ml-2">Suggested</Badge>
                  )}
                </Button>
              </div>
            </div>
            
            <Separator />

            {/* Combined Areas Section (Building + Landscape) */}
            {pricingMode !== "tierA" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Project Areas
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addArea("standard")} data-testid="button-add-standard-area">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Building
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addArea("landscape")} data-testid="button-add-landscape-area">
                      <Plus className="h-4 w-4 mr-1" />
                      <MapPin className="h-4 w-4 mr-1" />
                      Add Landscape
                    </Button>
                  </div>
                </div>

                {areas.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No project areas added yet.</p>
                      <p className="text-sm mt-1">Add buildings (sqft) or landscape areas (acres).</p>
                      <div className="flex gap-2 justify-center mt-4">
                        <Button variant="outline" size="sm" onClick={() => addArea("standard")}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Building
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addArea("landscape")}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Landscape
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {areas.map((area, index) => {
                  // Calculate kind-specific index for test IDs
                  const kindIndex = areas.slice(0, index).filter(a => a.kind === area.kind).length;
                  const isLandscape = area.kind === "landscape";
                  
                  return (
                  <Card key={area.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={area.name}
                            onChange={(e) => updateArea(area.id, "name", e.target.value)}
                            className="font-medium max-w-[200px]"
                            data-testid={isLandscape ? `input-landscape-name-${kindIndex}` : `input-area-name-${kindIndex}`}
                          />
                          <Badge variant={isLandscape ? "secondary" : "outline"}>
                            {isLandscape ? (
                              <><MapPin className="h-3 w-3 mr-1" />Landscape</>
                            ) : (
                              <><Building2 className="h-3 w-3 mr-1" />Building</>
                            )}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeArea(area.id)}
                          data-testid={isLandscape ? `button-remove-landscape-${kindIndex}` : `button-remove-area-${kindIndex}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Building-specific fields */}
                      {area.kind === "standard" && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Building Type</Label>
                              <Select
                                value={area.buildingType}
                                onValueChange={(v) => updateArea(area.id, "buildingType", v)}
                              >
                                <SelectTrigger data-testid={`select-building-type-${kindIndex}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {BUILDING_TYPES.filter(bt => bt.id !== "14" && bt.id !== "15").map((bt) => (
                                    <SelectItem key={bt.id} value={bt.id}>
                                      {bt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Square Footage</Label>
                              <Input
                                type="number"
                                value={area.squareFeet}
                                onChange={(e) => updateArea(area.id, "squareFeet", e.target.value)}
                                placeholder="e.g., 50000"
                                data-testid={`input-sqft-${kindIndex}`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Level of Detail</Label>
                              <Select value={area.lod} onValueChange={(v) => updateArea(area.id, "lod", v)}>
                                <SelectTrigger data-testid={`select-lod-${kindIndex}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LOD_OPTIONS.map((lod) => (
                                    <SelectItem key={lod.id} value={lod.id}>
                                      {lod.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Scope</Label>
                              <Select
                                value={area.scope || "full"}
                                onValueChange={(v) => updateArea(area.id, "scope", v)}
                              >
                                <SelectTrigger data-testid={`select-scope-${kindIndex}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SCOPE_OPTIONS.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Disciplines</Label>
                            <div className="flex flex-wrap gap-2">
                              {DISCIPLINES.map((d) => (
                                <Badge
                                  key={d.id}
                                  variant={area.disciplines?.includes(d.id) ? "default" : "outline"}
                                  className="cursor-pointer toggle-elevate"
                                  onClick={() => toggleDiscipline(area.id, d.id)}
                                  data-testid={`badge-discipline-${d.id}-${kindIndex}`}
                                >
                                  {d.label}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`cad-${area.id}`}
                              checked={area.includeCadDeliverable || false}
                              onCheckedChange={(checked) =>
                                updateArea(area.id, "includeCadDeliverable", checked)
                              }
                              data-testid={`checkbox-cad-${kindIndex}`}
                            />
                            <Label htmlFor={`cad-${area.id}`} className="text-sm">
                              Include CAD Deliverable
                            </Label>
                          </div>
                        </>
                      )}

                      {/* Landscape-specific fields */}
                      {area.kind === "landscape" && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Landscape Type</Label>
                              <Select
                                value={area.buildingType}
                                onValueChange={(v) => updateArea(area.id, "buildingType", v)}
                              >
                                <SelectTrigger data-testid={`select-landscape-type-${kindIndex}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LANDSCAPE_TYPES.map((lt) => (
                                    <SelectItem key={lt.id} value={lt.id}>
                                      {lt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Acres</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={area.squareFeet}
                                onChange={(e) => updateArea(area.id, "squareFeet", e.target.value)}
                                placeholder="e.g., 5"
                                data-testid={`input-acres-${kindIndex}`}
                              />
                              {area.squareFeet && (
                                <p className="text-xs text-muted-foreground">
                                  = {getAreaSqft(area).toLocaleString()} sqft
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">Site Discipline</Badge>
                              <span className="text-xs text-muted-foreground">
                                Landscape areas use site discipline only
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {area.boundary && area.boundary.length >= 3 && (
                                <Badge variant="outline" className="text-xs">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {area.boundary.length} points
                                </Badge>
                              )}
                              {projectCoordinates && (
                                <Button
                                  type="button"
                                  variant={area.boundary && area.boundary.length >= 3 ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setBoundaryDrawerAreaId(area.id)}
                                  data-testid={`button-draw-boundary-${kindIndex}`}
                                >
                                  <PenTool className="w-3 h-3 mr-1" />
                                  {area.boundary && area.boundary.length >= 3 ? "Edit Boundary" : "Draw Boundary"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}

            {/* Tier A Pricing Section */}
            {pricingMode === "tierA" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Tier A Pricing
                  </h2>
                  <Badge variant="secondary">{totalSqft.toLocaleString()} sqft total</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Large project pricing methodology. Formula: (Scanning + Modeling) x Margin = Client Price
                </p>
                <Card className="border-primary/30">
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Scanning Cost</Label>
                        <Select
                          value={tierAScanningCost}
                          onValueChange={setTierAScanningCost}
                        >
                          <SelectTrigger data-testid="select-tier-a-scanning">
                            <SelectValue placeholder="Select cost" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3500">$3,500</SelectItem>
                            <SelectItem value="7000">$7,000</SelectItem>
                            <SelectItem value="10500">$10,500</SelectItem>
                            <SelectItem value="15000">$15,000</SelectItem>
                            <SelectItem value="18500">$18,500</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {tierAScanningCost === "other" && (
                          <Input
                            type="number"
                            value={tierAScanningCostOther}
                            onChange={(e) => setTierAScanningCostOther(e.target.value)}
                            placeholder="Enter custom cost"
                            data-testid="input-tier-a-scanning-other"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Modeling Cost</Label>
                        <Input
                          type="number"
                          value={tierAModelingCost}
                          onChange={(e) => setTierAModelingCost(e.target.value)}
                          placeholder="Enter modeling cost"
                          data-testid="input-tier-a-modeling"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Margin Multiplier</Label>
                      <Select
                        value={tierAMargin}
                        onValueChange={setTierAMargin}
                      >
                        <SelectTrigger data-testid="select-tier-a-margin">
                          <SelectValue placeholder="Select margin" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIER_A_MARGINS).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {tierAPricingResult && tierAPricingResult.clientPrice > 0 && (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Scanning Cost:</span>
                            <span>${tierAPricingResult.scanningCost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Modeling Cost:</span>
                            <span>${tierAPricingResult.modelingCost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${tierAPricingResult.subtotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Margin ({tierAPricingResult.marginLabel}):</span>
                            <span>x{tierAPricingResult.margin}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Client Price:</span>
                            <span className="text-primary">${tierAPricingResult.clientPrice.toLocaleString()}</span>
                          </div>
                          {tierAPricingResult.travelCost > 0 && (
                            <>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Travel ($4/mi over 20mi):</span>
                                <span>+${tierAPricingResult.travelCost.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between font-bold text-lg">
                                <span>Total with Travel:</span>
                                <span className="text-primary">${tierAPricingResult.totalWithTravel.toLocaleString()}</span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            {/* Travel Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Travel
                {(lead?.googleIntel as any)?.travelInsights?.available && (
                  <Badge variant="outline" className="text-xs font-normal ml-2">
                    via Google Maps
                  </Badge>
                )}
              </h2>
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Dispatch Origin</Label>
                      <Select
                        value={travel?.dispatchLocation || "WOODSTOCK"}
                        onValueChange={handleDispatchLocationChange}
                        disabled={isCalculatingDistance}
                      >
                        <SelectTrigger data-testid="select-dispatch-location">
                          <SelectValue placeholder="Select dispatch origin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WOODSTOCK">Woodstock, NY</SelectItem>
                          <SelectItem value="BROOKLYN">Brooklyn, NY</SelectItem>
                          <SelectItem value="FLY_OUT">Out of State (Fly-out)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {travel?.dispatchLocation !== "FLY_OUT" && (
                      <div className="space-y-2">
                        <Label>Distance (miles)</Label>
                        <Input
                          type="number"
                          value={travel?.distance || ""}
                          onChange={(e) =>
                            setTravel({
                              dispatchLocation: travel?.dispatchLocation || "WOODSTOCK",
                              distance: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder={isCalculatingDistance ? "Calculating..." : "Auto-calculated"}
                          disabled={isCalculatingDistance}
                          data-testid="input-travel-distance"
                        />
                      </div>
                    )}
                    {travel?.dispatchLocation === "FLY_OUT" && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Travel Mode</Label>
                        <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Flight + Lodging</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{travel?.dispatchLocation === "FLY_OUT" ? "Fly-out Travel Cost" : "Custom Travel Cost (optional)"}</Label>
                    <Input
                      type="number"
                      value={customTravelCost}
                      onChange={(e) => setCustomTravelCost(e.target.value)}
                      placeholder={travel?.dispatchLocation === "FLY_OUT" ? "Enter total flight + lodging cost" : "Leave empty to use calculated cost"}
                      data-testid="input-custom-travel-cost"
                    />
                    <p className="text-xs text-muted-foreground">
                      {travel?.dispatchLocation === "FLY_OUT" 
                        ? "Include airfare, lodging, rental car, and per diem"
                        : "Override the calculated mileage-based travel cost"
                      }
                    </p>
                  </div>
                  {travelCostPreview && (
                    <div className="p-3 bg-muted/50 rounded-md border" data-testid="travel-cost-preview">
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Calculated Travel Cost: </span>
                          <span className="font-semibold text-foreground">
                            ${travelCostPreview.cost.toLocaleString()}
                          </span>
                          {travelCostPreview.isCustom && (
                            <Badge variant="outline" className="ml-2 text-xs">Custom</Badge>
                          )}
                        </div>
                        {travel?.dispatchLocation?.toLowerCase().includes("brooklyn") && (travel?.distance || 0) > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {calculateTotalSqft(areas) >= 50000 ? "Tier A (No base)" : 
                             calculateTotalSqft(areas) >= 10000 ? "Tier B ($300 base)" : "Tier C ($150 base)"}
                          </Badge>
                        )}
                      </div>
                      {!travelCostPreview.isCustom && travel?.distance === 0 && (
                        <p className="text-xs text-amber-600 mt-1">Enter distance to calculate travel cost</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Building Features */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Building Features</h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="has-basement"
                    checked={hasBasement}
                    onCheckedChange={(checked) => setHasBasement(checked === true)}
                    data-testid="checkbox-has-basement"
                  />
                  <Label htmlFor="has-basement">Has Basement</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="has-attic"
                    checked={hasAttic}
                    onCheckedChange={(checked) => setHasAttic(checked === true)}
                    data-testid="checkbox-has-attic"
                  />
                  <Label htmlFor="has-attic">Has Attic</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Site Status */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Site Status</h2>
              <Select value={siteStatus} onValueChange={(v) => setSiteStatus(v as typeof siteStatus)}>
                <SelectTrigger data-testid="select-site-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="construction">Under Construction</SelectItem>
                  <SelectItem value="ask_client">I don't know (Ask Client)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* MEP Scope */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">MEP Scope</h2>
              <Select value={mepScope} onValueChange={(v) => setMepScope(v as typeof mepScope)}>
                <SelectTrigger data-testid="select-mep-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full MEP Modeling</SelectItem>
                  <SelectItem value="partial">Partial (Major systems only)</SelectItem>
                  <SelectItem value="none">Architecture Only (No MEP)</SelectItem>
                  <SelectItem value="ask_client">I don't know (Ask Client)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Acoustic Ceiling Tile Scanning */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Scanning Above & Below Acoustic Ceiling Tile?</h2>
              <Select value={actScanning} onValueChange={(v) => setActScanning(v as typeof actScanning)}>
                <SelectTrigger data-testid="select-act-scanning">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="ask_client">I don't know (Ask Client)</SelectItem>
                </SelectContent>
              </Select>
              {actScanning === "other" && (
                <Input
                  value={actScanningNotes}
                  onChange={(e) => setActScanningNotes(e.target.value)}
                  placeholder="Describe ACT scanning requirements..."
                  data-testid="input-act-notes"
                />
              )}
            </div>

            <Separator />

            {/* Scanning & Registration Only */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Scanning & Registration Only</h2>
              <Select value={scanningOnly} onValueChange={(v) => setScanningOnly(v as typeof scanningOnly)}>
                <SelectTrigger data-testid="select-scanning-only">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Full Scan-to-BIM)</SelectItem>
                  <SelectItem value="full_day">Full Day (up to 10 hrs on-site)</SelectItem>
                  <SelectItem value="half_day">Half Day (up to 4 hrs on-site)</SelectItem>
                  <SelectItem value="ask_client">I don't know (Ask Client)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Payment Terms */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Payment Terms</h2>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger data-testid="select-payment-terms">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partner (no hold on production)</SelectItem>
                  <SelectItem value="owner">Owner (hold if delay)</SelectItem>
                  <SelectItem value="net30">Net 30 (+5%)</SelectItem>
                  <SelectItem value="net60">Net 60 (+10%)</SelectItem>
                  <SelectItem value="net90">Net 90 (+15%)</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Risk Factors */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Risk Factors</h2>
              <div className="flex flex-wrap gap-2">
                {RISK_FACTORS.map((risk) => (
                  <Badge
                    key={risk.id}
                    variant={risks.includes(risk.id) ? "destructive" : "outline"}
                    className="cursor-pointer toggle-elevate"
                    onClick={() => toggleRisk(risk.id)}
                    data-testid={`badge-risk-${risk.id}`}
                  >
                    {risk.label} (+{(risk.premium * 100).toFixed(0)}%)
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Additional Services */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Additional Services</h2>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(SERVICE_RATES).map(([id, service]) => (
                  <div key={id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label>{service.label}</Label>
                      <p className="text-xs text-muted-foreground">
                        ${service.rate}/{service.unit}
                      </p>
                    </div>
                    <Input
                      type="number"
                      value={services[id] || ""}
                      onChange={(e) => updateService(id, parseInt(e.target.value) || 0)}
                      className="w-20"
                      min="0"
                      data-testid={`input-service-${id}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Project Notes
              </h2>
              <textarea
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                className="w-full min-h-[100px] p-3 border rounded-md bg-background resize-y"
                placeholder="Add any notes about this project..."
                data-testid="textarea-project-notes"
              />
            </div>

          </div>
        </ScrollArea>

        {/* Right Panel - Pricing Summary + RFI Assistant */}
        <div className="w-80 border-l bg-muted/20 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Pricing Summary</h2>
          </div>
          
          {/* RFI Assistant - Shows when "I don't know" is selected */}
          {hasRfiItems && (
            <div className="p-4 border-b">
              <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Clarification Needed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    You selected "I don't know" for {rfiFields.length} {rfiFields.length === 1 ? "item" : "items"}. 
                    Send this RFI email to the client:
                  </p>
                  <div className="space-y-1">
                    {rfiFields.map((field) => (
                      <Badge 
                        key={field.key} 
                        variant="outline" 
                        className="text-xs mr-1 mb-1 border-orange-300 dark:border-orange-700"
                      >
                        {field.label}
                      </Badge>
                    ))}
                  </div>
                  <Textarea
                    readOnly
                    value={rfiEmailBody}
                    className="bg-white dark:bg-background text-xs h-40 font-mono resize-none"
                    data-testid="textarea-rfi-email"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                      onClick={() => {
                        navigator.clipboard.writeText(rfiEmailBody);
                        toast({
                          title: "Copied to clipboard",
                          description: "RFI email text has been copied. Paste it into your email client.",
                        });
                      }}
                      data-testid="button-copy-rfi"
                    >
                      <Mail className="mr-1 h-3 w-3" />
                      Copy Email
                    </Button>
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
                      onClick={() => saveAndGenerateLinkMutation.mutate()}
                      disabled={saveAndGenerateLinkMutation.isPending || generateLinkMutation.isPending}
                      data-testid="button-generate-link"
                    >
                      {saveAndGenerateLinkMutation.isPending || generateLinkMutation.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Link className="mr-1 h-3 w-3" />
                      )}
                      Client Link
                    </Button>
                  </div>
                  {generatedLink && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-300 mb-1">Link generated and copied!</p>
                      <code className="text-xs text-green-800 dark:text-green-200 break-all">{generatedLink}</code>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Active for 7 days
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
                    Quote cannot be saved until all questions are answered
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {pricing.items
                .filter((item) => !item.isTotal)
                .map((item, index) => (
                  <div
                    key={index}
                    className={`flex justify-between text-sm ${
                      item.isDiscount ? "text-green-600" : ""
                    }`}
                  >
                    <span className="truncate flex-1 mr-2">{item.label}</span>
                    <span className="font-mono">
                      {item.isDiscount ? "-" : ""}${Math.abs(item.value).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t bg-background space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-mono">${pricing.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Internal Cost</span>
              <span className="font-mono text-muted-foreground">
                ${pricing.totalUpteamCost.toLocaleString()}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="font-mono">${pricing.totalClientPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Profit Margin</span>
              <span className={`font-mono ${isMarginBelowGate ? 'text-red-600' : 'text-green-600'}`}>
                ${pricing.profitMargin.toLocaleString()} ({marginPercent.toFixed(1)}%)
              </span>
            </div>
            {isMarginBelowGate && (
              <div className="text-xs text-red-600 mt-1" data-testid="text-margin-gate-error">
                Margin must be at least {(FY26_GOALS.MARGIN_FLOOR * 100).toFixed(0)}% to save quote
              </div>
            )}
            {/* Price Adjustment Control */}
            {(isMarginBelowGate || priceAdjustmentPercent > 0) && (
              <div className="mt-4 p-3 border rounded-md bg-muted/30 space-y-3" data-testid="price-adjustment-section">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">Price Adjustment</Label>
                  {requiredAdjustmentPercent > 0 && priceAdjustmentPercent === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPriceAdjustmentPercent(requiredAdjustmentPercent)}
                      data-testid="button-apply-min-adjustment"
                    >
                      Apply +{requiredAdjustmentPercent}% (minimum)
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={priceAdjustmentPercent || ""}
                    onChange={(e) => setPriceAdjustmentPercent(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-24"
                    data-testid="input-price-adjustment"
                  />
                  <span className="text-sm text-muted-foreground">% markup</span>
                  {priceAdjustmentPercent > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPriceAdjustmentPercent(0)}
                      data-testid="button-clear-adjustment"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {priceAdjustmentPercent > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Base price: ${basePricing.totalClientPrice.toLocaleString()} + ${(pricing.totalClientPrice - basePricing.totalClientPrice).toLocaleString()} adjustment
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Boundary Drawer Modal for Landscape Areas */}
      {boundaryDrawerArea && projectCoordinates && (
        <BoundaryDrawer
          open={!!boundaryDrawerAreaId}
          onOpenChange={(open) => {
            if (!open) setBoundaryDrawerAreaId(null);
          }}
          coordinates={projectCoordinates}
          address={lead?.projectAddress || ""}
          initialBoundary={boundaryDrawerArea.boundary}
          onSave={(boundary, acres) => updateAreaBoundary(boundaryDrawerAreaId!, boundary, acres)}
        />
      )}
    </div>
  );
}
