import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuoteSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/objects/finalize", async (req, res) => {
    if (!req.body.fileURL) {
      return res.status(400).json({ error: "fileURL is required" });
    }
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.fileURL,
      );
      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error finalizing upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Quote routes
  app.get("/api/quotes", async (req, res) => {
    try {
      const allQuotes = await storage.getAllQuotes();
      res.json(allQuotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      const validatedData = insertQuoteSchema.parse(req.body);
      const newQuote = await storage.createQuote(validatedData);
      res.status(201).json(newQuote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid quote data", details: error.errors });
      }
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  app.patch("/api/quotes/:id", async (req, res) => {
    try {
      const validatedData = insertQuoteSchema.partial().parse(req.body);
      const updatedQuote = await storage.updateQuote(req.params.id, validatedData);
      if (!updatedQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(updatedQuote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid quote data", details: error.errors });
      }
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuote(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // Quote version routes
  app.get("/api/quotes/:id/versions", async (req, res) => {
    try {
      const versions = await storage.getQuoteVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching quote versions:", error);
      res.status(500).json({ error: "Failed to fetch quote versions" });
    }
  });

  app.post("/api/quotes/:id/versions", async (req, res) => {
    try {
      const { versionName } = req.body;
      const newVersion = await storage.createQuoteVersion(req.params.id, versionName);
      res.status(201).json(newVersion);
    } catch (error) {
      console.error("Error creating quote version:", error);
      res.status(500).json({ error: "Failed to create quote version" });
    }
  });

  app.post("/api/calculate-distance", async (req, res) => {
    try {
      const { origin, destination } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and destination are required" });
      }

      const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
      if (!MAPBOX_TOKEN) {
        return res.status(500).json({ error: "Mapbox API token not configured" });
      }

      const DISPATCH_COORDS: Record<string, [number, number]> = {
        troy: [-73.6918, 42.7284],
        woodstock: [-74.1182, 42.0409],
        brooklyn: [-73.9442, 40.6782],
      };

      const originCoords = DISPATCH_COORDS[origin.toLowerCase()];
      if (!originCoords) {
        return res.status(400).json({ error: "Invalid dispatch location" });
      }

      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      const geocodeResponse = await fetch(geocodeUrl);
      
      if (!geocodeResponse.ok) {
        throw new Error("Failed to geocode destination address");
      }

      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData.features || geocodeData.features.length === 0) {
        return res.status(404).json({ error: "Address not found" });
      }

      const destCoords = geocodeData.features[0].geometry.coordinates;

      const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?access_token=${MAPBOX_TOKEN}`;
      const directionsResponse = await fetch(directionsUrl);
      
      if (!directionsResponse.ok) {
        throw new Error("Failed to calculate route");
      }

      const directionsData = await directionsResponse.json();
      
      if (!directionsData.routes || directionsData.routes.length === 0) {
        return res.status(404).json({ error: "No route found" });
      }

      const distanceMeters = directionsData.routes[0].distance;
      const distanceMiles = Math.round(distanceMeters / 1609.34);

      res.json({ 
        distance: distanceMiles,
        origin: origin,
        destination: destination,
        formattedAddress: geocodeData.features[0].place_name
      });
    } catch (error) {
      console.error("Error calculating distance:", error);
      res.status(500).json({ error: "Failed to calculate distance" });
    }
  });

  // Pricing matrix routes
  app.get("/api/pricing-matrix", async (req, res) => {
    try {
      const allRates = await storage.getAllPricingRates();
      res.json(allRates);
    } catch (error) {
      console.error("Error fetching pricing rates:", error);
      res.status(500).json({ error: "Failed to fetch pricing rates" });
    }
  });
  
  app.patch("/api/pricing-matrix/:id", async (req, res) => {
    try {
      const { ratePerSqFt } = req.body;
      if (!ratePerSqFt) {
        return res.status(400).json({ error: "ratePerSqFt is required" });
      }
      
      const updated = await storage.updatePricingRate(parseInt(req.params.id), ratePerSqFt);
      if (!updated) {
        return res.status(404).json({ error: "Pricing rate not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating pricing rate:", error);
      res.status(500).json({ error: "Failed to update pricing rate" });
    }
  });

  // Upteam pricing matrix routes
  app.get("/api/upteam-pricing-matrix", async (req, res) => {
    try {
      const allRates = await storage.getAllUpteamPricingRates();
      res.json(allRates);
    } catch (error) {
      console.error("Error fetching upteam pricing rates:", error);
      res.status(500).json({ error: "Failed to fetch upteam pricing rates" });
    }
  });

  app.patch("/api/upteam-pricing-matrix/:id", async (req, res) => {
    try {
      const { ratePerSqFt } = req.body;
      if (!ratePerSqFt) {
        return res.status(400).json({ error: "ratePerSqFt is required" });
      }
      
      const updated = await storage.updateUpteamPricingRate(parseInt(req.params.id), ratePerSqFt);
      if (!updated) {
        return res.status(404).json({ error: "Upteam pricing rate not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating upteam pricing rate:", error);
      res.status(500).json({ error: "Failed to update upteam pricing rate" });
    }
  });

  // CAD pricing matrix routes
  app.get("/api/cad-pricing-matrix", async (req, res) => {
    try {
      const allRates = await storage.getAllCadPricingRates();
      res.json(allRates);
    } catch (error) {
      console.error("Error fetching CAD pricing rates:", error);
      res.status(500).json({ error: "Failed to fetch CAD pricing rates" });
    }
  });

  // Pricing parameters routes
  app.get("/api/pricing-parameters", async (req, res) => {
    try {
      const allParameters = await storage.getAllPricingParameters();
      // Convert parameterValue to number for numeric types
      const typedParameters = allParameters.map(param => ({
        ...param,
        parameterValue: (param.parameterType === 'number' || param.parameterType === 'percentage') 
          ? Number(param.parameterValue)
          : param.parameterValue
      }));
      res.json(typedParameters);
    } catch (error) {
      console.error("Error fetching pricing parameters:", error);
      res.status(500).json({ error: "Failed to fetch pricing parameters" });
    }
  });

  app.patch("/api/pricing-parameters/:id", async (req, res) => {
    try {
      const { parameterValue } = req.body;
      if (parameterValue === undefined || parameterValue === null || parameterValue === "") {
        return res.status(400).json({ error: "parameterValue is required and cannot be empty" });
      }
      
      // Fetch existing parameter to check its type
      const allParameters = await storage.getAllPricingParameters();
      const existingParam = allParameters.find(p => p.id === parseInt(req.params.id));
      
      if (!existingParam) {
        return res.status(404).json({ error: "Pricing parameter not found" });
      }
      
      // Validate based on parameter type
      let valueToStore: string;
      const isNumericType = existingParam.parameterType === 'number' || existingParam.parameterType === 'percentage';
      
      if (isNumericType) {
        const numericValue = Number(parameterValue);
        if (isNaN(numericValue)) {
          return res.status(400).json({ error: `Parameter '${existingParam.parameterKey}' requires a numeric value` });
        }
        valueToStore = numericValue.toString();
      } else {
        valueToStore = String(parameterValue);
      }
      
      // Store in database
      const updated = await storage.updatePricingParameter(parseInt(req.params.id), valueToStore);
      if (!updated) {
        return res.status(404).json({ error: "Pricing parameter not found" });
      }
      
      // Return with proper type in response
      const typedResponse = {
        ...updated,
        parameterValue: isNumericType 
          ? Number(updated.parameterValue)
          : updated.parameterValue
      };
      
      res.json(typedResponse);
    } catch (error) {
      console.error("Error updating pricing parameter:", error);
      res.status(500).json({ error: "Failed to update pricing parameter" });
    }
  });

  // PandaDoc integration endpoint
  app.post("/api/pandadoc/create", async (req, res) => {
    try {
      const API_KEY = process.env.PANDADOC_API_KEY;
      const TEMPLATE_UUID = process.env.PANDADOC_TEMPLATE_UUID;
      
      if (!API_KEY || !TEMPLATE_UUID) {
        return res.status(500).json({ error: "PandaDoc API key or template UUID not configured" });
      }
      
      const data = req.body;
      
      // Extract core details
      const projectDetails = data.projectDetails || {};
      const projectAddress = projectDetails.projectAddress || "No Address Provided";
      const crmData = data.crmData || {};
      const contactEmail = crmData.accountContactEmail || "";
      
      // Handle Name
      const rawContact = crmData.accountContact || "";
      let first = "";
      let last = "";
      if (rawContact.includes(',')) {
        const parts = rawContact.split(', ');
        first = parts.length > 1 ? parts[1] : parts[0];
        last = parts[0];
      } else {
        const parts = rawContact.split(' ');
        first = parts[0] || "";
        last = parts.slice(1).join(' ') || "";
      }
      
      // Area & Scope Logic
      const areas = data.areas || [];
      const typeMap: Record<string, string> = {
        "1": "Residential - Single Family", "2": "Residential - Multi Family",
        "3": "Residential - Luxury", "4": "Commercial / Office",
        "5": "Retail / Restaurants", "6": "Kitchen / Catering Facilities",
        "7": "Education", "8": "Hotel / Theatre / Museum",
        "9": "Hospitals / Mixed Use", "10": "Mechanical / Utility Rooms",
        "11": "Warehouse / Storage", "12": "Religious Buildings",
        "13": "Infrastructure", "14": "Built Landscape",
        "15": "Natural Landscape", "16": "ACT (Ceiling Tiles)"
      };
      
      // Service Line (Header)
      const primaryArea = areas[0] || {};
      const bTypeId = String(primaryArea.buildingType || '4');
      const typeLabel = typeMap[bTypeId] || "Standard";
      
      const servicePrefix = ["1", "2", "3"].includes(bTypeId) 
        ? "Residential Service" 
        : "Commercial Service";
      const serviceLine = `${servicePrefix} for ${projectAddress} - ${typeLabel}`;
      
      // Build "Project.AreasList"
      const allDisciplines = new Set<string>();
      const areaDescriptions: string[] = [];
      
      for (const area of areas) {
        const name = area.name || 'Area';
        const sqft = parseInt(area.squareFeet) || 0;
        const lod = area.disciplineLods?.architecture || '300';
        const disciplines = area.disciplines || [];
        
        for (const d of disciplines) allDisciplines.add(d);
        if (area.gradeAroundBuilding) allDisciplines.add('grade');
        
        const extras: string[] = [];
        if (disciplines.includes('mepf')) extras.push("MEPF");
        if (disciplines.includes('structure')) extras.push("Structure");
        if (disciplines.includes('site') || area.gradeAroundBuilding) extras.push("Site/Grade");
        if (disciplines.includes('matterport')) extras.push("Matterport");
        
        const extrasStr = extras.join(" + ");
        const sqftFormatted = sqft.toLocaleString();
        const desc = extrasStr 
          ? `• ${name}: ${sqftFormatted} sqft - LoD ${lod} + ${extrasStr}`
          : `• ${name}: ${sqftFormatted} sqft - LoD ${lod}`;
        areaDescriptions.push(desc);
      }
      
      const areasListBlock = areaDescriptions.join("\n");
      
      // Build Scope & Deliverables Lists
      const scopeItems = [
        "End-to-end project management and customer service",
        "LiDAR Scan - A scanning technician will capture the interior and exterior."
      ];
      if (allDisciplines.has('matterport')) {
        scopeItems.push("Matterport Scan - A scanning technician will capture the interior.");
      }
      scopeItems.push("Registration - Point cloud data registered, cleaned, and reviewed.");
      scopeItems.push("BIM Modeling - Revit model creation.");
      scopeItems.push("QA/QC - Redundant review by engineering staff.");
      
      const scopeBullets = scopeItems.map(item => `• ${item}`).join("\n");
      
      // Deliverables - now per-area instead of aggregated
      const delivItems: string[] = ["Total Square Footage Audit"];
      
      // Generate a Revit Model deliverable for each area
      for (const area of areas) {
        const name = area.name || 'Area';
        const lod = area.disciplineLods?.architecture || '300';
        const disciplines = area.disciplines || [];
        
        const scopeParts: string[] = [`LoD ${lod}`];
        if (disciplines.includes('mepf')) scopeParts.push("MEPF");
        if (disciplines.includes('structure')) scopeParts.push("Structure");
        if (disciplines.includes('site') || area.gradeAroundBuilding) scopeParts.push("Site/Grade");
        
        delivItems.push(`Revit Model - ${name} ${scopeParts.join(' + ')}`);
      }
      
      if (allDisciplines.has('matterport')) {
        delivItems.push("Matterport 3D Tour");
      }
      delivItems.push("Colorized Point Cloud (.rcp format)");
      const delivBullets = delivItems.map(item => `• ${item}`).join("\n");
      
      // Format Pricing Table Rows
      const pricing = data.pricing || {};
      const lineItems = pricing.lineItems || [];
      const rows = lineItems
        .filter((item: any) => !item.isTotal)
        .map((item: any) => ({
          options: { qty: 1, name: item.label || 'Service', price: item.value || 0 },
          data: { name: item.label || 'Service', price: item.value || 0, qty: 1 }
        }));
      
      // Construct Payload
      const payload = {
        name: `Proposal: ${projectAddress}`,
        template_uuid: TEMPLATE_UUID,
        recipients: [{ email: contactEmail, first_name: first, last_name: last, role: "Client" }],
        tokens: [
          { name: "Project.Address", value: projectAddress },
          { name: "Project.ServiceLine", value: serviceLine },
          { name: "Project.AreasList", value: areasListBlock },
          { name: "Scope.List", value: scopeBullets },
          { name: "Deliverables.List", value: delivBullets }
        ],
        pricing_tables: [
          {
            name: "Pricing Table 1",
            sections: [{ title: "Services Scope", default: true, rows }]
          }
        ]
      };
      
      // Execute PandaDoc API call
      const response = await fetch("https://api.pandadoc.com/public/v1/documents", {
        method: "POST",
        headers: {
          "Authorization": `API-Key ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (response.status === 201) {
        const result = await response.json();
        const docId = result.id;
        const docUrl = `https://app.pandadoc.com/a/#/documents/${docId}`;
        res.json({ success: true, documentId: docId, documentUrl: docUrl });
      } else {
        const errorText = await response.text();
        console.error("PandaDoc API error:", errorText);
        res.status(response.status).json({ error: "PandaDoc API error", details: errorText });
      }
    } catch (error) {
      console.error("Error creating PandaDoc document:", error);
      res.status(500).json({ error: "Failed to create PandaDoc document" });
    }
  });

  // QuickBooks OAuth endpoints
  const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
  const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
  const APP_ORIGIN = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : 'http://localhost:5000';
  const QB_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || `${APP_ORIGIN}/api/quickbooks/callback`;
  const QB_SANDBOX = process.env.QUICKBOOKS_SANDBOX !== 'false'; // Default to sandbox
  
  // Store pending OAuth states for CSRF protection
  const pendingOAuthStates = new Map<string, { createdAt: Date }>();
  
  // Clean up expired states (older than 10 minutes)
  const cleanupOAuthStates = () => {
    const now = Date.now();
    const entries = Array.from(pendingOAuthStates.entries());
    for (let i = 0; i < entries.length; i++) {
      const [state, data] = entries[i];
      if (now - data.createdAt.getTime() > 10 * 60 * 1000) {
        pendingOAuthStates.delete(state);
      }
    }
  };
  
  // Start OAuth flow
  app.get("/api/quickbooks/auth", (req, res) => {
    if (!QB_CLIENT_ID) {
      return res.status(500).json({ error: "QuickBooks Client ID not configured" });
    }
    
    // Generate cryptographically secure random state
    const stateBytes = new Uint8Array(32);
    crypto.getRandomValues(stateBytes);
    const state = Buffer.from(stateBytes).toString('base64url');
    
    // Store state for validation
    cleanupOAuthStates();
    pendingOAuthStates.set(state, { createdAt: new Date() });
    
    const authUrl = new URL("https://appcenter.intuit.com/connect/oauth2");
    authUrl.searchParams.set("client_id", QB_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", QB_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "com.intuit.quickbooks.accounting");
    authUrl.searchParams.set("state", state);
    
    res.json({ authUrl: authUrl.toString() });
  });
  
  // OAuth callback
  app.get("/api/quickbooks/callback", async (req, res) => {
    try {
      const { code, realmId, state } = req.query;
      
      if (!code || !realmId) {
        return res.status(400).send("Missing authorization code or realm ID");
      }
      
      // Validate state to prevent CSRF attacks
      if (!state || !pendingOAuthStates.has(state as string)) {
        return res.status(400).send("Invalid or expired state parameter - possible CSRF attack");
      }
      pendingOAuthStates.delete(state as string);
      
      if (!QB_CLIENT_ID || !QB_CLIENT_SECRET) {
        return res.status(500).send("QuickBooks credentials not configured");
      }
      
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: QB_REDIRECT_URI
        })
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("QuickBooks token exchange failed:", errorText);
        return res.status(500).send("Failed to exchange authorization code");
      }
      
      const tokens = await tokenResponse.json();
      
      // Calculate expiration times
      const now = new Date();
      const accessTokenExpiresAt = new Date(now.getTime() + (tokens.expires_in * 1000));
      const refreshTokenExpiresAt = new Date(now.getTime() + (tokens.x_refresh_token_expires_in * 1000));
      
      // Store tokens in database
      await storage.saveQuickBooksTokens({
        realmId: realmId as string,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiresAt,
        refreshTokenExpiresAt
      });
      
      // Redirect back to app with success message - use specific origin for security
      res.send(`
        <html>
          <body>
            <h1>QuickBooks Connected Successfully!</h1>
            <p>You can close this window and return to the application.</p>
            <script>
              setTimeout(() => {
                const targetOrigin = '${APP_ORIGIN}';
                window.opener?.postMessage({ type: 'quickbooks-connected', realmId: '${realmId}' }, targetOrigin);
                window.close();
              }, 1500);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("QuickBooks OAuth callback error:", error);
      res.status(500).send("OAuth callback failed");
    }
  });
  
  // Check connection status
  app.get("/api/quickbooks/status", async (req, res) => {
    try {
      const tokens = await storage.getQuickBooksTokens();
      if (!tokens) {
        return res.json({ connected: false });
      }
      
      // Check if refresh token is still valid
      const now = new Date();
      if (tokens.refreshTokenExpiresAt < now) {
        return res.json({ connected: false, reason: "expired" });
      }
      
      res.json({ 
        connected: true, 
        realmId: tokens.realmId,
        accessTokenExpired: tokens.accessTokenExpiresAt < now
      });
    } catch (error) {
      console.error("Error checking QuickBooks status:", error);
      res.status(500).json({ error: "Failed to check connection status" });
    }
  });
  
  // Helper function to refresh access token
  async function refreshQuickBooksToken(tokens: any): Promise<string | null> {
    if (!QB_CLIENT_ID || !QB_CLIENT_SECRET) return null;
    
    try {
      const response = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refreshToken
        })
      });
      
      if (!response.ok) {
        console.error("Token refresh failed:", await response.text());
        return null;
      }
      
      const newTokens = await response.json();
      const now = new Date();
      
      await storage.saveQuickBooksTokens({
        realmId: tokens.realmId,
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        accessTokenExpiresAt: new Date(now.getTime() + (newTokens.expires_in * 1000)),
        refreshTokenExpiresAt: new Date(now.getTime() + (newTokens.x_refresh_token_expires_in * 1000))
      });
      
      return newTokens.access_token;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return null;
    }
  }
  
  // Create invoice
  app.post("/api/quickbooks/create-invoice", async (req, res) => {
    try {
      let tokens = await storage.getQuickBooksTokens();
      if (!tokens) {
        return res.status(401).json({ error: "Not connected to QuickBooks" });
      }
      
      // Refresh token if expired
      let accessToken = tokens.accessToken;
      const now = new Date();
      if (tokens.accessTokenExpiresAt < now) {
        const newToken = await refreshQuickBooksToken(tokens);
        if (!newToken) {
          return res.status(401).json({ error: "Failed to refresh QuickBooks token. Please reconnect." });
        }
        accessToken = newToken;
      }
      
      const data = req.body;
      const projectDetails = data.projectDetails || {};
      const crmData = data.crmData || {};
      const pricing = data.pricing || {};
      
      // Determine API base URL
      const baseUrl = QB_SANDBOX 
        ? "https://sandbox-quickbooks.api.intuit.com" 
        : "https://quickbooks.api.intuit.com";
      
      // First, we need to find or create a customer
      // For simplicity, we'll use a generic customer - in production you'd want to search/create
      const customerName = crmData.accountName || crmData.accountContact || "Scan2Plan Customer";
      
      // Search for existing customer
      const searchUrl = `${baseUrl}/v3/company/${tokens.realmId}/query?query=SELECT * FROM Customer WHERE DisplayName = '${customerName.replace(/'/g, "\\'")}'`;
      const searchResponse = await fetch(searchUrl, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json"
        }
      });
      
      let customerId: string;
      const searchResult = await searchResponse.json();
      
      if (searchResult.QueryResponse?.Customer?.length > 0) {
        customerId = searchResult.QueryResponse.Customer[0].Id;
      } else {
        // Create new customer
        const createCustomerResponse = await fetch(`${baseUrl}/v3/company/${tokens.realmId}/customer`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            DisplayName: customerName,
            PrimaryEmailAddr: crmData.accountContactEmail ? { Address: crmData.accountContactEmail } : undefined,
            PrimaryPhone: crmData.accountContactPhone ? { FreeFormNumber: crmData.accountContactPhone } : undefined
          })
        });
        
        if (!createCustomerResponse.ok) {
          const errorText = await createCustomerResponse.text();
          console.error("Failed to create customer:", errorText);
          return res.status(500).json({ error: "Failed to create customer in QuickBooks" });
        }
        
        const newCustomer = await createCustomerResponse.json();
        customerId = newCustomer.Customer.Id;
      }
      
      // Build invoice line items
      const lineItems = pricing.lineItems || [];
      const invoiceLines = lineItems
        .filter((item: any) => !item.isTotal && item.value > 0)
        .map((item: any, index: number) => ({
          LineNum: index + 1,
          Amount: parseFloat(item.value) || 0,
          DetailType: "SalesItemLineDetail",
          Description: item.label || "Service",
          SalesItemLineDetail: {
            ItemRef: {
              value: "1", // Default service item - in production, you'd want to map to actual items
              name: "Services"
            },
            Qty: 1,
            UnitPrice: parseFloat(item.value) || 0
          }
        }));
      
      // Create the invoice
      const invoiceData = {
        CustomerRef: { value: customerId },
        Line: invoiceLines,
        CustomerMemo: { value: `Project: ${projectDetails.projectName || 'Scan-to-BIM Project'}\nAddress: ${projectDetails.projectAddress || 'N/A'}` },
        BillEmail: crmData.accountContactEmail ? { Address: crmData.accountContactEmail } : undefined
      };
      
      const invoiceResponse = await fetch(`${baseUrl}/v3/company/${tokens.realmId}/invoice`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(invoiceData)
      });
      
      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        console.error("Failed to create invoice:", errorText);
        return res.status(500).json({ error: "Failed to create invoice in QuickBooks", details: errorText });
      }
      
      const invoice = await invoiceResponse.json();
      const invoiceId = invoice.Invoice.Id;
      const docNumber = invoice.Invoice.DocNumber;
      
      // Generate link to view invoice in QuickBooks
      const invoiceUrl = QB_SANDBOX
        ? `https://app.sandbox.qbo.intuit.com/app/invoice?txnId=${invoiceId}`
        : `https://app.qbo.intuit.com/app/invoice?txnId=${invoiceId}`;
      
      res.json({ 
        success: true, 
        invoiceId, 
        docNumber,
        invoiceUrl,
        customerId
      });
    } catch (error) {
      console.error("Error creating QuickBooks invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });
  
  // Disconnect QuickBooks
  app.post("/api/quickbooks/disconnect", async (req, res) => {
    try {
      await storage.deleteQuickBooksTokens();
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting QuickBooks:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
