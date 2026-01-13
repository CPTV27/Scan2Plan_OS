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
    additionalDocuments: string;
  };
}

const SCAN2PLAN_PARENT_FOLDER_NAME = "Scan2Plan OS Projects";

async function getOrCreateParentFolder(drive: any): Promise<string | null> {
  try {
    const response = await drive.files.list({
      q: `name='${SCAN2PLAN_PARENT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    
    if (response.data.files && response.data.files.length > 0) {
      log(`Found existing parent folder: ${SCAN2PLAN_PARENT_FOLDER_NAME}`);
      return response.data.files[0].id;
    }
    
    const createResponse = await drive.files.create({
      requestBody: {
        name: SCAN2PLAN_PARENT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    
    log(`Created parent folder: ${SCAN2PLAN_PARENT_FOLDER_NAME}`);
    return createResponse.data.id;
  } catch (error) {
    log(`WARN: Could not get/create parent folder - ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

export async function createProjectFolder(universalProjectId: string): Promise<ProjectFolderResult> {
  const drive = await getGoogleDriveClient();
  
  const parentFolderId = await getOrCreateParentFolder(drive);
  
  const mainFolderResponse = await drive.files.create({
    requestBody: {
      name: universalProjectId,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentFolderId && { parents: [parentFolderId] }),
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
    '05_Additional_Documents',
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
      additionalDocuments: subfolderIds[4],
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
    thumbnailLink: response.data.thumbnailLink || undefined,
  };
}
