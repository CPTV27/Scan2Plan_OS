import { db } from "../db";
import { 
  pandaDocImportBatches, 
  pandaDocDocuments, 
  cpqQuotes,
  leads,
  type PandaDocDocument,
  type InsertPandaDocDocument,
  type PandaDocImportBatch,
  type InsertPandaDocImportBatch,
  PANDADOC_STATUS_MAP,
  type PandaDocStage,
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import OpenAI from "openai";

const PANDADOC_STATUS_TO_CODE: Record<string, number> = {
  "document.draft": 0,
  "document.sent": 1,
  "document.completed": 2,
  "document.uploaded": 3,
  "document.error": 4,
  "document.viewed": 5,
  "document.waiting_approval": 6,
  "document.approved": 7,
  "document.rejected": 8,
  "document.waiting_pay": 9,
  "document.paid": 10,
  "document.voided": 11,
  "document.declined": 12,
};

function mapStatusTextToStage(statusText: string): PandaDocStage {
  const code = PANDADOC_STATUS_TO_CODE[statusText];
  if (code === undefined) return "unknown";
  return PANDADOC_STATUS_MAP[code] || "unknown";
}

function mapStatusTextToCode(statusText: string): number | null {
  return PANDADOC_STATUS_TO_CODE[statusText] ?? null;
}

const PANDADOC_API_BASE = "https://api.pandadoc.com/public/v1";

interface PandaDocListResponse {
  results: PandaDocListItem[];
  next?: string;
}

interface PandaDocListItem {
  id: string;
  name: string;
  status: string;
  date_created: string;
  date_modified: string;
  version: string;
}

interface PandaDocDetailsResponse {
  id: string;
  name: string;
  status: string;
  date_created: string;
  date_modified: string;
  version: string;
  recipients?: Array<{
    email: string;
    first_name: string;
    last_name: string;
    company?: string;
  }>;
  tokens?: Array<{
    name: string;
    value: string;
  }>;
  pricing?: {
    tables: Array<{
      name: string;
      total: number;
      items: Array<{
        name: string;
        description?: string;
        price?: number;
        qty?: number;
        discount?: number;
        subtotal?: number;
      }>;
    }>;
  };
  fields?: Record<string, any>;
  metadata?: Record<string, any>;
  grand_total?: {
    amount: number;
    currency: string;
  };
}

interface ExtractedQuoteData {
  projectName?: string;
  clientName?: string;
  projectAddress?: string;
  totalPrice?: number;
  currency?: string;
  areas?: Array<{
    name: string;
    sqft?: number;
    buildingType?: string;
    price?: number;
  }>;
  services?: Array<{
    name: string;
    description?: string;
    price?: number;
    quantity?: number;
  }>;
  contacts?: Array<{
    name: string;
    email: string;
    company?: string;
  }>;
  variables?: Record<string, string>;
  confidence: number;
  unmappedFields?: string[];
}

export class PandaDocClient {
  private apiKey: string;
  private openai: OpenAI | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PANDADOC_API_KEY || "";
    if (!this.apiKey) {
      console.warn("PandaDoc API key not configured");
    }
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  private async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.apiKey) {
      throw new Error("PandaDoc API key not configured");
    }

    const response = await fetch(`${PANDADOC_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `API-Key ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PandaDoc API error: ${response.status} - ${error}`);
    }

    return response;
  }

  async listDocuments(params: {
    createdFrom?: string;
    createdTo?: string;
    page?: number;
    count?: number;
  } = {}): Promise<PandaDocListResponse> {
    const queryParams = new URLSearchParams();
    if (params.createdFrom) queryParams.set("date_from", params.createdFrom);
    if (params.createdTo) queryParams.set("date_to", params.createdTo);
    if (params.page) queryParams.set("page", params.page.toString());
    queryParams.set("count", (params.count || 50).toString());

    const response = await this.fetch(`/documents?${queryParams.toString()}`);
    return response.json();
  }

  async getDocumentDetails(documentId: string): Promise<PandaDocDetailsResponse> {
    const response = await this.fetch(`/documents/${documentId}/details`);
    return response.json();
  }

  async getDocumentPdfUrl(documentId: string): Promise<string> {
    return `${PANDADOC_API_BASE}/documents/${documentId}/download`;
  }

  async extractQuoteData(details: PandaDocDetailsResponse): Promise<ExtractedQuoteData> {
    const extracted: ExtractedQuoteData = {
      confidence: 0,
      unmappedFields: [],
    };

    let confidencePoints = 0;
    let totalPoints = 0;

    if (details.name) {
      extracted.projectName = details.name;
      
      const s2pMatch = details.name.match(/^S2P\s*Proposal\s*[-–—]\s*(.+)$/i);
      if (s2pMatch) {
        const addressPart = s2pMatch[1].trim();
        extracted.projectAddress = addressPart;
        extracted.projectName = `S2P Proposal - ${addressPart}`;
        confidencePoints += 15;
      } else {
        confidencePoints += 10;
      }
    }
    totalPoints += 15;

    if (details.recipients && details.recipients.length > 0) {
      extracted.contacts = details.recipients.map(r => ({
        name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
        email: r.email,
        company: r.company,
      }));
      if (details.recipients[0].company) {
        extracted.clientName = details.recipients[0].company;
        confidencePoints += 15;
      } else if (extracted.contacts[0].name) {
        extracted.clientName = extracted.contacts[0].name;
        confidencePoints += 10;
      }
    }
    totalPoints += 15;

    if (details.tokens) {
      extracted.variables = {};
      for (const token of details.tokens) {
        extracted.variables[token.name] = token.value;
        if (token.name.toLowerCase().includes("address") && !extracted.projectAddress) {
          extracted.projectAddress = token.value;
          confidencePoints += 10;
        }
        if (token.name.toLowerCase().includes("sqft") || token.name.toLowerCase().includes("square")) {
          confidencePoints += 5;
        }
      }
    }
    totalPoints += 15;

    let calculatedTotal = 0;
    if (details.pricing?.tables && details.pricing.tables.length > 0) {
      extracted.services = [];
      extracted.areas = [];
      
      for (const table of details.pricing.tables) {
        for (const item of table.items) {
          const itemPrice = item.subtotal || item.price || 0;
          const service = {
            name: item.name,
            description: item.description,
            price: itemPrice,
            quantity: item.qty,
          };
          extracted.services.push(service);
          calculatedTotal += itemPrice;

          const nameLower = (item.name || "").toLowerCase();
          if (nameLower.includes("scan") || nameLower.includes("model") || 
              nameLower.includes("bim") || nameLower.includes("residential") ||
              nameLower.includes("commercial") || nameLower.includes("lod")) {
            const sqftMatch = item.description?.match(/(\d{1,3}(?:,\d{3})*)\s*(?:sqft|sq\s*ft|square\s*feet)/i);
            extracted.areas.push({
              name: item.name,
              price: itemPrice,
              sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, ""), 10) : item.qty,
            });
          }
        }
      }
      confidencePoints += 25;
    }
    totalPoints += 25;

    if (details.grand_total) {
      extracted.totalPrice = details.grand_total.amount;
      extracted.currency = details.grand_total.currency;
      confidencePoints += 20;
    } else if (calculatedTotal > 0) {
      extracted.totalPrice = calculatedTotal;
      extracted.currency = "USD";
      confidencePoints += 15;
    }
    totalPoints += 20;

    if (this.openai && (extracted.services?.length || Object.keys(extracted.variables || {}).length)) {
      try {
        const aiExtraction = await this.aiEnhanceExtraction(details, extracted);
        if (aiExtraction) {
          if (aiExtraction.projectAddress && !extracted.projectAddress) {
            extracted.projectAddress = aiExtraction.projectAddress;
            confidencePoints += 10;
          }
          if (aiExtraction.areas && aiExtraction.areas.length > 0) {
            extracted.areas = aiExtraction.areas;
            confidencePoints += 15;
          }
          if (aiExtraction.unmappedFields) {
            extracted.unmappedFields = aiExtraction.unmappedFields;
          }
        }
      } catch (error) {
        console.error("AI extraction enhancement failed:", error);
      }
    }
    totalPoints += 25;

    extracted.confidence = Math.round((confidencePoints / totalPoints) * 100);
    return extracted;
  }

  private async aiEnhanceExtraction(
    details: PandaDocDetailsResponse,
    current: ExtractedQuoteData
  ): Promise<Partial<ExtractedQuoteData> | null> {
    if (!this.openai) return null;

    const allPricingItems = details.pricing?.tables?.flatMap(t => t.items) || [];
    
    const prompt = `You are analyzing a Scan2Plan (S2P) laser scanning proposal. S2P proposals follow this format:
- Document title: "S2P Proposal - [ADDRESS]" or "S2P Proposal - [ADDRESS], [details]"
- The address after "S2P Proposal - " is the PROJECT ADDRESS (street, city, state, zip)
- Pricing table has line items with QTY (square footage), RATE ($/sqft), AMOUNT (total)
- Common services: "Scan2Plan Residential", "Scan2Plan Commercial", "MEPF LoD 300", "Structural Modeling", "CAD Standard Package"

Document Name: ${details.name}
Recipients: ${JSON.stringify(details.recipients?.map(r => ({ name: `${r.first_name} ${r.last_name}`, company: r.company, email: r.email })) || [], null, 2)}
Pricing Items: ${JSON.stringify(allPricingItems.slice(0, 15), null, 2)}
Current Extraction: ${JSON.stringify({ projectName: current.projectName, projectAddress: current.projectAddress, totalPrice: current.totalPrice, clientName: current.clientName }, null, 2)}

Extract and return JSON with:
{
  "projectAddress": "Full street address (parse from document name after 'S2P Proposal - ')",
  "totalPrice": number (sum of all AMOUNT values from pricing, ignore discounts if negative),
  "areas": [{"name": "area description", "sqft": number, "buildingType": "residential|commercial|industrial"}],
  "unmappedFields": ["list of fields that couldn't be mapped"],
  "sqft": number (primary square footage from QTY column),
  "buildingType": "residential" | "commercial" | "industrial" | "mixed",
  "lod": "200" | "300" | "350" (Level of Detail from service names)
}

Return ONLY valid JSON.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });

      const content = response.choices[0].message.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (parsed.projectAddress && !current.projectAddress) {
          current.projectAddress = parsed.projectAddress;
        }
        if (parsed.totalPrice && !current.totalPrice) {
          current.totalPrice = parsed.totalPrice;
        }
        return parsed;
      }
    } catch (error) {
      console.error("AI extraction error:", error);
    }
    return null;
  }

  async createImportBatch(name?: string, createdBy?: string): Promise<PandaDocImportBatch> {
    const [batch] = await db.insert(pandaDocImportBatches).values({
      name: name || `Import ${new Date().toISOString().split("T")[0]}`,
      status: "pending",
      createdBy,
    }).returning();
    return batch;
  }

  async startImport(batchId: number, options: {
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<{ documentsFound: number; documentsImported: number }> {
    await db.update(pandaDocImportBatches)
      .set({ status: "in_progress", startedAt: new Date() })
      .where(eq(pandaDocImportBatches.id, batchId));

    let documentsFound = 0;
    let documentsImported = 0;
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const listResponse = await this.listDocuments({
          createdFrom: options.dateFrom,
          createdTo: options.dateTo,
          page,
          count: 50,
        });

        documentsFound += listResponse.results.length;

        for (const doc of listResponse.results) {
          const existing = await db.select()
            .from(pandaDocDocuments)
            .where(eq(pandaDocDocuments.pandaDocId, doc.id))
            .limit(1);

          const stage = mapStatusTextToStage(doc.status);
          const statusCode = mapStatusTextToCode(doc.status);

          if (existing.length === 0) {
            await db.insert(pandaDocDocuments).values({
              batchId,
              pandaDocId: doc.id,
              pandaDocName: doc.name,
              pandaDocStatus: doc.status,
              pandaDocStatusCode: statusCode,
              pandaDocStage: stage,
              pandaDocVersion: doc.version,
              pandaDocCreatedAt: new Date(doc.date_created),
              pandaDocUpdatedAt: new Date(doc.date_modified),
              importStatus: "pending",
            });
            documentsImported++;
          } else {
            const needsUpdate = 
              existing[0].pandaDocStatus !== doc.status ||
              existing[0].pandaDocStage !== stage ||
              existing[0].pandaDocStatusCode !== statusCode;
            
            if (needsUpdate) {
              await db.update(pandaDocDocuments)
                .set({ 
                  pandaDocStatus: doc.status,
                  pandaDocStatusCode: statusCode,
                  pandaDocStage: stage,
                  pandaDocUpdatedAt: new Date(doc.date_modified),
                  updatedAt: new Date(),
                })
                .where(eq(pandaDocDocuments.id, existing[0].id));
            }
          }
        }

        await db.update(pandaDocImportBatches)
          .set({ 
            totalDocuments: documentsFound,
            processedDocuments: documentsImported,
          })
          .where(eq(pandaDocImportBatches.id, batchId));

        hasMore = !!listResponse.next;
        page++;

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await db.update(pandaDocImportBatches)
        .set({ 
          status: "completed",
          completedAt: new Date(),
          totalDocuments: documentsFound,
          processedDocuments: documentsImported,
          successfulDocuments: documentsImported,
        })
        .where(eq(pandaDocImportBatches.id, batchId));

    } catch (error) {
      await db.update(pandaDocImportBatches)
        .set({ status: "failed" })
        .where(eq(pandaDocImportBatches.id, batchId));
      throw error;
    }

    return { documentsFound, documentsImported };
  }

  private async fetchWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isRateLimited = error.message?.includes("429") || error.status === 429;
        const isServerError = error.message?.includes("5") && /50[0-9]/.test(error.message);
        
        if (isRateLimited || isServerError) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          console.log(`PandaDoc API retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  async processDocument(documentId: number): Promise<PandaDocDocument> {
    const [doc] = await db.select()
      .from(pandaDocDocuments)
      .where(eq(pandaDocDocuments.id, documentId))
      .limit(1);

    if (!doc) {
      throw new Error("Document not found");
    }

    await db.update(pandaDocDocuments)
      .set({ importStatus: "fetching" })
      .where(eq(pandaDocDocuments.id, documentId));

    try {
      const details = await this.fetchWithRetry(
        () => this.getDocumentDetails(doc.pandaDocId),
        3,
        1000
      );
      const extracted = await this.extractQuoteData(details);

      const pdfUrl = await this.getDocumentPdfUrl(doc.pandaDocId);

      const [updated] = await db.update(pandaDocDocuments)
        .set({
          importStatus: "extracted",
          rawPandaDocData: details as any,
          pricingTableData: details.pricing as any,
          recipientsData: details.recipients as any,
          variablesData: details.tokens as any,
          extractedData: extracted as any,
          extractionConfidence: extracted.confidence.toString(),
          pandaDocPdfUrl: pdfUrl,
          updatedAt: new Date(),
        })
        .where(eq(pandaDocDocuments.id, documentId))
        .returning();

      return updated;

    } catch (error: any) {
      const errorDetails = {
        message: String(error?.message || error),
        status: error?.status,
        type: error?.name,
        timestamp: new Date().toISOString(),
      };
      
      console.error(`PandaDoc extraction failed for doc ${documentId}:`, errorDetails);
      
      await db.update(pandaDocDocuments)
        .set({
          importStatus: "error",
          extractionErrors: errorDetails as any,
          updatedAt: new Date(),
        })
        .where(eq(pandaDocDocuments.id, documentId));
      throw error;
    }
  }

  async approveDocument(
    documentId: number,
    reviewedBy: string,
    editedData?: Partial<ExtractedQuoteData>,
    reviewNotes?: string
  ): Promise<{ document: PandaDocDocument; quote?: typeof cpqQuotes.$inferSelect }> {
    const [doc] = await db.select()
      .from(pandaDocDocuments)
      .where(eq(pandaDocDocuments.id, documentId))
      .limit(1);

    if (!doc) {
      throw new Error("Document not found");
    }

    const finalData = editedData 
      ? { ...(doc.extractedData as ExtractedQuoteData), ...editedData }
      : doc.extractedData as ExtractedQuoteData;

    const quoteNumber = `PD-${doc.pandaDocId.substring(0, 8).toUpperCase()}`;
    
    const [quote] = await db.insert(cpqQuotes).values({
      quoteNumber,
      projectName: finalData.projectName || doc.pandaDocName || "Imported Quote",
      projectAddress: finalData.projectAddress || "TBD",
      clientName: finalData.clientName,
      typeOfBuilding: "Commercial / Office",
      areas: finalData.areas || [],
      risks: [],
      services: finalData.services || {},
      dispatchLocation: "Brooklyn",
      totalPrice: finalData.totalPrice?.toString() || "0",
      pricingBreakdown: {
        source: "pandadoc_import",
        originalDocId: doc.pandaDocId,
        importedAt: new Date().toISOString(),
      },
      scopingData: {
        pandaDocVariables: finalData.variables,
        pandaDocContacts: finalData.contacts,
      },
      createdBy: reviewedBy,
    }).returning();

    const [updated] = await db.update(pandaDocDocuments)
      .set({
        importStatus: "approved",
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        extractedData: finalData as any,
        cpqQuoteId: quote.id,
        updatedAt: new Date(),
      })
      .where(eq(pandaDocDocuments.id, documentId))
      .returning();

    return { document: updated, quote };
  }

  async rejectDocument(
    documentId: number,
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<PandaDocDocument> {
    const [updated] = await db.update(pandaDocDocuments)
      .set({
        importStatus: "rejected",
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date(),
      })
      .where(eq(pandaDocDocuments.id, documentId))
      .returning();

    return updated;
  }

  async getBatches(): Promise<PandaDocImportBatch[]> {
    return db.select()
      .from(pandaDocImportBatches)
      .orderBy(desc(pandaDocImportBatches.createdAt));
  }

  async getBatchDocuments(batchId: number): Promise<PandaDocDocument[]> {
    return db.select()
      .from(pandaDocDocuments)
      .where(eq(pandaDocDocuments.batchId, batchId))
      .orderBy(desc(pandaDocDocuments.createdAt));
  }

  async getAllDocuments(status?: string): Promise<PandaDocDocument[]> {
    const query = db.select().from(pandaDocDocuments);
    if (status) {
      return query.where(eq(pandaDocDocuments.importStatus, status))
        .orderBy(desc(pandaDocDocuments.createdAt));
    }
    return query.orderBy(desc(pandaDocDocuments.createdAt));
  }

  async getDocument(id: number): Promise<PandaDocDocument | null> {
    const [doc] = await db.select()
      .from(pandaDocDocuments)
      .where(eq(pandaDocDocuments.id, id))
      .limit(1);
    return doc || null;
  }

  async getStats(): Promise<{
    totalBatches: number;
    totalDocuments: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    errors: number;
  }> {
    const batches = await db.select({ count: sql<number>`count(*)` })
      .from(pandaDocImportBatches);
    
    const documents = await db.select({ count: sql<number>`count(*)` })
      .from(pandaDocDocuments);
    
    const pendingReview = await db.select({ count: sql<number>`count(*)` })
      .from(pandaDocDocuments)
      .where(eq(pandaDocDocuments.importStatus, "extracted"));
    
    const approved = await db.select({ count: sql<number>`count(*)` })
      .from(pandaDocDocuments)
      .where(eq(pandaDocDocuments.importStatus, "approved"));
    
    const rejected = await db.select({ count: sql<number>`count(*)` })
      .from(pandaDocDocuments)
      .where(eq(pandaDocDocuments.importStatus, "rejected"));
    
    const errors = await db.select({ count: sql<number>`count(*)` })
      .from(pandaDocDocuments)
      .where(eq(pandaDocDocuments.importStatus, "error"));

    return {
      totalBatches: Number(batches[0]?.count || 0),
      totalDocuments: Number(documents[0]?.count || 0),
      pendingReview: Number(pendingReview[0]?.count || 0),
      approved: Number(approved[0]?.count || 0),
      rejected: Number(rejected[0]?.count || 0),
      errors: Number(errors[0]?.count || 0),
    };
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const pandaDocClient = new PandaDocClient();
