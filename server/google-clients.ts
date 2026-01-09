// Google Workspace Integration Clients
// Uses Replit Connectors for OAuth token management

import { google } from 'googleapis';

// Shared token fetching logic
async function getAccessToken(connectorName: string): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=${connectorName}`,
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );

  const data = await response.json();
  const connectionSettings = data.items?.[0];

  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error(`${connectorName} not connected`);
  }

  return accessToken;
}

// Gmail Client (google-mail integration)
// Permissions: gmail.send, gmail.labels, gmail.readonly, gmail.compose
// WARNING: Never cache this client - access tokens expire
export async function getGmailClient() {
  const accessToken = await getAccessToken('google-mail');
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Google Calendar Client (google-calendar integration)
// Permissions: calendar.events, calendar.readonly, calendar.freebusy
// WARNING: Never cache this client - access tokens expire
export async function getCalendarClient() {
  const accessToken = await getAccessToken('google-calendar');
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Google Drive Client (google-drive integration)
// Permissions: drive.file, drive.appdata, docs, spreadsheets
// WARNING: Never cache this client - access tokens expire
export async function getDriveClient() {
  const accessToken = await getAccessToken('google-drive');
  
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.drive({ version: 'v3', auth: oauth2Client });
}
