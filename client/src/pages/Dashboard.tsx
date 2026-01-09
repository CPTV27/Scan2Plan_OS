import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { useLeads } from "@/hooks/use-leads";
import { useProjects } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, FolderKanban, TrendingUp, AlertTriangle, Target, Trophy, DollarSign, TrendingDown, Mail, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";
import { AIAssistant, AIInsightsWidget } from "@/components/AIAssistant";
import { GoogleWorkspaceWidget } from "@/components/GoogleWorkspaceWidget";
import { CalendarDayWidget } from "@/components/CalendarDayWidget";
import { useQuery } from "@tanstack/react-query";

interface ProfitabilityStats {
  totalRevenue: number;
  totalExpenses: number;
  profitMargin: number;
  byLead: Array<{ 
    leadId: number; 
    clientName: string; 
    revenue: number; 
    expenses: number; 
    profit: number; 
    margin: number;
  }>;
}

export default function Dashboard() {
  const { data: leads } = useLeads();
  const { data: projects } = useProjects();
  
  // Fetch profitability data (from QuickBooks sync)
  const { data: profitability, isLoading: profitabilityLoading, error: profitabilityError } = useQuery<ProfitabilityStats>({
    queryKey: ["/api/analytics/profitability"],
  });

  // Calculate raw pipeline value
  const totalPipeline = leads?.reduce((sum, l) => sum + Number(l.value), 0) || 0;
  
  // Stage-based default probabilities (0-100 scale)
  const stageProbabilityDefaults: Record<string, number> = {
    'New': 10,
    'Contacted': 25,
    'Proposal': 50,
    'Negotiation': 75,
    'Closed Won': 100,
    'Closed Lost': 0,
  };
  
  // Calculate weighted/forecasted revenue based on probability (uses ?? for 0 handling)
  const forecastedRevenue = leads?.reduce((sum, l) => {
    const value = Number(l.value) || 0;
    const probability = l.probability ?? stageProbabilityDefaults[l.dealStage] ?? 0;
    return sum + (value * probability / 100);
  }, 0) || 0;
  
  // Calculate win rate (closed won vs total closed)
  const closedWon = leads?.filter(l => l.dealStage === 'Closed Won').length || 0;
  const closedLost = leads?.filter(l => l.dealStage === 'Closed Lost').length || 0;
  const totalClosed = closedWon + closedLost;
  const winRate = totalClosed > 0 ? Math.round((closedWon / totalClosed) * 100) : 0;
  
  const activeProjects = projects?.filter(p => p.status !== "Delivered").length || 0;
  const staleLeads = leads?.filter(l => l.lastContactDate && differenceInDays(new Date(), new Date(l.lastContactDate)) > 14).length || 0;
  
  // Prepare chart data with both raw and weighted values
  const pipelineData = [
    { name: 'New', value: 0, weighted: 0 },
    { name: 'Contacted', value: 0, weighted: 0 },
    { name: 'Proposal', value: 0, weighted: 0 },
    { name: 'Negotiation', value: 0, weighted: 0 },
    { name: 'Won', value: 0, weighted: 0 },
  ];

  leads?.forEach(lead => {
    const stage = lead.dealStage === 'Closed Won' ? 'Won' : lead.dealStage;
    const index = pipelineData.findIndex(d => d.name === stage);
    if (index !== -1) {
      const value = Number(lead.value) || 0;
      const probability = lead.probability ?? stageProbabilityDefaults[lead.dealStage] ?? 0;
      pipelineData[index].value += value;
      pipelineData[index].weighted += value * probability / 100;
    }
  });


  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-display font-bold">Command Center</h2>
            <p className="text-muted-foreground mt-1">Real-time overview of your scanning operations.</p>
          </div>
          <AIAssistant />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard 
            title="Total Pipeline" 
            value={`$${totalPipeline.toLocaleString()}`} 
            icon={TrendingUp} 
            trend="All open deals"
            color="text-muted-foreground"
          />
          <StatCard 
            title="Forecasted Revenue" 
            value={`$${Math.round(forecastedRevenue).toLocaleString()}`} 
            icon={Target} 
            trend="Probability-weighted"
            color="text-primary"
            highlight
          />
          <StatCard 
            title="Win Rate" 
            value={`${winRate}%`} 
            icon={Trophy} 
            trend={`${closedWon} won / ${totalClosed} closed`}
            color="text-accent"
          />
          <StatCard 
            title="Active Projects" 
            value={activeProjects.toString()} 
            icon={FolderKanban} 
            trend="In production"
            color="text-blue-400"
          />
          <StatCard 
            title="Stale Leads" 
            value={staleLeads.toString()} 
            icon={AlertTriangle} 
            trend="No contact > 14 days"
            color="text-destructive"
          />
        </div>

        {/* Google Workspace & Calendar - High Visibility Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <CalendarDayWidget />
          <GoogleWorkspaceWidget />
        </div>

        {/* Rotting Deal Tracker - Sales Velocity */}
        <RottenDealTracker leads={leads || []} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart - Pipeline vs Forecast */}
          <Card className="lg:col-span-2 border-border shadow-md row-span-1">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Pipeline vs Forecasted Revenue</CardTitle>
                <CardDescription>Raw pipeline value vs probability-weighted forecast by stage</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-slate-400" />
                  <span className="text-muted-foreground">Pipeline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-muted-foreground">Forecast</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} barGap={2}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    formatter={(value: number, name: string) => [
                      `$${value.toLocaleString()}`, 
                      name === 'value' ? 'Raw Pipeline' : 'Forecasted'
                    ]}
                  />
                  <Bar dataKey="value" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Pipeline" />
                  <Bar dataKey="weighted" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Forecast" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity / Quick Stats */}
          <Card className="border-border shadow-md">
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
              <CardDescription>Current project distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {['Scheduling', 'Scanning', 'Registration', 'Modeling', 'QC', 'Delivered'].map((status) => {
                const count = projects?.filter(p => p.status === status).length || 0;
                const total = projects?.length || 1;
                const percentage = Math.round((count / total) * 100);
                
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-muted-foreground">{status}</span>
                      <span className="text-foreground font-bold">{count}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary/80 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* AI Insights */}
          <div className="lg:col-span-2">
            <AIInsightsWidget />
          </div>

          {/* ABM Target Account Penetration */}
          <ABMPenetrationWidget />

          {/* Profitability Analytics */}
          {profitability && profitability.totalRevenue > 0 && (
            <Card className="lg:col-span-3 border-border shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Profitability Analytics
                  </CardTitle>
                  <CardDescription>Revenue vs expenses from QuickBooks integration</CardDescription>
                </div>
                <div className="flex items-center gap-6 text-sm flex-wrap">
                  <div className="text-right">
                    <p className="text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-green-500">${profitability.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Total Expenses</p>
                    <p className="text-xl font-bold text-red-400">${profitability.totalExpenses.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Profit Margin</p>
                    <p className={`text-xl font-bold ${profitability.profitMargin >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {profitability.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Top Deals by Profit</p>
                  {profitability.byLead.slice(0, 5).map((deal) => (
                    <div key={deal.leadId} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-secondary/30">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{deal.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Revenue: ${deal.revenue.toLocaleString()} | Expenses: ${deal.expenses.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold ${deal.profit >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          ${deal.profit.toLocaleString()}
                        </p>
                        <p className={`text-xs ${deal.margin >= 0 ? 'text-green-500/70' : 'text-red-400/70'}`}>
                          {deal.margin.toFixed(1)}% margin
                        </p>
                      </div>
                    </div>
                  ))}
                  {profitability.byLead.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Link expenses to deals in the Sales page to see profitability data
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color, highlight }: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`border-border shadow-sm hover:shadow-md transition-all duration-200 ${
      highlight ? 'ring-2 ring-primary/30 bg-primary/5' : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className={`text-2xl font-bold mt-2 ${color}`}>{value}</h3>
          </div>
          <div className={`p-2 rounded-lg ${highlight ? 'bg-primary/20' : 'bg-secondary/50'} ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4 font-medium">{trend}</p>
      </CardContent>
    </Card>
  );
}

interface Lead {
  id: number;
  clientName: string;
  projectName?: string | null;
  projectAddress?: string | null;
  contactEmail?: string | null;
  contactName?: string | null;
  value?: string | null;
  dealStage: string;
  lastContactDate?: Date | string | null;
}

function RottenDealTracker({ leads }: { leads: Lead[] }) {
  const proposalLeads = leads
    .filter(l => l.dealStage === 'Proposal' || l.dealStage === 'Proposal Sent')
    .map(l => {
      const lastContact = l.lastContactDate ? new Date(l.lastContactDate) : new Date();
      const daysSinceContact = differenceInDays(new Date(), lastContact);
      let status: 'fresh' | 'aging' | 'stale';
      if (daysSinceContact < 3) status = 'fresh';
      else if (daysSinceContact <= 7) status = 'aging';
      else status = 'stale';
      return { ...l, daysSinceContact, status };
    })
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);

  const staleCount = proposalLeads.filter(l => l.status === 'stale').length;

  const handleNudge = (lead: Lead) => {
    const email = lead.contactEmail || '';
    const subject = encodeURIComponent(`Following up: ${lead.projectName || lead.clientName}`);
    const body = encodeURIComponent(
`Hi ${lead.contactName?.split(',')[0]?.trim() || 'there'},

I wanted to follow up on our proposal for ${lead.projectName || 'your project'}. 

Do you have any questions or need any clarification on the scope or pricing?

Looking forward to hearing from you.

Best regards`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  if (proposalLeads.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8 border-border shadow-md" data-testid="card-rotting-deals">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Rotting Deals
          </CardTitle>
          <CardDescription>Proposals awaiting response - sorted by staleness</CardDescription>
        </div>
        {staleCount > 0 && (
          <Badge variant="destructive" data-testid="badge-stale-count">
            {staleCount} stale
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {proposalLeads.map((lead) => (
            <div 
              key={lead.id}
              data-testid={`row-rotting-deal-${lead.id}`}
              className={`flex items-center justify-between gap-4 p-3 rounded-lg ${
                lead.status === 'stale' 
                  ? 'bg-destructive/10 border border-destructive/30' 
                  : lead.status === 'aging'
                  ? 'bg-orange-500/10 border border-orange-500/30'
                  : 'bg-secondary/30'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{lead.clientName}</p>
                  <Badge 
                    variant={lead.status === 'stale' ? 'destructive' : lead.status === 'aging' ? 'outline' : 'secondary'}
                    className={lead.status === 'aging' ? 'border-orange-500 text-orange-500' : ''}
                  >
                    {lead.status === 'fresh' ? 'Fresh' : lead.status === 'aging' ? 'Aging' : 'Stale'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {lead.projectName || lead.projectAddress || 'No project details'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lead.daysSinceContact} days since last contact
                  {lead.value && ` | $${Number(lead.value).toLocaleString()}`}
                </p>
              </div>
              <Button
                size="sm"
                variant={lead.status === 'stale' ? 'destructive' : 'outline'}
                onClick={() => handleNudge(lead)}
                disabled={!lead.contactEmail}
                data-testid={`button-nudge-${lead.id}`}
              >
                <Mail className="h-4 w-4 mr-1" />
                Nudge
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ABMPenetration {
  total: number;
  engaged: number;
  percentage: number;
}

function ABMPenetrationWidget() {
  const { data: penetration, isLoading } = useQuery<ABMPenetration>({
    queryKey: ["/api/analytics/abm-penetration"],
  });

  const percentage = penetration?.percentage || 0;
  const total = penetration?.total || 0;
  const engaged = penetration?.engaged || 0;

  return (
    <Card className="border-border shadow-md" data-testid="card-abm-penetration">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Target Account Penetration
        </CardTitle>
        <CardDescription>Tier A accounts with engagement in last 90 days</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Ring */}
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    className="stroke-secondary"
                    strokeWidth="10"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  {/* Progress circle */}
                  <circle
                    className="stroke-primary transition-all duration-500"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 40}`,
                      strokeDashoffset: `${2 * Math.PI * 40 * (1 - percentage / 100)}`,
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%'
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{percentage}%</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{engaged}</p>
                <p className="text-xs text-muted-foreground">Engaged</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{total}</p>
                <p className="text-xs text-muted-foreground">Total Tier A</p>
              </div>
            </div>

            {total === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Tag leads as "Tier A" in ABM tier field to track penetration
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
