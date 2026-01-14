import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Target, Loader2, Gavel, Eye, ExternalLink, Building, Cpu, 
  Banknote, Calendar, Users, TrendingUp, Pencil, Check, X, 
  RefreshCw, ChevronDown, Rss, Webhook
} from "lucide-react";
import type { IntelNewsItem, IntelFeedSource } from "@shared/schema";
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

export default function RegionalIntel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: feedSources = [], isLoading: sourcesLoading } = useQuery<IntelFeedSource[]>({
    queryKey: ["/api/intel-sources"],
  });

  const { data: intelItems = [], isLoading: itemsLoading } = useQuery<IntelNewsItem[]>({
    queryKey: ["/api/intel-feeds"],
    refetchInterval: 60000,
  });

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
      return apiRequest("POST", `/api/intel-sources/${id}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intel-sources"] });
      toast({ title: "Sync started", description: "Fetching latest intel..." });
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
                  {feedSources.length} intel feeds configured &bull; {intelItems.filter(i => !i.isRead).length} unread items
                </p>
              </div>
              <div className="flex items-center gap-2">
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
          </div>
        </main>
      </div>
    </div>
  );
}
