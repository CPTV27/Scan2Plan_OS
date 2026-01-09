import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Database, RefreshCw, Loader2, Building2, MapPin, Clock, Users, FolderOpen, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AirtableAnalytics {
  overview: {
    totalProjects: number;
    totalJobs: number;
    totalClients: number;
    totalLocations: number;
    totalHoursLogged: number;
  };
  projectsByStatus: { status: string; count: number }[];
  topClients: { name: string; projectCount: number }[];
  recentActivity: { date: string; hours: number }[];
  locationCoverage: { state: string; count: number }[];
  fetchedAt: string;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AirtableInsights() {
  const { data: analytics, isLoading, refetch, isFetching } = useQuery<AirtableAnalytics>({
    queryKey: ["/api/integrations/airtable/analytics"],
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
        <header className="mb-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-3xl font-display font-bold flex items-center gap-3">
                <Database className="w-8 h-8 text-accent" />
                Airtable Analytics
              </h2>
              <p className="text-muted-foreground mt-2 text-lg">
                Business insights from your Airtable operations data.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              disabled={isFetching}
              data-testid="button-refresh-analytics"
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
          
          {analytics && (
            <div className="mt-4 text-sm text-muted-foreground">
              Last synced: {new Date(analytics.fetchedAt).toLocaleString()}
            </div>
          )}
        </header>

        <div className="max-w-6xl mx-auto space-y-6">
          {isLoading ? (
            <Card className="border-border">
              <CardContent className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : !analytics ? (
            <Card className="border-border">
              <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Database className="w-12 h-12 mb-4 opacity-30" />
                <p>Could not load Airtable data. Check your API key configuration.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overview KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="border-border" data-testid="card-kpi-projects">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-accent/20">
                        <FolderOpen className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics.overview.totalProjects}</p>
                        <p className="text-sm text-muted-foreground">Projects</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border" data-testid="card-kpi-jobs">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-accent/20">
                        <TrendingUp className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics.overview.totalJobs}</p>
                        <p className="text-sm text-muted-foreground">Jobs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border" data-testid="card-kpi-clients">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-accent/20">
                        <Building2 className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics.overview.totalClients}</p>
                        <p className="text-sm text-muted-foreground">Clients</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border" data-testid="card-kpi-locations">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-accent/20">
                        <MapPin className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics.overview.totalLocations}</p>
                        <p className="text-sm text-muted-foreground">Locations</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border" data-testid="card-kpi-hours">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-accent/20">
                        <Clock className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics.overview.totalHoursLogged.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Hours Logged</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Projects by Status */}
                <Card className="border-border" data-testid="card-chart-status">
                  <CardHeader>
                    <CardTitle className="text-lg">Projects by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.projectsByStatus}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ status, count }) => `${status}: ${count}`}
                          >
                            {analytics.projectsByStatus.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Location Coverage */}
                <Card className="border-border" data-testid="card-chart-locations">
                  <CardHeader>
                    <CardTitle className="text-lg">Location Coverage by State</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.locationCoverage.slice(0, 8)} layout="vertical">
                          <XAxis type="number" />
                          <YAxis dataKey="state" type="category" width={50} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Clients */}
              <Card className="border-border" data-testid="card-top-clients">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Clients by Project Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {analytics.topClients.map((client, index) => (
                      <div 
                        key={client.name} 
                        className="flex items-center justify-between p-3 rounded-md bg-secondary/30"
                        data-testid={`client-row-${index}`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-[2rem] justify-center">
                            {index + 1}
                          </Badge>
                          <span className="font-medium truncate max-w-[200px]">{client.name}</span>
                        </div>
                        <Badge variant="secondary">{client.projectCount} projects</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}
