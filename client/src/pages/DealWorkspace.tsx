/**
 * Deal Workspace - Unified Lead + Quote Builder
 * 
 * Combines lead CRM fields with inline CPQ quote builder.
 * Lead Details shown first with consolidated form (no sub-tabs).
 * Supports quote versioning with history display.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  Clock,
  Cloud,
  DollarSign,
  ExternalLink,
  FileDown,
  FileText,
  Folder,
  FolderCheck,
  FolderOpen,
  FolderPlus,
  HardDrive,
  History,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import type { Lead, CpqQuote, DealAttribution, CpqCalculateRequest, CpqCalculateResponse, CpqApiArea } from "@shared/schema";
import { insertLeadSchema, TOUCHPOINT_OPTIONS, TIER_A_THRESHOLD, CPQ_BUILDING_TYPES, CPQ_API_DISCIPLINES, CPQ_API_LODS, CPQ_API_SCOPES, CPQ_API_RISKS, CPQ_API_DISPATCH_LOCATIONS, CPQ_PAYMENT_TERMS, CPQ_PAYMENT_TERMS_DISPLAY } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { useUpdateLead } from "@/hooks/use-leads";
import { useToast } from "@/hooks/use-toast";
import { LocationPreview } from "@/components/LocationPreview";
import { DealAIAssistant } from "@/components/DealAIAssistant";
import { formatDistanceToNow } from "date-fns";
import { Brain, Paperclip, Download, Eye, Link2, ClipboardList, Send, Copy, CheckCircle2, FileSignature, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LeadDocument } from "@shared/schema";
import { SendProposalDialog } from "@/components/SendProposalDialog";
import { PandaDocEmbed } from "@/components/PandaDocEmbed";
import { Slider } from "@/components/ui/slider";
import { 
  calculatePricing, 
  type Area as PricingArea, 
  type TravelConfig, 
  type PricingResult 
} from "@/features/cpq/pricing";
import { FY26_GOALS } from "@shared/businessGoals";
import { SITE_READINESS_QUESTIONS, type SiteReadinessQuestion } from "@shared/siteReadinessQuestions";

const BUYER_PERSONAS: Record<string, string> = {
  "BP-A": "Design Principal / Senior Architect",
  "BP-B": "Project Architect / Manager",
  "BP-C": "Owner Representative / Developer",
  "BP-D": "GC / Construction Manager",
};

// QuickBooks Estimate Status Badge Component
function QboEstimateBadge({ lead }: { lead: Lead }) {
  const { data: estimateData, isLoading } = useQuery<{ 
    url: string | null; 
    connected: boolean; 
    estimateId?: string; 
    estimateNumber?: string;
  }>({
    queryKey: ["/api/quickbooks/estimate-url", lead.id],
    enabled: !!lead.id,
    staleTime: 60000, // Cache for 1 minute
  });

  // Loading state
  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground" data-testid="badge-qbo-loading">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading
      </Badge>
    );
  }

  // QBO not connected
  if (estimateData && !estimateData.connected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 text-muted-foreground" data-testid="badge-qbo-not-connected">
            <DollarSign className="w-3 h-3" />
            QBO Offline
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>QuickBooks is not connected</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // No estimate synced yet
  if (!lead.qboEstimateId && !estimateData?.estimateId) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground" data-testid="badge-qbo-not-synced">
        <DollarSign className="w-3 h-3" />
        Not Synced
      </Badge>
    );
  }

  // Synced but no URL available (edge case)
  if (!estimateData?.url) {
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-600 dark:text-green-400" data-testid="badge-qbo-synced">
        <DollarSign className="w-3 h-3" />
        {lead.qboEstimateNumber || estimateData?.estimateNumber || "Synced"}
      </Badge>
    );
  }

  // Full synced state with clickable link
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={estimateData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex"
          data-testid="link-qbo-estimate"
        >
          <Badge variant="outline" className="gap-1 cursor-pointer border-green-500 text-green-600 dark:text-green-400">
            <DollarSign className="w-3 h-3" />
            {lead.qboEstimateNumber || estimateData.estimateNumber || "QBO"}
          </Badge>
        </a>
      </TooltipTrigger>
      <TooltipContent>
        <p>View estimate in QuickBooks Online</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Tier A Estimator Card Component - Uses controlled state for better UX
function TierAEstimatorCard({ 
  lead, 
  leadId, 
  updateMutation, 
  queryClient, 
  toast 
}: { 
  lead: Lead; 
  leadId: number; 
  updateMutation: ReturnType<typeof useUpdateLead>;
  queryClient: ReturnType<typeof useQueryClient>;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [cardUrl, setCardUrl] = useState((lead as any).estimatorCardUrl || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!cardUrl.trim()) return;
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        id: leadId,
        estimatorCardUrl: cardUrl.trim(),
      } as any);
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      toast({ title: "Estimator card linked", description: "Proposal generation is now available." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to save estimator card link", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const hasExistingCard = !!(lead as any).estimatorCardUrl;
  const hasUnsavedChanges = cardUrl !== ((lead as any).estimatorCardUrl || "");

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Tier A Requirements
          {hasExistingCard ? (
            <Badge variant="secondary" className="ml-auto gap-1 text-green-600">
              Complete
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-auto gap-1 text-amber-600">
              Recommended
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Large projects ({(lead.sqft || 0).toLocaleString()} sqft) - estimator card helps with proposal accuracy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormLabel>Estimator Card URL</FormLabel>
            <Input
              placeholder="Paste Google Drive link to estimator card..."
              value={cardUrl}
              onChange={(e) => setCardUrl(e.target.value)}
              data-testid="input-estimator-card-url"
            />
          </div>
          <Button
            variant={hasUnsavedChanges ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            disabled={!cardUrl.trim() || !hasUnsavedChanges || isSaving}
            data-testid="button-save-estimator-card"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
          {hasExistingCard && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={(lead as any).estimatorCardUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
        {!hasExistingCard && (
          <div className="flex items-center gap-2 p-2 text-sm rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400" data-testid="alert-estimator-recommended">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Adding an estimator card improves AI proposal accuracy for Tier A projects.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Marketing Influence Widget Component
function MarketingInfluenceWidget({ leadId }: { leadId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTouchpoint, setSelectedTouchpoint] = useState("");

  // Guard against invalid leadId (NaN or 0)
  const validLeadId = leadId && !isNaN(leadId);

  const { data: attributions, isLoading } = useQuery<DealAttribution[]>({
    queryKey: ["/api/leads", leadId, "attributions"],
    enabled: !!validLeadId,
  });

  const addMutation = useMutation({
    mutationFn: async (touchpoint: string) => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/attributions`, { touchpoint });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "attributions"] });
      setSelectedTouchpoint("");
      toast({ title: "Influence Added", description: "Marketing touchpoint recorded" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attrId: number) => {
      await apiRequest("DELETE", `/api/leads/${leadId}/attributions/${attrId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "attributions"] });
    },
  });

  const getTouchpointLabel = (value: string) => 
    TOUCHPOINT_OPTIONS.find(t => t.value === value)?.label || value;

  // Don't render widget for invalid leadId
  if (!validLeadId) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Marketing Influence
        </CardTitle>
        <CardDescription>Track touchpoints that influenced this deal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Select value={selectedTouchpoint} onValueChange={setSelectedTouchpoint}>
            <SelectTrigger className="flex-1" data-testid="select-touchpoint">
              <SelectValue placeholder="Select touchpoint" />
            </SelectTrigger>
            <SelectContent>
              {TOUCHPOINT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="icon" 
            variant="default" 
            disabled={!selectedTouchpoint || addMutation.isPending}
            onClick={() => selectedTouchpoint && addMutation.mutate(selectedTouchpoint)}
            data-testid="button-add-touchpoint"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : attributions && attributions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {attributions.map((attr) => (
              <Badge 
                key={attr.id} 
                variant="secondary" 
                className="gap-1 pr-1"
                data-testid={`badge-touchpoint-${attr.id}`}
              >
                {getTouchpointLabel(attr.touchpoint)}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => deleteMutation.mutate(attr.id)}
                  data-testid={`button-remove-touchpoint-${attr.id}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No touchpoints recorded yet</div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuoteBuilderArea {
  id: string;
  name: string;
  buildingType: string;
  squareFeet: string;
  disciplines: string[];
  disciplineLods: Record<string, { discipline: string; lod: string; scope: string }>;
}

interface QuoteBuilderTabProps {
  lead: Lead;
  leadId: number;
  queryClient: ReturnType<typeof useQueryClient>;
  toast: ReturnType<typeof useToast>["toast"];
  onQuoteSaved: () => void;
  existingQuotes?: CpqQuote[];
}

function QuoteBuilderTab({ lead, leadId, queryClient, toast, onQuoteSaved, existingQuotes }: QuoteBuilderTabProps) {
  const updateLeadMutation = useUpdateLead();
  
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
  
  const [dispatchLocation, setDispatchLocation] = useState<string>("brooklyn");
  const [distance, setDistance] = useState<string>("25");
  const [risks, setRisks] = useState<string[]>([]);
  const [risksAffirmed, setRisksAffirmed] = useState(false);
  const [matterport, setMatterport] = useState(false);
  const [actScan, setActScan] = useState(false);
  const [additionalElevations, setAdditionalElevations] = useState<string>("");
  const [servicesAffirmed, setServicesAffirmed] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<string>("standard");
  
  const [isSaving, setIsSaving] = useState(false);
  const [marginTarget, setMarginTarget] = useState<number>(0.45);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      // Pre-fill from lead data: estimatedSqft or default to 15000
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
  }, [lead]);

  useEffect(() => {
    if (existingQuotes && existingQuotes.length > 0) {
      const latestQuote = existingQuotes.find(q => q.isLatest) || existingQuotes[0];
      if (latestQuote?.travel) {
        const travelData = typeof latestQuote.travel === 'string' 
          ? JSON.parse(latestQuote.travel) 
          : latestQuote.travel;
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
      }
    }
  }, [existingQuotes]);

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

  // Helper to infer category from line item label
  const inferCategory = (label: string, isTotal?: boolean, isDiscount?: boolean): "discipline" | "risk" | "area" | "travel" | "service" | "subtotal" | "total" => {
    if (isTotal) return "total";
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("risk premium")) return "risk";
    if (lowerLabel.includes("travel") || lowerLabel.includes("mileage") || lowerLabel.includes("hotel")) return "travel";
    if (lowerLabel.includes("matterport") || lowerLabel.includes("cad") || lowerLabel.includes("elevation") || lowerLabel.includes("facade")) return "service";
    if (lowerLabel.includes("discount") || lowerLabel.includes("terms") || lowerLabel.includes("adjustment")) return "subtotal";
    return "discipline";
  };

  // Reactive pricing calculation - returns both result and error without mutating state
  const pricingMemo = useMemo((): { result: CpqCalculateResponse | null; error: string | null } => {
    // Don't calculate if no areas have valid sqft
    if (!areas.length || areas.every(a => !a.squareFeet || parseInt(a.squareFeet) <= 0)) {
      return { result: null, error: null };
    }

    try {
      // Convert areas to pricing engine format
      const pricingAreas: PricingArea[] = areas.map(a => ({
        id: a.id,
        name: a.name,
        buildingType: a.buildingType,
        squareFeet: a.squareFeet,
        lod: "300", // Default LOD
        disciplines: a.disciplines,
        disciplineLods: a.disciplineLods,
        scope: "full",
      }));

      // Build travel config
      const travel: TravelConfig | null = dispatchLocation ? {
        dispatchLocation,
        distance: distance ? parseFloat(distance) : 0,
      } : null;

      // Build services object
      const servicesConfig: Record<string, number> = {};
      if (matterport) servicesConfig.matterport = 1;
      if (actScan) servicesConfig.actScan = 1;
      if (additionalElevations) servicesConfig.additionalElevations = parseInt(additionalElevations);

      // Calculate pricing using client-side engine
      const result: PricingResult = calculatePricing(
        pricingAreas,
        servicesConfig,
        travel,
        risks,
        paymentTerms,
        marginTarget
      );

      // Calculate margin percentage
      const grossMargin = result.totalClientPrice - result.totalUpteamCost;
      const grossMarginPercent = result.totalClientPrice > 0 
        ? (grossMargin / result.totalClientPrice) * 100 
        : 0;

      // Determine integrity status based on margin using FY26_GOALS constants
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

      // Calculate payment premium from line items
      let paymentPremiumTotal = 0;
      result.items.forEach(item => {
        const lowerLabel = item.label.toLowerCase();
        if (lowerLabel.includes("terms") || (lowerLabel.includes("discount") && !lowerLabel.includes("partner"))) {
          paymentPremiumTotal += item.value;
        }
      });

      // Convert PricingResult to CpqCalculateResponse format
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
  }, [areas, dispatchLocation, distance, matterport, actScan, additionalElevations, risks, paymentTerms, marginTarget]);
  
  // Extract result for use in component
  const pricingResult = pricingMemo.result;
  
  // Sync error state from memo (safe to call setState in effect)
  useEffect(() => {
    if (pricingMemo.error !== pricingError) {
      setPricingError(pricingMemo.error);
    }
  }, [pricingMemo.error, pricingError]);
  
  // Show toast when error occurs
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
      const quoteData = {
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

      const response = await apiRequest("POST", `/api/leads/${leadId}/cpq-quotes`, quoteData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save quote");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "cpq-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      toast({ title: "Quote Saved", description: "Quote has been saved successfully" });
      onQuoteSaved();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to save quote", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isLandscape = (buildingType: string) => buildingType === "14" || buildingType === "15";

  // === QUOTE CONFIDENCE SCORING SYSTEM ===
  const CONFIDENCE_WEIGHTS = {
    buildingType: 0.15,     // 15%
    sqft: 0.15,             // 15%
    disciplines: 0.20,      // 20%
    mepScope: 0.15,         // 15% (having MEPF discipline with scope details)
    dispatchLocation: 0.10, // 10%
    siteStatus: 0.10,       // 10% (risks selection indicates site knowledge)
    actScanning: 0.10,      // 10% (actScan decision made)
    distance: 0.05,         // 5%
  };

  const calculateConfidenceScore = useMemo(() => {
    let score = 0;
    
    // Check each area for completeness
    const primaryArea = areas[0];
    if (!primaryArea) return 0;
    
    // Building Type (15%) - any valid selection (truthy value)
    if (primaryArea.buildingType && primaryArea.buildingType.length > 0) {
      score += CONFIDENCE_WEIGHTS.buildingType * 100;
    }
    
    // Square Feet (15%) - has a valid value
    const sqftValue = parseInt(primaryArea.squareFeet);
    if (sqftValue && sqftValue > 0) {
      score += CONFIDENCE_WEIGHTS.sqft * 100;
    }
    
    // Disciplines (20%) - at least one selected
    if (primaryArea.disciplines.length > 0) {
      score += CONFIDENCE_WEIGHTS.disciplines * 100;
    }
    
    // MEP Scope (15%) - has MEPF discipline with non-default LOD (not just 300/full defaults)
    const hasMepf = primaryArea.disciplines.includes("mepf");
    const mepfConfig = primaryArea.disciplineLods["mepf"];
    const mepfHasCustomConfig = hasMepf && mepfConfig && (
      mepfConfig.lod !== "300" || mepfConfig.scope !== "full"
    );
    if (hasMepf && mepfHasCustomConfig) {
      score += CONFIDENCE_WEIGHTS.mepScope * 100;
    } else if (hasMepf) {
      // Partial credit for having MEPF selected (7.5%)
      score += (CONFIDENCE_WEIGHTS.mepScope * 100) / 2;
    }
    
    // Dispatch Location (10%) - any selection
    if (dispatchLocation && dispatchLocation.length > 0) {
      score += CONFIDENCE_WEIGHTS.dispatchLocation * 100;
    }
    
    // Site Status / Risks (10%) - requires explicit decision (either risks selected OR "no risks" affirmed)
    if (risks.length > 0 || risksAffirmed) {
      score += CONFIDENCE_WEIGHTS.siteStatus * 100;
    }
    
    // ActScanning (10%) - requires explicit decision (services configured OR "no services" affirmed)
    const hasServices = actScan || matterport || (additionalElevations && parseInt(additionalElevations) > 0);
    if (hasServices || servicesAffirmed) {
      score += CONFIDENCE_WEIGHTS.actScanning * 100;
    }
    
    // Distance (5%) - has a valid distance value
    const distValue = parseFloat(distance);
    if (distValue && distValue > 0) {
      score += CONFIDENCE_WEIGHTS.distance * 100;
    }
    
    return Math.round(score);
  }, [areas, dispatchLocation, risks, risksAffirmed, actScan, matterport, additionalElevations, servicesAffirmed, distance]);

  // Field completion status for "hungry field" styling
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

  // Helper to get "hungry field" styling classes
  const getHungryFieldClass = (fieldName: keyof typeof fieldCompletionStatus) => {
    const isComplete = fieldCompletionStatus[fieldName];
    if (isComplete) {
      return "transition-all duration-300"; // Neutral, no glow
    }
    return "ring-2 ring-amber-400/40 bg-amber-500/5 transition-all duration-300"; // Hungry amber glow
  };

  // Confidence badge component
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
    const variant = status === "pass" ? "default" : status === "warning" ? "secondary" : "destructive";
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
                            {disc.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {area.disciplines.length > 0 && (
                      <div className="space-y-2">
                        {area.disciplines.map((disc) => (
                          <div key={disc} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                            <span className="text-xs font-medium w-16">{disc.toUpperCase()}</span>
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
                    <Select value={dispatchLocation} onValueChange={setDispatchLocation}>
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
                {/* Margin Target Slider - Always Visible */}
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

const formSchema = insertLeadSchema.extend({
  clientName: z.string().min(1, "Client name is required"),
  projectAddress: z.string().min(1, "Project address is required"),
  dealStage: z.string().min(1, "Deal stage is required"),
  billingContactName: z.string().min(1, "Billing contact name is required"),
  billingContactEmail: z.string().email("Valid billing email is required"),
  billingContactPhone: z.string().optional().nullable(),
  projectStatus: z.object({
    proposalPhase: z.boolean().optional(),
    inHand: z.boolean().optional(),
    urgent: z.boolean().optional(),
    other: z.boolean().optional(),
    otherText: z.string().optional(),
  }).optional(),
  proofLinks: z.string().optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

export default function DealWorkspace() {
  const params = useParams<{ id: string }>();
  // Use parseInt to safely extract numeric ID, ignoring any query string that might be attached
  const leadId = params.id ? parseInt(params.id.split("?")[0], 10) : NaN;
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const validTabs = ["lead", "quote", "history", "ai", "documents"];
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get("tab");
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return "lead";
  });
  const { toast } = useToast();
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<CpqQuote | null>(null);
  
  const handleTabChange = (value: string) => {
    const validTabs = ["lead", "quote", "history", "ai", "documents"];
    setActiveTab(validTabs.includes(value) ? value : "lead");
  };
  const queryClient = useQueryClient();
  const updateMutation = useUpdateLead();

  const { data: lead, isLoading: leadLoading } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    enabled: !isNaN(leadId) && leadId > 0,
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery<CpqQuote[]>({
    queryKey: ["/api/leads", leadId, "cpq-quotes"],
    enabled: !isNaN(leadId) && leadId > 0,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<LeadDocument[]>({
    queryKey: ["/api/leads", leadId, "documents"],
    enabled: !isNaN(leadId) && leadId > 0,
  });

  const { data: proposalEmails } = useQuery<{
    id: number;
    leadId: number;
    quoteId: number | null;
    token: string;
    recipientEmail: string;
    recipientName: string | null;
    subject: string | null;
    sentAt: string;
    firstOpenedAt: string | null;
    lastOpenedAt: string | null;
    openCount: number;
    clickCount: number;
  }[]>({
    queryKey: ["/api/leads", leadId, "proposal-emails"],
    enabled: !isNaN(leadId) && leadId > 0,
  });

  const latestQuote = quotes?.find((q) => q.isLatest);


  const deleteLeadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/trash"] });
      toast({ 
        title: "Deal Moved to Trash", 
        description: "The deal has been moved to trash and will be permanently deleted after 60 days." 
      });
      setLocation("/sales");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete deal", 
        variant: "destructive" 
      });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/leads/${leadId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload document");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "documents"] });
      toast({ title: "Document Uploaded", description: "File has been uploaded successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "documents"] });
      toast({ title: "Document Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Site Readiness Magic Link state
  const [siteReadinessAnswers, setSiteReadinessAnswers] = useState<Record<string, any>>({});
  const [questionsToSend, setQuestionsToSend] = useState<string[]>([]);
  const [generatedMagicLink, setGeneratedMagicLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Initialize site readiness answers from lead data
  // CEO sees their internal answers only - client answers are shown separately if completed
  // Reset state when lead changes to prevent cross-lead data contamination
  useEffect(() => {
    if (lead?.siteReadiness) {
      const structured = lead.siteReadiness as { internal?: Record<string, any>; client?: Record<string, any> };
      // Only load internal (CEO) answers for editing - don't merge with client to avoid overwriting
      setSiteReadinessAnswers(structured.internal || {});
    } else {
      // Reset to empty when lead has no site readiness data
      setSiteReadinessAnswers({});
    }
    if (lead?.siteReadinessQuestionsSent) {
      setQuestionsToSend(lead.siteReadinessQuestionsSent as string[]);
    } else {
      // Reset to empty when no questions were sent
      setQuestionsToSend([]);
    }
    // Reset magic link state when lead changes
    setGeneratedMagicLink(null);
    setLinkCopied(false);
  }, [leadId, lead?.siteReadiness, lead?.siteReadinessQuestionsSent]);

  // Get client-submitted answers for display (read-only)
  const clientSubmittedAnswers = useMemo(() => {
    if (!lead?.siteReadiness) return {};
    const structured = lead.siteReadiness as { internal?: Record<string, any>; client?: Record<string, any> };
    return structured.client || {};
  }, [lead?.siteReadiness]);

  // Save site readiness answers to persist CEO-entered data (stores in internal segment)
  const saveSiteReadinessMutation = useMutation({
    mutationFn: async () => {
      // Get existing structured data and update internal segment
      const existing = (lead?.siteReadiness as { internal?: Record<string, any>; client?: Record<string, any> }) || {};
      const structuredAnswers = {
        internal: { ...(existing.internal || {}), ...siteReadinessAnswers },
        client: existing.client || {},
      };
      return updateMutation.mutateAsync({
        id: leadId,
        siteReadiness: structuredAnswers,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      toast({ title: "Answers Saved", description: "Site readiness answers have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const generateMagicLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/leads/${leadId}/site-readiness-link`, {
        questionIds: questionsToSend,
        siteReadiness: siteReadinessAnswers,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate link");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedMagicLink(data.magicLink);
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      toast({ 
        title: "Magic Link Generated", 
        description: `Link valid for 7 days. ${data.questionsCount} questions sent to client.`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleQuestionToSend = (questionId: string, checked: boolean) => {
    setQuestionsToSend(prev => 
      checked ? [...prev, questionId] : prev.filter(id => id !== questionId)
    );
  };

  const updateSiteReadinessAnswer = (questionId: string, value: any) => {
    setSiteReadinessAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const copyMagicLink = async () => {
    if (generatedMagicLink) {
      await navigator.clipboard.writeText(generatedMagicLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const pushToQboMutation = useMutation({
    mutationFn: async (forceResync: boolean = false) => {
      if (!latestQuote?.id) throw new Error("No quote to push");
      const response = await apiRequest("POST", "/api/quickbooks/estimate", {
        quoteId: latestQuote.id,
        contactEmail: lead?.contactEmail || lead?.billingContactEmail,
        forceResync,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create estimate");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/quickbooks/estimate-url", leadId] });
      toast({ 
        title: "Estimate Created", 
        description: `QuickBooks estimate ${data.estimateNumber} created successfully.`
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to push to QuickBooks", 
        variant: "destructive" 
      });
    },
  });

  const sendProposalMutation = useMutation({
    mutationFn: async ({ recipientEmail, customSubject }: { recipientEmail: string; customSubject: string }) => {
      if (!leadId) throw new Error("No lead ID");
      const response = await apiRequest("POST", "/api/google/gmail/send-proposal", {
        leadId,
        recipientEmail,
        customSubject,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send proposal email");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setShowProposalDialog(false);
      toast({ 
        title: "Proposal Sent", 
        description: `Proposal email sent to ${data.sentTo}` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send proposal email", 
        variant: "destructive" 
      });
    },
  });

  const sendToPandadocMutation = useMutation({
    mutationFn: async () => {
      if (!latestQuote?.id) throw new Error("No quote to send");
      const response = await apiRequest("POST", `/api/cpq-quotes/${latestQuote.id}/send-pandadoc`, {
        message: "Please review and sign the attached proposal.",
        subject: `Proposal: ${lead?.projectName || latestQuote.projectName}`,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to send via PandaDoc");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cpq-quotes", { leadId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      toast({ 
        title: "Proposal Sent", 
        description: "The proposal has been sent via PandaDoc for signature."
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send via PandaDoc", 
        variant: "destructive" 
      });
    },
  });

  // Check QuickBooks connection status
  const { data: qboStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/quickbooks/estimate-url", leadId],
    enabled: !!leadId,
    staleTime: 60000,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      projectName: "",
      projectAddress: "",
      value: 0,
      dealStage: "Leads",
      probability: 0,
      notes: "",
      quoteNumber: "",
      timeline: "",
      paymentTerms: "standard",
      leadSource: "",
      leadPriority: 3,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      billingContactName: "",
      billingContactEmail: "",
      billingContactPhone: "",
      projectStatus: {
        proposalPhase: false,
        inHand: false,
        urgent: false,
        other: false,
        otherText: "",
      },
      proofLinks: "",
    },
  });

  useEffect(() => {
    if (lead) {
      const projectStatus = (lead as any).projectStatus || {};
      form.reset({
        clientName: lead.clientName,
        projectName: lead.projectName || "",
        projectAddress: lead.projectAddress || "",
        value: Number(lead.value),
        dealStage: lead.dealStage,
        probability: lead.probability || 0,
        notes: lead.notes || "",
        quoteNumber: lead.quoteNumber || "",
        timeline: lead.timeline || "",
        paymentTerms: lead.paymentTerms || "",
        leadSource: lead.leadSource || "",
        leadPriority: lead.leadPriority || 3,
        contactName: lead.contactName || "",
        contactEmail: lead.contactEmail || "",
        contactPhone: lead.contactPhone || "",
        billingContactName: (lead as any).billingContactName || "",
        billingContactEmail: (lead as any).billingContactEmail || "",
        billingContactPhone: (lead as any).billingContactPhone || "",
        buyerPersona: lead.buyerPersona || "",
        projectStatus: {
          proposalPhase: projectStatus.proposalPhase || false,
          inHand: projectStatus.inHand || false,
          urgent: projectStatus.urgent || false,
          other: projectStatus.other || false,
          otherText: projectStatus.otherText || "",
        },
        proofLinks: (lead as any).proofLinks || "",
      });
    }
  }, [lead, form]);

  async function onSubmit(data: FormData) {
    try {
      await updateMutation.mutateAsync({ id: leadId, ...data });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Success", description: "Deal updated successfully" });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Something went wrong", 
        variant: "destructive" 
      });
    }
  }

  if (leadLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex items-center gap-4 p-4 border-b">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-8 flex-1" />
        </header>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Lead Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested deal could not be found.</p>
        <Button onClick={() => setLocation("/sales")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pipeline
        </Button>
      </div>
    );
  }

  const isPending = updateMutation.isPending;

  // Helper function to get files status badge info
  const getFilesStatus = () => {
    const status = (lead as any).driveFolderStatus;
    if (!lead.driveFolderId && !lead.driveFolderUrl) {
      return { color: "bg-muted text-muted-foreground", label: "No Folder", icon: Folder };
    }
    if (status === "files_uploaded" || status === "active") {
      return { color: "bg-green-500/20 text-green-600 border-green-500/30", label: "Files Uploaded", icon: FolderCheck };
    }
    // Default: folder created but empty
    return { color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30", label: "Folder Empty", icon: FolderOpen };
  };
  
  const filesStatus = getFilesStatus();

  // Helper function to get storage links based on storage mode
  const getStorageLinks = () => {
    const storageMode = (lead as any).storageMode || "legacy_drive";
    const gcsBucket = (lead as any).gcsBucket;
    const gcsPath = (lead as any).gcsPath;
    const driveFolderUrl = lead.driveFolderUrl;
    
    const gcsConsoleUrl = gcsBucket && gcsPath 
      ? `https://console.cloud.google.com/storage/browser/${gcsBucket}/${gcsPath}`
      : null;
    
    switch (storageMode) {
      case "hybrid_gcs":
        return {
          mode: "hybrid",
          primary: gcsConsoleUrl ? { url: gcsConsoleUrl, label: "Scan Data (GCS)", icon: Cloud } : null,
          secondary: driveFolderUrl ? { url: driveFolderUrl, label: "Docs Folder (Drive)", icon: HardDrive } : null,
        };
      case "gcs_native":
        return {
          mode: "gcs",
          primary: gcsConsoleUrl ? { url: gcsConsoleUrl, label: "Project Files (GCS)", icon: Cloud } : null,
          secondary: null,
        };
      default: // legacy_drive
        return {
          mode: "drive",
          primary: driveFolderUrl 
            ? { url: driveFolderUrl, label: "Drive Folder", icon: HardDrive }
            : { url: `https://drive.google.com/drive/search?q=${encodeURIComponent(lead.projectCode || "")}`, label: "Search Drive", icon: HardDrive },
          secondary: null,
        };
    }
  };

  const storageLinks = lead.projectCode ? getStorageLinks() : null;

  // Google Static Maps URL for header thumbnail (16:9 aspect ratio)
  const getStaticMapUrl = (address: string) => {
    if (!address || address.length < 5) return null;
    return `/api/location/static-map?address=${encodeURIComponent(address)}&size=320x180&zoom=18&maptype=satellite`;
  };

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="page-deal-workspace">
      <header className="flex items-center justify-between gap-4 p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/sales")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          {/* Google Maps Satellite Thumbnail - 16:9 aspect ratio */}
          {lead.projectAddress && lead.projectAddress.length >= 5 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.projectAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <div className="w-32 h-[72px] rounded-md overflow-hidden border bg-muted">
                    <img
                      src={getStaticMapUrl(lead.projectAddress) || ""}
                      alt="Project location"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85M19 21V10.85M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" /></svg></div>';
                      }}
                      data-testid="img-location-thumbnail"
                    />
                  </div>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>View on Google Maps</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="w-32 h-[72px] rounded-md border bg-muted flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{lead.clientName}</h1>
              {lead.projectCode && (
                <Badge variant="outline" className="font-mono text-xs">
                  {lead.projectCode}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{lead.projectName || lead.projectAddress}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Evidence Vault Button - Purple */}
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-600"
            onClick={() => {
              // Navigate to marketing page with this lead's persona context
              setLocation("/marketing");
            }}
            data-testid="button-evidence-vault"
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Evidence Vault
          </Button>
          
          {/* Generate Estimate in QuickBooks Button */}
          {latestQuote && qboStatus?.connected && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
              onClick={() => pushToQboMutation.mutate(!!lead.qboEstimateId)}
              disabled={pushToQboMutation.isPending}
              data-testid="button-generate-qbo-estimate"
            >
              {pushToQboMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4 mr-2" />
              )}
              {lead.qboEstimateId ? "Sync to QuickBooks" : "Generate Estimate in QuickBooks"}
            </Button>
          )}
          
          {/* Communicate Button - Green */}
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600"
            onClick={() => {
              // Open communications tab or drawer
              window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${lead.billingContactEmail || lead.contactEmail || ""}`, "_blank");
            }}
            data-testid="button-communicate"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Communicate
          </Button>
          
          {/* Files Status Badge - Always show to indicate folder state */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Badge 
                  variant="outline" 
                  className={`gap-1 ${filesStatus.color}`}
                  data-testid="badge-files-status"
                >
                  {filesStatus.label === "No Folder" && <Folder className="w-3 h-3" />}
                  {filesStatus.label === "Files Uploaded" && <FolderCheck className="w-3 h-3" />}
                  {filesStatus.label === "Folder Empty" && <FolderOpen className="w-3 h-3" />}
                  {filesStatus.label}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Google Drive folder status</p>
            </TooltipContent>
          </Tooltip>
          
          {lead.projectCode && storageLinks ? (
            storageLinks.mode === "hybrid" && storageLinks.secondary ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Badge variant="secondary" className="gap-1 cursor-pointer" data-testid="dropdown-storage-links">
                    <Cloud className="w-3 h-3" />
                    Open Folder
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {storageLinks.primary && (
                    <DropdownMenuItem asChild>
                      <a
                        href={storageLinks.primary.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                        data-testid="link-gcs-folder"
                      >
                        <Cloud className="w-4 h-4" />
                        {storageLinks.primary.label}
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <a
                      href={storageLinks.secondary.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      data-testid="link-drive-folder"
                    >
                      <HardDrive className="w-4 h-4" />
                      {storageLinks.secondary.label}
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={storageLinks.primary?.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                    data-testid="link-drive-folder"
                  >
                    <Badge variant="secondary" className="gap-1 cursor-pointer">
                      {storageLinks.mode === "gcs" ? <Cloud className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                      {storageLinks.primary?.label || "Open Folder"}
                    </Badge>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open project folder for {lead.projectCode}</p>
                </TooltipContent>
              </Tooltip>
            )
          ) : null}
          <Badge variant="outline" className="text-xs">
            {lead.dealStage}
          </Badge>
          {/* Tier A Badge - Auto-flagged for large projects */}
          {(lead.sqft && lead.sqft >= TIER_A_THRESHOLD) || lead.abmTier === "Tier A" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="gap-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" data-testid="badge-tier-a">
                  <Star className="w-3 h-3 fill-current" />
                  Tier A
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Large project ({(lead.sqft || 0).toLocaleString()} sqft) - estimator card recommended for better proposal accuracy</p>
              </TooltipContent>
            </Tooltip>
          ) : null}
          {lead.value && (
            <Badge variant="secondary">
              ${Number(lead.value).toLocaleString()}
            </Badge>
          )}
          {/* QuickBooks Sync Status */}
          <QboEstimateBadge lead={lead} />
          
          {/* Proposal Buttons - Preview and Send */}
          {latestQuote && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`/api/google/gmail/preview-proposal/${leadId}`, '_blank')}
                data-testid="button-preview-proposal"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Proposal
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowProposalDialog(true)}
                data-testid="button-send-proposal"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Proposal
              </Button>
              {proposalEmails && proposalEmails.length > 0 && (
                <div className="flex items-center gap-2">
                  {proposalEmails[0].openCount > 0 ? (
                    <Badge variant="default" className="bg-green-600 text-white text-xs" data-testid="badge-proposal-opened">
                      <Eye className="w-3 h-3 mr-1" />
                      Viewed {proposalEmails[0].openCount}x
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs" data-testid="badge-proposal-sent">
                      <Clock className="w-3 h-3 mr-1" />
                      Sent
                    </Badge>
                  )}
                </div>
              )}
            </>
          )}

          {/* Delete Button - Standalone with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                data-testid="button-delete-deal"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{lead.clientName}" will be moved to trash. You can restore it within 60 days. After that, it will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteLeadMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deleteLeadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {/* More Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-more-actions">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Push to QuickBooks - show if there's a quote and QBO is connected */}
              {latestQuote && qboStatus?.connected && (
                <DropdownMenuItem 
                  onClick={() => pushToQboMutation.mutate(!!lead.qboEstimateId)}
                  disabled={pushToQboMutation.isPending}
                  data-testid="menu-push-to-qbo"
                >
                  {pushToQboMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  {lead.qboEstimateId ? "Re-sync to QuickBooks" : "Push to QuickBooks"}
                </DropdownMenuItem>
              )}
              {latestQuote && !qboStatus?.connected && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  <DollarSign className="w-4 h-4 mr-2" />
                  QuickBooks not connected
                </DropdownMenuItem>
              )}
              {/* Download estimate PDF - show if estimate exists */}
              {lead.qboEstimateId && qboStatus?.connected && (
                <DropdownMenuItem 
                  onClick={() => {
                    window.open(`/api/quickbooks/estimate/${lead.qboEstimateId}/pdf`, '_blank');
                  }}
                  data-testid="menu-download-pdf"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download Estimate PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {/* Send for Signature via PandaDoc */}
              {latestQuote && lead.contactEmail && lead.contactName && (
                <DropdownMenuItem 
                  onClick={() => sendToPandadocMutation.mutate()}
                  disabled={sendToPandadocMutation.isPending}
                  data-testid="menu-send-pandadoc"
                >
                  {sendToPandadocMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send for Signature
                </DropdownMenuItem>
              )}
              {latestQuote && (!lead.contactEmail || !lead.contactName) && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  <Send className="w-4 h-4 mr-2" />
                  Add contact info first
                </DropdownMenuItem>
              )}
              {!latestQuote && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  <Send className="w-4 h-4 mr-2" />
                  Create quote first
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4 bg-card/30">
          <TabsList className="h-11 bg-transparent">
            <TabsTrigger value="lead" className="gap-2" data-testid="tab-lead">
              <FileText className="w-4 h-4" />
              Lead Details
            </TabsTrigger>
            <TabsTrigger value="quote" className="gap-2" data-testid="tab-quote">
              <Calculator className="w-4 h-4" />
              Quote Builder
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2" data-testid="tab-history">
              <History className="w-4 h-4" />
              Version History
              {quotes && quotes.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {quotes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2" data-testid="tab-ai-assistant">
              <Brain className="w-4 h-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2" data-testid="tab-documents">
              <Paperclip className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="proposal" className="gap-2" data-testid="tab-proposal">
              <FileSignature className="w-4 h-4" />
              Proposal
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Lead Details Tab - Consolidated form with bordered sections */}
        <TabsContent value="lead" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
                {/* Project Information Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Project Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client / Company *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ashley McGraw Architects" {...field} data-testid="input-client-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input placeholder="4900 Tank Trail, Roofs" {...field} value={field.value || ""} data-testid="input-project-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Industrial Park Dr, City, ST 12345" {...field} value={field.value || ""} data-testid="input-project-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <LocationPreview 
                      address={form.watch("projectAddress") || ""} 
                      companyName={form.watch("clientName")}
                      onAddressUpdate={(formattedAddress) => {
                        form.setValue("projectAddress", formattedAddress);
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Deal Status Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Deal Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deal Value ($)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-value" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="probability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Probability of Closing</FormLabel>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">0%</span>
                                <span className="text-lg font-semibold" data-testid="text-probability-value">{field.value || 0}%</span>
                                <span className="text-sm text-muted-foreground">100%</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={[field.value || 0]}
                                  onValueChange={(values) => field.onChange(values[0])}
                                  data-testid="slider-probability"
                                  className="w-full"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="dealStage"
                      render={({ field }) => {
                        const isClosingWon = field.value === "Closed Won" && lead.dealStage !== "Closed Won";
                        const hasSource = form.watch("leadSource") && form.watch("leadSource") !== "";
                        const showAttributionWarning = isClosingWon && !hasSource;
                        
                        return (
                          <FormItem>
                            <FormLabel>Deal Stage *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-deal-stage">
                                  <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Leads">Leads</SelectItem>
                                <SelectItem value="Contacted">Contacted</SelectItem>
                                <SelectItem value="Proposal">Proposal</SelectItem>
                                <SelectItem value="Negotiation">Negotiation</SelectItem>
                                <SelectItem value="On Hold">On Hold</SelectItem>
                                <SelectItem value="Closed Won">Closed Won</SelectItem>
                                <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                              </SelectContent>
                            </Select>
                            {showAttributionWarning && (
                              <div className="flex items-center gap-2 p-2 mt-2 text-sm rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400" data-testid="alert-attribution-required">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>Lead source is required to close this deal. Please set a source below.</span>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="leadSource"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lead Source</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-lead-source">
                                  <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Amplifi">Amplifi</SelectItem>
                                <SelectItem value="Customer Referral">Customer Referral</SelectItem>
                                <SelectItem value="Website">Website</SelectItem>
                                <SelectItem value="Social Media">Social Media</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="leadPriority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value || 3)}>
                              <FormControl>
                                <SelectTrigger data-testid="select-lead-priority">
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="5">5 - Highest</SelectItem>
                                <SelectItem value="4">4 - High</SelectItem>
                                <SelectItem value="3">3 - Medium</SelectItem>
                                <SelectItem value="2">2 - Low</SelectItem>
                                <SelectItem value="1">1 - Lowest</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                  </CardContent>
                </Card>

                {/* Project Status Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      Project Status
                    </CardTitle>
                    <CardDescription>Track the current phase and urgency of this project</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="projectStatus.proposalPhase"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-proposal-phase"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer">Proposal Phase</FormLabel>
                              <FormDescription className="text-xs">Currently preparing proposal</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="projectStatus.inHand"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-in-hand"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer">In Hand</FormLabel>
                              <FormDescription className="text-xs">Project is confirmed</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="projectStatus.urgent"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-urgent"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer">Urgent</FormLabel>
                              <FormDescription className="text-xs">High priority timeline</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="projectStatus.other"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-other"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer">Other</FormLabel>
                              <FormDescription className="text-xs">Custom status</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Show text input if "Other" is checked */}
                    {form.watch("projectStatus.other") && (
                      <FormField
                        control={form.control}
                        name="projectStatus.otherText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Other Status Details</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Describe the status..."
                                {...field}
                                value={field.value || ""}
                                data-testid="input-other-status"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Tier A Estimator Card Section - Only shown for Tier A deals */}
                {((lead.sqft && lead.sqft >= TIER_A_THRESHOLD) || lead.abmTier === "Tier A") && (
                  <TierAEstimatorCard 
                    lead={lead} 
                    leadId={leadId} 
                    updateMutation={updateMutation}
                    queryClient={queryClient}
                    toast={toast}
                  />
                )}

                {/* Contact Information Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Andrew Schuster" {...field} value={field.value || ""} data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@company.com" {...field} value={field.value || ""} data-testid="input-contact-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="(315) 484-8826" {...field} value={field.value || ""} data-testid="input-contact-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Billing Contact Section */}
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Billing Contact <span className="text-destructive">*</span>
                      </h4>
                      <FormField
                        control={form.control}
                        name="billingContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Contact Name <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Accounts Payable / CFO Name" {...field} value={field.value || ""} data-testid="input-billing-contact-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <FormField
                          control={form.control}
                          name="billingContactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Billing Email <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="billing@company.com" {...field} value={field.value || ""} data-testid="input-billing-contact-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billingContactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Billing Phone</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="(555) 123-4567" {...field} value={field.value || ""} data-testid="input-billing-contact-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="paymentTerms"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Payment Terms</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-payment-terms">
                                  <SelectValue placeholder="Select terms" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CPQ_PAYMENT_TERMS.filter(term => term !== "other").map((term) => (
                                  <SelectItem key={term} value={term}>
                                    {CPQ_PAYMENT_TERMS_DISPLAY[term]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="buyerPersona"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buyer Persona</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-buyer-persona">
                                <SelectValue placeholder="Select persona" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(BUYER_PERSONAS).map(([id, label]) => (
                                <SelectItem key={id} value={id}>{id}: {label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Tailors communication style and templates
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Site Readiness Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Site Readiness Questionnaire
                      </CardTitle>
                      {lead?.siteReadinessStatus === "completed" && (
                        <Badge variant="default" className="bg-green-600" data-testid="badge-site-readiness-completed">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {lead?.siteReadinessStatus === "sent" && (
                        <Badge variant="secondary" data-testid="badge-site-readiness-sent">
                          <Send className="w-3 h-3 mr-1" />
                          Sent to Client
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      Fill in what you know. Check questions to send to the client via magic link.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {SITE_READINESS_QUESTIONS.map((q) => {
                      const isSelectedToSend = questionsToSend.includes(q.id);
                      const clientAnswer = clientSubmittedAnswers[q.id];
                      const hasClientAnswer = clientAnswer !== undefined && clientAnswer !== "";
                      
                      return (
                        <div key={q.id} className="flex items-start gap-3 py-3 border-b last:border-b-0">
                          <Checkbox
                            id={`send-${q.id}`}
                            checked={isSelectedToSend}
                            onCheckedChange={(checked) => toggleQuestionToSend(q.id, checked === true)}
                            data-testid={`checkbox-send-${q.id}`}
                          />
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={`send-${q.id}`} className="text-sm font-medium cursor-pointer">
                              {q.question}
                            </Label>
                            {q.pricingImpact && (
                              <p className="text-xs text-muted-foreground">{q.pricingImpact}</p>
                            )}
                            {hasClientAnswer && (
                              <div className="p-2 rounded bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Client answered:</p>
                                <p className="text-sm text-green-800 dark:text-green-300">
                                  {typeof clientAnswer === "boolean" ? (clientAnswer ? "Yes" : "No") : String(clientAnswer)}
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">Your answer (internal):</p>
                            {q.type === "boolean" && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`answer-${q.id}`}
                                  checked={siteReadinessAnswers[q.id] === true}
                                  onCheckedChange={(checked) => updateSiteReadinessAnswer(q.id, checked === true)}
                                  data-testid={`checkbox-answer-${q.id}`}
                                />
                                <Label htmlFor={`answer-${q.id}`} className="text-sm cursor-pointer">Yes</Label>
                              </div>
                            )}
                            {q.type === "select" && (
                              <Select
                                value={siteReadinessAnswers[q.id] || ""}
                                onValueChange={(value) => updateSiteReadinessAnswer(q.id, value)}
                              >
                                <SelectTrigger className="w-full" data-testid={`select-answer-${q.id}`}>
                                  <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                                <SelectContent>
                                  {q.options?.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {q.type === "number" && (
                              <Input
                                type="number"
                                min="0"
                                value={siteReadinessAnswers[q.id] || ""}
                                onChange={(e) => updateSiteReadinessAnswer(q.id, parseInt(e.target.value) || 0)}
                                placeholder="Enter a number"
                                className="w-32"
                                data-testid={`input-answer-${q.id}`}
                              />
                            )}
                            {q.type === "text" && (
                              <Textarea
                                value={siteReadinessAnswers[q.id] || ""}
                                onChange={(e) => updateSiteReadinessAnswer(q.id, e.target.value)}
                                placeholder="Type your answer..."
                                className="resize-none min-h-16"
                                data-testid={`textarea-answer-${q.id}`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-4 space-y-3">
                      {generatedMagicLink && (
                        <div className="space-y-3 p-3 rounded-lg bg-muted">
                          <div className="flex items-center gap-2">
                            <Input
                              value={generatedMagicLink}
                              readOnly
                              className="flex-1 text-sm"
                              data-testid="input-magic-link"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={copyMagicLink}
                              data-testid="button-copy-magic-link"
                            >
                              {linkCopied ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(generatedMagicLink, "_blank")}
                              data-testid="button-preview-questionnaire"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Preview Questionnaire
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                const clientEmail = lead?.contactEmail || lead?.billingContactEmail || "";
                                const projectName = lead?.projectName || "Your Project";
                                const subject = encodeURIComponent(`Site Readiness Questionnaire - ${projectName}`);
                                const body = encodeURIComponent(
                                  `Hi,\n\nPlease complete the following site readiness questionnaire to help us prepare for your scan.\n\n${generatedMagicLink}\n\nThis link will expire in 7 days. If you have any questions, please don't hesitate to reach out.\n\nBest regards,\nScan2Plan Team`
                                );
                                window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`, "_blank");
                              }}
                              data-testid="button-email-questionnaire"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Send via Email
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => saveSiteReadinessMutation.mutate()}
                          disabled={saveSiteReadinessMutation.isPending || Object.keys(siteReadinessAnswers).length === 0}
                          data-testid="button-save-site-readiness"
                        >
                          {saveSiteReadinessMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Answers
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => generateMagicLinkMutation.mutate()}
                          disabled={questionsToSend.length === 0 || generateMagicLinkMutation.isPending}
                          data-testid="button-generate-magic-link"
                        >
                          {generateMagicLinkMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating Link...
                            </>
                          ) : (
                            <>
                              <Link2 className="w-4 h-4 mr-2" />
                              Generate Link for {questionsToSend.length} Questions
                            </>
                          )}
                        </Button>
                        {questionsToSend.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            Check questions above to include in the questionnaire
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional details, scope notes, follow-up items..." 
                              className="min-h-24"
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-notes" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Documentation Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      Documentation
                    </CardTitle>
                    <CardDescription>Store proof links and upload important documents</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="proofLinks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proof Links</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Paste URLs to proof documents, photos, floor plans, etc.&#10;One link per line or separated by commas..."
                              className="min-h-24"
                              {...field} 
                              value={field.value || ""} 
                              data-testid="textarea-proof-links" 
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Links to external documents, photos, or floor plans for this project
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">NDA & Other Documents</Label>
                        <Badge variant="outline" className="text-xs">
                          {documents?.length || 0} files
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadDocumentMutation.isPending}
                          onClick={() => {
                            const input = document.getElementById('nda-upload-input') as HTMLInputElement;
                            input?.click();
                          }}
                          data-testid="button-upload-nda"
                        >
                          {uploadDocumentMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload NDA or Other Documents
                            </>
                          )}
                        </Button>
                        <input
                          id="nda-upload-input"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadDocumentMutation.mutate(file);
                            e.target.value = '';
                          }}
                          disabled={uploadDocumentMutation.isPending}
                          data-testid="input-upload-nda"
                        />
                      </div>
                      {documents && documents.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {documents.slice(0, 3).map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                              data-testid={`doc-preview-${doc.id}`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{doc.originalName}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => window.open(`/api/documents/${doc.id}/download`, '_blank')}
                                data-testid={`button-download-doc-${doc.id}`}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          {documents.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{documents.length - 3} more documents (see Documents tab)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Marketing Influence Widget */}
                <MarketingInfluenceWidget leadId={leadId} />

                {/* Save Button */}
                <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 border-t -mx-4 px-4">
                  <Button type="submit" disabled={isPending} className="w-full" data-testid="button-submit-lead">
                    <Save className="w-4 h-4 mr-2" />
                    {isPending ? "Saving..." : "Save Lead Details"}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </TabsContent>

        {/* Quote Builder Tab */}
        <TabsContent value="quote" className="flex-1 overflow-hidden m-0">
          <QuoteBuilderTab 
            lead={lead} 
            leadId={leadId}
            queryClient={queryClient}
            toast={toast}
            onQuoteSaved={() => {
              handleTabChange("history");
            }}
            existingQuotes={quotes}
          />
        </TabsContent>

        {/* Version History Tab */}
        <TabsContent value="history" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Quote Version History
                  </CardTitle>
                  <CardDescription>
                    Track all quote revisions for this deal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {quotesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : quotes && quotes.length > 0 ? (
                    <div className="space-y-3">
                      {quotes.map((quote) => (
                        <div
                          key={quote.id}
                          className={`p-4 rounded-lg border transition-colors cursor-pointer hover-elevate ${
                            quote.isLatest ? "border-primary/50 bg-primary/5" : "border-border"
                          }`}
                          data-testid={`version-card-${quote.id}`}
                          onClick={() => setViewingQuote(quote)}
                        >
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Version {quote.versionNumber}</span>
                              {quote.isLatest && (
                                <Badge variant="default" className="text-xs">
                                  Current
                                </Badge>
                              )}
                              {(quote as any).createdBy === "external-cpq" && (
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                  External CPQ
                                </Badge>
                              )}
                              {quote.versionName && (
                                <span className="text-muted-foreground text-sm">
                                  ({quote.versionName})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {quote.createdAt &&
                                formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Quote: <span className="font-mono">{quote.quoteNumber}</span>
                            </span>
                            {quote.totalPrice && (
                              <span className="font-medium">
                                ${Number(quote.totalPrice).toLocaleString()}
                              </span>
                            )}
                            {quote.createdBy && quote.createdBy !== "external-cpq" && (
                              <span className="text-muted-foreground">
                                by {quote.createdBy}
                              </span>
                            )}
                            {(quote as any).externalCpqUrl && (
                              <a
                                href={(quote as any).externalCpqUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3" />
                                View in CPQ
                              </a>
                            )}
                          </div>
                          {/* Show cost breakdown - Tier A or Standard pricing */}
                          {((quote as any).internalCosts?.tierAScanningCost != null || (quote as any).pricingBreakdown?.items?.length > 0) && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm mt-2 pt-2 border-t border-muted">
                              {/* Tier A costs */}
                              {(quote as any).internalCosts?.tierAScanningCost != null && (
                                <span className="text-muted-foreground">
                                  Scanning: <span className="font-mono font-medium text-foreground">${Number((quote as any).internalCosts.tierAScanningCost).toLocaleString()}</span>
                                </span>
                              )}
                              {(quote as any).internalCosts?.tierAModelingCost != null && (
                                <span className="text-muted-foreground">
                                  Modeling: <span className="font-mono font-medium text-foreground">${Number((quote as any).internalCosts.tierAModelingCost).toLocaleString()}</span>
                                </span>
                              )}
                              {(quote as any).internalCosts?.assumedMargin && (
                                <span className="text-muted-foreground">
                                  Target Margin: <span className="font-mono font-medium text-foreground">{(quote as any).internalCosts.assumedMargin}%</span>
                                </span>
                              )}
                              {/* Standard pricing items - show top 3 disciplines */}
                              {!(quote as any).internalCosts?.tierAScanningCost && (quote as any).pricingBreakdown?.items?.slice(0, 3).map((item: any, idx: number) => (
                                <span key={idx} className="text-muted-foreground">
                                  {item.label}: <span className="font-mono font-medium text-foreground">${Number(item.value).toLocaleString()}</span>
                                </span>
                              ))}
                              {/* Show "more" indicator if there are more items */}
                              {!(quote as any).internalCosts?.tierAScanningCost && (quote as any).pricingBreakdown?.items?.length > 3 && (
                                <span className="text-muted-foreground text-xs">
                                  +{(quote as any).pricingBreakdown.items.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-1">No Quotes Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first quote using the Quote Builder tab.
                      </p>
                      <Button
                        variant="default"
                        onClick={() => setActiveTab("quote")}
                        data-testid="button-create-first-quote"
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        Start Quote
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <DealAIAssistant lead={lead} />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Project Documents
                  </CardTitle>
                  <CardDescription>
                    Upload floor plans, pictures, or other files. When this deal closes, files will automatically move to Google Drive.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center border-2 border-dashed border-muted rounded-lg p-6">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Upload floor plans, pictures, or documents</span>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          disabled={uploadDocumentMutation.isPending}
                          onClick={() => {
                            const input = document.getElementById('document-upload-input') as HTMLInputElement;
                            input?.click();
                          }}
                          data-testid="button-upload-document"
                        >
                          {uploadDocumentMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>Select File</>
                          )}
                        </Button>
                        <input
                          id="document-upload-input"
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadDocumentMutation.mutate(file);
                            e.target.value = '';
                          }}
                          disabled={uploadDocumentMutation.isPending}
                          data-testid="input-upload-document"
                        />
                      </div>
                    </div>

                    {documentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : documents && documents.length > 0 ? (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            data-testid={`document-item-${doc.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Paperclip className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.originalName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(doc.size / 1024).toFixed(1)} KB
                                  {doc.uploadedAt && ` • ${formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}`}
                                </p>
                              </div>
                              {doc.movedToDriveAt && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <ExternalLink className="w-3 h-3" />
                                  In Drive
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/api/documents/${doc.id}/download`, '_blank')}
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => deleteDocumentMutation.mutate(doc.id)}
                                disabled={deleteDocumentMutation.isPending}
                                data-testid={`button-delete-document-${doc.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Paperclip className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="proposal" className="flex-1 overflow-hidden m-0">
          <PandaDocEmbed
            pandaDocId={lead?.pandaDocId || null}
            documentName={lead?.projectName ? `Proposal - ${lead.projectName}` : undefined}
            leadId={leadId}
            quoteId={latestQuote?.id}
            onDocumentCreated={(docId) => {
              queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
            }}
            onDocumentSent={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
            }}
          />
        </TabsContent>
      </Tabs>

      {lead && latestQuote && (
        <SendProposalDialog
          open={showProposalDialog}
          onOpenChange={setShowProposalDialog}
          leadId={leadId}
          projectName={lead.projectName || ""}
          clientName={lead.clientName}
          contactName={lead.contactName || undefined}
          contactEmail={lead.contactEmail || undefined}
          billingContactName={lead.billingContactName || undefined}
          billingContactEmail={lead.billingContactEmail || undefined}
          quoteTotal={latestQuote.totalPrice ? Number(latestQuote.totalPrice) : undefined}
          onSend={(email, subject) => sendProposalMutation.mutate({ recipientEmail: email, customSubject: subject })}
          isSending={sendProposalMutation.isPending}
        />
      )}

      {/* Quote Version Detail Dialog */}
      <Dialog open={!!viewingQuote} onOpenChange={(open) => !open && setViewingQuote(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Quote Version {viewingQuote?.versionNumber}
              {viewingQuote?.isLatest && (
                <Badge variant="default" className="ml-2">Current</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Quote #{viewingQuote?.quoteNumber} - Created {viewingQuote?.createdAt && formatDistanceToNow(new Date(viewingQuote.createdAt), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>

          {viewingQuote && (
            <div className="space-y-6 mt-4">
              {/* Quote Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Project</Label>
                  <p className="font-medium">{viewingQuote.projectName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Total Price</Label>
                  <p className="font-semibold text-lg">
                    ${Number(viewingQuote.totalPrice || 0).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Address</Label>
                  <p className="text-sm">{viewingQuote.projectAddress}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">Building Type</Label>
                  <p className="text-sm">{viewingQuote.typeOfBuilding}</p>
                </div>
                {viewingQuote.paymentTerms && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Payment Terms</Label>
                    <p className="text-sm">{CPQ_PAYMENT_TERMS_DISPLAY[viewingQuote.paymentTerms as keyof typeof CPQ_PAYMENT_TERMS_DISPLAY] || viewingQuote.paymentTerms}</p>
                  </div>
                )}
                {viewingQuote.dispatchLocation && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Dispatch Location</Label>
                    <p className="text-sm capitalize">{viewingQuote.dispatchLocation}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Areas */}
              {viewingQuote.areas && Array.isArray(viewingQuote.areas) && (viewingQuote.areas as any[]).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Areas ({(viewingQuote.areas as any[]).length})
                  </h4>
                  <div className="space-y-2">
                    {(viewingQuote.areas as any[]).map((area: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{area.name || `Area ${idx + 1}`}</span>
                          <span className="text-sm text-muted-foreground">
                            {Number(area.squareFeet || area.sqft || 0).toLocaleString()} SF
                          </span>
                        </div>
                        {area.disciplines && area.disciplines.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {area.disciplines.map((disc: any, dIdx: number) => (
                              <Badge key={dIdx} variant="secondary" className="text-xs">
                                {typeof disc === 'string' ? disc.toUpperCase() : disc.discipline?.toUpperCase()}
                                {typeof disc !== 'string' && disc.lod && ` (LOD ${disc.lod})`}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              {viewingQuote.pricingBreakdown && (viewingQuote.pricingBreakdown as any).items && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Pricing Breakdown
                  </h4>
                  <div className="space-y-1">
                    {((viewingQuote.pricingBreakdown as any).items as any[]).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-muted last:border-0">
                        <span className="text-sm">{item.label}</span>
                        <span className="font-mono text-sm">${Number(item.value || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks */}
              {viewingQuote.risks && Array.isArray(viewingQuote.risks) && (viewingQuote.risks as string[]).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Factors
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {(viewingQuote.risks as string[]).map((risk: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {risk.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingQuote.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notes
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingQuote.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
