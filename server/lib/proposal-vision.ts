import OpenAI from "openai";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

const ProposalSchema = z.object({
  client: z.object({
    name: z.string(),
    company: z.string().optional(),
    email: z.string().optional(),
  }),
  project: z.object({
    address: z.string(),
    date: z.string().optional(),
  }),
  lineItems: z.array(z.object({
    sku: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    qty: z.number(),
    rate: z.number(),
    total: z.number(),
  })),
  grandTotal: z.number(),
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

const VISION_SYSTEM_PROMPT = `You are a Data Entry Clerk specialized in extracting structured data from laser scanning and BIM proposal documents.

IMPORTANT: Focus on finding the "ESTIMATE" page - this is the page that contains the pricing table with all line items.

Analyze these proposal images carefully:

1. Identify the Client:
   - Look for "PROPOSAL FOR", "PREPARED FOR", or the "ADDRESS" block
   - Extract client name, company name, and email if visible

2. Identify the Project:
   - Look for the specific address being scanned
   - Look for project date

3. Extract the Pricing Table (on the ESTIMATE page):
   - Find the estimate/pricing table with columns like: Item, Description, Qty, Rate, Amount
   - CRITICAL: Extract ALL line items with their prices
   - If there are checkboxes, only include rows with checked boxes (X or checkmark)
   - If it's a standard list, extract all line items with a price

4. For each line item, capture:
   - Title/Name (e.g., "LoD 300 + MEPF", "Scan2Plan Residential", "7.3.1 Plumbing pipe")
   - Description (may be multi-line)
   - Quantity (sqft, count, or hours)
   - Rate (per unit price)
   - Amount/Total for that line

5. Find the Grand Total / Subtotal at the bottom of the table

Return ONLY valid JSON matching this exact structure:
{
  "client": {
    "name": "string",
    "company": "string or null",
    "email": "string or null"
  },
  "project": {
    "address": "string",
    "date": "string or null"
  },
  "lineItems": [
    {
      "sku": "string or null",
      "title": "string",
      "description": "string or null",
      "qty": number,
      "rate": number,
      "total": number
    }
  ],
  "grandTotal": number
}

Do NOT add markdown fencing or any text outside the JSON.`;

export async function convertPdfToImages(pdfBuffer: Buffer, maxPages: number = 8): Promise<string[]> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  const outputPrefix = path.join(tmpDir, "page");
  
  try {
    await fs.writeFile(pdfPath, pdfBuffer);
    
    await execAsync(`pdftoppm -png -r 150 -l ${maxPages} "${pdfPath}" "${outputPrefix}"`);
    
    const files = await fs.readdir(tmpDir);
    const pngFiles = files.filter(f => f.endsWith(".png")).sort();
    
    const base64Images: string[] = [];
    for (const pngFile of pngFiles) {
      const imagePath = path.join(tmpDir, pngFile);
      const imageBuffer = await fs.readFile(imagePath);
      const base64 = imageBuffer.toString("base64");
      base64Images.push(`data:image/png;base64,${base64}`);
    }
    
    console.log(`Converted ${base64Images.length} pages to images using pdftoppm`);
    return base64Images;
  } finally {
    try {
      const files = await fs.readdir(tmpDir);
      for (const file of files) {
        await fs.unlink(path.join(tmpDir, file));
      }
      await fs.rmdir(tmpDir);
    } catch (e) {
    }
  }
}

export async function extractProposalData(pdfBuffer: Buffer): Promise<ProposalData> {
  console.log("Starting vision-based proposal extraction...");
  
  const images = await convertPdfToImages(pdfBuffer, 8);
  
  if (images.length === 0) {
    throw new Error("No images extracted from PDF");
  }

  const imageContents = images.map(base64Image => ({
    type: "image_url" as const,
    image_url: {
      url: base64Image,
      detail: "high" as const,
    },
  }));

  const openai = getOpenAI();
  
  console.log(`Sending ${images.length} images to GPT-4o for analysis...`);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: VISION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the proposal data from these document pages. Look for the ESTIMATE page which contains the pricing table with all services and their prices. Extract client info, project address, and all line items with their quantities, rates, and totals.",
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

  console.log("GPT-4o response received, parsing JSON...");

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseError) {
    console.error("JSON parse error:", parseError);
    console.error("Raw content:", content);
    throw new Error(`Failed to parse GPT-4o response as JSON: ${parseError}`);
  }

  const validated = ProposalSchema.safeParse(parsed);
  
  if (!validated.success) {
    console.error("Schema validation failed:", validated.error);
    
    const fallback: ProposalData = {
      client: {
        name: (parsed as any)?.client?.name || "Unknown",
        company: (parsed as any)?.client?.company,
        email: (parsed as any)?.client?.email,
      },
      project: {
        address: (parsed as any)?.project?.address || "Unknown",
        date: (parsed as any)?.project?.date,
      },
      lineItems: ((parsed as any)?.lineItems || []).map((item: any) => ({
        sku: item.sku,
        title: item.title || item.name || "Unknown Item",
        description: item.description,
        qty: parseFloat(item.qty) || parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || parseFloat(item.unitPrice) || 0,
        total: parseFloat(item.total) || parseFloat(item.amount) || 0,
      })),
      grandTotal: parseFloat((parsed as any)?.grandTotal) || 
                  parseFloat((parsed as any)?.total) || 
                  0,
    };
    
    console.log("Using fallback parsed data:", fallback);
    return fallback;
  }

  console.log("Vision extraction successful:", {
    client: validated.data.client.name,
    lineItems: validated.data.lineItems.length,
    grandTotal: validated.data.grandTotal,
  });

  return validated.data;
}

export function convertVisionToExtractedData(visionData: ProposalData) {
  const grandTotal = visionData.grandTotal;
  
  // Calculate what GPT-4o thinks the sum is
  const rawLineItemSum = visionData.lineItems.reduce((sum, item) => {
    return sum + (item.total > 0 ? item.total : item.rate * item.qty);
  }, 0);
  
  // Check if line item sum is wildly off from grandTotal
  // This indicates GPT-4o confused sqft with qty and calculated wrong totals
  const isDataConfused = grandTotal > 0 && rawLineItemSum > grandTotal * 5;
  
  if (isDataConfused) {
    console.log("Vision extraction detected confused data:");
    console.log(`  Raw line item sum: $${rawLineItemSum.toLocaleString()}`);
    console.log(`  Grand total: $${grandTotal.toLocaleString()}`);
    console.log("  Will use rate field as actual line item price");
  }
  
  // Map line items, correcting prices when data is confused
  const services = visionData.lineItems.map(item => {
    let price: number;
    
    if (isDataConfused) {
      // When data is confused, the "rate" field often contains the actual line total
      // Check if rate looks reasonable as a line item price (< grandTotal)
      if (item.rate > 0 && item.rate <= grandTotal) {
        price = item.rate;
        console.log(`  "${item.title}": Using rate $${item.rate} as price`);
      } else if (item.total > 0 && item.total <= grandTotal) {
        price = item.total;
        console.log(`  "${item.title}": Using total $${item.total} as price`);
      } else {
        // Fallback: distribute grandTotal proportionally
        const proportion = 1 / visionData.lineItems.length;
        price = grandTotal * proportion;
        console.log(`  "${item.title}": Distributing proportionally: $${price.toFixed(2)}`);
      }
    } else {
      // Normal case: use total if available, otherwise rate * qty
      price = item.total > 0 ? item.total : item.rate * item.qty;
    }
    
    return {
      name: item.title,
      description: item.description,
      quantity: item.qty,
      price: price,
    };
  });
  
  // Verify sum matches grandTotal reasonably
  const serviceSum = services.reduce((sum, s) => sum + s.price, 0);
  const sumMatchesTotal = Math.abs(serviceSum - grandTotal) < grandTotal * 0.1; // Within 10%
  
  if (!sumMatchesTotal && grandTotal > 0) {
    console.log(`Service sum ($${serviceSum.toFixed(2)}) doesn't match grandTotal ($${grandTotal.toFixed(2)})`);
  }
  
  return {
    projectName: visionData.project.address,
    projectAddress: visionData.project.address,
    clientName: visionData.client.company || visionData.client.name,
    totalPrice: grandTotal,
    confidence: isDataConfused ? 65 : 85,
    contacts: [{
      name: visionData.client.name,
      email: visionData.client.email,
      company: visionData.client.company,
    }].filter(c => c.name),
    services,
    areas: [],
    variables: {},
    unmappedFields: [],
  };
}
