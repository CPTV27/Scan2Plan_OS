/**
 * Predictive Cashflow Service
 * 
 * Uses historical project data to forecast future revenue and cash flow.
 * Implements simple exponential smoothing and Monte Carlo simulation
 * for realistic financial projections.
 */

import { db } from "./db";
import { leads, projects, invoices } from "@shared/schema";
import { eq, gte, lte, and, sql } from "drizzle-orm";

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

interface PredictiveCashflowResult {
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

/**
 * Calculate simple exponential smoothing forecast
 */
function exponentialSmoothing(data: number[], alpha: number = 0.3): number[] {
  if (data.length === 0) return [];
  
  const smoothed: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

/**
 * Calculate trend from historical data
 */
function calculateTrend(data: number[]): number {
  if (data.length < 2) return 0;
  
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope || 0;
}

/**
 * Monte Carlo simulation for confidence intervals
 */
function monteCarloSimulation(
  baseValue: number, 
  volatility: number, 
  iterations: number = 200 // Reduced from 1000 for performance
): { low: number; high: number } {
  if (baseValue <= 0 || !isFinite(volatility)) {
    return { low: 0, high: baseValue };
  }
  
  const results: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    // Random walk with normal distribution approximation
    const randomFactor = 1 + (Math.random() - 0.5) * Math.min(volatility, 1) * 2;
    results.push(baseValue * randomFactor);
  }
  
  results.sort((a, b) => a - b);
  
  // 90% confidence interval
  const lowIndex = Math.floor(iterations * 0.05);
  const highIndex = Math.floor(iterations * 0.95);
  
  return {
    low: Math.max(0, results[lowIndex]),
    high: results[highIndex],
  };
}

/**
 * Get historical cashflow data from the database
 */
async function getHistoricalCashflow(monthsBack: number = 12): Promise<CashflowDataPoint[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  
  const result: CashflowDataPoint[] = [];
  
  // Get closed won leads with deal values
  const closedLeads = await db
    .select({
      value: leads.value,
      closedAt: leads.lastContactDate,
    })
    .from(leads)
    .where(eq(leads.dealStage, "Closed Won"));
  
  // Get completed projects
  const completedProjects = await db
    .select({
      id: projects.id,
      leadId: projects.leadId,
    })
    .from(projects)
    .where(eq(projects.status, "Delivered"));
  
  // Get paid invoices
  const paidInvoiceData = await db
    .select({
      totalAmount: invoices.totalAmount,
      paidDate: invoices.paidDate,
    })
    .from(invoices)
    .where(eq(invoices.status, "Paid"));
  
  // Group by month
  const monthlyData = new Map<string, { revenue: number; expenses: number; projectCount: number }>();
  
  // Initialize months
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData.set(monthKey, { revenue: 0, expenses: 0, projectCount: 0 });
  }
  
  // Track closed leads for project count only (avoid double-counting with invoices)
  for (const lead of closedLeads) {
    if (lead.closedAt) {
      const date = new Date(lead.closedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey);
      if (existing) {
        existing.projectCount += 1;
      }
    }
  }
  
  // Use paid invoices as the primary revenue source (avoids double-counting)
  for (const invoice of paidInvoiceData) {
    if (invoice.paidDate && invoice.totalAmount) {
      const date = new Date(invoice.paidDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey);
      if (existing) {
        existing.revenue += Number(invoice.totalAmount);
      }
    }
  }
  
  // If no invoice data exists, fall back to closed lead values
  const totalInvoiceRevenue = paidInvoiceData.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  if (totalInvoiceRevenue === 0) {
    for (const lead of closedLeads) {
      if (lead.closedAt && lead.value) {
        const date = new Date(lead.closedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthlyData.get(monthKey);
        if (existing) {
          existing.revenue += Number(lead.value);
        }
      }
    }
  }
  
  // Estimate expenses as ~60% of revenue (industry standard for services)
  monthlyData.forEach((data, month) => {
    data.expenses = data.revenue * 0.6;
  });
  
  // Convert to array and sort chronologically
  const sortedMonths = Array.from(monthlyData.keys()).sort();
  for (const month of sortedMonths) {
    const data = monthlyData.get(month)!;
    result.push({
      month,
      revenue: data.revenue,
      expenses: data.expenses,
      netCashflow: data.revenue - data.expenses,
      projectCount: data.projectCount,
    });
  }
  
  return result;
}

/**
 * Get current pipeline value
 */
async function getPipelineValue(): Promise<{ pipeline: number; closedWon: number }> {
  const pipelineLeads = await db
    .select({
      value: leads.value,
      dealStage: leads.dealStage,
      probability: leads.probability,
    })
    .from(leads)
    .where(sql`${leads.dealStage} != 'Closed Won' AND ${leads.dealStage} != 'Closed Lost'`);
  
  const closedWonLeads = await db
    .select({
      value: leads.value,
    })
    .from(leads)
    .where(eq(leads.dealStage, "Closed Won"));
  
  let pipelineValue = 0;
  for (const lead of pipelineLeads) {
    const leadValue = Number(lead.value) || 0;
    const prob = Number(lead.probability) || 50;
    pipelineValue += leadValue * (prob / 100);
  }
  
  let closedWonValue = 0;
  for (const lead of closedWonLeads) {
    closedWonValue += Number(lead.value) || 0;
  }
  
  return { pipeline: pipelineValue, closedWon: closedWonValue };
}

/**
 * Generate 3-month forecast
 */
function generateForecast(
  historical: CashflowDataPoint[],
  pipelineValue: number
): ForecastPoint[] {
  const revenueData = historical.map(h => h.revenue);
  const trend = calculateTrend(revenueData);
  const smoothed = exponentialSmoothing(revenueData);
  const lastSmoothed = smoothed[smoothed.length - 1] || 0;
  
  // Calculate volatility from historical data
  const mean = revenueData.reduce((a, b) => a + b, 0) / revenueData.length || 0;
  const variance = revenueData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / revenueData.length;
  const volatility = Math.sqrt(variance) / (mean || 1);
  
  const forecast: ForecastPoint[] = [];
  const today = new Date();
  
  for (let i = 1; i <= 3; i++) {
    const forecastDate = new Date(today);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Base projection with trend
    let projectedRevenue = lastSmoothed + (trend * i);
    
    // Add pipeline contribution (weighted by expected close timing)
    const pipelineContribution = (pipelineValue * 0.3) / 3; // 30% of pipeline over 3 months
    projectedRevenue += pipelineContribution;
    
    // Expenses estimated at 60% of revenue
    const projectedExpenses = projectedRevenue * 0.6;
    
    // Monte Carlo confidence intervals
    const confidence = monteCarloSimulation(projectedRevenue, volatility);
    
    // Generate factors affecting forecast
    const factors: string[] = [];
    if (trend > 0) factors.push("Positive revenue trend");
    if (trend < 0) factors.push("Declining revenue trend");
    if (pipelineContribution > 0) factors.push("Active pipeline deals");
    if (volatility > 0.3) factors.push("High revenue volatility");
    if (i === 1) factors.push("Near-term visibility");
    
    forecast.push({
      month: monthKey,
      projectedRevenue: Math.max(0, projectedRevenue),
      projectedExpenses: Math.max(0, projectedExpenses),
      projectedNetCashflow: Math.max(0, projectedRevenue - projectedExpenses),
      confidence,
      factors,
    });
  }
  
  return forecast;
}

/**
 * Generate insights from the data
 */
function generateInsights(
  historical: CashflowDataPoint[],
  forecast: ForecastPoint[],
  pipelineValue: number
): string[] {
  const insights: string[] = [];
  
  const revenueData = historical.map(h => h.revenue).filter(r => r > 0);
  if (revenueData.length === 0) {
    insights.push("Insufficient historical data for trend analysis");
    return insights;
  }
  
  const avgRevenue = revenueData.reduce((a, b) => a + b, 0) / revenueData.length;
  const trend = calculateTrend(revenueData);
  const growthRate = (trend / avgRevenue) * 100;
  
  // Revenue trend insight
  if (growthRate > 5) {
    insights.push(`Revenue growing at ${growthRate.toFixed(1)}% monthly rate`);
  } else if (growthRate < -5) {
    insights.push(`Revenue declining at ${Math.abs(growthRate).toFixed(1)}% monthly rate - action recommended`);
  } else {
    insights.push("Revenue is stable with minimal growth");
  }
  
  // Pipeline health
  if (pipelineValue > avgRevenue * 3) {
    insights.push("Strong pipeline coverage provides revenue security");
  } else if (pipelineValue < avgRevenue) {
    insights.push("Pipeline coverage is low - consider increasing lead generation");
  }
  
  // Forecast insight
  const forecastTotal = forecast.reduce((a, b) => a + b.projectedRevenue, 0);
  const quarterlyProjection = forecastTotal / 3;
  if (quarterlyProjection > avgRevenue * 1.1) {
    insights.push("Next quarter projected to exceed current average by 10%+");
  }
  
  // Seasonality check (simplified)
  const recentMonths = historical.slice(-3);
  const olderMonths = historical.slice(-6, -3);
  const recentAvg = recentMonths.reduce((a, b) => a + b.revenue, 0) / 3;
  const olderAvg = olderMonths.reduce((a, b) => a + b.revenue, 0) / 3 || recentAvg;
  
  if (recentAvg < olderAvg * 0.8) {
    insights.push("Recent months show seasonal slowdown - common in industry");
  }
  
  return insights;
}

/**
 * Main function to generate predictive cashflow analysis
 */
export async function getPredictiveCashflow(): Promise<PredictiveCashflowResult> {
  // Get historical data
  const historical = await getHistoricalCashflow(12);
  
  // Get pipeline values
  const { pipeline: pipelineValue, closedWon: closedWonValue } = await getPipelineValue();
  
  // Generate forecast
  const forecast = generateForecast(historical, pipelineValue);
  
  // Calculate summary metrics
  const revenueData = historical.map(h => h.revenue);
  const expenseData = historical.map(h => h.expenses);
  const avgRevenue = revenueData.reduce((a, b) => a + b, 0) / revenueData.length || 0;
  const avgExpenses = expenseData.reduce((a, b) => a + b, 0) / expenseData.length || 0;
  const trend = calculateTrend(revenueData);
  const growthRate = avgRevenue > 0 ? (trend / avgRevenue) * 100 : 0;
  
  // Next quarter projection
  const nextQuarterProjection = forecast.reduce((a, b) => a + b.projectedRevenue, 0);
  
  // Confidence level based on data quality
  let confidence: "low" | "medium" | "high" = "medium";
  if (revenueData.filter(r => r > 0).length < 3) {
    confidence = "low";
  } else if (revenueData.filter(r => r > 0).length >= 6) {
    confidence = "high";
  }
  
  // Generate insights
  const insights = generateInsights(historical, forecast, pipelineValue);
  
  return {
    historicalData: historical,
    forecast,
    summary: {
      avgMonthlyRevenue: avgRevenue,
      avgMonthlyExpenses: avgExpenses,
      revenueGrowthRate: growthRate,
      nextQuarterProjection,
      pipelineValue,
      closedWonValue,
      confidence,
    },
    insights,
  };
}
