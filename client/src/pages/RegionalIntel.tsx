import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Users, TrendingUp, AlertTriangle, DollarSign, Target, Loader2, Newspaper, Building, Gavel, Eye } from "lucide-react";
import type { Lead } from "@shared/schema";
import { format } from "date-fns";

interface CompetitorData {
  name: string;
  region: string;
  pricingTier: "Budget" | "Mid-Range" | "Premium";
  services: string[];
  gaps: string[];
}

export default function RegionalIntel() {
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
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
                  </CardTitle>
                  <CardDescription>RFPs and projects to bid on</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">NYC DOE School Renovation</p>
                        <Badge variant="secondary" className="text-xs">$85K</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">LOD 300 MEP required. Due in 14 days.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Educational</Badge>
                        <Badge variant="outline" className="text-xs">Northeast</Badge>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">Hudson Yards Tower Survey</p>
                        <Badge variant="secondary" className="text-xs">$250K</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">45-story mixed-use. Due in 21 days.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Commercial</Badge>
                        <Badge variant="outline" className="text-xs">Northeast</Badge>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">Philadelphia Hospital Expansion</p>
                        <Badge variant="secondary" className="text-xs">$180K</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Healthcare facility MEP as-built. Due in 30 days.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Healthcare</Badge>
                        <Badge variant="outline" className="text-xs">Mid-Atlantic</Badge>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">Boston University Campus Scan</p>
                        <Badge variant="secondary" className="text-xs">$320K</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Multi-building campus documentation. Due in 45 days.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Educational</Badge>
                        <Badge variant="outline" className="text-xs">Northeast</Badge>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">NJ Transit Station Renovation</p>
                        <Badge variant="secondary" className="text-xs">$145K</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Historic station LOD 350 required. Due in 18 days.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Transportation</Badge>
                        <Badge variant="outline" className="text-xs">Northeast</Badge>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">DC Government Building Survey</p>
                        <Badge variant="secondary" className="text-xs">$210K</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Federal facility clearance required. Due in 60 days.</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Government</Badge>
                        <Badge variant="outline" className="text-xs">Mid-Atlantic</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Connect BidNet API for live feeds
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Policy Updates */}
              <Card className="border-amber-500/20 bg-amber-500/5" data-testid="card-policy-updates">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Gavel className="w-5 h-5 text-amber-500" />
                    Policy & Regulatory
                  </CardTitle>
                  <CardDescription>Laws and regulations affecting work</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">Local Law 97 Update</p>
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">NYC DOB</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Carbon reporting may increase as-built demand.</p>
                      <p className="text-xs text-muted-foreground mt-1">Effective: May 2026</p>
                    </div>
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">OSHA Heat Safety Rules</p>
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">OSHA</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">New rest break requirements for field work.</p>
                      <p className="text-xs text-muted-foreground mt-1">Effective: July 2026</p>
                    </div>
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">NYC Facade Inspection (FISP)</p>
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">NYC DOB</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Cycle 9 deadline approaching. 3D scanning accepted.</p>
                      <p className="text-xs text-muted-foreground mt-1">Deadline: Feb 2027</p>
                    </div>
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">NJ Energy Audit Requirements</p>
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">NJ BPU</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Commercial buildings 25K+ SF need energy audits.</p>
                      <p className="text-xs text-muted-foreground mt-1">Effective: Jan 2027</p>
                    </div>
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">MA Building Code Update</p>
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">MA BBRS</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">New accessibility requirements for renovations.</p>
                      <p className="text-xs text-muted-foreground mt-1">Effective: Sept 2026</p>
                    </div>
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">EPA Lead Paint Rule Expansion</p>
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">EPA</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Pre-1978 buildings need documentation before work.</p>
                      <p className="text-xs text-muted-foreground mt-1">Effective: March 2026</p>
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Subscribe to agency RSS feeds
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Competitor Watch */}
              <Card className="border-red-500/20 bg-red-500/5" data-testid="card-competitor-watch">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="w-5 h-5 text-red-500" />
                    Competitor Watch
                  </CardTitle>
                  <CardDescription>Competitor news and movements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">ScanCorp Acquisition</p>
                        <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">Expansion</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Acquired Baltimore firm, expanding Mid-Atlantic.</p>
                    </div>
                    <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">TechScan Pro Price Cut</p>
                        <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">Pricing</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">30% price reduction on basic scanning services.</p>
                    </div>
                    <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">3D Reality Labs New Equipment</p>
                        <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">Equipment</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Purchased 3 Leica RTC360 scanners for faster delivery.</p>
                    </div>
                    <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">BuildScan LLC Layoffs</p>
                        <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">Workforce</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Reduced modeling team by 40%. Opportunity to hire talent.</p>
                    </div>
                    <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">Precision 3D New Office</p>
                        <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">Expansion</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Opening Boston office, targeting New England market.</p>
                    </div>
                    <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">VirtualBuild Partnership</p>
                        <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">Partnership</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Partnered with major AEC firm for exclusive scanning work.</p>
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Add items manually or via webhooks
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Market Analysis */}
            {insightsData?.insights && (
              <Card data-testid="card-ai-analysis">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    AI Market Analysis
                  </CardTitle>
                  <CardDescription>
                    Generated {insightsData.generatedAt ? format(new Date(insightsData.generatedAt), "MMM d, yyyy 'at' h:mm a") : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {insightsData.insights}
                  </div>
                </CardContent>
              </Card>
            )}

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
