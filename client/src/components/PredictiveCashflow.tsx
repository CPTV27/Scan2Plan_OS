import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  AlertCircle,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";

interface CashflowDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  netCashflow: number;
  projectCount: number;
}

interface ForecastPoint {
  month: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedNetCashflow: number;
  confidence: {
    low: number;
    high: number;
  };
  factors: string[];
}

interface PredictiveCashflowData {
  historicalData: CashflowDataPoint[];
  forecast: ForecastPoint[];
  summary: {
    avgMonthlyRevenue: number;
    avgMonthlyExpenses: number;
    revenueGrowthRate: number;
    nextQuarterProjection: number;
    pipelineValue: number;
    closedWonValue: number;
    confidence: "low" | "medium" | "high";
  };
  insights: string[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatMonth(month: string): string {
  const [year, monthNum] = month.split("-");
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function PredictiveCashflow() {
  const { data, isLoading, error } = useQuery<PredictiveCashflowData>({
    queryKey: ["/api/predictive-cashflow"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Predictive Cashflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Predictive Cashflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Unable to load cashflow data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    ...data.historicalData.map(d => ({
      month: formatMonth(d.month),
      revenue: d.revenue,
      expenses: d.expenses,
      type: "historical" as const,
    })),
    ...data.forecast.map(d => ({
      month: formatMonth(d.month),
      revenue: d.projectedRevenue,
      expenses: d.projectedExpenses,
      confidenceLow: d.confidence.low,
      confidenceHigh: d.confidence.high,
      type: "forecast" as const,
    })),
  ];

  const confidenceColor = {
    low: "bg-red-500/20 text-red-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-green-500/20 text-green-400",
  };

  const growthPositive = data.summary.revenueGrowthRate >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Predictive Cashflow
          </CardTitle>
          <Badge className={confidenceColor[data.summary.confidence]}>
            {data.summary.confidence} confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number) => [formatCurrency(value)]}
                labelFormatter={(label) => `${label}`}
              />
              <ReferenceLine 
                x={formatMonth(data.historicalData[data.historicalData.length - 1]?.month || "")} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="3 3"
                label={{ value: "Forecast", position: "top", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ fill: "hsl(var(--destructive))", strokeWidth: 0, r: 3 }}
                name="Expenses"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avg Monthly</p>
            <p className="text-lg font-semibold" data-testid="text-avg-monthly">
              {formatCurrency(data.summary.avgMonthlyRevenue)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Growth Rate</p>
            <p className={`text-lg font-semibold flex items-center gap-1 ${growthPositive ? "text-green-400" : "text-red-400"}`}>
              {growthPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(data.summary.revenueGrowthRate).toFixed(1)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Next Quarter</p>
            <p className="text-lg font-semibold" data-testid="text-next-quarter">
              {formatCurrency(data.summary.nextQuarterProjection)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pipeline Value</p>
            <p className="text-lg font-semibold flex items-center gap-1" data-testid="text-pipeline-value">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              {formatCurrency(data.summary.pipelineValue)}
            </p>
          </div>
        </div>

        {data.insights.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              AI Insights
            </p>
            <ul className="space-y-1">
              {data.insights.slice(0, 3).map((insight, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <ArrowRight className="h-3 w-3 mt-1.5 flex-shrink-0 text-muted-foreground" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
