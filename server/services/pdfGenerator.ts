/**
 * PDF Generator Service
 * Generates proposal PDFs with signature anchors for PandaDoc
 */

import { jsPDF } from "jspdf";
import type { Lead, CpqQuote, CaseStudy } from "@shared/schema";
import { MARKETING_COPY, PAYMENT_TERMS, getScopeDescription } from "@shared/proposalContent";

interface ProposalData {
  lead: Lead;
  quote: CpqQuote | null;
  caseStudies: CaseStudy[];
}

function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function deriveLOD(lead: Lead, quote: CpqQuote | null): string {
  if (quote?.cpqAreas) {
    const areas = quote.cpqAreas as any[];
    if (areas.length > 0 && areas[0]?.disciplineLods) {
      const lods = Object.values(areas[0].disciplineLods) as string[];
      if (lods.length > 0) {
        const lodNum = Math.max(...lods.map(l => parseInt(l) || 300));
        return `LOD ${lodNum}`;
      }
    }
  }
  if (lead.disciplines && lead.disciplines.includes("LoD")) {
    const match = lead.disciplines.match(/LoD\s*(\d+)/i);
    if (match) return `LOD ${match[1]}`;
  }
  return "LOD 300";
}

function deriveScope(lead: Lead): string {
  return lead.scope || "Full Building";
}

interface AreaWithBoundary {
  name: string;
  acres: number;
  boundaryImageUrl?: string;
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;
    
    // Parse the internal API URL and construct direct Google URL
    const urlObj = new URL(url, "http://localhost");
    const center = urlObj.searchParams.get("center");
    const zoom = urlObj.searchParams.get("zoom");
    const size = urlObj.searchParams.get("size");
    const maptype = urlObj.searchParams.get("maptype");
    const path = urlObj.searchParams.get("path");
    
    if (!center || !zoom || !size) return null;
    
    let googleUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(center)}&zoom=${zoom}&size=${encodeURIComponent(size)}&maptype=${maptype || "satellite"}&key=${apiKey}`;
    if (path) {
      googleUrl += `&path=${encodeURIComponent(path)}`;
    }
    
    const response = await fetch(googleUrl);
    if (!response.ok) return null;
    
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("Failed to fetch boundary image:", error);
    return null;
  }
}

export async function generateProposalPDF(data: ProposalData): Promise<Buffer> {
  const { lead, quote, caseStudies } = data;
  const doc = new jsPDF();
  
  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  const lod = deriveLOD(lead, quote);
  const scope = deriveScope(lead);
  
  const addNewPageIfNeeded = (requiredSpace: number = 30) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  const addSection = (title: string, spacing: number = 10) => {
    addNewPageIfNeeded(40);
    yPos += spacing;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  const addParagraph = (text: string, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      addNewPageIfNeeded();
      doc.text(line, margin, yPos);
      yPos += 5;
    }
    yPos += 3;
  };

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(MARKETING_COPY.companyName, pageWidth / 2, yPos, { align: "center" });
  yPos += 8;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(MARKETING_COPY.tagline, pageWidth / 2, yPos, { align: "center" });
  yPos += 20;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Proposal for: ${lead.clientName}`, margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const details = [
    ["Project Address:", lead.projectAddress || "Not specified"],
    ["Building Type:", lead.buildingType || "Not specified"],
    ["Scope:", scope],
    ["LOD:", lod],
  ];
  
  for (const [label, value] of details) {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 40, yPos);
    yPos += 6;
  }
  yPos += 10;

  addSection("About Scan2Plan");
  addParagraph(MARKETING_COPY.aboutUs);
  yPos += 5;

  for (const item of MARKETING_COPY.theDifference) {
    addNewPageIfNeeded(20);
    doc.setFont("helvetica", "bold");
    doc.text(`- ${item.title}`, margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    const bodyLines = doc.splitTextToSize(item.body, contentWidth - 10);
    for (const line of bodyLines) {
      doc.text(line, margin + 5, yPos);
      yPos += 5;
    }
    yPos += 3;
  }

  addSection("Scope of Work", 15);
  const scopeText = getScopeDescription(scope, lod);
  addParagraph(scopeText);

  // Add Site Boundary Maps section if quote has landscape areas with boundaries
  if (quote?.areas) {
    const areas = quote.areas as any[];
    const landscapeAreas: AreaWithBoundary[] = areas
      .filter((a: any) => a.kind === "landscape" && a.boundaryImageUrl && a.boundary?.length >= 3)
      .map((a: any) => ({
        name: a.name || "Landscape Area",
        acres: parseFloat(a.squareFeet) || 0,
        boundaryImageUrl: a.boundaryImageUrl,
      }));

    if (landscapeAreas.length > 0) {
      addSection("Site Boundary Maps", 15);
      addParagraph("The following satellite imagery shows the defined scan boundaries for landscape areas:");
      
      for (const area of landscapeAreas) {
        addNewPageIfNeeded(100);
        
        doc.setFont("helvetica", "bold");
        doc.text(`${area.name} (${area.acres.toFixed(2)} acres)`, margin, yPos);
        yPos += 8;
        doc.setFont("helvetica", "normal");
        
        if (area.boundaryImageUrl) {
          try {
            const imageData = await fetchImageAsBase64(area.boundaryImageUrl);
            if (imageData) {
              const imgWidth = 80;
              const imgHeight = 80;
              doc.addImage(imageData, "PNG", margin, yPos, imgWidth, imgHeight);
              yPos += imgHeight + 10;
            }
          } catch (error) {
            console.error("Failed to add boundary image:", error);
          }
        }
      }
    }
  }

  if (quote) {
    addSection("Pricing", 15);
    
    const scanningTotal = Number(quote.scanningTotal) || 0;
    const bimTotal = Number(quote.bimTotal) || 0;
    const travelTotal = Number(quote.travelTotal) || 0;
    const addOnsTotal = Number(quote.addOnsTotal) || 0;
    const totalPrice = Number(quote.totalPrice) || (scanningTotal + bimTotal + travelTotal + addOnsTotal);
    
    const pricingItems: [string, string][] = [];
    
    if (scanningTotal > 0) {
      pricingItems.push(["Laser Scanning Services", formatCurrency(scanningTotal)]);
    }
    if (bimTotal > 0) {
      pricingItems.push(["BIM Modeling Services", formatCurrency(bimTotal)]);
    }
    if (travelTotal > 0) {
      pricingItems.push(["Travel & Logistics", formatCurrency(travelTotal)]);
    }
    if (addOnsTotal > 0) {
      pricingItems.push(["Additional Services", formatCurrency(addOnsTotal)]);
    }
    
    if (pricingItems.length === 0 && totalPrice > 0) {
      pricingItems.push(["Professional Services", formatCurrency(totalPrice)]);
    }
    
    pricingItems.push(["TOTAL", formatCurrency(totalPrice)]);

    const colWidth = contentWidth / 2;
    
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 4, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Service", margin + 2, yPos);
    doc.text("Amount", margin + colWidth + 2, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    for (let i = 0; i < pricingItems.length; i++) {
      const [service, amount] = pricingItems[i];
      addNewPageIfNeeded();
      
      if (i === pricingItems.length - 1) {
        doc.setFillColor(230, 245, 255);
        doc.rect(margin, yPos - 4, contentWidth, 8, "F");
        doc.setFont("helvetica", "bold");
      }
      
      doc.text(service, margin + 2, yPos);
      doc.text(amount, pageWidth - margin - 2, yPos, { align: "right" });
      yPos += 8;
    }
    doc.setFont("helvetica", "normal");
    yPos += 5;
  }

  if (caseStudies.length > 0) {
    addSection("Similar Projects", 15);
    
    for (const study of caseStudies) {
      addNewPageIfNeeded(30);
      doc.setFont("helvetica", "bold");
      doc.text(study.title, margin, yPos);
      yPos += 6;
      doc.setFont("helvetica", "normal");
      
      const blurbLines = doc.splitTextToSize(study.blurb, contentWidth);
      for (const line of blurbLines) {
        addNewPageIfNeeded();
        doc.text(line, margin, yPos);
        yPos += 5;
      }
      
      if (study.stats) {
        const statsObj = study.stats as Record<string, unknown>;
        const statsText = Object.entries(statsObj).map(([k, v]) => `${k}: ${String(v)}`).join(" | ");
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(statsText, margin, yPos);
        doc.setTextColor(0);
        doc.setFontSize(10);
        yPos += 8;
      }
      yPos += 5;
    }
  }

  addSection("Terms & Conditions", 15);
  addParagraph(`Deposit: ${PAYMENT_TERMS.deposit}`);
  addParagraph(`Final Payment: ${PAYMENT_TERMS.final}`);
  addParagraph(`Payment Methods: ${PAYMENT_TERMS.methods.join(", ")}`);
  addParagraph(PAYMENT_TERMS.validity);
  addParagraph(PAYMENT_TERMS.warranty);
  
  addNewPageIfNeeded(60);
  yPos += 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("[sig|req|signer1]", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;
  doc.text("Client Signature", pageWidth / 2, yPos, { align: "center" });

  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}

export function generateProposalFilename(lead: Lead): string {
  const clientSlug = (lead.clientName || "Client")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 30);
  const date = new Date().toISOString().split("T")[0];
  return `Scan2Plan_Proposal_${clientSlug}_${date}.pdf`;
}
