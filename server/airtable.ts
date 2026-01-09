import pLimit from 'p-limit';
import { log } from "./lib/logger";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

// Rate limiter: Airtable allows 5 requests/second
const airtableRateLimit = pLimit(4);

const TABLES = {
  projects: 'tbl0soa9tt6Mdnv3O',
  jobs: 'tblOlF7lJkJGBkLCq',
  locations: 'tblvnbhJ1MnNDmVhk',
  contacts: 'tbll0Lza9F9JzjYV5',
  companies: 'tbltmwvdOy8uN2bTc',
  timeEntries: 'tblbEKCoVzd6wMy1X',
};

export type TableName = keyof typeof TABLES;

interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime?: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface TableSummary {
  name: TableName;
  tableId: string;
  recordCount: number;
  fields: string[];
  sampleRecords: AirtableRecord[];
}

export interface AirtableOverview {
  baseId: string;
  tables: TableSummary[];
  fetchedAt: string;
}

async function airtableRequestRaw(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: any
): Promise<any> {
  if (!AIRTABLE_API_KEY) {
    throw new Error('AIRTABLE_API_KEY is not configured');
  }

  if (!AIRTABLE_BASE_ID) {
    throw new Error('AIRTABLE_BASE_ID is not configured');
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    log(`ERROR: Airtable API error: ${response.status} - ${error}`);
    
    // Handle rate limiting with retry hint
    if (response.status === 429) {
      throw new Error('Airtable rate limit exceeded. Please try again in a few seconds.');
    }
    if (response.status === 403) {
      throw new Error('Airtable token lacks required permissions. Please check your Personal Access Token scopes.');
    }
    if (response.status === 422) {
      throw new Error(`Airtable field mismatch: ${error}. Check that field names match your Airtable schema.`);
    }
    throw new Error(`Airtable API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Rate-limited wrapper for all Airtable requests
async function airtableRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' = 'GET',
  body?: any
): Promise<any> {
  return airtableRateLimit(() => airtableRequestRaw(endpoint, method, body));
}

export async function getTableRecords(tableName: TableName, maxRecords = 100): Promise<AirtableRecord[]> {
  const tableId = TABLES[tableName];
  const result: AirtableResponse = await airtableRequest(`${tableId}?maxRecords=${maxRecords}`);
  return result.records;
}

export async function getTableRecordCount(tableName: TableName): Promise<number> {
  const tableId = TABLES[tableName];
  let count = 0;
  let offset: string | undefined;
  
  do {
    const url = offset 
      ? `${tableId}?pageSize=100&offset=${offset}` 
      : `${tableId}?pageSize=100`;
    const result: AirtableResponse = await airtableRequest(url);
    count += result.records.length;
    offset = result.offset;
  } while (offset);
  
  return count;
}

export async function getAirtableProjects(): Promise<AirtableRecord[]> {
  return getTableRecords('projects');
}

export async function getJobs(): Promise<AirtableRecord[]> {
  return getTableRecords('jobs');
}

export async function getLocations(): Promise<AirtableRecord[]> {
  return getTableRecords('locations');
}

export async function getContacts(): Promise<AirtableRecord[]> {
  return getTableRecords('contacts');
}

export async function getCompanies(): Promise<AirtableRecord[]> {
  return getTableRecords('companies');
}

export async function getTimeEntries(): Promise<AirtableRecord[]> {
  return getTableRecords('timeEntries');
}

function inferFieldsFromRecords(records: AirtableRecord[]): string[] {
  const fieldSet = new Set<string>();
  for (const record of records) {
    Object.keys(record.fields).forEach(f => fieldSet.add(f));
  }
  return Array.from(fieldSet).sort();
}

export async function getAirtableOverview(): Promise<AirtableOverview> {
  const tableNames = Object.keys(TABLES) as TableName[];
  const tables: TableSummary[] = [];

  for (const name of tableNames) {
    try {
      const sampleRecords = await getTableRecords(name, 10);
      const recordCount = await getTableRecordCount(name);
      
      tables.push({
        name,
        tableId: TABLES[name],
        recordCount,
        fields: inferFieldsFromRecords(sampleRecords),
        sampleRecords: sampleRecords.slice(0, 5),
      });
    } catch (error) {
      log(`ERROR: Failed to fetch table ${name} - ${error instanceof Error ? error.message : String(error)}`);
      tables.push({
        name,
        tableId: TABLES[name],
        recordCount: 0,
        fields: [],
        sampleRecords: [],
      });
    }
  }

  return {
    baseId: AIRTABLE_BASE_ID || '',
    tables,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getTimeEntriesForProject(projectName: string): Promise<AirtableRecord[]> {
  const formula = encodeURIComponent(`FIND("${projectName}", {Project})`);
  const result: AirtableResponse = await airtableRequest(
    `${TABLES.timeEntries}?filterByFormula=${formula}`
  );
  return result.records;
}

export function isAirtableConfigured(): boolean {
  return !!AIRTABLE_API_KEY && !!AIRTABLE_BASE_ID;
}

export const AIRTABLE_WRITE_ENABLED = true;

// Write Operations
export async function createAirtableRecord(tableName: TableName, fields: Record<string, any>): Promise<AirtableRecord> {
  const tableId = TABLES[tableName];
  const result = await airtableRequest(tableId, 'POST', { fields });
  return result;
}

export async function updateAirtableRecord(tableName: TableName, recordId: string, fields: Record<string, any>): Promise<AirtableRecord> {
  const tableId = TABLES[tableName];
  const result = await airtableRequest(`${tableId}/${recordId}`, 'PATCH', { fields });
  return result;
}

export async function findAirtableRecordByField(tableName: TableName, fieldName: string, value: string): Promise<AirtableRecord | null> {
  const tableId = TABLES[tableName];
  // Escape quotes in value to prevent formula injection
  const escapedValue = value.replace(/"/g, '\\"');
  const formula = encodeURIComponent(`{${fieldName}} = "${escapedValue}"`);
  const result: AirtableResponse = await airtableRequest(`${tableId}?filterByFormula=${formula}&maxRecords=1`);
  return result.records[0] || null;
}

export async function syncProjectToAirtable(project: {
  name: string;
  status: string;
  clientName?: string;
  projectAddress?: string;
}): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    // Find existing project by name
    const existingProject = await findAirtableRecordByField('projects', 'Name', project.name);
    
    const fields: Record<string, any> = {
      'Name': project.name,
      'Status': project.status,
    };
    
    if (project.clientName) fields['Client Name'] = project.clientName;
    if (project.projectAddress) fields['Address'] = project.projectAddress;
    
    if (existingProject) {
      // Update existing record
      const updated = await updateAirtableRecord('projects', existingProject.id, fields);
      return { success: true, recordId: updated.id };
    } else {
      // Create new record
      const created = await createAirtableRecord('projects', fields);
      return { success: true, recordId: created.id };
    }
  } catch (error) {
    log(`ERROR: Failed to sync project to Airtable - ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Business Analytics Functions
export interface AirtableAnalytics {
  overview: {
    totalProjects: number;
    totalJobs: number;
    totalClients: number;
    totalLocations: number;
    totalHoursLogged: number;
  };
  projectsByStatus: { status: string; count: number }[];
  topClients: { name: string; projectCount: number }[];
  recentActivity: { date: string; hours: number }[];
  locationCoverage: { state: string; count: number }[];
  fetchedAt: string;
}

async function getAllTableRecords(tableName: TableName): Promise<AirtableRecord[]> {
  const tableId = TABLES[tableName];
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;
  
  do {
    const url = offset 
      ? `${tableId}?pageSize=100&offset=${offset}` 
      : `${tableId}?pageSize=100`;
    const result: AirtableResponse = await airtableRequest(url);
    allRecords.push(...result.records);
    offset = result.offset;
  } while (offset);
  
  return allRecords;
}

export async function getAirtableAnalytics(): Promise<AirtableAnalytics> {
  // Fetch all data in parallel
  const [projects, jobs, companies, locations, timeEntries] = await Promise.all([
    getAllTableRecords('projects'),
    getAllTableRecords('jobs'),
    getAllTableRecords('companies'),
    getAllTableRecords('locations'),
    getAllTableRecords('timeEntries'),
  ]);

  // Calculate total hours from time entries
  let totalHours = 0;
  const hoursByDate: Record<string, number> = {};
  
  for (const entry of timeEntries) {
    const hours = Number(entry.fields['Hours']) || 0;
    totalHours += hours;
    
    const date = entry.fields['Date'] as string;
    if (date) {
      const dateKey = date.substring(0, 10); // YYYY-MM-DD
      hoursByDate[dateKey] = (hoursByDate[dateKey] || 0) + hours;
    }
  }

  // Projects by status
  const statusCounts: Record<string, number> = {};
  for (const project of projects) {
    const status = (project.fields['Status'] as string) || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  // Top clients by project count
  const clientProjects: Record<string, number> = {};
  for (const project of projects) {
    const clientName = project.fields['Client Name'] as string;
    if (clientName) {
      clientProjects[clientName] = (clientProjects[clientName] || 0) + 1;
    }
  }

  // Location coverage by state
  const stateCounts: Record<string, number> = {};
  for (const location of locations) {
    const state = (location.fields['State'] as string) || 'Unknown';
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  }

  // Sort and format results
  const projectsByStatus = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const topClients = Object.entries(clientProjects)
    .map(([name, projectCount]) => ({ name, projectCount }))
    .sort((a, b) => b.projectCount - a.projectCount)
    .slice(0, 10);

  const recentActivity = Object.entries(hoursByDate)
    .map(([date, hours]) => ({ date, hours }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  const locationCoverage = Object.entries(stateCounts)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    overview: {
      totalProjects: projects.length,
      totalJobs: jobs.length,
      totalClients: companies.length,
      totalLocations: locations.length,
      totalHoursLogged: Math.round(totalHours * 10) / 10,
    },
    projectsByStatus,
    topClients,
    recentActivity,
    locationCoverage,
    fetchedAt: new Date().toISOString(),
  };
}
