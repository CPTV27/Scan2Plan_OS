import { db } from './db';
import { leads, type Lead } from '@shared/schema';
import { sql, and, eq, inArray } from 'drizzle-orm';

// Stage baseline probabilities - based on typical B2B sales funnel
const STAGE_BASELINES: Record<string, number> = {
  'Leads': 5,
  'Contacted': 15,
  'Qualified': 30,
  'Proposal': 45,
  'Negotiation': 60,
  'On Hold': 20,
  'Closed Won': 100,
  'Closed Lost': 0,
};

// Stage-specific staleness thresholds (days until each severity level)
const STAGE_STALENESS: Record<string, { aging: number; stale: number; critical: number }> = {
  'Leads': { aging: 2, stale: 5, critical: 10 },
  'Contacted': { aging: 3, stale: 7, critical: 14 },
  'Qualified': { aging: 5, stale: 10, critical: 21 },
  'Proposal': { aging: 5, stale: 14, critical: 30 },
  'Negotiation': { aging: 2, stale: 5, critical: 10 }, // Hot leads need quick follow-up
  'On Hold': { aging: 14, stale: 30, critical: 60 }, // More lenient for on-hold
};

// Value band modifiers (larger deals often have longer cycles but higher stakes)
const VALUE_BANDS = [
  { min: 0, max: 5000, modifier: 0 },
  { min: 5000, max: 15000, modifier: 5 },
  { min: 15000, max: 35000, modifier: 8 },
  { min: 35000, max: 100000, modifier: 10 },
  { min: 100000, max: Infinity, modifier: 12 },
];

// Building type win rate modifiers (based on typical scan2plan patterns)
const BUILDING_TYPE_MODIFIERS: Record<string, number> = {
  'Residential': 5,
  'Residential - Standard': 5,
  'Residential - High-Rise': 3,
  'Commercial': 3,
  'Commercial / Office': 3,
  'Education': 8,
  'Education / Campus': 8,
  'Healthcare / Medical': 5,
  'Industrial / Warehouse': 2,
  'Warehouse / Storage': 2,
  'Retail / Hospitality': 0,
  'Mixed Use': 2,
  'Historical / Renovation': 5,
  'Infrastructure': 0,
};

// Lead source modifiers (partners vs direct)
const LEAD_SOURCE_MODIFIERS: Record<string, number> = {
  'partner': 10,
  'referral': 8,
  'repeat': 15,
  'direct': 0,
  'website': -2,
  'cold': -5,
};

export interface ProbabilityFactors {
  stageBaseline: number;
  stalenessModifier: number;
  valueModifier: number;
  buildingTypeModifier: number;
  leadSourceModifier: number;
  retainerModifier: number;
  priorityModifier: number;
  finalScore: number;
  stalenessStatus: 'fresh' | 'aging' | 'stale' | 'critical';
  daysSinceContact: number;
}

export function calculateProbability(lead: Lead): ProbabilityFactors {
  // Start with stage baseline
  const stageBaseline = STAGE_BASELINES[lead.dealStage] ?? 20;
  
  // Skip calculation for closed deals
  if (lead.dealStage === 'Closed Won') {
    return {
      stageBaseline: 100,
      stalenessModifier: 0,
      valueModifier: 0,
      buildingTypeModifier: 0,
      leadSourceModifier: 0,
      retainerModifier: 0,
      priorityModifier: 0,
      finalScore: 100,
      stalenessStatus: 'fresh',
      daysSinceContact: 0,
    };
  }
  
  if (lead.dealStage === 'Closed Lost') {
    return {
      stageBaseline: 0,
      stalenessModifier: 0,
      valueModifier: 0,
      buildingTypeModifier: 0,
      leadSourceModifier: 0,
      retainerModifier: 0,
      priorityModifier: 0,
      finalScore: 0,
      stalenessStatus: 'fresh',
      daysSinceContact: 0,
    };
  }

  // Calculate days since contact
  const now = new Date();
  const lastContact = lead.lastContactDate ? new Date(lead.lastContactDate) : now;
  const daysSinceContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

  // Stage-specific staleness calculation
  const stageThresholds = STAGE_STALENESS[lead.dealStage] || STAGE_STALENESS['Proposal'];
  let stalenessStatus: 'fresh' | 'aging' | 'stale' | 'critical' = 'fresh';
  let stalenessModifier = 0;

  if (daysSinceContact >= stageThresholds.critical) {
    stalenessStatus = 'critical';
    stalenessModifier = -30;
  } else if (daysSinceContact >= stageThresholds.stale) {
    stalenessStatus = 'stale';
    stalenessModifier = -20;
  } else if (daysSinceContact >= stageThresholds.aging) {
    stalenessStatus = 'aging';
    stalenessModifier = -10;
  }

  // Value modifier
  const dealValue = Number(lead.value) || 0;
  let valueModifier = 0;
  for (const band of VALUE_BANDS) {
    if (dealValue >= band.min && dealValue < band.max) {
      valueModifier = band.modifier;
      break;
    }
  }

  // Building type modifier
  let buildingTypeModifier = 0;
  if (lead.buildingType) {
    buildingTypeModifier = BUILDING_TYPE_MODIFIERS[lead.buildingType] ?? 0;
  }

  // Lead source modifier
  let leadSourceModifier = 0;
  if (lead.leadSource) {
    const source = lead.leadSource.toLowerCase();
    if (source.includes('partner') || lead.paymentTerms === 'partner') {
      leadSourceModifier = LEAD_SOURCE_MODIFIERS['partner'];
    } else if (source.includes('referral')) {
      leadSourceModifier = LEAD_SOURCE_MODIFIERS['referral'];
    } else if (source.includes('repeat') || source.includes('existing')) {
      leadSourceModifier = LEAD_SOURCE_MODIFIERS['repeat'];
    } else if (source.includes('cold')) {
      leadSourceModifier = LEAD_SOURCE_MODIFIERS['cold'];
    } else if (source.includes('website') || source.includes('web')) {
      leadSourceModifier = LEAD_SOURCE_MODIFIERS['website'];
    }
  }

  // Retainer modifier - paid retainer is a strong signal
  const retainerModifier = lead.retainerPaid ? 15 : 0;

  // Priority modifier (1-5 scale, 3 is default)
  const priorityModifier = ((lead.leadPriority || 3) - 3) * 5;

  // Calculate final score, clamped to 0-99 (100 only for Closed Won)
  const rawScore = stageBaseline + stalenessModifier + valueModifier + buildingTypeModifier + leadSourceModifier + retainerModifier + priorityModifier;
  const finalScore = Math.max(1, Math.min(99, rawScore));

  return {
    stageBaseline,
    stalenessModifier,
    valueModifier,
    buildingTypeModifier,
    leadSourceModifier,
    retainerModifier,
    priorityModifier,
    finalScore,
    stalenessStatus,
    daysSinceContact,
  };
}

export function getStageSpecificStaleness(stage: string, lastContactDate: Date | null): {
  daysOld: number;
  status: 'fresh' | 'aging' | 'stale' | 'critical';
  threshold: { aging: number; stale: number; critical: number };
} {
  if (!lastContactDate) {
    return { 
      daysOld: 0, 
      status: 'fresh',
      threshold: STAGE_STALENESS[stage] || STAGE_STALENESS['Proposal']
    };
  }

  const now = new Date();
  const daysOld = Math.floor(
    (now.getTime() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  const threshold = STAGE_STALENESS[stage] || STAGE_STALENESS['Proposal'];
  let status: 'fresh' | 'aging' | 'stale' | 'critical' = 'fresh';

  if (daysOld >= threshold.critical) {
    status = 'critical';
  } else if (daysOld >= threshold.stale) {
    status = 'stale';
  } else if (daysOld >= threshold.aging) {
    status = 'aging';
  }

  return { daysOld, status, threshold };
}

export async function recalculateAllProbabilities(): Promise<{ updated: number; results: Array<{ id: number; clientName: string; oldProb: number; newProb: number; factors: ProbabilityFactors }> }> {
  const allLeads = await db.select().from(leads);
  const results: Array<{ id: number; clientName: string; oldProb: number; newProb: number; factors: ProbabilityFactors }> = [];

  for (const lead of allLeads) {
    const factors = calculateProbability(lead);
    const oldProb = lead.probability || 0;
    
    if (factors.finalScore !== oldProb) {
      await db
        .update(leads)
        .set({ 
          probability: factors.finalScore,
          updatedAt: new Date()
        })
        .where(eq(leads.id, lead.id));

      results.push({
        id: lead.id,
        clientName: lead.clientName,
        oldProb,
        newProb: factors.finalScore,
        factors,
      });
    }
  }

  return { updated: results.length, results };
}

export async function getWinLossAnalytics(): Promise<{
  overall: { totalWon: number; totalLost: number; winRate: number; avgWonValue: number; avgLostValue: number };
  byBuildingType: Array<{ type: string; won: number; lost: number; winRate: number; avgValue: number }>;
  byValueBand: Array<{ band: string; won: number; lost: number; winRate: number }>;
  byLeadSource: Array<{ source: string; won: number; lost: number; winRate: number; totalValue: number }>;
  byMonth: Array<{ month: string; won: number; lost: number; winRate: number }>;
}> {
  const allLeads = await db.select().from(leads);
  
  const wonLeads = allLeads.filter(l => l.dealStage === 'Closed Won');
  const lostLeads = allLeads.filter(l => l.dealStage === 'Closed Lost');

  // Overall stats
  const totalWon = wonLeads.length;
  const totalLost = lostLeads.length;
  const winRate = totalWon + totalLost > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : 0;
  const avgWonValue = wonLeads.length > 0 ? wonLeads.reduce((sum, l) => sum + Number(l.value || 0), 0) / wonLeads.length : 0;
  const avgLostValue = lostLeads.length > 0 ? lostLeads.reduce((sum, l) => sum + Number(l.value || 0), 0) / lostLeads.length : 0;

  // By building type
  const buildingTypeStats = new Map<string, { won: number; lost: number; totalValue: number }>();
  for (const lead of [...wonLeads, ...lostLeads]) {
    const type = lead.buildingType || 'Unknown';
    const stats = buildingTypeStats.get(type) || { won: 0, lost: 0, totalValue: 0 };
    if (lead.dealStage === 'Closed Won') {
      stats.won++;
      stats.totalValue += Number(lead.value || 0);
    } else {
      stats.lost++;
    }
    buildingTypeStats.set(type, stats);
  }
  const byBuildingType = Array.from(buildingTypeStats.entries()).map(([type, stats]) => ({
    type,
    won: stats.won,
    lost: stats.lost,
    winRate: stats.won + stats.lost > 0 ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : 0,
    avgValue: stats.won > 0 ? stats.totalValue / stats.won : 0,
  })).sort((a, b) => b.winRate - a.winRate);

  // By value band
  const valueBands = [
    { label: '$0-5K', min: 0, max: 5000 },
    { label: '$5K-15K', min: 5000, max: 15000 },
    { label: '$15K-35K', min: 15000, max: 35000 },
    { label: '$35K-100K', min: 35000, max: 100000 },
    { label: '$100K+', min: 100000, max: Infinity },
  ];
  const byValueBand = valueBands.map(band => {
    const won = wonLeads.filter(l => {
      const v = Number(l.value || 0);
      return v >= band.min && v < band.max;
    }).length;
    const lost = lostLeads.filter(l => {
      const v = Number(l.value || 0);
      return v >= band.min && v < band.max;
    }).length;
    return {
      band: band.label,
      won,
      lost,
      winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
    };
  });

  // By lead source
  const leadSourceStats = new Map<string, { won: number; lost: number; totalValue: number }>();
  for (const lead of [...wonLeads, ...lostLeads]) {
    const source = lead.leadSource || 'Unknown';
    const stats = leadSourceStats.get(source) || { won: 0, lost: 0, totalValue: 0 };
    if (lead.dealStage === 'Closed Won') {
      stats.won++;
      stats.totalValue += Number(lead.value || 0);
    } else {
      stats.lost++;
    }
    leadSourceStats.set(source, stats);
  }
  const byLeadSource = Array.from(leadSourceStats.entries()).map(([source, stats]) => ({
    source,
    won: stats.won,
    lost: stats.lost,
    winRate: stats.won + stats.lost > 0 ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : 0,
    totalValue: stats.totalValue,
  })).sort((a, b) => b.totalValue - a.totalValue);

  // By month (last 12 months)
  const monthStats = new Map<string, { won: number; lost: number }>();
  for (const lead of [...wonLeads, ...lostLeads]) {
    if (!lead.createdAt) continue;
    const date = new Date(lead.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const stats = monthStats.get(monthKey) || { won: 0, lost: 0 };
    if (lead.dealStage === 'Closed Won') stats.won++;
    else stats.lost++;
    monthStats.set(monthKey, stats);
  }
  const byMonth = Array.from(monthStats.entries())
    .map(([month, stats]) => ({
      month,
      won: stats.won,
      lost: stats.lost,
      winRate: stats.won + stats.lost > 0 ? Math.round((stats.won / (stats.won + stats.lost)) * 100) : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  return {
    overall: { totalWon, totalLost, winRate, avgWonValue, avgLostValue },
    byBuildingType,
    byValueBand,
    byLeadSource,
    byMonth,
  };
}
