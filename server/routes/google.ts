import type { Express } from "express";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { getGmailClient, getCalendarClient, getDriveClient } from "../google-clients";
import { log } from "../lib/logger";
import multer from "multer";
import fs from "fs";

const upload = multer({ dest: "/tmp/uploads/" });

export async function registerGoogleRoutes(app: Express): Promise<void> {
  app.get("/api/google/gmail/messages", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const gmail = await getGmailClient();
      const maxResults = Number(req.query.maxResults) || 10;
      const q = req.query.q as string || '';
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q,
      });

      const messages = await Promise.all(
        (response.data.messages || []).map(async (msg) => {
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
          });
          const headers = full.data.payload?.headers || [];
          return {
            id: msg.id,
            threadId: msg.threadId,
            snippet: full.data.snippet,
            from: headers.find(h => h.name === 'From')?.value,
            to: headers.find(h => h.name === 'To')?.value,
            subject: headers.find(h => h.name === 'Subject')?.value,
            date: headers.find(h => h.name === 'Date')?.value,
          };
        })
      );

      res.json({ messages });
    } catch (error: any) {
      log("ERROR: Gmail list error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Failed to fetch emails" });
    }
  }));

  app.post("/api/google/gmail/send", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const gmail = await getGmailClient();
      const { to, subject, body } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({ message: "to, subject, and body are required" });
      }

      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ].join('\r\n');

      const encodedEmail = Buffer.from(email).toString('base64url');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedEmail },
      });

      res.json({ messageId: response.data.id, threadId: response.data.threadId });
    } catch (error: any) {
      log("ERROR: Gmail send error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Failed to send email" });
    }
  }));

  app.get("/api/google/calendar/events", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const calendar = await getCalendarClient();
      const maxResults = Number(req.query.maxResults) || 10;
      const timeMin = req.query.timeMin as string || new Date().toISOString();

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = (response.data.items || []).map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        htmlLink: event.htmlLink,
      }));

      res.json({ events });
    } catch (error: any) {
      log("ERROR: Calendar list error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Failed to fetch calendar events" });
    }
  }));

  app.post("/api/google/calendar/events", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const calendar = await getCalendarClient();
      const { summary, description, location, start, end } = req.body;

      if (!summary || !start || !end) {
        return res.status(400).json({ message: "summary, start, and end are required" });
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description,
          location,
          start: { dateTime: start },
          end: { dateTime: end },
        },
      });

      res.json({
        id: response.data.id,
        summary: response.data.summary,
        htmlLink: response.data.htmlLink,
      });
    } catch (error: any) {
      log("ERROR: Calendar create error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Failed to create event" });
    }
  }));

  app.get("/api/google/drive/files", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const drive = await getDriveClient();
      const pageSize = Number(req.query.pageSize) || 10;
      const q = req.query.q as string || '';

      const response = await drive.files.list({
        pageSize,
        q: q || undefined,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink)',
      });

      res.json({ files: response.data.files || [] });
    } catch (error: any) {
      log("ERROR: Drive list error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Failed to list files" });
    }
  }));

  app.post("/api/google/drive/upload", isAuthenticated, upload.single("file"), asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const drive = await getDriveClient();
      const { name, folderId } = req.body;

      const response = await drive.files.create({
        requestBody: {
          name: name || req.file.originalname,
          parents: folderId ? [folderId] : undefined,
        },
        media: {
          mimeType: req.file.mimetype,
          body: fs.createReadStream(req.file.path),
        },
        fields: 'id, name, webViewLink',
      });

      fs.unlinkSync(req.file.path);

      res.json({
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
      });
    } catch (error: any) {
      log("ERROR: Drive upload error - " + (error?.message || error));
      if (req.file?.path) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  }));

  app.get("/api/maps/script", (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(503).send("// Google Maps API key not configured");
    }
    
    const libraries = req.query.libraries || "drawing,geometry";
    const callback = req.query.callback || "";
    
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries}${callback ? `&callback=${callback}` : ""}`;
    res.redirect(scriptUrl);
  });

  app.get("/api/maps/static", asyncHandler(async (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Google Maps API key not configured" });
    }
    
    const { center, zoom, size, maptype, path } = req.query;
    
    if (!center || !zoom || !size) {
      return res.status(400).json({ error: "center, zoom, and size are required" });
    }
    
    const centerStr = String(center);
    const zoomStr = String(zoom);
    const sizeStr = String(size);
    const maptypeStr = String(maptype || "satellite");
    
    if (!/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(centerStr)) {
      return res.status(400).json({ error: "Invalid center format" });
    }
    
    const zoomNum = parseInt(zoomStr, 10);
    if (isNaN(zoomNum) || zoomNum < 1 || zoomNum > 21) {
      return res.status(400).json({ error: "Invalid zoom level" });
    }
    
    if (!/^\d+x\d+$/.test(sizeStr)) {
      return res.status(400).json({ error: "Invalid size format" });
    }
    
    const pathStr = path ? String(path) : "";
    if (pathStr.length > 5000) {
      return res.status(400).json({ error: "Path too long, max 100 points" });
    }
    
    try {
      let url = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(centerStr)}&zoom=${zoomNum}&size=${encodeURIComponent(sizeStr)}&maptype=${encodeURIComponent(maptypeStr)}&key=${apiKey}`;
      
      if (pathStr) {
        url += `&path=${encodeURIComponent(pathStr)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch static map" });
      }
      
      const contentType = response.headers.get("content-type");
      res.setHeader("Content-Type", contentType || "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      log("ERROR: Static map error - " + (error as any)?.message);
      res.status(500).json({ error: "Failed to generate static map" });
    }
  }));

  app.get("/api/location/preview", asyncHandler(async (req, res) => {
    try {
      const address = req.query.address as string;
      if (!address || address.trim().length < 5) {
        return res.status(400).json({ error: "Address is required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          error: "Google Maps API key not configured",
          available: false 
        });
      }

      const encodedAddress = encodeURIComponent(address);
      
      let streetViewUrl = "";
      let lat: number | null = null;
      let lng: number | null = null;
      
      try {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
        );
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.status === "OK" && geocodeData.results?.[0]) {
          const location = geocodeData.results[0].geometry?.location;
          if (location) {
            lat = location.lat;
            lng = location.lng;
            streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&key=${apiKey}`;
          }
        }
      } catch (geoErr) {
        log("WARN: Geocoding failed for location preview - " + (geoErr as any)?.message);
      }

      const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`;
      const satelliteUrl = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${lat || 40.7},${lng || -74}&zoom=18&maptype=satellite`;

      res.json({
        available: true,
        mapUrl,
        satelliteUrl,
        streetViewUrl,
        geocoded: {
          lat,
          lng,
          formattedAddress: address
        }
      });
    } catch (error) {
      log("ERROR: Location preview error - " + (error as any)?.message);
      res.status(500).json({ error: "Failed to generate location preview" });
    }
  }));

  app.get("/api/location/aerial-view", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Valid latitude and longitude are required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          error: "Google Maps API key not configured",
          available: false 
        });
      }

      const lookupResponse = await fetch(
        `https://aerialview.googleapis.com/v1/videos:lookupVideoMetadata?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: {
              latitude: lat,
              longitude: lng
            }
          })
        }
      );

      if (lookupResponse.ok) {
        const videoData = await lookupResponse.json();
        if (videoData.videoId || videoData.state === "DONE") {
          return res.json({
            available: true,
            hasVideo: true,
            videoId: videoData.videoId,
            state: videoData.state,
            videoUri: videoData.uris?.MP4_HIGH?.portraitUri || videoData.uris?.MP4_MEDIUM?.portraitUri,
            landscapeUri: videoData.uris?.MP4_HIGH?.landscapeUri || videoData.uris?.MP4_MEDIUM?.landscapeUri,
            metadata: videoData.metadata
          });
        }
      }

      res.json({
        available: true,
        hasVideo: false,
        message: "3D flyover video not available for this location. You can request a rendering.",
        canRequest: true
      });
      
    } catch (error) {
      log("ERROR: Aerial view error - " + (error as any)?.message);
      res.status(500).json({ error: "Failed to fetch aerial view data" });
    }
  }));

  app.post("/api/location/aerial-view/request", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const { lat, lng, address } = req.body;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "Google Maps API key not configured" });
      }

      const renderResponse = await fetch(
        `https://aerialview.googleapis.com/v1/videos:renderVideo?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: address || `${lat},${lng}`
          })
        }
      );

      if (!renderResponse.ok) {
        const errorText = await renderResponse.text();
        log("ERROR: Aerial View render error - " + errorText);
        return res.status(renderResponse.status).json({
          error: "Failed to request video rendering",
          details: errorText
        });
      }

      const renderData = await renderResponse.json();
      res.json({
        success: true,
        state: renderData.state || "PROCESSING",
        videoId: renderData.videoId,
        message: "Video rendering requested. This may take several minutes."
      });
      
    } catch (error) {
      log("ERROR: Aerial view render request error - " + (error as any)?.message);
      res.status(500).json({ error: "Failed to request video rendering" });
    }
  }));
}
