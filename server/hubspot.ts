// HubSpot Integration for Scan2Plan OS
// Uses Replit HubSpot connector for authentication

import { Client } from '@hubspot/api-client';

let connectionSettings: any;

async function getAccessToken() {
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

export async function getHubSpotClient() {
  const accessToken = await getAccessToken();
  return new Client({ accessToken });
}

export interface HubSpotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    hubspot_owner_id?: string;
    description?: string;
  };
  associations?: {
    contacts?: { results: Array<{ id: string }> };
    companies?: { results: Array<{ id: string }> };
  };
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    industry?: string;
  };
}

export async function getHubSpotContacts(limit = 100): Promise<HubSpotContact[]> {
  const client = await getHubSpotClient();
  const response = await client.crm.contacts.basicApi.getPage(
    limit,
    undefined,
    ['firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle', 'address', 'city', 'state', 'zip']
  );
  return response.results as HubSpotContact[];
}

export async function getHubSpotDeals(limit = 100): Promise<HubSpotDeal[]> {
  const client = await getHubSpotClient();
  const response = await client.crm.deals.basicApi.getPage(
    limit,
    undefined,
    ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'description', 'hubspot_owner_id']
  );
  return response.results as HubSpotDeal[];
}

export async function getHubSpotCompanies(limit = 100): Promise<HubSpotCompany[]> {
  const client = await getHubSpotClient();
  const response = await client.crm.companies.basicApi.getPage(
    limit,
    undefined,
    ['name', 'domain', 'phone', 'address', 'city', 'state', 'zip', 'industry']
  );
  return response.results as HubSpotCompany[];
}

export async function getDealWithAssociations(dealId: string): Promise<HubSpotDeal> {
  const client = await getHubSpotClient();
  const response = await client.crm.deals.basicApi.getById(
    dealId,
    ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'description'],
    undefined,
    ['contacts', 'companies']
  );
  return response as HubSpotDeal;
}

export async function getContactById(contactId: string): Promise<HubSpotContact> {
  const client = await getHubSpotClient();
  const response = await client.crm.contacts.basicApi.getById(
    contactId,
    ['firstname', 'lastname', 'email', 'phone', 'company', 'jobtitle', 'address', 'city', 'state', 'zip']
  );
  return response as HubSpotContact;
}

export async function getCompanyById(companyId: string): Promise<HubSpotCompany> {
  const client = await getHubSpotClient();
  const response = await client.crm.companies.basicApi.getById(
    companyId,
    ['name', 'domain', 'phone', 'address', 'city', 'state', 'zip', 'industry']
  );
  return response as HubSpotCompany;
}

const HUBSPOT_TO_SCAN2PLAN_STAGES: Record<string, string> = {
  'appointmentscheduled': 'Contacted',
  'qualifiedtobuy': 'Proposal',
  'presentationscheduled': 'Proposal',
  'decisionmakerboughtin': 'Negotiation',
  'contractsent': 'Negotiation',
  'closedwon': 'Closed Won',
  'closedlost': 'Closed Lost',
};

export function mapHubSpotStageToScan2Plan(hubspotStage: string): string {
  return HUBSPOT_TO_SCAN2PLAN_STAGES[hubspotStage?.toLowerCase()] || 'Leads';
}

export async function syncDealsToLeads(): Promise<{
  synced: number;
  errors: string[];
  deals: Array<{
    hubspotId: string;
    dealName: string;
    amount: number;
    stage: string;
    contact: { name: string; email: string; phone: string } | null;
    company: { name: string; address: string } | null;
  }>;
}> {
  const errors: string[] = [];
  const syncedDeals: Array<{
    hubspotId: string;
    dealName: string;
    amount: number;
    stage: string;
    contact: { name: string; email: string; phone: string } | null;
    company: { name: string; address: string } | null;
  }> = [];

  try {
    const deals = await getHubSpotDeals(100);

    for (const deal of deals) {
      try {
        const dealWithAssoc = await getDealWithAssociations(deal.id);
        
        let contact: { name: string; email: string; phone: string } | null = null;
        let company: { name: string; address: string } | null = null;

        if (dealWithAssoc.associations?.contacts?.results?.[0]?.id) {
          const hubContact = await getContactById(dealWithAssoc.associations.contacts.results[0].id);
          contact = {
            name: [hubContact.properties.firstname, hubContact.properties.lastname].filter(Boolean).join(' '),
            email: hubContact.properties.email || '',
            phone: hubContact.properties.phone || '',
          };
        }

        if (dealWithAssoc.associations?.companies?.results?.[0]?.id) {
          const hubCompany = await getCompanyById(dealWithAssoc.associations.companies.results[0].id);
          company = {
            name: hubCompany.properties.name || '',
            address: [
              hubCompany.properties.address,
              hubCompany.properties.city,
              hubCompany.properties.state,
              hubCompany.properties.zip
            ].filter(Boolean).join(', '),
          };
        }

        syncedDeals.push({
          hubspotId: deal.id,
          dealName: deal.properties.dealname || 'Untitled Deal',
          amount: parseFloat(deal.properties.amount || '0'),
          stage: mapHubSpotStageToScan2Plan(deal.properties.dealstage || ''),
          contact,
          company,
        });
      } catch (dealErr: any) {
        errors.push(`Deal ${deal.id}: ${dealErr.message}`);
      }
    }

    return { synced: syncedDeals.length, errors, deals: syncedDeals };
  } catch (err: any) {
    errors.push(`Failed to fetch deals: ${err.message}`);
    return { synced: 0, errors, deals: [] };
  }
}

export async function testHubSpotConnection(): Promise<{ connected: boolean; message: string; contactCount?: number; dealCount?: number; companyCount?: number }> {
  try {
    const client = await getHubSpotClient();
    
    const [contacts, deals, companies] = await Promise.all([
      getHubSpotContacts(100),
      getHubSpotDeals(100),
      getHubSpotCompanies(100),
    ]);

    return {
      connected: true,
      message: 'HubSpot connected successfully',
      contactCount: contacts.length,
      dealCount: deals.length,
      companyCount: companies.length,
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `HubSpot connection failed: ${err.message}`,
    };
  }
}
