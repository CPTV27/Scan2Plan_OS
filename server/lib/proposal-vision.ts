import OpenAI from "openai";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Enhanced schema with confidence scoring per field
const LineItemSchema = z.object({
  sku: z.string().optional().nullable(),
  title: z.string(),
  description: z.string().optional().nullable(),
  qty: z.number(),
  unit: z.string().optional().nullable(), // sqft, each, hours, etc.
  rate: z.number(),
  total: z.number(),
  confidence: z.number().optional(), // 0-100 confidence for this line
});

const ProposalSchema = z.object({
  client: z.object({
    name: z.string(),
    company: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    confidence: z.number().optional(),
  }),
  project: z.object({
    address: z.string(),
    date: z.string().optional().nullable(),
    confidence: z.number().optional(),
  }),
  lineItems: z.array(LineItemSchema),
  grandTotal: z.number(),
  subtotal: z.number().optional().nullable(),
  tax: z.number().optional().nullable(),
  discount: z.number().optional().nullable(),
  estimatePageNumber: z.number().optional(), // Which page had the pricing table
  extractionNotes: z.array(z.string()).optional(), // Any issues noticed
});

export type ProposalData = z.infer<typeof ProposalSchema>;

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _openai;
}

// Phase 1: Find the estimate/pricing page
const PAGE_FINDER_PROMPT = `You are analyzing proposal document pages to find the ESTIMATE or PRICING page.

Look for pages that contain:
- A pricing table with columns like: Item, Description, Qty, Rate, Amount/Total
- Line items with dollar amounts
- Subtotal or Grand Total rows
- The word "ESTIMATE", "PROPOSAL", "QUOTE", or "PRICING" as a header

For each page, respond with:
- page_number (1-indexed)
- is_estimate_page: true/false
- confidence: 0-100
- reason: brief explanation

Return JSON array:
[{"page_number": 1, "is_estimate_page": false, "confidence": 95, "reason": "Cover page only"}]`;

// Phase 2: Extract data from estimate page with enhanced prompting
const EXTRACTION_PROMPT = `You are a specialized Data Entry Clerk extracting structured data from a laser scanning/BIM proposal's pricing table.

CRITICAL INSTRUCTIONS FOR ACCURACY:

1. TABLE COLUMN IDENTIFICATION:
   - First, identify the column headers in the pricing table
   - Common columns: Item/SKU, Description/Service, Qty/Quantity, Rate/Unit Price, Amount/Total
   - Some tables use "sqft" as quantity, others use counts or hours
   
2. LINE ITEM EXTRACTION RULES:
   - Extract EVERY row that has a price/amount
   - If checkboxes exist, only include checked items
   - The "qty" field should be the numeric quantity (could be sqft, count, hours)
   - The "unit" field describes what qty represents (e.g., "sqft", "each", "hours")
   - The "rate" is price per unit
   - The "total" is qty × rate, or the Amount column value
   
3. PRICE VALIDATION:
   - Grand total should approximately equal sum of line item totals
   - If they don't match, note this in extractionNotes
   - Watch for subtotals that might be duplicated as line items

4. COMMON ERRORS TO AVOID:
   - Don't confuse sqft quantities with dollar amounts
   - Don't include subtotal/total rows as line items
   - Don't miss multi-line descriptions
   - Watch for hidden fees or optional items

5. CONFIDENCE SCORING (0-100):
   - 90-100: Crystal clear, easy to read
   - 70-89: Readable but some ambiguity
   - 50-69: Difficult to read, making educated guesses
   - Below 50: Very uncertain, may be wrong

CLIENT INFORMATION:
- Look for "PROPOSAL FOR", "PREPARED FOR", "CLIENT:", "TO:", or address blocks
- Company name often appears before or after contact name
- Email may be on cover page or in header/footer

PROJECT INFORMATION:
- Look for the specific site/building address
- This is usually different from the client's business address
- May be labeled "PROJECT:", "SITE:", "LOCATION:"

Return ONLY valid JSON (no markdown, no extra text):
{
  "client": {
    "name": "Contact Name",
    "company": "Company Name or null",
    "email": "email@example.com or null",
    "confidence": 85
  },
  "project": {
    "address": "123 Project Site Address, City, State",
    "date": "2024-01-15 or null",
    "confidence": 90
  },
  "lineItems": [
    {
      "sku": "SKU-001 or null",
      "title": "Service Name",
      "description": "Detailed description or null",
      "qty": 5000,
      "unit": "sqft",
      "rate": 0.15,
      "total": 750.00,
      "confidence": 95
    }
  ],
  "grandTotal": 15000.00,
  "subtotal": 14500.00,
  "tax": 500.00,
  "discount": null,
  "estimatePageNumber": 3,
  "extractionNotes": ["Note any issues or uncertainties here"]
}`;

export async function convertPdfToImages(pdfBuffer: Buffer, maxPages: number = 10): Promise<string[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  const outputPrefix = path.join(tmpDir, "page");
  
  try {
    await fs.writeFile(pdfPath, pdfBuffer);
    
    // Higher DPI (200) for better text clarity in tables
    // Using -gray for faster processing and often cleaner text
    await execAsync(`pdftoppm -png -r 200 -l ${maxPages} "${pdfPath}" "${outputPrefix}"`);
    
    const files = await fs.readdir(tmpDir);
    const pngFiles = files.filter(f => f.endsWith(".png")).sort();
    
    const base64Images: string[] = [];
    for (const pngFile of pngFiles) {
      const imagePath = path.join(tmpDir, pngFile);
      const imageBuffer = await fs.readFile(imagePath);
      const base64 = imageBuffer.toString("base64");
      base64Images.push(`data:image/png;base64,${base64}`);
    }
    
    console.log(`[Vision] Converted ${base64Images.length} pages to images at 200 DPI`);
    return base64Images;
  } finally {
    try {
      const files = await fs.readdir(tmpDir);
      for (const file of files) {
        await fs.unlink(path.join(tmpDir, file));
      }
      await fs.rmdir(tmpDir);
    } catch (e) {
      // Cleanup errors are non-fatal
    }
  }
}

// Phase 1: Identify which page contains the estimate/pricing table
async function findEstimatePage(images: string[]): Promise<{ pageIndex: number; confidence: number }> {
  const openai = getOpenAI();
  
  // Scan ALL pages to find estimate - pricing tables can be anywhere
  const imageContents = images.map((base64Image, idx) => ({
    type: "image_url" as const,
    image_url: {
      url: base64Image,
      detail: "low" as const, // Low detail for page finding is sufficient
    },
  }));

  console.log(`[Vision] Phase 1: Scanning ALL ${images.length} pages to find estimate...`);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: PAGE_FINDER_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze these ${images.length} proposal pages and identify which one contains the pricing/estimate table. Pages are numbered 1 through ${images.length}. The pricing table may be near the end of the document.` },
            ...imageContents,
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content?.trim() || "[]";
    let jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const pages = JSON.parse(jsonStr) as Array<{
      page_number: number;
      is_estimate_page: boolean;
      confidence: number;
      reason: string;
    }>;

    const estimatePage = pages
      .filter(p => p.is_estimate_page)
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (estimatePage) {
      console.log(`[Vision] Found estimate on page ${estimatePage.page_number} (${estimatePage.confidence}% confidence): ${estimatePage.reason}`);
      return { pageIndex: estimatePage.page_number - 1, confidence: estimatePage.confidence };
    }

    // Fallback: scan pages looking for any with numbers/tables (pages 2-3 are common)
    console.log("[Vision] No estimate page identified with high confidence, using heuristic fallback");
    
    // Try the middle of the document as fallback (common for estimates)
    const fallbackIndex = Math.min(Math.floor(images.length / 2), images.length - 1);
    return { pageIndex: fallbackIndex, confidence: 40 };
  } catch (error) {
    console.error("[Vision] Page finder error:", error);
    // On error, try to extract from all pages at once
    return { pageIndex: -1, confidence: 20 }; // -1 signals "use all pages"
  }
}

// Phase 2: Extract data from the estimate page with focused attention
async function extractFromEstimatePage(
  images: string[],
  estimatePageIndex: number
): Promise<ProposalData> {
  const openai = getOpenAI();

  let relevantImages: string[];
  let contextInfo: string;

  if (estimatePageIndex < 0) {
    // Use all pages when page detection failed
    relevantImages = images;
    contextInfo = `You are looking at all ${images.length} pages of the proposal. Find the pricing/estimate table and extract all data.`;
    console.log(`[Vision] Phase 2: Extracting from ALL ${images.length} pages (page detection failed)...`);
  } else {
    // Dynamic window: include 1 page before and ALL pages after the estimate
    // This ensures we capture totals/signatures that may follow
    const startIdx = Math.max(0, estimatePageIndex - 1);
    const endIdx = images.length; // Always include to end of document
    relevantImages = images.slice(startIdx, endIdx);
    contextInfo = `You are looking at pages ${startIdx + 1} through ${endIdx} of the proposal. The pricing table should be on page ${estimatePageIndex + 1}. Include any totals or additional pricing from subsequent pages.`;
    console.log(`[Vision] Phase 2: Extracting from pages ${startIdx + 1}-${endIdx} (estimate on page ${estimatePageIndex + 1})...`);
  }
  
  const imageContents = relevantImages.map((base64Image, idx) => ({
    type: "image_url" as const,
    image_url: {
      url: base64Image,
      detail: "high" as const, // High detail for actual extraction
    },
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: `${contextInfo}

Extract all proposal data including:
1. Client name, company, and email (may be on cover page)
2. Project/site address (the location being scanned, not client's office)
3. ALL line items from the pricing table with accurate quantities, rates, and totals
4. Grand total, subtotal, tax, and any discounts

Pay special attention to:
- Correctly reading numeric values (don't confuse sqft with dollars)
- Including all line items, not just the main ones
- Noting your confidence level for each extracted field`
          },
          ...imageContents,
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No response from GPT-4o");
  }

  console.log("[Vision] Response received, parsing...");

  // Clean up JSON response
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseError) {
    console.error("[Vision] JSON parse error:", parseError);
    console.error("[Vision] Raw content:", content.substring(0, 500));
    throw new Error(`Failed to parse response as JSON: ${parseError}`);
  }

  // Validate with schema
  const validated = ProposalSchema.safeParse(parsed);
  
  if (!validated.success) {
    console.error("[Vision] Schema validation failed:", validated.error.errors);
    
    // Build fallback from partial data
    const data = parsed as any;
    return buildFallbackData(data, estimatePageIndex);
  }

  // Add page number if not set
  if (!validated.data.estimatePageNumber) {
    validated.data.estimatePageNumber = estimatePageIndex + 1;
  }

  // Validate totals match
  const lineItemSum = validated.data.lineItems.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = validated.data.grandTotal;
  const discrepancy = Math.abs(lineItemSum - grandTotal);
  const discrepancyPercent = (discrepancy / grandTotal) * 100;

  if (discrepancyPercent > 10) {
    validated.data.extractionNotes = validated.data.extractionNotes || [];
    validated.data.extractionNotes.push(
      `Warning: Line item sum ($${lineItemSum.toFixed(2)}) differs from grand total ($${grandTotal.toFixed(2)}) by ${discrepancyPercent.toFixed(1)}%`
    );
  }

  console.log("[Vision] Extraction successful:", {
    client: validated.data.client.name,
    lineItems: validated.data.lineItems.length,
    grandTotal: validated.data.grandTotal,
    avgConfidence: calculateAverageConfidence(validated.data),
  });

  return validated.data;
}

function buildFallbackData(data: any, estimatePageIndex: number): ProposalData {
  // Parse line items with multiple fallback strategies
  const lineItems = (data?.lineItems || []).map((item: any) => {
    // Try multiple field name variations
    const qty = parseFloat(item?.qty) || parseFloat(item?.quantity) || parseFloat(item?.sqft) || 1;
    const rate = parseFloat(item?.rate) || parseFloat(item?.unitPrice) || parseFloat(item?.price) || 0;
    let total = parseFloat(item?.total) || parseFloat(item?.amount) || parseFloat(item?.lineTotal) || 0;
    
    // If total is missing but we have qty and rate, calculate it
    if (total === 0 && rate > 0) {
      total = qty * rate;
    }
    
    return {
      sku: item?.sku || item?.itemNumber || null,
      title: item?.title || item?.name || item?.service || item?.description?.substring(0, 50) || "Unknown Item",
      description: item?.description || item?.details || null,
      qty,
      unit: item?.unit || item?.uom || null,
      rate,
      total,
      confidence: 40,
    };
  });

  // Calculate line item sum for validation
  const lineItemSum = lineItems.reduce((sum: number, item: any) => sum + item.total, 0);
  
  // Parse grand total with multiple fallbacks
  let grandTotal = parseFloat(data?.grandTotal) || 
                   parseFloat(data?.total) || 
                   parseFloat(data?.totalAmount) ||
                   parseFloat(data?.estimateTotal) || 0;
  
  // If grand total is 0 but we have line items, use their sum
  if (grandTotal === 0 && lineItemSum > 0) {
    grandTotal = lineItemSum;
  }
  
  // If grand total exists but line items don't sum correctly, note it
  const notes: string[] = ["Schema validation failed, using fallback parsing"];
  if (grandTotal > 0 && lineItemSum > 0) {
    const discrepancy = Math.abs(lineItemSum - grandTotal) / grandTotal * 100;
    if (discrepancy > 10) {
      notes.push(`Line items sum ($${lineItemSum.toFixed(2)}) differs from grand total ($${grandTotal.toFixed(2)}) by ${discrepancy.toFixed(1)}%`);
    }
  }

  return {
    client: {
      name: data?.client?.name || data?.clientName || "Unknown",
      company: data?.client?.company || data?.clientCompany || null,
      email: data?.client?.email || data?.clientEmail || null,
      confidence: 50,
    },
    project: {
      address: data?.project?.address || data?.projectAddress || data?.siteAddress || "Unknown",
      date: data?.project?.date || data?.projectDate || null,
      confidence: 50,
    },
    lineItems,
    grandTotal,
    subtotal: parseFloat(data?.subtotal) || null,
    tax: parseFloat(data?.tax) || null,
    discount: parseFloat(data?.discount) || null,
    estimatePageNumber: estimatePageIndex >= 0 ? estimatePageIndex + 1 : undefined,
    extractionNotes: notes,
  };
}

function calculateAverageConfidence(data: ProposalData): number {
  const confidences: number[] = [];
  
  if (data.client.confidence) confidences.push(data.client.confidence);
  if (data.project.confidence) confidences.push(data.project.confidence);
  
  data.lineItems.forEach(item => {
    if (item.confidence) confidences.push(item.confidence);
  });

  if (confidences.length === 0) return 75; // Default
  return Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
}

// Main extraction function - now uses two-pass approach
export async function extractProposalData(pdfBuffer: Buffer): Promise<ProposalData> {
  console.log("[Vision] Starting enhanced two-pass proposal extraction...");
  
  const images = await convertPdfToImages(pdfBuffer, 10);
  
  if (images.length === 0) {
    throw new Error("No images extracted from PDF");
  }

  // Phase 1: Find the estimate page
  const { pageIndex, confidence: pageConfidence } = await findEstimatePage(images);
  
  // Phase 2: Extract data with focus on the estimate page
  const data = await extractFromEstimatePage(images, pageIndex);
  
  // Add extraction notes about the process
  data.extractionNotes = data.extractionNotes || [];
  if (pageConfidence < 70) {
    data.extractionNotes.push(`Estimate page location confidence was low (${pageConfidence}%), results may vary`);
  }

  return data;
}

export function convertVisionToExtractedData(visionData: ProposalData) {
  const grandTotal = visionData.grandTotal;
  
  // Calculate sum of line items
  const lineItemSum = visionData.lineItems.reduce((sum, item) => sum + item.total, 0);
  
  // Check for data integrity
  const discrepancyPercent = grandTotal > 0 
    ? Math.abs(lineItemSum - grandTotal) / grandTotal * 100 
    : 0;
  
  const hasDiscrepancy = discrepancyPercent > 15;
  
  if (hasDiscrepancy) {
    console.log("[Vision] Price discrepancy detected:");
    console.log(`  Line item sum: $${lineItemSum.toLocaleString()}`);
    console.log(`  Grand total: $${grandTotal.toLocaleString()}`);
    console.log(`  Discrepancy: ${discrepancyPercent.toFixed(1)}%`);
  }

  // Map line items with quality metrics
  const services = visionData.lineItems.map(item => ({
    name: item.title,
    description: item.description || undefined,
    quantity: item.qty,
    unit: item.unit || undefined,
    price: item.total,
    confidence: item.confidence || 75,
  }));

  // Calculate overall confidence
  const avgLineConfidence = calculateAverageConfidence(visionData);
  let confidence = avgLineConfidence;
  
  // Reduce confidence if there are issues
  if (hasDiscrepancy) confidence -= 15;
  if (visionData.extractionNotes?.some(n => n.includes("Warning"))) confidence -= 5;
  if (visionData.extractionNotes?.some(n => n.includes("fallback"))) confidence -= 20;
  
  confidence = Math.max(30, Math.min(95, confidence));

  return {
    projectName: visionData.project.address,
    projectAddress: visionData.project.address,
    clientName: visionData.client.company || visionData.client.name,
    totalPrice: grandTotal,
    confidence,
    contacts: [{
      name: visionData.client.name,
      email: visionData.client.email || undefined,
      company: visionData.client.company || undefined,
    }].filter(c => c.name),
    services,
    subtotal: visionData.subtotal || undefined,
    tax: visionData.tax || undefined,
    discount: visionData.discount || undefined,
    areas: [],
    variables: {},
    unmappedFields: [],
    extractionNotes: visionData.extractionNotes || [],
  };
}
