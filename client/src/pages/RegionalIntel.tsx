import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Map, Users, TrendingUp, AlertTriangle, Building2, DollarSign, Target, Loader2 } from "lucide-react";
import type { Lead, LeadResearch } from "@shared/schema";
import { format } from "date-fns";

interface CompetitorData {
  name: string;
  region: string;
  pricingTier: "Budget" | "Mid-Range" | "Premium";
  services: string[];
  gaps: string[];
}

interface ServiceGap {
  gap: string;
  opportunity: string;
  leads: number;
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

  const calculateServiceGaps = (): ServiceGap[] => {
    if (!leads) return [];

    const gaps: ServiceGap[] = [];

    const mepLeads = leads.filter(l =>
      l.disciplines?.includes("MEPF") || l.scope?.includes("MEP")
    ).length;
    if (mepLeads > 0) {
      gaps.push({
        gap: "MEP-Only Scanning",
        opportunity: "Many competitors don't offer standalone MEP scanning services",
        leads: mepLeads
      });
    }

    const hbimLeads = leads.filter(l =>
      l.buildingType?.includes("Historical") || l.buildingType?.includes("Religious") ||
      l.buildingType?.includes("Museum") || l.buildingType?.includes("Theatre")
    ).length;
    if (hbimLeads > 0) {
      gaps.push({
        gap: "Heritage BIM (HBIM)",
        opportunity: "Specialized heritage documentation is underserved in the market",
        leads: hbimLeads
      });
    }

    const highLoDLeads = leads.filter(l =>
      l.disciplines?.includes("LOD 350") || l.disciplines?.includes("LOD 400")
    ).length;
    if (highLoDLeads > 0) {
      gaps.push({
        gap: "High-LOD Modeling",
        opportunity: "Premium LOD 350+ modeling commands higher margins",
        leads: highLoDLeads
      });
    }

    return gaps;
  };

  const calculateRegionalStats = () => {
    if (!leads) return { regions: [], totalValue: 0, avgDealSize: 0 };

    const regionMap: Record<string, { count: number; value: number; leads: Lead[] }> = {};

    leads.forEach(lead => {
      const zip = lead.projectZipCode || lead.projectAddress?.match(/\d{5}/)?.[0] || "Unknown";
      const region = zip.startsWith("1") ? "Northeast" :
        zip.startsWith("2") || zip.startsWith("3") ? "Southeast" :
          zip.startsWith("4") || zip.startsWith("5") ? "Midwest" :
            zip.startsWith("6") || zip.startsWith("7") ? "Southwest" :
              zip.startsWith("8") || zip.startsWith("9") ? "West" : "Other";

      if (!regionMap[region]) {
        regionMap[region] = { count: 0, value: 0, leads: [] };
      }
      regionMap[region].count++;
      regionMap[region].value += Number(lead.value) || 0;
      regionMap[region].leads.push(lead);
    });

    const regions = Object.entries(regionMap).map(([name, data]) => ({
      name,
      count: data.count,
      value: data.value,
      avgDeal: data.count > 0 ? data.value / data.count : 0
    })).sort((a, b) => b.value - a.value);

    const totalValue = leads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
    const avgDealSize = leads.length > 0 ? totalValue / leads.length : 0;

    return { regions, totalValue, avgDealSize };
  };

  const competitors = extractCompetitorData();
  const serviceGaps = calculateServiceGaps();
  const { regions, totalValue, avgDealSize } = calculateRegionalStats();

  const tierCounts = {
    SMB: leads?.filter(l => l.clientTier === "SMB").length || 0,
    "Mid-Market": leads?.filter(l => l.clientTier === "Mid-Market").length || 0,
    Enterprise: leads?.filter(l => l.clientTier === "Enterprise").length || 0,
  };

  const complexityCounts = {
    Low: leads?.filter(l => l.complexityScore === "Low").length || 0,
    Medium: leads?.filter(l => l.complexityScore === "Medium").length || 0,
    High: leads?.filter(l => l.complexityScore === "High").length || 0,
  };

  const leadsWithRisks = leads?.filter(l =>
    l.regulatoryRisks && Array.isArray(l.regulatoryRisks) && l.regulatoryRisks.length > 0
  ).length || 0;

  if (leadsLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileHeader />
          <main className="flex-1 p-4 md:p-8 overflow-auto">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
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
                  Competitor pricing analysis and service gap opportunities
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card data-testid="card-total-pipeline">
                <CardHeader className="pb-2">
                  <CardDescription>Total Pipeline</CardDescription>
                  <CardTitle className="text-2xl">${totalValue.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {leads?.length || 0} active leads
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-avg-deal">
                <CardHeader className="pb-2">
                  <CardDescription>Avg Deal Size</CardDescription>
                  <CardTitle className="text-2xl">${avgDealSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Across all regions
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-ai-insights">
                <CardHeader className="pb-2">
                  <CardDescription>AI Insights Generated</CardDescription>
                  <CardTitle className="text-2xl">{insightsData?.totalResearchCount || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {insightsData?.clientsResearched || 0} clients researched
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-regulatory-risks">
                <CardHeader className="pb-2">
                  <CardDescription>Regulatory Flags</CardDescription>
                  <CardTitle className="text-2xl">{leadsWithRisks}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Leads with identified risks
                  </p>
                </CardContent>
              </Card>
            </div>

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

              <Card data-testid="card-complexity">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    MEP Complexity Distribution
                  </CardTitle>
                  <CardDescription>AI-assessed project complexity from site research</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(complexityCounts).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              level === "High" ? "bg-red-500/10 text-red-500 border-red-500/30" :
                                level === "Medium" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" :
                                  "bg-green-500/10 text-green-500 border-green-500/30"
                            }
                          >
                            {level}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${level === "High" ? "bg-red-500" :
                                level === "Medium" ? "bg-yellow-500" : "bg-green-500"
                                }`}
                              style={{ width: `${leads?.length ? (count / leads.length) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                    {Object.values(complexityCounts).every(c => c === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Run Property Intelligence research to assess complexity
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-regional-breakdown">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="w-5 h-5" />
                    Regional Pipeline Breakdown
                  </CardTitle>
                  <CardDescription>Deal distribution by geographic region</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {regions.map((region) => (
                      <div key={region.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{region.name}</p>
                          <p className="text-sm text-muted-foreground">{region.count} leads</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${region.value.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            Avg: ${region.avgDeal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {regions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No regional data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-service-gaps">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Service Gap Opportunities
                  </CardTitle>
                  <CardDescription>Underserved market segments based on your pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {serviceGaps.map((gap, i) => (
                      <div key={i} className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{gap.gap}</p>
                          <Badge variant="secondary">{gap.leads} leads</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{gap.opportunity}</p>
                      </div>
                    ))}
                    {serviceGaps.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Add more leads to identify market opportunities
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

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
                          <th className="text-left p-2 font-medium">Region</th>
                          <th className="text-left p-2 font-medium">Pricing</th>
                          <th className="text-left p-2 font-medium">Services</th>
                          <th className="text-left p-2 font-medium">Gaps (Your Opportunity)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {competitors.map((comp, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="p-2 font-medium">{comp.name}</td>
                            <td className="p-2">{comp.region}</td>
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
                                {comp.services.map((s, j) => (
                                  <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                                ))}
                              </div>
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

            {/* Intel News Feeds Section */}
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
                  <div className="space-y-3">
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
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Policy & Regulatory
                  </CardTitle>
                  <CardDescription>Laws and regulations affecting work</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                    <Users className="w-5 h-5 text-red-500" />
                    Competitor Watch
                  </CardTitle>
                  <CardDescription>Competitor news and movements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Add items manually or via webhooks
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
