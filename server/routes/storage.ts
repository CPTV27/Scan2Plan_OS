import { Express } from "express";
import { Storage } from "@google-cloud/storage";
import { storage } from "../storage";
import { GcsStorageConfig } from "@shared/schema";

function log(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [storage] ${message}`);
}

export function registerStorageRoutes(app: Express) {
  // Test GCS connection with provided credentials
  app.post("/api/storage/gcs/test", async (req, res) => {
    try {
      const { projectId, bucket, credentials } = req.body;

      if (!projectId || !bucket) {
        return res.status(400).json({ 
          success: false, 
          error: "Project ID and bucket name are required" 
        });
      }

      let storageClient: Storage;

      if (credentials) {
        // Parse credentials if provided as string
        const credentialsObj = typeof credentials === "string" 
          ? JSON.parse(credentials) 
          : credentials;
        
        storageClient = new Storage({
          projectId,
          credentials: credentialsObj,
        });
      } else {
        // Try using environment variable
        const envCredentials = process.env.GCS_SERVICE_ACCOUNT_JSON;
        if (!envCredentials) {
          return res.status(400).json({ 
            success: false, 
            error: "No credentials provided and GCS_SERVICE_ACCOUNT_JSON is not set" 
          });
        }
        
        storageClient = new Storage({
          projectId,
          credentials: JSON.parse(envCredentials),
        });
      }

      // Test bucket access
      const [exists] = await storageClient.bucket(bucket).exists();
      
      if (!exists) {
        return res.status(400).json({ 
          success: false, 
          error: `Bucket "${bucket}" does not exist or is not accessible` 
        });
      }

      // Test write permission by getting bucket metadata
      const [metadata] = await storageClient.bucket(bucket).getMetadata();
      
      log(`GCS connection test successful: ${projectId}/${bucket}`);
      
      res.json({ 
        success: true, 
        message: "Connection successful",
        bucketLocation: metadata.location,
        bucketStorageClass: metadata.storageClass,
      });
    } catch (error: any) {
      log(`GCS connection test failed: ${error.message}`);
      
      let errorMessage = error.message;
      if (error.code === 403) {
        errorMessage = "Permission denied. Check that the service account has access to this bucket.";
      } else if (error.code === 404) {
        errorMessage = "Bucket not found. Check the bucket name.";
      } else if (error.message?.includes("invalid_grant")) {
        errorMessage = "Invalid credentials. The service account key may be expired or invalid.";
      }
      
      res.status(400).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  });

  // Save GCS configuration
  app.post("/api/storage/gcs/configure", async (req, res) => {
    try {
      const { projectId, bucket, defaultStorageMode, credentials } = req.body;

      if (!projectId || !bucket) {
        return res.status(400).json({ 
          success: false, 
          error: "Project ID and bucket name are required" 
        });
      }

      // Validate storage mode
      const validModes = ["legacy_drive", "hybrid_gcs", "gcs_native"];
      if (defaultStorageMode && !validModes.includes(defaultStorageMode)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid storage mode" 
        });
      }

      // If credentials are provided, they should be stored as a secret
      // For now, we expect them to be set as GCS_SERVICE_ACCOUNT_JSON env var
      if (credentials) {
        log("Note: Credentials provided - these should be stored as GCS_SERVICE_ACCOUNT_JSON secret");
      }

      // Save configuration to settings
      const config: GcsStorageConfig = {
        projectId,
        defaultBucket: bucket,
        configured: true,
        defaultStorageMode: defaultStorageMode || "hybrid_gcs",
        lastTestedAt: new Date().toISOString(),
      };

      await storage.updateSetting("gcsStorage", config);
      
      log(`GCS configuration saved: ${projectId}/${bucket} (mode: ${config.defaultStorageMode})`);
      
      res.json({ 
        success: true, 
        config 
      });
    } catch (error: any) {
      log(`Failed to save GCS configuration: ${error.message}`);
      res.status(500).json({ 
        success: false, 
        error: "Failed to save configuration" 
      });
    }
  });

  // Get current GCS configuration
  app.get("/api/storage/gcs/config", async (req, res) => {
    try {
      const config = await storage.getSettingValue<GcsStorageConfig>("gcsStorage");
      
      // Check if credentials are available
      const hasCredentials = !!process.env.GCS_SERVICE_ACCOUNT_JSON;
      
      res.json({ 
        config: config || null,
        hasCredentials,
      });
    } catch (error: any) {
      log(`Failed to get GCS configuration: ${error.message}`);
      res.status(500).json({ error: "Failed to get configuration" });
    }
  });

  // Disconnect/remove GCS configuration
  app.post("/api/storage/gcs/disconnect", async (req, res) => {
    try {
      await storage.updateSetting("gcsStorage", {
        projectId: "",
        defaultBucket: "",
        configured: false,
        defaultStorageMode: "legacy_drive",
      } as GcsStorageConfig);
      
      log("GCS configuration removed");
      
      res.json({ success: true });
    } catch (error: any) {
      log(`Failed to disconnect GCS: ${error.message}`);
      res.status(500).json({ 
        success: false, 
        error: "Failed to disconnect" 
      });
    }
  });
}
