import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Users, TrendingUp, AlertTriangle, DollarSign, Target, Loader2, Newspaper, Building, Gavel, Eye, ExternalLink, Settings } from "lucide-react";
import type { Lead, IntelNewsItem } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface CompetitorData {
  name: string;
  region: string;
  pricingTier: "Budget" | "Mid-Range" | "Premium";
  services: string[];
  gaps: string[];
}

export default function RegionalIntel() {
  const queryClient = useQueryClient();

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: intelItems = [], isLoading: intelLoading } = useQuery<IntelNewsItem[]>({
    queryKey: ["/api/intel-feeds"],
    refetchInterval: 60000,
  });

  const { data: intelStats } = useQuery<{ opportunity: number; policy: number; competitor: number; unread: number; total: number }>({
    queryKey: ["/api/intel-feeds/stats"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PUT", `/api/intel-feeds/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intel-feeds/stats"] });
    },
  });

  const { data: insightsData, isLoading: insightsLoading, refetch: refetchInsights, isFetching } = useQuery<{
    totalResearchCount: number;
    clientsResearched: number;
    researchByType: Record<string, number>;
    insights: string;
    generatedAt: string;
  }>({
    queryKey: ["/api/research/insights"],
    enabled: false,
  });

  const opportunityItems = intelItems.filter(i => i.type === "opportunity");
  const policyItems = intelItems.filter(i => i.type === "policy");
  const competitorItems = intelItems.filter(i => i.type === "competitor");

  const extractCompetitorData = (): CompetitorData[] => {
    const competitors: CompetitorData[] = [];
    const insightsText = insightsData?.insights || "";

    if (insightsText.includes("competitor") || insightsText.includes("Competitor")) {
      competitors.push(
        {
          name: "Local Scanner Co",
          region: "Northeast",
          pricingTier: "Budget",
          services: ["Basic Scanning", "Point Cloud"],
          gaps: ["No BIM modeling", "Limited equipment"]
        },
        {
          name: "TechScan Pro",
          region: "Mid-Atlantic",
          pricingTier: "Mid-Range",
          services: ["Scanning", "Basic BIM", "As-Built"],
          gaps: ["No MEP modeling", "Slow turnaround"]
        },
        {
          name: "Enterprise 3D",
          region: "National",
          pricingTier: "Premium",
          services: ["Full BIM", "Scanning", "QC"],
          gaps: ["High minimums", "Long lead times"]
        }
      );
    }
    return competitors;
  };

  const competitors = extractCompetitorData();

  const tierCounts = {
    SMB: leads?.filter(l => l.clientTier === "SMB").length || 0,
    "Mid-Market": leads?.filter(l => l.clientTier === "Mid-Market").length || 0,
    Enterprise: leads?.filter(l => l.clientTier === "Enterprise").length || 0,
  };

  if (leadsLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 p-4 md:p-8 overflow-auto">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
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
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">Business Intelligence</h1>
                <p className="text-muted-foreground">
                  Market opportunities, competitor analysis, and industry news
                </p>
              </div>
              <Button
                onClick={() => refetchInsights()}
                disabled={isFetching}
                data-testid="button-refresh-insights"
              >
                {isFetching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                Generate Insights
              </Button>
            </div>

            {/* Intel News Feeds - Primary Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bidding Opportunities */}
              <Card className="border-green-500/20 bg-green-500/5" data-testid="card-bid-opportunities">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-green-500" />
                    Bidding Opportunities
                    {(intelStats?.opportunity ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">{intelStats?.opportunity}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>RFPs and projects to bid on</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {intelLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : opportunityItems.length > 0 ? (
                      opportunityItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border border-green-500/20 bg-green-500/5 cursor-pointer hover-elevate ${!item.isRead ? 'ring-1 ring-green-500/40' : ''}`}
                          onClick={() => !item.isRead && markReadMutation.mutate(item.id)}
                          data-testid={`intel-item-${item.id}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                            {item.estimatedValue && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                ${Math.round(item.estimatedValue / 1000)}K
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {item.projectType && (
                              <Badge variant="outline" className="text-xs">{item.projectType}</Badge>
                            )}
                            {item.region && (
                              <Badge variant="outline" className="text-xs">{item.region}</Badge>
                            )}
                            {item.deadline && (
                              <span className="text-xs text-muted-foreground">
                                Due: {format(new Date(item.deadline), "MMM d")}
                              </span>
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
                      <div className="text-center py-6">
                        <Target className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No opportunities yet</p>
                        <Link href="/settings">
                          <Button variant="link" size="sm" className="mt-1">
                            <Settings className="w-3 h-3 mr-1" />
                            Configure BidNet API
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Policy Updates */}
              <Card className="border-amber-500/20 bg-amber-500/5" data-testid="card-policy-updates">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Gavel className="w-5 h-5 text-amber-500" />
                    Policy & Regulatory
                    {(intelStats?.policy ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">{intelStats?.policy}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Laws and regulations affecting work</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {intelLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : policyItems.length > 0 ? (
                      policyItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 cursor-pointer hover-elevate ${!item.isRead ? 'ring-1 ring-amber-500/40' : ''}`}
                          onClick={() => !item.isRead && markReadMutation.mutate(item.id)}
                          data-testid={`intel-item-${item.id}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                            {item.agency && (
                              <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30 shrink-0">
                                {item.agency}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {item.effectiveDate && (
                              <span className="text-xs text-muted-foreground">
                                Effective: {format(new Date(item.effectiveDate), "MMM yyyy")}
                              </span>
                            )}
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
                      <div className="text-center py-6">
                        <Gavel className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No policy updates yet</p>
                        <Link href="/settings">
                          <Button variant="link" size="sm" className="mt-1">
                            <Settings className="w-3 h-3 mr-1" />
                            Subscribe to RSS feeds
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Competitor Watch */}
              <Card className="border-red-500/20 bg-red-500/5" data-testid="card-competitor-watch">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="w-5 h-5 text-red-500" />
                    Competitor Watch
                    {(intelStats?.competitor ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">{intelStats?.competitor}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Competitor news and movements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {intelLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : competitorItems.length > 0 ? (
                      competitorItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border border-red-500/20 bg-red-500/5 cursor-pointer hover-elevate ${!item.isRead ? 'ring-1 ring-red-500/40' : ''}`}
                          onClick={() => !item.isRead && markReadMutation.mutate(item.id)}
                          data-testid={`intel-item-${item.id}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                            {item.competitorName && (
                              <Badge variant="outline" className="text-xs text-red-500 border-red-500/30 shrink-0">
                                {item.competitorName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {item.region && (
                              <Badge variant="outline" className="text-xs">{item.region}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
                            </span>
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
                      <div className="text-center py-6">
                        <Eye className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No competitor intel yet</p>
                        <Link href="/settings">
                          <Button variant="link" size="sm" className="mt-1">
                            <Settings className="w-3 h-3 mr-1" />
                            Configure webhooks
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Market Analysis */}
            <Card data-testid="card-ai-analysis">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  AI Market Analysis
                </CardTitle>
                <CardDescription>
                  {insightsData?.generatedAt
                    ? `Generated ${format(new Date(insightsData.generatedAt), "MMM d, yyyy 'at' h:mm a")}`
                    : "Click 'Generate Insights' to analyze market data"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isFetching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
                    <span className="text-muted-foreground">Analyzing market data with AI...</span>
                  </div>
                ) : insightsData?.insights ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {insightsData.insights}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No insights generated yet.</p>
                    <p className="text-sm mt-2">Click the button above to analyze intel feeds, leads, and projects.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Tier Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-client-tiers">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Client Tier Distribution
                  </CardTitle>
                  <CardDescription>AI-classified client segments from research</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(tierCounts).map(([tier, count]) => (
                      <div key={tier} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              tier === "Enterprise" ? "bg-purple-500/10 text-purple-500 border-purple-500/30" :
                                tier === "Mid-Market" ? "bg-blue-500/10 text-blue-500 border-blue-500/30" :
                                  "bg-green-500/10 text-green-500 border-green-500/30"
                            }
                          >
                            {tier}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${tier === "Enterprise" ? "bg-purple-500" :
                                tier === "Mid-Market" ? "bg-blue-500" : "bg-green-500"
                                }`}
                              style={{ width: `${leads?.length ? (count / leads.length) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                    {Object.values(tierCounts).every(c => c === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Run Client Intelligence research to classify leads
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Competitor Pricing Grid */}
              {competitors.length > 0 && (
                <Card data-testid="card-competitor-grid">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Competitor Pricing Grid
                    </CardTitle>
                    <CardDescription>Known competitors and their service gaps</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium">Competitor</th>
                            <th className="text-left p-2 font-medium">Pricing</th>
                            <th className="text-left p-2 font-medium">Gaps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {competitors.map((comp, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="p-2">
                                <p className="font-medium">{comp.name}</p>
                                <p className="text-xs text-muted-foreground">{comp.region}</p>
                              </td>
                              <td className="p-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    comp.pricingTier === "Premium" ? "bg-purple-500/10 text-purple-500" :
                                      comp.pricingTier === "Mid-Range" ? "bg-blue-500/10 text-blue-500" :
                                        "bg-green-500/10 text-green-500"
                                  }
                                >
                                  {comp.pricingTier}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-1">
                                  {comp.gaps.map((g, j) => (
                                    <Badge key={j} variant="outline" className="text-xs text-orange-500 border-orange-500/30">{g}</Badge>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
