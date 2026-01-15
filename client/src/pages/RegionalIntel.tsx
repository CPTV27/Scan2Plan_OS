import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Target, Loader2, Gavel, Eye, ExternalLink, Building, Cpu,
  Banknote, Calendar, Users, TrendingUp, Pencil, Check, X,
  RefreshCw, ChevronDown, Rss, Webhook, Bot, Mail, CheckCircle,
  AlertCircle, Clock, Sparkles, Timer, UserSearch, Send, ClipboardCheck, FileText
} from "lucide-react";
import type { IntelNewsItem, IntelFeedSource, IntelPipelineRun } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const FEED_CONFIG: Record<string, {
  icon: typeof Target;
  description: string;
  cardClass: string;
  iconClass: string;
  borderClass: string;
  itemClass: string;
  ringClass: string;
}> = {
  opportunity: {
    icon: Target,
    description: "RFPs and bidding opportunities",
    cardClass: "border-green-500/20 bg-green-500/5",
    iconClass: "text-green-500",
    borderClass: "border-green-500/20",
    itemClass: "border-green-500/20 bg-green-500/5",
    ringClass: "ring-green-500/40"
  },
  policy: {
    icon: Gavel,
    description: "Regulatory and policy updates",
    cardClass: "border-amber-500/20 bg-amber-500/5",
    iconClass: "text-amber-500",
    borderClass: "border-amber-500/20",
    itemClass: "border-amber-500/20 bg-amber-500/5",
    ringClass: "ring-amber-500/40"
  },
  competitor: {
    icon: Eye,
    description: "Competitor news and movements",
    cardClass: "border-red-500/20 bg-red-500/5",
    iconClass: "text-red-500",
    borderClass: "border-red-500/20",
    itemClass: "border-red-500/20 bg-red-500/5",
    ringClass: "ring-red-500/40"
  },
  project: {
    icon: Building,
    description: "New construction projects",
    cardClass: "border-blue-500/20 bg-blue-500/5",
    iconClass: "text-blue-500",
    borderClass: "border-blue-500/20",
    itemClass: "border-blue-500/20 bg-blue-500/5",
    ringClass: "ring-blue-500/40"
  },
  technology: {
    icon: Cpu,
    description: "Scanning and BIM tech news",
    cardClass: "border-purple-500/20 bg-purple-500/5",
    iconClass: "text-purple-500",
    borderClass: "border-purple-500/20",
    itemClass: "border-purple-500/20 bg-purple-500/5",
    ringClass: "ring-purple-500/40"
  },
  funding: {
    icon: Banknote,
    description: "Grants and funding opportunities",
    cardClass: "border-emerald-500/20 bg-emerald-500/5",
    iconClass: "text-emerald-500",
    borderClass: "border-emerald-500/20",
    itemClass: "border-emerald-500/20 bg-emerald-500/5",
    ringClass: "ring-emerald-500/40"
  },
  event: {
    icon: Calendar,
    description: "Industry events and conferences",
    cardClass: "border-orange-500/20 bg-orange-500/5",
    iconClass: "text-orange-500",
    borderClass: "border-orange-500/20",
    itemClass: "border-orange-500/20 bg-orange-500/5",
    ringClass: "ring-orange-500/40"
  },
  talent: {
    icon: Users,
    description: "Hiring trends and talent market",
    cardClass: "border-pink-500/20 bg-pink-500/5",
    iconClass: "text-pink-500",
    borderClass: "border-pink-500/20",
    itemClass: "border-pink-500/20 bg-pink-500/5",
    ringClass: "ring-pink-500/40"
  },
  market: {
    icon: TrendingUp,
    description: "Market trends and analysis",
    cardClass: "border-cyan-500/20 bg-cyan-500/5",
    iconClass: "text-cyan-500",
    borderClass: "border-cyan-500/20",
    itemClass: "border-cyan-500/20 bg-cyan-500/5",
    ringClass: "ring-cyan-500/40"
  },
  // Lead Intelligence Trigger Pod Types
  permit: {
    icon: FileText,
    description: "Building permit filings",
    cardClass: "border-indigo-500/20 bg-indigo-500/5",
    iconClass: "text-indigo-500",
    borderClass: "border-indigo-500/20",
    itemClass: "border-indigo-500/20 bg-indigo-500/5",
    ringClass: "ring-indigo-500/40"
  },
  compliance: {
    icon: ClipboardCheck,
    description: "Compliance triggers (LL11/LL87/LL97)",
    cardClass: "border-rose-500/20 bg-rose-500/5",
    iconClass: "text-rose-500",
    borderClass: "border-rose-500/20",
    itemClass: "border-rose-500/20 bg-rose-500/5",
    ringClass: "ring-rose-500/40"
  },
  procurement: {
    icon: Banknote,
    description: "Public procurement opportunities",
    cardClass: "border-teal-500/20 bg-teal-500/5",
    iconClass: "text-teal-500",
    borderClass: "border-teal-500/20",
    itemClass: "border-teal-500/20 bg-teal-500/5",
    ringClass: "ring-teal-500/40"
  },
};

function FeedCard({
  source,
  items,
  isLoading,
  onUpdate,
  onSync,
  onMarkRead
}: {
  source: IntelFeedSource;
  items: IntelNewsItem[];
  isLoading: boolean;
  onUpdate: (id: number, data: Partial<IntelFeedSource>) => void;
  onSync: (id: number) => void;
  onMarkRead: (id: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(source.config?.searchPrompt || "");
  const [isExpanded, setIsExpanded] = useState(true);

  const targetType = source.config?.targetType || "opportunity";
  const config = FEED_CONFIG[targetType] || FEED_CONFIG.opportunity;
  const Icon = config.icon;

  const handleSave = () => {
    onUpdate(source.id, {
      config: { ...(source.config || {}), searchPrompt: editedPrompt }
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPrompt(source.config?.searchPrompt || "");
    setIsEditing(false);
  };

  return (
    <Card
      className={config.cardClass}
      data-testid={`card-feed-${targetType}`}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon className={`w-5 h-5 ${config.iconClass}`} />
              {source.name}
              {items.length > 0 && (
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Switch
                checked={source.isActive ?? true}
                onCheckedChange={(checked) => onUpdate(source.id, { isActive: checked })}
                data-testid={`switch-feed-${source.id}`}
              />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CardDescription className="flex items-center gap-2">
            {config.description}
            <Badge variant="outline" className="text-xs">
              {source.type === "rss" ? <Rss className="w-3 h-3 mr-1" /> : <Webhook className="w-3 h-3 mr-1" />}
              {source.type.toUpperCase()}
            </Badge>
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3">
            <div className={`p-3 rounded-lg border ${config.borderClass} bg-background/50`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Search Prompt</span>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}>
                        <Check className="w-3 h-3 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}>
                        <X className="w-3 h-3 text-red-500" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setIsEditing(true)}
                      data-testid={`button-edit-prompt-${source.id}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              {isEditing ? (
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="text-xs min-h-[80px]"
                  placeholder="Enter search prompt for this feed..."
                  data-testid={`textarea-prompt-${source.id}`}
                />
              ) : (
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {source.config?.searchPrompt || "No prompt configured"}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {source.lastSyncAt
                  ? `Last sync: ${formatDistanceToNow(new Date(source.lastSyncAt), { addSuffix: true })}`
                  : "Never synced"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSync(source.id)}
                disabled={!source.isActive}
                data-testid={`button-sync-${source.id}`}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Sync Now
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : items.length > 0 ? (
                items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className={`p-2 rounded-lg border ${config.itemClass} cursor-pointer hover-elevate ${!item.isRead ? `ring-1 ${config.ringClass}` : ''}`}
                    onClick={() => !item.isRead && onMarkRead(item.id)}
                    data-testid={`intel-item-${item.id}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium text-xs line-clamp-1">{item.title}</p>
                      {item.estimatedValue && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          ${Math.round(Number(item.estimatedValue) / 1000)}K
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.region && (
                        <Badge variant="outline" className="text-xs">{item.region}</Badge>
                      )}
                      {item.sourceUrl && (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Icon className="w-6 h-6 mx-auto text-muted-foreground/50 mb-1" />
                  <p className="text-xs text-muted-foreground">No items yet</p>
                  <p className="text-xs text-muted-foreground">Click Sync Now to fetch</p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface ProcessedIntelItem {
  item: IntelNewsItem;
  run: IntelPipelineRun;
}

interface ProcessingStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  unread: number;
  avgAuditScore: number;
}

// Lead Intelligence SLA Queue Types
interface SlaContact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  confidence: number;
}

interface SlaQueueItem {
  id: number;
  type: string;
  title: string;
  address?: string;
  contacts: SlaContact[];
  relevanceScore: number;
  slaStatus: "on_track" | "at_risk" | "overdue";
  hoursUntilSla: number;
  triggerDate: string;
  recommendedAction: string;
  template?: {
    subject: string;
    previewHook: string;
    ctaText: string;
  };
}

interface SlaQueueSummary {
  total: number;
  onTrack: number;
  atRisk: number;
  overdue: number;
  byType: Record<string, number>;
  avgRelevanceScore: number;
}

interface OutreachEmail {
  to: string;
  subject: string;
  body: string;
  plainText: string;
}

function ProcessedIntelCard({
  processedItem,
  onMarkRead
}: {
  processedItem: ProcessedIntelItem;
  onMarkRead: (runId: number) => void;
}) {
  const { item, run } = processedItem;
  const config = FEED_CONFIG[item.type] || FEED_CONFIG.market;
  const Icon = config.icon;

  const getVerdictBadge = (verdict: string | null) => {
    switch (verdict) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "needs_revision":
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Needs Review</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <Card
      className={`cursor-pointer hover-elevate ${!run.isRead ? 'ring-2 ring-primary/40' : ''}`}
      onClick={() => !run.isRead && onMarkRead(run.id)}
      data-testid={`processed-intel-${run.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${config.cardClass}`}>
              <Icon className={`w-4 h-4 ${config.iconClass}`} />
            </div>
            <Badge variant="outline" className="text-xs">{item.type}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {run.auditScore && (
              <Badge variant="secondary" className="text-xs">
                Score: {run.auditScore}
              </Badge>
            )}
            {getVerdictBadge(run.auditVerdict)}
          </div>
        </div>
        <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
        <CardDescription className="text-xs">
          {item.sourceName} &bull; {run.completedAt && formatDistanceToNow(new Date(run.completedAt), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {run.executiveSummary && (
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-xs font-medium mb-1">
              <Sparkles className="w-3 h-3 text-primary" /> AI Summary
            </div>
            <p className="text-sm">{run.executiveSummary}</p>
          </div>
        )}

        {run.recommendedActions && Array.isArray(run.recommendedActions) && run.recommendedActions.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium flex items-center gap-1">
              <Target className="w-3 h-3 text-primary" /> Recommended Actions
            </div>
            <ul className="text-xs space-y-1">
              {(run.recommendedActions as string[]).slice(0, 3).map((action, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {run.draftEmail && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Mail className="w-3 h-3" /> View Draft Email
              <ChevronDown className="w-3 h-3" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-3 rounded-lg bg-muted/50 text-xs whitespace-pre-wrap">
                {run.draftEmail}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> View Source
            </a>
          )}
          {!run.isRead && (
            <Badge variant="secondary" className="text-xs">
              <Bot className="w-3 h-3 mr-1" /> New
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegionalIntel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("feeds");

  const { data: feedSources = [], isLoading: sourcesLoading } = useQuery<IntelFeedSource[]>({
    queryKey: ["/api/intel-sources"],
  });

  const { data: intelItems = [], isLoading: itemsLoading } = useQuery<IntelNewsItem[]>({
    queryKey: ["/api/intel-feeds"],
    refetchInterval: 60000,
  });

  const { data: processedItems = [], isLoading: processedLoading } = useQuery<ProcessedIntelItem[]>({
    queryKey: ["/api/intel-feeds/processed"],
    refetchInterval: 30000,
  });

  const { data: processingStats } = useQuery<ProcessingStats>({
    queryKey: ["/api/intel-feeds/processed/stats"],
    refetchInterval: 30000,
  });

  // Lead Intelligence SLA Queue
  const { data: slaQueue = [], isLoading: slaLoading } = useQuery<SlaQueueItem[]>({
    queryKey: ["/api/intel-feeds/sla-queue"],
    refetchInterval: 60000,
  });

  const { data: slaSummary } = useQuery<SlaQueueSummary>({
    queryKey: ["/api/intel-feeds/sla-queue/summary"],
    refetchInterval: 60000,
  });

  const [selectedSlaItem, setSelectedSlaItem] = useState<SlaQueueItem | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<OutreachEmail | null>(null);

  const updateSourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<IntelFeedSource> }) => {
      return apiRequest("PUT", `/api/intel-sources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-sources"] });
      toast({ title: "Feed updated", description: "Your changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update feed.", variant: "destructive" });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/intel-sources/${id}/sync`);
      return res.json();
    },
    onSuccess: (data: { success: boolean; message: string; itemsProcessed: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intel-sources"] });
      if (data.itemsProcessed > 0) {
        toast({
          title: "Sync Complete",
          description: `Found ${data.itemsProcessed} new items!`
        });
      } else {
        toast({
          title: "Sync Complete",
          description: data.message || "No new items found."
        });
      }
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Could not sync feed.", variant: "destructive" });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PUT", `/api/intel-feeds/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds"] });
    },
  });

  const markProcessedReadMutation = useMutation({
    mutationFn: async (runId: number) => {
      return apiRequest("PUT", `/api/intel-feeds/processed/${runId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds/processed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds/processed/stats"] });
    },
  });

  const processPendingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/intel-feeds/process-pending", { limit: 10 });
      return res.json();
    },
    onSuccess: (data: { processed: number; successful: number; failed: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds/processed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds/processed/stats"] });
      toast({
        title: "Processing Complete",
        description: `Processed ${data.successful} of ${data.processed} items successfully.`,
      });
    },
    onError: () => {
      toast({ title: "Processing failed", description: "Could not process items.", variant: "destructive" });
    },
  });

  // Lead Intelligence Mutations
  const syncTriggerPodsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/intel-source-config/sync-trigger-pods");
      return res.json();
    },
    onSuccess: (data: { totalAdded: number; summary: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds/sla-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds/sla-queue/summary"] });
      toast({
        title: "Trigger Pods Synced",
        description: `Added ${data.totalAdded} new leads. ${data.summary}`,
      });
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Could not sync trigger pods.", variant: "destructive" });
    },
  });

  const enrichContactMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/intel-feeds/${id}/enrich`);
      return res.json();
    },
    onSuccess: (data: { contacts: SlaContact[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds/sla-queue"] });
      toast({
        title: "Contacts Enriched",
        description: `Found ${data.contacts.length} contacts.`,
      });
    },
    onError: () => {
      toast({ title: "Enrichment failed", description: "Could not enrich contacts.", variant: "destructive" });
    },
  });

  const generateOutreachMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/intel-feeds/${id}/generate-outreach`);
      return res.json();
    },
    onSuccess: (data: { email: OutreachEmail }) => {
      setGeneratedEmail(data.email);
      toast({ title: "Email Generated", description: "Outreach email is ready." });
    },
    onError: () => {
      toast({ title: "Generation failed", description: "Could not generate email.", variant: "destructive" });
    },
  });

  const prepareLeadsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/intel-feeds/sla-queue/prepare-leads", { limit: 20 });
      return res.json();
    },
    onSuccess: (data: { leadsCreated: number; message: string }) => {
      toast({
        title: "Leads Created",
        description: data.message,
      });
    },
    onError: () => {
      toast({ title: "Failed", description: "Could not create leads.", variant: "destructive" });
    },
  });

  const getItemsForSource = (source: IntelFeedSource) => {
    const targetType = source.config?.targetType;
    return intelItems.filter(item => item.type === targetType);
  };

  if (sourcesLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 p-4 md:p-8 overflow-auto">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">Business Intelligence</h1>
                <p className="text-muted-foreground">
                  {feedSources.length} intel feeds &bull; {intelItems.filter(i => !i.isRead).length} unread &bull; {processingStats?.unread || 0} AI-processed
                </p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="feeds" data-testid="tab-feeds">
                  <Rss className="w-4 h-4 mr-2" /> Feed Sources
                </TabsTrigger>
                <TabsTrigger value="processed" data-testid="tab-processed">
                  <Bot className="w-4 h-4 mr-2" />
                  Processed Intel
                  {(processingStats?.unread || 0) > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">{processingStats?.unread}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="leads" data-testid="tab-leads">
                  <Timer className="w-4 h-4 mr-2" />
                  Lead Intelligence
                  {(slaSummary?.overdue || 0) > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">{slaSummary?.overdue}</Badge>
                  )}
                  {(slaSummary?.atRisk || 0) > 0 && (slaSummary?.overdue || 0) === 0 && (
                    <Badge className="ml-2 text-xs bg-amber-500">{slaSummary?.atRisk}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="feeds" className="space-y-4">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      feedSources.filter(s => s.isActive).forEach(s => syncMutation.mutate(s.id));
                    }}
                    disabled={syncMutation.isPending}
                    data-testid="button-sync-all"
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync All Feeds
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {feedSources.map((source) => (
                    <FeedCard
                      key={source.id}
                      source={source}
                      items={getItemsForSource(source)}
                      isLoading={itemsLoading}
                      onUpdate={(id, data) => updateSourceMutation.mutate({ id, data })}
                      onSync={(id) => syncMutation.mutate(id)}
                      onMarkRead={(id) => markReadMutation.mutate(id)}
                    />
                  ))}
                </div>

                {feedSources.length === 0 && (
                  <Card className="p-8 text-center">
                    <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Intel Feeds Configured</h3>
                    <p className="text-muted-foreground mb-4">
                      Set up your intel feeds to start receiving market intelligence.
                    </p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="processed" className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    {processingStats && (
                      <>
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> {processingStats.completed} Completed
                        </Badge>
                        {processingStats.running > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {processingStats.running} Running
                          </Badge>
                        )}
                        {processingStats.failed > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" /> {processingStats.failed} Failed
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => processPendingMutation.mutate()}
                    disabled={processPendingMutation.isPending}
                    data-testid="button-process-pending"
                  >
                    {processPendingMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Process Pending Items
                  </Button>
                </div>

                {processedLoading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-64" />
                    ))}
                  </div>
                ) : processedItems.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {processedItems.map((item) => (
                      <ProcessedIntelCard
                        key={item.run.id}
                        processedItem={item}
                        onMarkRead={(runId) => markProcessedReadMutation.mutate(runId)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <Bot className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Processed Intel Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Sync your feeds to get intel items, then they'll be automatically processed by AI agents.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("feeds")}
                      data-testid="button-go-to-feeds"
                    >
                      <Rss className="w-4 h-4 mr-2" /> Go to Feed Sources
                    </Button>
                  </Card>
                )}
              </TabsContent>

              {/* Lead Intelligence Tab */}
              <TabsContent value="leads" className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold">{slaSummary?.total || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Queue</div>
                  </Card>
                  <Card className="p-4 border-green-500/20 bg-green-500/5">
                    <div className="text-2xl font-bold text-green-600">{slaSummary?.onTrack || 0}</div>
                    <div className="text-xs text-muted-foreground">On Track</div>
                  </Card>
                  <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                    <div className="text-2xl font-bold text-amber-600">{slaSummary?.atRisk || 0}</div>
                    <div className="text-xs text-muted-foreground">At Risk</div>
                  </Card>
                  <Card className="p-4 border-red-500/20 bg-red-500/5">
                    <div className="text-2xl font-bold text-red-600">{slaSummary?.overdue || 0}</div>
                    <div className="text-xs text-muted-foreground">Overdue</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold">{slaSummary?.avgRelevanceScore || 0}</div>
                    <div className="text-xs text-muted-foreground">Avg Score</div>
                  </Card>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      onClick={() => syncTriggerPodsMutation.mutate()}
                      disabled={syncTriggerPodsMutation.isPending}
                      data-testid="button-sync-triggers"
                    >
                      {syncTriggerPodsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Sync Trigger Pods
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => prepareLeadsMutation.mutate()}
                      disabled={prepareLeadsMutation.isPending || slaQueue.length === 0}
                    >
                      {prepareLeadsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Push to Mautic
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    48-hour SLA Queue • Sorted by urgency
                  </div>
                </div>

                {/* SLA Queue Items */}
                {slaLoading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-48" />
                    ))}
                  </div>
                ) : slaQueue.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {slaQueue.map((item) => {
                      const config = FEED_CONFIG[item.type] || FEED_CONFIG.permit;
                      const Icon = config.icon;
                      const statusColors = {
                        on_track: "border-green-500/30 bg-green-500/5",
                        at_risk: "border-amber-500/30 bg-amber-500/5",
                        overdue: "border-red-500/30 bg-red-500/5",
                      };

                      return (
                        <Card
                          key={item.id}
                          className={`cursor-pointer hover-elevate ${statusColors[item.slaStatus]} ${selectedSlaItem?.id === item.id ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => setSelectedSlaItem(item)}
                          data-testid={`sla-item-${item.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-md ${config.cardClass}`}>
                                  <Icon className={`w-4 h-4 ${config.iconClass}`} />
                                </div>
                                <Badge variant="outline" className="text-xs">{item.type}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={item.slaStatus === "overdue" ? "destructive" : item.slaStatus === "at_risk" ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  <Clock className="w-3 h-3 mr-1" />
                                  {item.slaStatus === "overdue"
                                    ? "Overdue"
                                    : `${Math.round(item.hoursUntilSla)}h left`
                                  }
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  Score: {item.relevanceScore}
                                </Badge>
                              </div>
                            </div>
                            <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
                            {item.address && (
                              <CardDescription className="text-xs">{item.address}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Contacts */}
                            {item.contacts.length > 0 ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Users className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs">{item.contacts.length} contacts</span>
                                {item.contacts.slice(0, 2).map((c, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {c.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <UserSearch className="w-3 h-3" />
                                No contacts enriched yet
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  enrichContactMutation.mutate(item.id);
                                }}
                                disabled={enrichContactMutation.isPending}
                              >
                                <UserSearch className="w-3 h-3 mr-1" />
                                Enrich
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSlaItem(item);
                                  generateOutreachMutation.mutate(item.id);
                                }}
                                disabled={generateOutreachMutation.isPending || item.contacts.length === 0}
                              >
                                <Mail className="w-3 h-3 mr-1" />
                                Generate Email
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <Timer className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Leads in Queue</h3>
                    <p className="text-muted-foreground mb-4">
                      Sync trigger pods to pull in permit filings and compliance items from NYC DOB.
                    </p>
                    <Button
                      onClick={() => syncTriggerPodsMutation.mutate()}
                      disabled={syncTriggerPodsMutation.isPending}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Trigger Pods
                    </Button>
                  </Card>
                )}

                {/* Generated Email Preview */}
                {generatedEmail && selectedSlaItem && (
                  <Card className="mt-4 border-primary/30">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Generated Outreach Email
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setGeneratedEmail(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardDescription>For: {selectedSlaItem.title}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">To:</span>
                        <p className="text-sm">{generatedEmail.to || "No email address"}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Subject:</span>
                        <p className="text-sm font-medium">{generatedEmail.subject}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Body:</span>
                        <div className="p-3 mt-1 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                          {generatedEmail.body}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedEmail.body);
                            toast({ title: "Copied!", description: "Email copied to clipboard." });
                          }}
                        >
                          Copy to Clipboard
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
