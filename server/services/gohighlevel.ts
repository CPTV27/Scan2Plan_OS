import Bottleneck from 'bottleneck';
import { Lead, Persona, CaseStudy } from '@shared/schema';
import { db } from '../db';
import { ghlSyncLogs, trackingEvents, notifications, leads, personas, caseStudies } from '@shared/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { log } from "../lib/logger";

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

function getGHLConfig() {
  return {
    apiKey: process.env.GHL_API_KEY || '',
    locationId: process.env.GHL_LOCATION_ID || ''
  };
}

export function isGHLConfigured(): boolean {
  const { apiKey, locationId } = getGHLConfig();
  return !!(apiKey && locationId);
}

async function ghlRequest(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const { apiKey, locationId } = getGHLConfig();
  
  if (!apiKey || !locationId) {
    throw new Error('GoHighLevel not configured - missing API key or Location ID');
  }

  const url = `${GHL_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28'
  };

  const options: RequestInit = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GHL API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

const limiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 50,
});

export async function isGHLConnected(): Promise<boolean> {
  if (!isGHLConfigured()) return false;
  
  try {
    const { locationId } = getGHLConfig();
    await ghlRequest(`/contacts/?locationId=${locationId}&limit=1`);
    return true;
  } catch {
    return false;
  }
}

export async function rankCaseStudies(personaCode: string): Promise<CaseStudy[]> {
  const [persona] = await db.select().from(personas).where(eq(personas.code, personaCode));
  if (!persona || !persona.preferredTags) return [];
  
  const allStudies = await db.select().from(caseStudies).where(eq(caseStudies.isActive, true));
  
  const scored = allStudies.map(study => {
    const matchCount = study.tags.filter(tag => 
      persona.preferredTags?.includes(tag)
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

export async function syncLead(lead: Lead, persona: Persona): Promise<{ success: boolean; ghlContactId?: string; error?: string }> {
  return limiter.schedule(async () => {
    try {
      const { locationId } = getGHLConfig();
      
      const rankedStudies = await rankCaseStudies(persona.code);
      const topStudy = rankedStudies[0];
      const pdfUrl = topStudy?.imageUrl || '';
      const trackingUrl = pdfUrl ? buildTrackingUrl(lead.id, pdfUrl) : '';
      const outreachScript = persona.scriptTemplate 
        ? generateOutreachScript(persona.scriptTemplate, lead, topStudy)
        : '';

      const tags = [`persona:${persona.code}`, 's2p-synced', `lead_id:${lead.id}`];
      if (lead.buildingType) tags.push(`bldg:${lead.buildingType}`);
      
      const contactData: Record<string, any> = {
        locationId,
        email: lead.contactEmail || undefined,
        firstName: lead.contactName?.split(' ')[0] || '',
        lastName: lead.contactName?.split(' ').slice(1).join(' ') || '',
        name: lead.contactName || '',
        companyName: lead.clientName || '',
        phone: lead.contactPhone || undefined,
        address1: lead.projectAddress || undefined,
        tags,
        source: 'Scan2Plan OS'
      };

      let ghlContactId: string | undefined;

      if (lead.ghlContactId) {
        await ghlRequest(`/contacts/${lead.ghlContactId}`, 'PUT', contactData);
        ghlContactId = lead.ghlContactId;
      } else if (lead.contactEmail) {
        const searchResult = await ghlRequest(
          `/contacts/?locationId=${locationId}&query=${encodeURIComponent(lead.contactEmail)}&limit=1`
        );
        
        if (searchResult.contacts && searchResult.contacts.length > 0) {
          const existingId = searchResult.contacts[0].id;
          await ghlRequest(`/contacts/${existingId}`, 'PUT', contactData);
          ghlContactId = existingId;
        } else {
          const createResult = await ghlRequest('/contacts/', 'POST', contactData);
          ghlContactId = createResult.contact?.id;
        }
      } else {
        const createResult = await ghlRequest('/contacts/', 'POST', contactData);
        ghlContactId = createResult.contact?.id;
      }

      await db.update(leads)
        .set({ 
          ghlContactId,
          buyerPersona: persona.code
        })
        .where(eq(leads.id, lead.id));

      await db.insert(ghlSyncLogs).values({
        leadId: lead.id,
        ghlContactId,
        syncStatus: 'synced'
      });

      return { success: true, ghlContactId };
    } catch (error: any) {
      log(`ERROR: GoHighLevel sync error - ${error?.message || String(error)}`);
      
      await db.insert(ghlSyncLogs).values({
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
  const allPersonas = await db.select().from(personas);
  const personaMap = new Map(allPersonas.map(p => [p.code, p]));

  for (const lead of leadsToSync) {
    const personaCode = lead.buyerPersona || 'BP1';
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

export async function createOpportunity(
  lead: Lead,
  pipelineId: string,
  stageId: string
): Promise<{ success: boolean; opportunityId?: string; error?: string }> {
  try {
    const { locationId } = getGHLConfig();
    
    const opportunityData = {
      locationId,
      name: `${lead.clientName} - ${lead.projectName || 'New Project'}`,
      pipelineId,
      pipelineStageId: stageId,
      contactId: lead.ghlContactId,
      monetaryValue: Number(lead.value) || 0,
      source: 'Scan2Plan OS'
    };

    const result = await ghlRequest('/opportunities/', 'POST', opportunityData);
    return { success: true, opportunityId: result.opportunity?.id };
  } catch (error: any) {
    log(`ERROR: GHL opportunity creation error - ${error?.message || String(error)}`);
    return { success: false, error: error.message };
  }
}

export async function updateOpportunityStage(
  opportunityId: string,
  stageId: string
): Promise<boolean> {
  try {
    await ghlRequest(`/opportunities/${opportunityId}/status`, 'PUT', {
      pipelineStageId: stageId
    });
    return true;
  } catch (error) {
    log(`ERROR: GHL opportunity update error - ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export async function getContacts(limit = 100): Promise<any[]> {
  const { locationId } = getGHLConfig();
  const result = await ghlRequest(`/contacts/?locationId=${locationId}&limit=${limit}`);
  return result.contacts || [];
}

export async function getOpportunities(pipelineId?: string, limit = 100): Promise<any[]> {
  const { locationId } = getGHLConfig();
  let url = `/opportunities/?locationId=${locationId}&limit=${limit}`;
  if (pipelineId) {
    url += `&pipelineId=${pipelineId}`;
  }
  const result = await ghlRequest(url);
  return result.opportunities || [];
}

export async function getPipelines(): Promise<any[]> {
  const { locationId } = getGHLConfig();
  const result = await ghlRequest(`/opportunities/pipelines?locationId=${locationId}`);
  return result.pipelines || [];
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

export async function getPersonas(): Promise<Persona[]> {
  return db.select().from(personas);
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

export async function updateLeadFromGHLOpportunity(
  ghlOpportunityId: string, 
  stageId: string,
  pipelineStageMapping: Record<string, string>
): Promise<void> {
  const mappedStage = pipelineStageMapping[stageId];
  if (mappedStage === 'Closed Won') {
    const syncLogs = await db.select()
      .from(ghlSyncLogs)
      .where(eq(ghlSyncLogs.ghlContactId, ghlOpportunityId));
    
    if (syncLogs.length > 0 && syncLogs[0].leadId) {
      await db.update(leads)
        .set({ dealStage: 'Closed Won' })
        .where(eq(leads.id, syncLogs[0].leadId));
    }
  }
}
