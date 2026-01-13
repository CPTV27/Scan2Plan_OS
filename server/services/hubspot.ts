import { Client } from '@hubspot/api-client';
import Bottleneck from 'bottleneck';
import { Lead, BuyerPersona, CaseStudy } from '@shared/schema';
import { db } from '../db';
import { hubspotSyncLogs, trackingEvents, notifications, leads, buyerPersonas, caseStudies } from '@shared/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { log } from "../lib/logger";

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=hubspot',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('HubSpot not connected');
  }
  return accessToken;
}

async function getHubSpotClient(): Promise<Client> {
  const accessToken = await getAccessToken();
  return new Client({ accessToken });
}

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 100,
});

export async function isHubSpotConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export async function rankCaseStudies(personaCode: string): Promise<CaseStudy[]> {
  const [persona] = await db.select().from(buyerPersonas).where(eq(buyerPersonas.code, personaCode));
  if (!persona) return [];
  
  // Use organization type and purchase triggers for matching
  const matchTerms = [
    persona.organizationType?.toLowerCase(),
    ...(persona.purchaseTriggers || []).map(t => t.toLowerCase()),
  ].filter(Boolean) as string[];
  
  if (matchTerms.length === 0) return [];
  
  const allStudies = await db.select().from(caseStudies).where(eq(caseStudies.isActive, true));
  
  const scored = allStudies.map(study => {
    const matchCount = study.tags.filter(tag => 
      matchTerms.some(term => tag.toLowerCase().includes(term) || term.includes(tag.toLowerCase()))
    ).length;
    return { study, score: matchCount };
  });
  
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.study);
}

function buildTrackingUrl(leadId: number, destinationUrl: string): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:5000';
  return `${baseUrl}/api/track?leadId=${leadId}&dest=${encodeURIComponent(destinationUrl)}`;
}

function generateOutreachScript(template: string, lead: Lead, caseStudy: CaseStudy | null): string {
  const firstName = lead.contactName?.split(' ')[0] || 'there';
  
  return template
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{client\}\}/g, caseStudy?.clientName || caseStudy?.title?.split(' - ')[0] || 'a recent client')
    .replace(/\{\{heroStat\}\}/g, caseStudy?.heroStat || 'significant time savings')
    .replace(/\{\{caseStudyTitle\}\}/g, caseStudy?.title || 'our latest case study');
}

export async function syncLead(lead: Lead, persona: BuyerPersona): Promise<{ success: boolean; hubspotId?: string; error?: string }> {
  return limiter.schedule(async () => {
    try {
      const client = await getHubSpotClient();
      
      const rankedStudies = await rankCaseStudies(persona.code);
      const topStudy = rankedStudies[0];
      const pdfUrl = topStudy?.imageUrl || '';
      const trackingUrl = pdfUrl ? buildTrackingUrl(lead.id, pdfUrl) : '';
      // Generate outreach script from persona value hook
      const outreachScript = persona.valueHook 
        ? `${lead.contactName?.split(' ')[0] || 'Hi'}, ${persona.valueHook}`
        : '';

      const properties: Record<string, string> = {
        email: lead.contactEmail || '',
        firstname: lead.contactName?.split(' ')[0] || '',
        lastname: lead.contactName?.split(' ').slice(1).join(' ') || '',
        company: lead.clientName || '',
        phone: lead.contactPhone || '',
        s2p_persona_code: persona.code,
        s2p_lead_id: String(lead.id),
        ...(trackingUrl && { s2p_case_study_url: trackingUrl }),
        ...(outreachScript && { s2p_outreach_script: outreachScript }),
      };

      let hubspotContactId: string | undefined;

      if (lead.contactEmail) {
        try {
          const searchResponse = await client.crm.contacts.searchApi.doSearch({
            filterGroups: [{
              filters: [{
                propertyName: 'email',
                operator: 'EQ' as any,
                value: lead.contactEmail
              }]
            }],
            limit: 1,
            properties: ['email'],
            sorts: [],
            after: '0'
          });

          if (searchResponse.results.length > 0) {
            const existingId = searchResponse.results[0].id;
            await client.crm.contacts.basicApi.update(existingId, { properties });
            hubspotContactId = existingId;
          } else {
            const createResponse = await client.crm.contacts.basicApi.create({ properties });
            hubspotContactId = createResponse.id;
          }
        } catch (searchErr: any) {
          if (searchErr.code === 409) {
            const createResponse = await client.crm.contacts.basicApi.create({ properties });
            hubspotContactId = createResponse.id;
          } else {
            throw searchErr;
          }
        }
      } else {
        const createResponse = await client.crm.contacts.basicApi.create({ properties });
        hubspotContactId = createResponse.id;
      }

      await db.update(leads)
        .set({ 
          hubspotId: hubspotContactId,
          buyerPersona: persona.code
        })
        .where(eq(leads.id, lead.id));

      await db.insert(hubspotSyncLogs).values({
        leadId: lead.id,
        hubspotContactId,
        syncStatus: 'synced'
      });

      return { success: true, hubspotId: hubspotContactId };
    } catch (error: any) {
      log(`ERROR: HubSpot sync error - ${error?.message || String(error)}`);
      
      await db.insert(hubspotSyncLogs).values({
        leadId: lead.id,
        syncStatus: 'failed',
        errorMessage: error.message || 'Unknown error'
      });

      return { success: false, error: error.message };
    }
  });
}

export async function batchSyncLeads(leadIds: number[]): Promise<{ synced: number[]; failed: { id: number; error: string }[] }> {
  const synced: number[] = [];
  const failed: { id: number; error: string }[] = [];

  const leadsToSync = await db.select().from(leads).where(inArray(leads.id, leadIds));
  const allPersonas = await db.select().from(buyerPersonas);
  const personaMap = new Map(allPersonas.map(p => [p.code, p]));

  for (const lead of leadsToSync) {
    const personaCode = lead.buyerPersona || 'BP-OWNER';
    const persona = personaMap.get(personaCode);
    
    if (!persona) {
      failed.push({ id: lead.id, error: 'Persona not found' });
      continue;
    }

    const result = await syncLead(lead, persona);
    if (result.success) {
      synced.push(lead.id);
    } else {
      failed.push({ id: lead.id, error: result.error || 'Unknown error' });
    }
  }

  return { synced, failed };
}

export async function recordTrackingEvent(
  leadId: number, 
  eventType: string, 
  assetUrl: string, 
  referrer?: string
): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const existingEvents = await db.select()
    .from(trackingEvents)
    .where(
      and(
        eq(trackingEvents.leadId, leadId),
        eq(trackingEvents.eventType, eventType),
        eq(trackingEvents.assetUrl, assetUrl),
        gte(trackingEvents.clickedAt, twentyFourHoursAgo)
      )
    );

  if (existingEvents.length > 0) {
    return false;
  }

  await db.insert(trackingEvents).values({
    leadId,
    eventType,
    assetUrl,
    referrer
  });

  const [currentLead] = await db.select().from(leads).where(eq(leads.id, leadId));
  const currentScore = currentLead?.leadScore || 0;
  await db.update(leads)
    .set({ leadScore: currentScore + 10 })
    .where(eq(leads.id, leadId));

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (lead?.ownerId) {
    await db.insert(notifications).values({
      userId: lead.ownerId,
      type: 'lead_click',
      leadId,
      message: `${lead.clientName} clicked on a case study link`
    });
  }

  return true;
}

export async function getPersonas(): Promise<BuyerPersona[]> {
  return db.select().from(buyerPersonas).where(eq(buyerPersonas.isActive, true));
}

export async function getNotifications(userId: string, unreadOnly = false): Promise<any[]> {
  if (unreadOnly) {
    return db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }
  return db.select().from(notifications).where(eq(notifications.userId, userId));
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, notificationId));
}

export async function updateLeadFromHubSpotDeal(
  hubspotDealId: string, 
  dealStage: string
): Promise<void> {
  if (dealStage === 'closedwon') {
    const syncLogs = await db.select()
      .from(hubspotSyncLogs)
      .where(eq(hubspotSyncLogs.hubspotContactId, hubspotDealId));
    
    if (syncLogs.length > 0 && syncLogs[0].leadId) {
      await db.update(leads)
        .set({ dealStage: 'Closed Won' })
        .where(eq(leads.id, syncLogs[0].leadId));
    }
  }
}
