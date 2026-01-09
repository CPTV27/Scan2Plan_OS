import { db } from './db';
import { leads } from '@shared/schema';
import { lt, sql } from 'drizzle-orm';

const STALENESS_RULES = [
  { daysOld: 7, probabilityReduction: 5 },
  { daysOld: 14, probabilityReduction: 10 },
  { daysOld: 21, probabilityReduction: 15 },
  { daysOld: 30, probabilityReduction: 25 },
];

export async function applyStalenessPenalties(): Promise<{ updated: number; details: any[] }> {
  const allLeads = await db.select().from(leads);
  const now = new Date();
  const updates: any[] = [];

  for (const lead of allLeads) {
    if (!lead.lastContactDate) continue;
    if (lead.dealStage === 'Closed Won' || lead.dealStage === 'Closed Lost') continue;

    const daysSinceContact = Math.floor(
      (now.getTime() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    let totalReduction = 0;
    for (const rule of STALENESS_RULES) {
      if (daysSinceContact >= rule.daysOld) {
        totalReduction = rule.probabilityReduction;
      }
    }

    if (totalReduction > 0) {
      const currentProbability = lead.probability || 0;
      const newProbability = Math.max(0, currentProbability - totalReduction);
      
      if (newProbability !== currentProbability) {
        await db
          .update(leads)
          .set({ 
            probability: newProbability,
            updatedAt: new Date()
          })
          .where(sql`${leads.id} = ${lead.id}`);

        updates.push({
          leadId: lead.id,
          clientName: lead.clientName,
          daysSinceContact,
          oldProbability: currentProbability,
          newProbability,
          reduction: totalReduction,
        });
      }
    }
  }

  return { updated: updates.length, details: updates };
}

export function getStalenessStatus(lastContactDate: Date | null): {
  daysOld: number;
  status: 'fresh' | 'aging' | 'stale' | 'critical';
  nextPenalty: number;
} {
  if (!lastContactDate) {
    return { daysOld: 0, status: 'fresh', nextPenalty: 0 };
  }

  const now = new Date();
  const daysOld = Math.floor(
    (now.getTime() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  let status: 'fresh' | 'aging' | 'stale' | 'critical' = 'fresh';
  let nextPenalty = 0;

  if (daysOld >= 30) {
    status = 'critical';
    nextPenalty = 25;
  } else if (daysOld >= 21) {
    status = 'stale';
    nextPenalty = 15;
  } else if (daysOld >= 14) {
    status = 'stale';
    nextPenalty = 10;
  } else if (daysOld >= 7) {
    status = 'aging';
    nextPenalty = 5;
  }

  return { daysOld, status, nextPenalty };
}
