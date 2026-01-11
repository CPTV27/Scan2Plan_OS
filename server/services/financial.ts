/**
 * Financial Service - True Net Profitability Calculator
 * Calculates real project profit after commissions and overhead
 */

import { db } from '../db';
import { projects, leads, timeLogs, salesReps, systemSettings, compensationSplits } from '@shared/schema';
import { eq, sum, and } from 'drizzle-orm';

export interface CompensationItem {
  name: string;
  role: string | null;
  type: string;
  rate: number;
  amount: number;
}

export interface ProfitabilityResult {
  revenue: number;
  costs: {
    labor: number;
    vendor: number;
    commission: number;
    overhead: number;
    total: number;
  };
  profit: {
    grossDollar: number;
    grossPercent: number;
    netDollar: number;
    netPercent: number;
  };
  compensationBreakdown: CompensationItem[];
  salesRep?: {
    name: string;
    commissionRate: number;
  };
  settings: {
    overheadRate: number;
    targetNetMargin: number;
  };
}

/**
 * Get or create default system settings
 */
export async function getSystemSettings(): Promise<{ overheadRate: number; targetNetMargin: number }> {
  const settings = await db.query.systemSettings?.findFirst();
  
  if (settings) {
    return {
      overheadRate: parseFloat(settings.overheadRate || "15"),
      targetNetMargin: parseFloat(settings.targetNetMargin || "20")
    };
  }
  
  // Return defaults if no settings exist
  return {
    overheadRate: 15,
    targetNetMargin: 20
  };
}

/**
 * Update system settings
 */
export async function updateSystemSettings(overheadRate: number, targetNetMargin: number) {
  const existing = await db.query.systemSettings?.findFirst();
  
  if (existing) {
    await db.update(systemSettings)
      .set({ 
        overheadRate: overheadRate.toString(),
        targetNetMargin: targetNetMargin.toString(),
        updatedAt: new Date()
      })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values({
      overheadRate: overheadRate.toString(),
      targetNetMargin: targetNetMargin.toString()
    });
  }
}

/**
 * Calculate True Net Profitability for a project
 */
export async function calculateProjectProfitability(projectId: number): Promise<ProfitabilityResult> {
  // 1. Fetch Project
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId)
  });

  if (!project) throw new Error("Project not found");

  // 2. Get linked lead for revenue and owner info
  let lead = null;
  let revenue = 0;
  
  // Fetch lead first for owner info
  if (project.leadId) {
    lead = await db.query.leads.findFirst({
      where: eq(leads.id, project.leadId)
    });
  }
  
  // Try project.quotedPrice first (inherited at Closed Won), then fall back to lead.value
  if (project.quotedPrice) {
    revenue = parseFloat(project.quotedPrice);
  } else if (lead?.value) {
    revenue = parseFloat(lead.value);
  }

  // 3. Calculate Direct Labor (COGS) from time logs
  const allTimeLogs = await db.select().from(timeLogs).where(eq(timeLogs.projectId, projectId));
  let laborCost = 0;
  
  for (const log of allTimeLogs) {
    // Use stored totalSiteMinutes if available, otherwise calculate from arrival/departure
    let minutes = log.totalSiteMinutes || 0;
    
    if (!minutes && log.arrivalTime && log.departureTime) {
      const arrival = new Date(log.arrivalTime).getTime();
      const departure = new Date(log.departureTime).getTime();
      minutes = Math.round((departure - arrival) / (1000 * 60));
    }
    
    const hours = minutes / 60;
    const rate = parseFloat(log.hourlyCost || "0");
    laborCost += hours * rate;
  }

  // 4. Calculate Vendor Costs (COGS)
  const vendorCost = parseFloat(project.vendorCostActual || "0");

  // 5. Calculate Commission (Variable) - using compensation splits
  // Only calculate if we have revenue (avoid misleading calculations on $0 revenue)
  let commissionCost = 0;
  let salesRepInfo = undefined;
  const compensationBreakdown: CompensationItem[] = [];
  
  if (revenue > 0) {
    // Get all active compensation splits
    const splits = await db.select().from(compensationSplits).where(eq(compensationSplits.isActive, true));
    
    for (const split of splits) {
      const rate = parseFloat(split.defaultRate || "0");
      const amount = revenue * (rate / 100);
      commissionCost += amount;
      
      compensationBreakdown.push({
        name: split.name,
        role: split.role,
        type: split.type || "commission",
        rate,
        amount
      });
    }
    
    // Also check for legacy salesRep (for backward compatibility)
    if (lead?.ownerId && compensationBreakdown.length === 0) {
      const salesRep = await db.query.salesReps?.findFirst({
        where: eq(salesReps.userId, lead.ownerId)
      });
      
      if (salesRep) {
        const commissionRate = parseFloat(salesRep.commissionRate || "0");
        commissionCost = revenue * (commissionRate / 100);
        salesRepInfo = {
          name: salesRep.name,
          commissionRate
        };
      }
    }
  }

  // 6. Get system settings for overhead
  // Only apply overhead if we have revenue to allocate against
  const settings = await getSystemSettings();
  const overheadCost = revenue > 0 ? revenue * (settings.overheadRate / 100) : 0;

  // 7. Calculate all profit metrics
  const cogsCost = laborCost + vendorCost;
  const grossProfit = revenue - cogsCost;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  
  const totalCost = cogsCost + commissionCost + overheadCost;
  const netProfit = revenue - totalCost;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue,
    costs: {
      labor: laborCost,
      vendor: vendorCost,
      commission: commissionCost,
      overhead: overheadCost,
      total: totalCost
    },
    profit: {
      grossDollar: grossProfit,
      grossPercent: grossMargin,
      netDollar: netProfit,
      netPercent: netMargin
    },
    compensationBreakdown,
    salesRep: salesRepInfo,
    settings
  };
}

/**
 * Calculate profitability for all active projects
 */
export async function calculatePortfolioProfitability() {
  const allProjects = await db.select().from(projects);
  
  const results = [];
  let totalRevenue = 0;
  let totalCosts = 0;
  let totalNetProfit = 0;
  
  for (const project of allProjects) {
    try {
      const profitability = await calculateProjectProfitability(project.id);
      results.push({
        projectId: project.id,
        projectName: project.name,
        status: project.status,
        ...profitability
      });
      
      totalRevenue += profitability.revenue;
      totalCosts += profitability.costs.total;
      totalNetProfit += profitability.profit.netDollar;
    } catch (e) {
      // Skip projects that can't be calculated
    }
  }
  
  return {
    projects: results,
    portfolio: {
      totalRevenue,
      totalCosts,
      totalNetProfit,
      averageNetMargin: totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0
    }
  };
}
