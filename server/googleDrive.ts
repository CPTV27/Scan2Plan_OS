// Google Drive Integration for Scan2Plan OS
// Connection: google-drive (Replit Connector)
// Creates project folders on "Closed Won" events with standard subfolder structure

import { google } from 'googleapis';
import { log } from "./lib/logger";

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  // Always refresh if token is expired or about to expire (5 minute buffer)
  const bufferMs = 5 * 60 * 1000;
  const isExpired = !connectionSettings || 
    !connectionSettings.settings?.expires_at ||
    new Date(connectionSettings.settings.expires_at).getTime() < (Date.now() + bufferMs);
    
  if (!isExpired && connectionSettings.settings.access_token) {
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

export interface ProjectFolderResult {
  folderId: string;
  folderUrl: string;
  subfolders: {
    fieldCapture: string;
    bimProduction: string;
    accountingFinancials: string;
    clientDeliverables: string;
  };
}

export async function createProjectFolder(universalProjectId: string): Promise<ProjectFolderResult> {
  const drive = await getGoogleDriveClient();
  
  // Create the main project folder
  const mainFolderResponse = await drive.files.create({
    requestBody: {
      name: universalProjectId,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id, webViewLink',
  });

  const folderId = mainFolderResponse.data.id!;
  const folderUrl = mainFolderResponse.data.webViewLink!;

  // Create subfolders per project specification
  const subfolderNames = [
    '01_Field_Capture',
    '02_BIM_Production',
    '03_Accounting_Financials',
    '04_Client_Final_Deliverables',
  ];

  const subfolderIds: string[] = [];
  for (const subfolderName of subfolderNames) {
    const subfolderResponse = await drive.files.create({
      requestBody: {
        name: subfolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [folderId],
      },
      fields: 'id',
    });
    subfolderIds.push(subfolderResponse.data.id!);
  }

  // Share folder with accounting and production teams
  const shareEmails = ['accounting@scan2plan.dev', 'production@scan2plan.dev'];
  
  for (const email of shareEmails) {
    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: email,
        },
        sendNotificationEmail: false,
      });
    } catch (err) {
      log(`WARN: Failed to share folder with ${email} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  log(`Created Google Drive folder for project ${universalProjectId}: ${folderUrl}`);

  return {
    folderId,
    folderUrl,
    subfolders: {
      fieldCapture: subfolderIds[0],
      bimProduction: subfolderIds[1],
      accountingFinancials: subfolderIds[2],
      clientDeliverables: subfolderIds[3],
    },
  };
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export interface UploadFileResult {
  fileId: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink?: string;
}

export async function uploadFileToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<UploadFileResult> {
  const drive = await getGoogleDriveClient();
  const { Readable } = await import('stream');
  
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: Readable.from(fileBuffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink, thumbnailLink',
  });

  // Make the file accessible via link
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      type: 'anyone',
      role: 'reader',
    },
  });

  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink || '',
    webContentLink: response.data.webContentLink || '',
    thumbnailLink: response.data.thumbnailLink,
  };
}
