import type { Express } from "express";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { getGmailClient, getCalendarClient, getDriveClient } from "../google-clients";
import { log } from "../lib/logger";
import { storage } from "../storage";
import multer from "multer";
import fs from "fs";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// CPQ Building type ID to name mapping
const CPQ_BUILDING_TYPE_NAMES: Record<string, string> = {
  "1": "Residential - Single Family",
  "2": "Residential - Multi Family",
  "3": "Residential - Luxury",
  "4": "Commercial / Office",
  "5": "Retail / Restaurants",
  "6": "Kitchen / Catering",
  "7": "Education",
  "8": "Hotel / Theatre / Museum",
  "9": "Hospitals / Mixed Use",
  "10": "Mechanical / Utility",
  "11": "Warehouse / Storage",
  "12": "Religious Buildings",
  "13": "Infrastructure / Roads",
  "14": "Built Landscape",
  "15": "Natural Landscape",
  "16": "ACT (Acoustic Ceiling)",
};

// Discipline display names - consistent capitalization
const DISCIPLINE_NAMES: Record<string, string> = {
  "arch": "Architecture",
  "architecture": "Architecture",
  "struct": "Structure",
  "structural": "Structure",
  "mech": "MEPF",
  "mechanical": "MEPF",
  "elec": "MEPF",
  "electrical": "MEPF",
  "plumb": "MEPF",
  "plumbing": "MEPF",
  "site": "Site",
  "mep": "MEPF",
  "mepf": "MEPF",
};

// Scope display names
const SCOPE_NAMES: Record<string, string> = {
  "full": "Full Building (Interior + Exterior)",
  "interior": "Interior Only",
  "exterior": "Exterior Only",
  "roof": "Roof/Facades",
  "facade": "Facade Only",
};

// Payment terms display names
const PAYMENT_TERMS_NAMES: Record<string, string> = {
  "standard": "Due on Receipt",
  "prepaid": "Prepaid (5% discount)",
  "partner": "Partner Terms (10% discount)",
  "net15": "Net 15",
  "net30": "Net 30",
  "net45": "Net 45",
  "net60": "Net 60",
  "net90": "Net 90",
};

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function generateProposalEmailHtml(lead: any, quote: any): string {
  // Client info - prefer contact name over company
  const clientName = lead.contactName || lead.clientName || lead.company || 'Valued Client';
  const projectName = lead.projectName || lead.company || 'Your Project';
  const projectAddress = quote?.projectAddress || lead.projectAddress || '';
  const quoteNumber = quote?.quoteNumber || '';
  const quoteDate = formatDate(quote?.createdAt) || formatDate(new Date());
  
  // Contact info
  const contactName = lead.contactName || lead.billingContactName || '';
  const contactEmail = lead.contactEmail || lead.billingContactEmail || '';
  const contactPhone = lead.contactPhone || lead.billingContactPhone || '';
  
  // Payment terms
  const paymentTermsKey = quote?.paymentTerms || lead.paymentTerms || 'standard';
  const paymentTermsDisplay = PAYMENT_TERMS_NAMES[paymentTermsKey] || paymentTermsKey;
  
  const pricingData = quote?.pricingBreakdown;
  const totalPrice = pricingData?.totalClientPrice || pricingData?.totalPrice || pricingData?.subtotal || quote?.totalPrice || 0;
  const areas = quote?.areas || [];
  const pricingItems = pricingData?.items || [];
  
  // Build detailed scope of work table with distinct area names
  let scopeTableRows = '';
  if (areas.length > 0) {
    const seenNames = new Set<string>();
    scopeTableRows = areas.map((area: any, i: number) => {
      const sqft = area.kind === 'landscape' 
        ? Math.round(parseFloat(area.acres || 0) * 43560) 
        : parseInt(area.squareFeet || area.sqft || 0, 10);
      const buildingTypeName = CPQ_BUILDING_TYPE_NAMES[area.buildingType] || area.kind || 'Building';
      const scopeName = SCOPE_NAMES[area.scope] || area.scope || 'Full';
      
      // Extract LOD from disciplineLods - this is the correct data structure
      const disciplineLodEntries: { discipline: string; lod: string }[] = [];
      if (area.disciplineLods && typeof area.disciplineLods === 'object') {
        for (const [disc, lodData] of Object.entries(area.disciplineLods)) {
          const lodValue = typeof lodData === 'object' && lodData !== null 
            ? (lodData as any).lod 
            : String(lodData);
          const displayName = DISCIPLINE_NAMES[disc.toLowerCase()] || disc;
          disciplineLodEntries.push({ discipline: displayName, lod: lodValue || '300' });
        }
      }
      
      // Determine LOD display - show per-discipline if they differ
      let lodDisplay = 'LOD 300';
      if (disciplineLodEntries.length > 0) {
        const uniqueLods = new Set(disciplineLodEntries.map(d => d.lod));
        if (uniqueLods.size > 1) {
          lodDisplay = disciplineLodEntries.map(d => `${d.discipline}: LOD ${d.lod}`).join(', ');
        } else {
          const highestLod = Math.max(...disciplineLodEntries.map(d => parseInt(d.lod) || 300));
          lodDisplay = `LOD ${highestLod}`;
        }
      } else if (area.mixedInteriorLod && area.mixedExteriorLod && area.mixedInteriorLod !== area.mixedExteriorLod) {
        lodDisplay = `Int LOD ${area.mixedInteriorLod} / Ext LOD ${area.mixedExteriorLod}`;
      } else if (area.lod) {
        lodDisplay = `LOD ${area.lod}`;
      }
      
      // Get disciplines with consistent capitalization and deduplication
      const disciplineSet = new Set<string>();
      (area.disciplines || []).forEach((d: string) => {
        const mapped = DISCIPLINE_NAMES[d.toLowerCase()] || d;
        disciplineSet.add(mapped);
      });
      const disciplines = Array.from(disciplineSet).sort().join(', ') || 'Architecture';
      
      // Make area names distinct if they duplicate project name
      let areaName = area.name || `Area ${i + 1}`;
      if (areaName === projectName && areas.length > 1) {
        areaName = `Area ${i + 1} - ${buildingTypeName}`;
      } else if (seenNames.has(areaName)) {
        areaName = `${areaName} (${i + 1})`;
      }
      seenNames.add(areaName);
      
      return `<tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
          <strong>${areaName}</strong><br>
          <span style="color: #6b7280; font-size: 13px;">${buildingTypeName}</span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
          ${scopeName}<br>
          <span style="color: #6b7280; font-size: 13px;">${lodDisplay}</span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
          ${disciplines}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: top;">
          ${sqft > 0 ? sqft.toLocaleString() : '-'} sqft
        </td>
      </tr>`;
    }).join('');
  }
  
  // Build pricing breakdown - categorize items with better labels
  const scanningItems: any[] = [];
  const modelingItems: any[] = [];
  const travelItems: any[] = [];
  const riskItems: any[] = [];
  const adjustmentItems: any[] = [];
  
  pricingItems.forEach((item: any) => {
    if (item.isTotal) return;
    const label = (item.label || '').toLowerCase();
    
    // Categorize with better logic
    if (label.includes('travel') || label.includes('mileage')) {
      travelItems.push(item);
    } else if (label.includes('risk') || label.includes('premium') || label.includes('occupied') || label.includes('hazardous')) {
      riskItems.push(item);
    } else if (label.includes('adjustment')) {
      // Rename adjustment for clarity
      adjustmentItems.push({
        ...item,
        label: item.label.replace('Price Adjustment', 'Margin Adjustment')
      });
    } else if (label.includes('discount')) {
      adjustmentItems.push(item);
    } else if (label.includes('scanning') || label.includes('scan')) {
      scanningItems.push(item);
    } else {
      // All modeling/discipline items go here
      modelingItems.push(item);
    }
  });
  
  // Build pricing line items HTML
  const buildItemRows = (items: any[]) => items.map((item: any) => 
    `<tr>
      <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${item.label}</td>
      <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 500;">${formatCurrency(item.value || 0)}</td>
    </tr>`
  ).join('');
  
  // Additional services
  let servicesHtml = '';
  if (pricingData?.services?.length > 0) {
    servicesHtml = pricingData.services.map((svc: any) => 
      `<li style="margin: 4px 0;">${svc.name}: ${formatCurrency(svc.price)}</li>`
    ).join('');
  }
  
  // Build contact info section
  const hasContactInfo = contactName || contactEmail || contactPhone;
  const contactInfoHtml = hasContactInfo ? `
    <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px;">Project Contact</h3>
    <table style="width: 100%; margin: 16px 0; font-size: 14px;">
      ${contactName ? `<tr><td style="padding: 4px 0; color: #6b7280;">Contact:</td><td style="padding: 4px 0;"><strong>${contactName}</strong></td></tr>` : ''}
      ${contactEmail ? `<tr><td style="padding: 4px 0; color: #6b7280;">Email:</td><td style="padding: 4px 0;"><a href="mailto:${contactEmail}" style="color: #2563eb;">${contactEmail}</a></td></tr>` : ''}
      ${contactPhone ? `<tr><td style="padding: 4px 0; color: #6b7280;">Phone:</td><td style="padding: 4px 0;">${contactPhone}</td></tr>` : ''}
    </table>
  ` : '';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; max-width: 720px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 32px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">Scan2Plan</h1>
    <p style="margin: 0; opacity: 0.9; font-size: 14px;">Precision 3D Laser Scanning & BIM Services</p>
  </div>
  
  <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    
    <!-- Quote Header with Number, Date, Address -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
      <div>
        ${quoteNumber ? `<p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">Quote Number</p><p style="margin: 0; font-size: 16px; font-weight: 600;">${quoteNumber}</p>` : ''}
      </div>
      <div style="text-align: right;">
        ${quoteDate ? `<p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">Date</p><p style="margin: 0; font-size: 16px;">${quoteDate}</p>` : ''}
      </div>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 16px;">Dear ${clientName},</p>
    
    <p>Thank you for the opportunity to provide a proposal for <strong>${projectName}</strong>.</p>
    ${projectAddress ? `<p style="margin: 8px 0 24px 0; color: #6b7280;"><strong>Project Location:</strong> ${projectAddress}</p>` : '<p style="margin-bottom: 24px;"></p>'}
    
    <p>Based on our discussions and site analysis, we are pleased to present the following scope and investment summary.</p>
    
    <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <h2 style="margin: 0 0 12px 0; color: #1e40af; font-size: 18px;">Project Investment</h2>
      <p style="margin: 0; font-size: 32px; font-weight: 700; color: #1e3a5f;">${formatCurrency(totalPrice)}</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Payment Terms: ${paymentTermsDisplay}</p>
    </div>
    
    ${areas.length > 0 ? `
    <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px;">Scope of Work</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 10px 12px; text-align: left; font-weight: 600;">Area / Building Type</th>
          <th style="padding: 10px 12px; text-align: left; font-weight: 600;">Scope / LOD</th>
          <th style="padding: 10px 12px; text-align: left; font-weight: 600;">Disciplines</th>
          <th style="padding: 10px 12px; text-align: right; font-weight: 600;">Size</th>
        </tr>
      </thead>
      <tbody>
        ${scopeTableRows}
      </tbody>
    </table>
    ` : ''}
    
    ${scanningItems.length > 0 ? `
    <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px;">Scanning Services</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tbody>
        ${buildItemRows(scanningItems)}
      </tbody>
    </table>
    ` : ''}
    
    ${modelingItems.length > 0 ? `
    <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px;">Modeling Services</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tbody>
        ${buildItemRows(modelingItems)}
      </tbody>
    </table>
    ` : ''}
    
    ${travelItems.length > 0 ? `
    <h4 style="color: #6b7280; margin: 16px 0 8px 0; font-size: 14px;">Travel</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tbody>
        ${buildItemRows(travelItems)}
      </tbody>
    </table>
    ` : ''}
    
    ${riskItems.length > 0 ? `
    <h4 style="color: #6b7280; margin: 16px 0 8px 0; font-size: 14px;">Site Conditions</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tbody>
        ${buildItemRows(riskItems)}
      </tbody>
    </table>
    ` : ''}
    
    ${adjustmentItems.length > 0 ? `
    <h4 style="color: #6b7280; margin: 16px 0 8px 0; font-size: 14px;">Adjustments</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tbody>
        ${buildItemRows(adjustmentItems)}
      </tbody>
    </table>
    ` : ''}
    
    ${servicesHtml ? `
    <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px;">Additional Services</h3>
    <ul style="padding-left: 20px; margin: 16px 0;">
      ${servicesHtml}
    </ul>
    ` : ''}
    
    ${contactInfoHtml}
    
    <div style="margin-top: 32px;">
      <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">What's Included</h3>
      <ul style="padding-left: 20px;">
        <li style="margin: 8px 0;">High-definition 3D laser scanning of all designated areas</li>
        <li style="margin: 8px 0;">Point cloud registration and processing</li>
        <li style="margin: 8px 0;">BIM/CAD deliverables per specified Level of Detail</li>
        <li style="margin: 8px 0;">Quality assurance review and final delivery</li>
      </ul>
    </div>
    
    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Proposal Valid:</strong> This proposal is valid for 30 days from the date of this email.</p>
    </div>
    
    <p style="margin-top: 32px;">We're confident our precision scanning services will provide the foundation for your project's success. Please don't hesitate to reach out with any questions.</p>
    
    <p style="margin-top: 24px;">
      Best regards,<br>
      <strong>The Scan2Plan Team</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">Scan2Plan | Precision 3D Laser Scanning & BIM Services</p>
    <p style="margin: 4px 0;">Brooklyn, NY | info@scan2plan.io</p>
  </div>
</body>
</html>`;
}

function generateProposalEmailText(lead: any, quote: any): string {
  const clientName = lead.contactName || lead.company || 'Valued Client';
  const projectName = lead.projectName || lead.company || 'Your Project';
  const totalPrice = quote?.pricingBreakdown?.totalPrice || quote?.price || 0;
  
  return `SCAN2PLAN - Precision 3D Laser Scanning & BIM Services

Dear ${clientName},

Thank you for the opportunity to provide a proposal for ${projectName}. Based on our discussions and site analysis, we are pleased to present the following scope and investment summary.

PROJECT INVESTMENT: ${formatCurrency(totalPrice)}

WHAT'S INCLUDED:
- High-definition 3D laser scanning of all designated areas
- Point cloud registration and processing
- BIM/CAD deliverables per specified Level of Detail
- Quality assurance review and final delivery

This proposal is valid for 30 days from the date of this email.

We're confident our precision scanning services will provide the foundation for your project's success. Please don't hesitate to reach out with any questions.

Best regards,
The Scan2Plan Team

---
Scan2Plan | Brooklyn, NY | info@scan2plan.io`;
}

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

  // Preview proposal HTML without sending
  app.get("/api/google/gmail/preview-proposal/:leadId", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const leadId = parseInt(req.params.leadId);

      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const quotes = await storage.getCpqQuotesByLead(leadId);
      const latestQuote = quotes.find(q => q.isLatest) || quotes[quotes.length - 1];

      if (!latestQuote) {
        return res.status(400).json({ message: "No quote found for this lead. Please create a quote first." });
      }

      const htmlBody = generateProposalEmailHtml(lead, latestQuote);

      res.setHeader('Content-Type', 'text/html');
      res.send(htmlBody);
    } catch (error: any) {
      log("ERROR: Proposal preview error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Failed to generate proposal preview" });
    }
  }));

  app.post("/api/google/gmail/send-proposal", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const { leadId, recipientEmail, customSubject } = req.body;

      if (!leadId) {
        return res.status(400).json({ message: "leadId is required" });
      }

      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const quotes = await storage.getCpqQuotesByLead(leadId);
      const latestQuote = quotes.find(q => q.isLatest) || quotes[quotes.length - 1];

      if (!latestQuote) {
        return res.status(400).json({ message: "No quote found for this lead. Please create a quote first." });
      }

      const toEmail = recipientEmail || lead.contactEmail || lead.billingContactEmail || latestQuote.billingContactEmail;
      if (!toEmail) {
        return res.status(400).json({ message: "No recipient email provided and no contact email on lead or quote" });
      }

      const projectName = lead.projectName || lead.company || 'Your Project';
      const subject = customSubject || `Scan2Plan Proposal - ${projectName}`;

      const htmlBody = generateProposalEmailHtml(lead, latestQuote);
      const textBody = generateProposalEmailText(lead, latestQuote);

      const boundary = "----=_Part_" + Date.now().toString(36);
      const email = [
        `To: ${toEmail}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        textBody,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        htmlBody,
        '',
        `--${boundary}--`,
      ].join('\r\n');

      const encodedEmail = Buffer.from(email).toString('base64url');

      const gmail = await getGmailClient();
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedEmail },
      });

      log(`INFO: Proposal email sent for lead ${leadId} to ${toEmail}`);

      res.json({ 
        success: true,
        messageId: response.data.id, 
        threadId: response.data.threadId,
        sentTo: toEmail,
        subject,
      });
    } catch (error: any) {
      log("ERROR: Proposal email send error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Failed to send proposal email" });
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
