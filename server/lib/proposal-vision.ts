import OpenAI from "openai";
import { z } from "zod";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

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

Analyze these proposal images carefully:

1. Identify the Client:
   - Look for "PROPOSAL FOR", "PREPARED FOR", or the "ADDRESS" block
   - Extract client name, company name, and email if visible

2. Identify the Project:
   - Look for the specific address being scanned
   - Look for project date

3. Extract the Pricing Table:
   - Find the pricing/services table
   - CRITICAL: Only extract rows that appear to be "Selected" or "Included"
   - If there are checkboxes, look for the "X", checkmark, or filled checkbox
   - If it's a standard list, extract all line items with a price

4. For each line item, capture:
   - Product/Service Name (e.g., "LoD 300 + MEPF", "Scan2Plan Residential")
   - Description
   - Quantity (sqft or count)
   - Rate (per unit price)
   - Amount/Total

5. Find the Grand Total at the bottom of the table

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

export async function convertPdfToImages(pdfBuffer: Buffer, maxPages: number = 5): Promise<string[]> {
  try {
    const pdfImgConvert = require("pdf-img-convert");
    
    const options = {
      width: 1600,
      height: 2200,
      page_numbers: Array.from({ length: maxPages }, (_, i) => i + 1),
    };
    
    const images = await pdfImgConvert.convert(pdfBuffer, options);
    
    const base64Images: string[] = [];
    for (let i = 0; i < Math.min(images.length, maxPages); i++) {
      const imageBuffer = Buffer.from(images[i]);
      const base64 = imageBuffer.toString("base64");
      base64Images.push(`data:image/png;base64,${base64}`);
    }
    
    console.log(`Converted ${base64Images.length} pages to images`);
    return base64Images;
  } catch (error) {
    console.error("PDF to image conversion failed:", error);
    throw error;
  }
}

export async function extractProposalData(pdfBuffer: Buffer): Promise<ProposalData> {
  console.log("Starting vision-based proposal extraction...");
  
  const images = await convertPdfToImages(pdfBuffer, 5);
  
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
            text: "Extract the proposal data from these document pages. Focus on finding the client info, project address, and all selected/included line items with their prices.",
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
  return {
    projectName: visionData.project.address,
    projectAddress: visionData.project.address,
    clientName: visionData.client.company || visionData.client.name,
    totalPrice: visionData.grandTotal,
    confidence: 85,
    contacts: [{
      name: visionData.client.name,
      email: visionData.client.email,
      company: visionData.client.company,
    }].filter(c => c.name),
    services: visionData.lineItems.map(item => ({
      name: item.title,
      description: item.description,
      quantity: item.qty,
      price: item.total > 0 ? item.total : item.rate * item.qty,
    })),
    areas: [],
    variables: {},
    unmappedFields: [],
  };
}
