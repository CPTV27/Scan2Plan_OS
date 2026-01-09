import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { useLeads } from "@/hooks/use-leads";
import { useProjects } from "@/hooks/use-projects";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, Target, Trophy, DollarSign, 
  Clock, Users, Activity, AlertTriangle, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Zap, Calendar, Brain, RefreshCw, Loader2
} from "lucide-react";
import { differenceInDays, format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import type { Lead, Project } from "@shared/schema";
import { useState } from "react";

const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
  muted: "#64748b",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

const STAGE_COLORS: Record<string, string> = {
  'New': '#64748b',
  'Contacted': '#3b82f6',
  'Proposal': '#8b5cf6',
  'Negotiation': '#f59e0b',
  'Closed Won': '#22c55e',
  'Closed Lost': '#ef4444',
};

const PROJECT_STAGE_COLORS: Record<string, string> = {
  'Scheduling': '#64748b',
  'Scanning': '#3b82f6',
  'Registration': '#8b5cf6',
  'Modeling': '#f59e0b',
  'QC': '#ec4899',
  'Delivered': '#22c55e',
};

export default function Analytics() {
  const { data: leads } = useLeads();
  const { data: projects } = useProjects();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <header className="mb-6">
            <h2 className="text-3xl font-display font-bold" data-testid="text-analytics-title">Analytics</h2>
            <p className="text-muted-foreground mt-1">Deep insights into your sales, production, and revenue performance.</p>
          </header>

          <Tabs defaultValue="sales" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid" data-testid="analytics-tabs">
              <TabsTrigger value="sales" data-testid="tab-sales">Sales</TabsTrigger>
              <TabsTrigger value="winloss" data-testid="tab-winloss">Win/Loss</TabsTrigger>
              <TabsTrigger value="production" data-testid="tab-production">Production</TabsTrigger>
              <TabsTrigger value="forecast" data-testid="tab-forecast">Forecasting</TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
              <TabsTrigger value="insights" data-testid="tab-insights">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-6">
              <SalesAnalytics leads={leads || []} />
            </TabsContent>

            <TabsContent value="winloss" className="space-y-6">
              <WinLossAnalytics />
            </TabsContent>

            <TabsContent value="production" className="space-y-6">
              <ProductionAnalytics projects={projects || []} />
            </TabsContent>

            <TabsContent value="forecast" className="space-y-6">
              <RevenueForecast leads={leads || []} />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <ActivityMetrics leads={leads || []} projects={projects || []} />
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <ResearchInsights />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function SalesAnalytics({ leads }: { leads: Lead[] }) {
  const stageProbabilityDefaults: Record<string, number> = {
    'New': 10, 'Contacted': 25, 'Proposal': 50, 'Negotiation': 75, 'Closed Won': 100, 'Closed Lost': 0,
  };

  const closedWon = leads.filter(l => l.dealStage === 'Closed Won');
  const closedLost = leads.filter(l => l.dealStage === 'Closed Lost');
  const totalClosed = closedWon.length + closedLost.length;
  const winRate = totalClosed > 0 ? Math.round((closedWon.length / totalClosed) * 100) : 0;
  const lossRate = totalClosed > 0 ? Math.round((closedLost.length / totalClosed) * 100) : 0;

  const wonValue = closedWon.reduce((sum, l) => sum + Number(l.value), 0);
  const lostValue = closedLost.reduce((sum, l) => sum + Number(l.value), 0);
  const avgDealSize = closedWon.length > 0 ? wonValue / closedWon.length : 0;

  const stageData = ['New', 'Contacted', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].map(stage => ({
    name: stage === 'Closed Won' ? 'Won' : stage === 'Closed Lost' ? 'Lost' : stage,
    count: leads.filter(l => l.dealStage === stage).length,
    value: leads.filter(l => l.dealStage === stage).reduce((s, l) => s + Number(l.value), 0),
    fill: STAGE_COLORS[stage],
  }));

  const conversionData = [
    { stage: 'New', leads: leads.filter(l => l.dealStage === 'New').length },
    { stage: 'Contacted', leads: leads.filter(l => ['Contacted', 'Proposal', 'Negotiation', 'Closed Won'].includes(l.dealStage)).length },
    { stage: 'Proposal', leads: leads.filter(l => ['Proposal', 'Negotiation', 'Closed Won'].includes(l.dealStage)).length },
    { stage: 'Negotiation', leads: leads.filter(l => ['Negotiation', 'Closed Won'].includes(l.dealStage)).length },
    { stage: 'Won', leads: closedWon.length },
  ];

  const leadSourceData = leads.reduce((acc, lead) => {
    const source = lead.leadSource || 'Direct';
    if (!acc[source]) acc[source] = { name: source, count: 0, value: 0, won: 0 };
    acc[source].count++;
    acc[source].value += Number(lead.value);
    if (lead.dealStage === 'Closed Won') acc[source].won++;
    return acc;
  }, {} as Record<string, { name: string; count: number; value: number; won: number }>);
  const sourceChartData = Object.values(leadSourceData).sort((a, b) => b.value - a.value);

  const staleLeads = leads.filter(l => 
    l.lastContactDate && 
    differenceInDays(new Date(), new Date(l.lastContactDate)) > 14 &&
    !['Closed Won', 'Closed Lost'].includes(l.dealStage)
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Win Rate" 
          value={`${winRate}%`} 
          subtitle={`${closedWon.length} won / ${totalClosed} closed`}
          icon={Trophy}
          trend={winRate >= 50 ? "positive" : "neutral"}
        />
        <MetricCard 
          title="Avg Deal Size" 
          value={`$${Math.round(avgDealSize).toLocaleString()}`} 
          subtitle="Closed won deals"
          icon={DollarSign}
          trend="neutral"
        />
        <MetricCard 
          title="Revenue Won" 
          value={`$${wonValue.toLocaleString()}`} 
          subtitle="Total closed revenue"
          icon={TrendingUp}
          trend="positive"
        />
        <MetricCard 
          title="Revenue Lost" 
          value={`$${lostValue.toLocaleString()}`} 
          subtitle={`${closedLost.length} deals lost`}
          icon={TrendingDown}
          trend="negative"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
            <CardDescription>Deal count and value by sales stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => `$${v/1000}k`} stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Lead progression through stages</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={conversionData}>
                <XAxis dataKey="stage" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  stroke={CHART_COLORS.primary} 
                  fill={CHART_COLORS.primary} 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Source Performance</CardTitle>
            <CardDescription>Revenue and conversion by source</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {sourceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [
                      name === 'value' ? `$${value.toLocaleString()}` : value,
                      name === 'value' ? 'Pipeline Value' : name === 'won' ? 'Deals Won' : 'Total Leads'
                    ]}
                  />
                  <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No lead source data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Stale Leads Alert
            </CardTitle>
            <CardDescription>Leads with no contact in 14+ days</CardDescription>
          </CardHeader>
          <CardContent>
            {staleLeads.length > 0 ? (
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
                {staleLeads.slice(0, 5).map(lead => (
                  <div key={lead.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{lead.clientName}</p>
                      <p className="text-sm text-muted-foreground truncate">{lead.projectAddress}</p>
                    </div>
                    <div className="text-right ml-4">
                      <Badge variant="destructive" className="text-xs">
                        {differenceInDays(new Date(), new Date(lead.lastContactDate!))}d ago
                      </Badge>
                      <p className="text-sm font-medium mt-1">${Number(lead.value).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {staleLeads.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{staleLeads.length - 5} more stale leads
                  </p>
                )}
              </div>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 text-success mb-3" />
                <p>All leads are actively managed</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ProductionAnalytics({ projects }: { projects: Project[] }) {
  const stages = ['Scheduling', 'Scanning', 'Registration', 'Modeling', 'QC', 'Delivered'];
  
  const stageData = stages.map(stage => ({
    name: stage,
    count: projects.filter(p => p.status === stage).length,
    fill: PROJECT_STAGE_COLORS[stage],
  }));

  const priorityData = [
    { name: 'High', count: projects.filter(p => p.priority === 'High').length, fill: CHART_COLORS.danger },
    { name: 'Medium', count: projects.filter(p => p.priority === 'Medium').length, fill: CHART_COLORS.warning },
    { name: 'Low', count: projects.filter(p => p.priority === 'Low').length, fill: CHART_COLORS.success },
  ];

  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
    : 0;

  const activeProjects = projects.filter(p => p.status !== 'Delivered');
  const deliveredProjects = projects.filter(p => p.status === 'Delivered');
  const completionRate = projects.length > 0 
    ? Math.round((deliveredProjects.length / projects.length) * 100)
    : 0;

  const overdueProjects = projects.filter(p => 
    p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'Delivered'
  );

  const bottleneckStage = stageData
    .filter(s => s.name !== 'Delivered')
    .sort((a, b) => b.count - a.count)[0];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Active Projects" 
          value={activeProjects.length.toString()} 
          subtitle="In production"
          icon={Activity}
          trend="neutral"
        />
        <MetricCard 
          title="Completion Rate" 
          value={`${completionRate}%`} 
          subtitle={`${deliveredProjects.length} delivered`}
          icon={CheckCircle2}
          trend={completionRate >= 70 ? "positive" : "neutral"}
        />
        <MetricCard 
          title="Avg Progress" 
          value={`${avgProgress}%`} 
          subtitle="Across all active"
          icon={Target}
          trend="neutral"
        />
        <MetricCard 
          title="Overdue" 
          value={overdueProjects.length.toString()} 
          subtitle="Past due date"
          icon={Clock}
          trend={overdueProjects.length > 0 ? "negative" : "positive"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Projects by Stage</CardTitle>
            <CardDescription>Current distribution across workflow</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Projects by priority level</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData.filter(d => d.count > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              Bottleneck Detection
            </CardTitle>
            <CardDescription>Stages with highest project concentration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stageData.filter(s => s.name !== 'Delivered').map(stage => {
                const isBottleneck = stage.name === bottleneckStage?.name && stage.count > 1;
                return (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium flex items-center gap-2">
                        {stage.name}
                        {isBottleneck && <Badge variant="destructive" className="text-xs">Bottleneck</Badge>}
                      </span>
                      <span className="text-muted-foreground">{stage.count} projects</span>
                    </div>
                    <Progress 
                      value={projects.length > 0 ? (stage.count / projects.length) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue Projects</CardTitle>
            <CardDescription>Projects past their due date</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueProjects.length > 0 ? (
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
                {overdueProjects.map(project => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.status}</p>
                    </div>
                    <div className="text-right ml-4">
                      <Badge variant="destructive" className="text-xs">
                        {differenceInDays(new Date(), new Date(project.dueDate!))}d overdue
                      </Badge>
                      <Progress value={project.progress || 0} className="h-1.5 mt-2 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 text-success mb-3" />
                <p>No overdue projects</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function RevenueForecast({ leads }: { leads: Lead[] }) {
  const stageProbabilityDefaults: Record<string, number> = {
    'New': 10, 'Contacted': 25, 'Proposal': 50, 'Negotiation': 75, 'Closed Won': 100, 'Closed Lost': 0,
  };

  const totalPipeline = leads
    .filter(l => !['Closed Won', 'Closed Lost'].includes(l.dealStage))
    .reduce((sum, l) => sum + Number(l.value), 0);

  const weightedForecast = leads
    .filter(l => !['Closed Won', 'Closed Lost'].includes(l.dealStage))
    .reduce((sum, l) => {
      const prob = l.probability ?? stageProbabilityDefaults[l.dealStage] ?? 0;
      return sum + (Number(l.value) * prob / 100);
    }, 0);

  const closedWonValue = leads
    .filter(l => l.dealStage === 'Closed Won')
    .reduce((sum, l) => sum + Number(l.value), 0);

  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date(),
  });

  const monthlyData = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthLeads = leads.filter(l => {
      const created = new Date(l.createdAt!);
      return created >= monthStart && created <= monthEnd;
    });
    
    const monthWon = monthLeads.filter(l => l.dealStage === 'Closed Won');
    
    return {
      month: format(month, 'MMM'),
      pipeline: monthLeads.reduce((s, l) => s + Number(l.value), 0),
      won: monthWon.reduce((s, l) => s + Number(l.value), 0),
      deals: monthLeads.length,
    };
  });

  const activeLeads = leads.filter(l => !['Closed Won', 'Closed Lost'].includes(l.dealStage));
  const avgDaysInPipeline = activeLeads.length > 0
    ? Math.round(activeLeads.reduce((sum, l) => sum + differenceInDays(new Date(), new Date(l.createdAt!)), 0) / activeLeads.length)
    : 0;

  const dealVelocityData = [
    { 
      stage: 'New', 
      avgDays: Math.round(leads.filter(l => l.dealStage === 'New').reduce((s, l) => s + differenceInDays(new Date(), new Date(l.createdAt!)), 0) / (leads.filter(l => l.dealStage === 'New').length || 1)),
    },
    { 
      stage: 'Contacted', 
      avgDays: Math.round(leads.filter(l => l.dealStage === 'Contacted').reduce((s, l) => s + differenceInDays(new Date(), new Date(l.createdAt!)), 0) / (leads.filter(l => l.dealStage === 'Contacted').length || 1)),
    },
    { 
      stage: 'Proposal', 
      avgDays: Math.round(leads.filter(l => l.dealStage === 'Proposal').reduce((s, l) => s + differenceInDays(new Date(), new Date(l.createdAt!)), 0) / (leads.filter(l => l.dealStage === 'Proposal').length || 1)),
    },
    { 
      stage: 'Negotiation', 
      avgDays: Math.round(leads.filter(l => l.dealStage === 'Negotiation').reduce((s, l) => s + differenceInDays(new Date(), new Date(l.createdAt!)), 0) / (leads.filter(l => l.dealStage === 'Negotiation').length || 1)),
    },
  ];

  const forecastByStage = ['New', 'Contacted', 'Proposal', 'Negotiation'].map(stage => {
    const stageLeads = leads.filter(l => l.dealStage === stage);
    const prob = stageProbabilityDefaults[stage];
    return {
      stage,
      raw: stageLeads.reduce((s, l) => s + Number(l.value), 0),
      weighted: stageLeads.reduce((s, l) => s + Number(l.value) * prob / 100, 0),
      count: stageLeads.length,
    };
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Open Pipeline" 
          value={`$${Math.round(totalPipeline).toLocaleString()}`} 
          subtitle="Raw value"
          icon={Target}
          trend="neutral"
        />
        <MetricCard 
          title="Weighted Forecast" 
          value={`$${Math.round(weightedForecast).toLocaleString()}`} 
          subtitle="Probability-adjusted"
          icon={TrendingUp}
          trend="positive"
          highlight
        />
        <MetricCard 
          title="Closed Revenue" 
          value={`$${closedWonValue.toLocaleString()}`} 
          subtitle="Total won"
          icon={DollarSign}
          trend="positive"
        />
        <MetricCard 
          title="Avg Days in Pipe" 
          value={avgDaysInPipeline.toString()} 
          subtitle="Deal velocity"
          icon={Clock}
          trend={avgDaysInPipeline < 30 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Pipeline Trend</CardTitle>
            <CardDescription>Pipeline value and closed revenue over 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Line type="monotone" dataKey="pipeline" stroke={CHART_COLORS.muted} strokeWidth={2} name="Pipeline" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="won" stroke={CHART_COLORS.success} strokeWidth={2} name="Closed Won" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forecast by Stage</CardTitle>
            <CardDescription>Raw vs weighted value per stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastByStage}>
                <XAxis dataKey="stage" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Bar dataKey="raw" fill={CHART_COLORS.muted} name="Raw Value" radius={[4, 4, 0, 0]} />
                <Bar dataKey="weighted" fill={CHART_COLORS.primary} name="Weighted" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deal Velocity</CardTitle>
            <CardDescription>Average days in each stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealVelocityData} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="stage" stroke="#64748b" fontSize={12} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value} days`, 'Avg Time']}
                />
                <Bar dataKey="avgDays" fill={CHART_COLORS.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ActivityMetrics({ leads, projects }: { leads: Lead[]; projects: Project[] }) {
  const today = new Date();
  const last7Days = leads.filter(l => 
    l.lastContactDate && differenceInDays(today, new Date(l.lastContactDate)) <= 7
  );
  const last30Days = leads.filter(l => 
    l.lastContactDate && differenceInDays(today, new Date(l.lastContactDate)) <= 30
  );

  const recentlyCreatedLeads = leads.filter(l => 
    l.createdAt && differenceInDays(today, new Date(l.createdAt)) <= 7
  );

  const recentlyCreatedProjects = projects.filter(p => 
    p.createdAt && differenceInDays(today, new Date(p.createdAt)) <= 7
  );

  const avgResponseTime = leads.length > 0
    ? Math.round(leads.reduce((sum, l) => {
        if (!l.lastContactDate || !l.createdAt) return sum;
        return sum + differenceInDays(new Date(l.lastContactDate), new Date(l.createdAt));
      }, 0) / leads.length)
    : 0;

  const activityByDay = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    const dayLeads = leads.filter(l => 
      l.lastContactDate && 
      format(new Date(l.lastContactDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return {
      day: format(date, 'EEE'),
      contacts: dayLeads.length,
      value: dayLeads.reduce((s, l) => s + Number(l.value), 0),
    };
  });

  const topDeals = [...leads]
    .filter(l => !['Closed Won', 'Closed Lost'].includes(l.dealStage))
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Contacts (7d)" 
          value={last7Days.length.toString()} 
          subtitle="Leads touched this week"
          icon={Users}
          trend="neutral"
        />
        <MetricCard 
          title="Contacts (30d)" 
          value={last30Days.length.toString()} 
          subtitle="Leads touched this month"
          icon={Calendar}
          trend="neutral"
        />
        <MetricCard 
          title="New Leads (7d)" 
          value={recentlyCreatedLeads.length.toString()} 
          subtitle="Added this week"
          icon={ArrowUpRight}
          trend={recentlyCreatedLeads.length > 0 ? "positive" : "neutral"}
        />
        <MetricCard 
          title="Avg Response" 
          value={`${avgResponseTime}d`} 
          subtitle="Time to first contact"
          icon={Clock}
          trend={avgResponseTime < 3 ? "positive" : "negative"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Lead contacts and pipeline value over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityByDay}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [
                    name === 'value' ? `$${value.toLocaleString()}` : value,
                    name === 'contacts' ? 'Contacts' : 'Pipeline Value'
                  ]}
                />
                <Legend />
                <Bar dataKey="contacts" fill={CHART_COLORS.primary} name="Contacts" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Active Deals</CardTitle>
            <CardDescription>Highest value open opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDeals.map((lead, i) => (
                <div key={lead.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{lead.clientName}</p>
                    <p className="text-sm text-muted-foreground truncate">{lead.projectAddress}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(lead.value).toLocaleString()}</p>
                    <Badge variant="secondary" className="text-xs">{lead.dealStage}</Badge>
                  </div>
                </div>
              ))}
              {topDeals.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No active deals</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity Summary</CardTitle>
            <CardDescription>Quick stats for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span>New Leads</span>
                </div>
                <span className="font-bold">{recentlyCreatedLeads.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-400" />
                  <span>New Projects</span>
                </div>
                <span className="font-bold">{recentlyCreatedProjects.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-success" />
                  <span>Pipeline Added</span>
                </div>
                <span className="font-bold">
                  ${recentlyCreatedLeads.reduce((s, l) => s + Number(l.value), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-warning" />
                  <span>Deals Won (7d)</span>
                </div>
                <span className="font-bold">
                  {leads.filter(l => 
                    l.dealStage === 'Closed Won' && 
                    l.updatedAt && 
                    differenceInDays(today, new Date(l.updatedAt)) <= 7
                  ).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  highlight 
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'positive' | 'negative' | 'neutral';
  highlight?: boolean;
}) {
  const trendColors = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card className={highlight ? 'ring-2 ring-primary/30 bg-primary/5' : ''}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className={`text-2xl font-bold mt-1 ${trendColors[trend]}`}>{value}</h3>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-2 rounded-lg ${highlight ? 'bg-primary/20' : 'bg-secondary/50'}`}>
            <Icon className={`h-5 w-5 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ResearchInsightsData {
  totalResearchCount: number;
  clientsResearched: number;
  researchByType: {
    client: number;
    property: number;
    competitor: number;
    regulatory: number;
    expansion: number;
  };
  insights: string;
  generatedAt: string;
}

function ResearchInsights() {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { data, isLoading, isError, refetch, isFetching } = useQuery<ResearchInsightsData>({
    queryKey: ['/api/research/insights', refreshKey],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium">Failed to load research insights</p>
          <p className="text-muted-foreground mt-1">This feature is available to CEOs only.</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const researchTypes = [
    { key: 'client', label: 'Client Intelligence', color: CHART_COLORS.primary },
    { key: 'property', label: 'Property Research', color: CHART_COLORS.accent },
    { key: 'competitor', label: 'Competitor Analysis', color: CHART_COLORS.warning },
    { key: 'regulatory', label: 'Regulatory Intel', color: CHART_COLORS.purple },
    { key: 'expansion', label: 'Expansion Opps', color: CHART_COLORS.success },
  ];

  const typeData = researchTypes.map(t => ({
    name: t.label,
    value: data?.researchByType[t.key as keyof typeof data.researchByType] || 0,
    fill: t.color,
  }));

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Research Insights
          </h3>
          <p className="text-sm text-muted-foreground">
            Strategic analysis of accumulated client and property research
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isFetching}
          data-testid="button-refresh-insights"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Research" 
          value={(data?.totalResearchCount || 0).toString()} 
          subtitle="Intelligence reports generated"
          icon={Brain}
          trend="neutral"
        />
        <MetricCard 
          title="Clients Researched" 
          value={(data?.clientsResearched || 0).toString()} 
          subtitle="Unique leads analyzed"
          icon={Users}
          trend="neutral"
        />
        <MetricCard 
          title="Client Intel" 
          value={(data?.researchByType?.client || 0).toString()} 
          subtitle="Margin protection insights"
          icon={Target}
          trend="neutral"
        />
        <MetricCard 
          title="Property Intel" 
          value={(data?.researchByType?.property || 0).toString()} 
          subtitle="Site complexity scores"
          icon={Activity}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Strategic Insights
            </CardTitle>
            <CardDescription>
              AI-generated analysis based on your accumulated research data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.insights ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed" data-testid="text-research-insights">
                  {data.insights}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No research data available yet.</p>
                <p className="text-sm mt-1">Use the "Analyze Client" and "Research Site" buttons on deals to build intelligence.</p>
              </div>
            )}
            {data?.generatedAt && (
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                Generated: {format(new Date(data.generatedAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Research Distribution</CardTitle>
            <CardDescription>By intelligence type</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data && data.totalResearchCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Brain className="h-12 w-12 mb-3 opacity-50" />
                <p>No research data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

interface WinLossData {
  overall: { totalWon: number; totalLost: number; winRate: number; avgWonValue: number; avgLostValue: number };
  byBuildingType: Array<{ type: string; won: number; lost: number; winRate: number; avgValue: number }>;
  byValueBand: Array<{ band: string; won: number; lost: number; winRate: number }>;
  byLeadSource: Array<{ source: string; won: number; lost: number; winRate: number; totalValue: number }>;
  byMonth: Array<{ month: string; won: number; lost: number; winRate: number }>;
}

function WinLossAnalytics() {
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  const { data, isLoading, refetch } = useQuery<WinLossData>({
    queryKey: ["/api/analytics/win-loss"],
  });

  const handleRecalculateProbabilities = async () => {
    setIsRecalculating(true);
    try {
      const response = await fetch("/api/probability/recalculate", { method: "POST" });
      const result = await response.json();
      console.log("Recalculated probabilities:", result);
      refetch();
    } catch (error) {
      console.error("Failed to recalculate probabilities:", error);
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No win/loss data available
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Win/Loss Intelligence</h3>
          <p className="text-sm text-muted-foreground">Patterns from historical deal outcomes</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRecalculateProbabilities}
          disabled={isRecalculating}
          data-testid="button-recalculate-probabilities"
        >
          {isRecalculating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Recalculate Probabilities
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard 
          title="Win Rate" 
          value={`${data.overall.winRate}%`}
          subtitle={`${data.overall.totalWon} won / ${data.overall.totalWon + data.overall.totalLost} closed`}
          icon={Trophy}
          trend={data.overall.winRate >= 50 ? "positive" : "negative"}
        />
        <MetricCard 
          title="Deals Won" 
          value={data.overall.totalWon.toString()}
          subtitle={`$${Math.round(data.overall.avgWonValue).toLocaleString()} avg`}
          icon={CheckCircle2}
          trend="positive"
        />
        <MetricCard 
          title="Deals Lost" 
          value={data.overall.totalLost.toString()}
          subtitle={`$${Math.round(data.overall.avgLostValue).toLocaleString()} avg`}
          icon={AlertTriangle}
          trend="negative"
        />
        <MetricCard 
          title="Avg Won Value" 
          value={`$${Math.round(data.overall.avgWonValue).toLocaleString()}`}
          subtitle="Per closed won deal"
          icon={DollarSign}
          trend="positive"
        />
        <MetricCard 
          title="Avg Lost Value" 
          value={`$${Math.round(data.overall.avgLostValue).toLocaleString()}`}
          subtitle="Per closed lost deal"
          icon={TrendingDown}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Win Rate by Building Type</CardTitle>
            <CardDescription>Which building types convert best?</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data.byBuildingType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byBuildingType.slice(0, 8)} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="type" stroke="#64748b" fontSize={11} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [
                      name === 'winRate' ? `${value}%` : value,
                      name === 'winRate' ? 'Win Rate' : name === 'won' ? 'Won' : 'Lost'
                    ]}
                  />
                  <Bar dataKey="winRate" fill={CHART_COLORS.success} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No building type data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win Rate by Deal Size</CardTitle>
            <CardDescription>How size affects conversion</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byValueBand}>
                <XAxis dataKey="band" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [
                    name === 'winRate' ? `${value}%` : value,
                    name === 'winRate' ? 'Win Rate' : name === 'won' ? 'Won' : 'Lost'
                  ]}
                />
                <Bar dataKey="winRate" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Win Rate by Lead Source</CardTitle>
            <CardDescription>Partner performance analysis</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data.byLeadSource.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byLeadSource.slice(0, 6)} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="source" stroke="#64748b" fontSize={11} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [
                      name === 'winRate' ? `${value}%` : name === 'totalValue' ? `$${value.toLocaleString()}` : value,
                      name === 'winRate' ? 'Win Rate' : name === 'totalValue' ? 'Total Value' : name
                    ]}
                  />
                  <Bar dataKey="winRate" fill={CHART_COLORS.purple} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No lead source data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Referral Source</CardTitle>
            <CardDescription>Which sources generate the most money?</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data.byLeadSource.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byLeadSource.filter(s => s.totalValue > 0).sort((a, b) => b.totalValue - a.totalValue).slice(0, 8)}>
                  <XAxis dataKey="source" stroke="#64748b" fontSize={11} angle={-30} textAnchor="end" height={70} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="totalValue" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No revenue data by source
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Win Rate Trend</CardTitle>
            <CardDescription>Historical performance</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data.byMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.byMonth}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [
                      name === 'winRate' ? `${value}%` : value,
                      name === 'winRate' ? 'Win Rate' : name === 'won' ? 'Won' : 'Lost'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="winRate" 
                    stroke={CHART_COLORS.success} 
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.success }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No monthly data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Building Type Performance Table</CardTitle>
          <CardDescription>Detailed breakdown by property type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Building Type</th>
                  <th className="text-center py-3 px-4 font-medium">Won</th>
                  <th className="text-center py-3 px-4 font-medium">Lost</th>
                  <th className="text-center py-3 px-4 font-medium">Win Rate</th>
                  <th className="text-right py-3 px-4 font-medium">Avg Deal Size</th>
                </tr>
              </thead>
              <tbody>
                {data.byBuildingType.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{row.type}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400">{row.won}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="secondary" className="bg-red-500/20 text-red-400">{row.lost}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={row.winRate >= 50 ? 'text-green-400' : row.winRate >= 25 ? 'text-amber-400' : 'text-red-400'}>
                        {row.winRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      ${Math.round(row.avgValue).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
