import type { Lead, CpqQuote, DealAttribution } from "@shared/schema";
import type { useUpdateLead } from "@/hooks/use-leads";
import type { useQueryClient } from "@tanstack/react-query";
import type { useToast } from "@/hooks/use-toast";

export interface QboEstimateBadgeProps {
  lead: Lead;
}

export interface TierAEstimatorCardProps {
  lead: Lead;
  leadId: number;
  updateMutation: ReturnType<typeof useUpdateLead>;
  queryClient: ReturnType<typeof useQueryClient>;
  toast: ReturnType<typeof useToast>["toast"];
}

export interface MarketingInfluenceWidgetProps {
  leadId: number;
}

export interface QuoteBuilderArea {
  id: string;
  name: string;
  buildingType: string;
  squareFeet: string;
  disciplines: string[];
  disciplineLods: Record<string, { discipline: string; lod: string; scope: string }>;
}

export interface DealWorkspaceTab {
  id: string;
  label: string;
  icon: React.ComponentType;
  badge?: number;
}
