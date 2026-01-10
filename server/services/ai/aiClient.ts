import OpenAI from "openai";
import { log } from "../../lib/logger";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface ChatParams {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  responseFormat?: "json_object" | "text";
  maxTokens?: number;
}

interface EmbeddingResult {
  embedding: number[];
  tokensUsed: number;
}

export class AIClient {
  private openai: OpenAI;
  private defaultModel: string;
  private embeddingsModel: string;

  constructor() {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

    if (!apiKey) {
      log("WARN: [AIClient] OpenAI API key not configured");
    }

    this.openai = new OpenAI({
      apiKey: apiKey || "",
      baseURL: baseURL || undefined,
    });

    this.defaultModel = process.env.AI_DEFAULT_MODEL || "gpt-4o";
    this.embeddingsModel = process.env.AI_EMBEDDINGS_MODEL || "text-embedding-3-small";
  }

  async chat(params: ChatParams): Promise<string | null> {
    const { messages, model, temperature, responseFormat, maxTokens } = params;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: model || this.defaultModel,
          messages: messages as any,
          temperature: temperature ?? 0.3,
          max_tokens: maxTokens,
          ...(responseFormat === "json_object" && {
            response_format: { type: "json_object" },
          }),
        });

        return response.choices[0]?.message?.content || null;
      } catch (error: any) {
        const isRateLimit = error?.status === 429;
        const isRetryable = isRateLimit || error?.status >= 500;

        if (isRateLimit) {
          log(`WARN: [AIClient] Rate limit hit, attempt ${attempt}/${MAX_RETRIES}`);
        } else {
          log(`ERROR: [AIClient] Chat error: ${error?.message || error}`);
        }

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    return null;
  }

  async chatJSON<T>(params: ChatParams): Promise<T | null> {
    const result = await this.chat({
      ...params,
      responseFormat: "json_object",
    });

    if (!result) return null;

    try {
      return JSON.parse(result) as T;
    } catch (error) {
      log(`ERROR: [AIClient] Failed to parse JSON response: ${error}`);
      return null;
    }
  }

  async embed(text: string): Promise<EmbeddingResult | null> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingsModel,
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        tokensUsed: response.usage?.total_tokens || 0,
      };
    } catch (error: any) {
      log(`ERROR: [AIClient] Embedding error: ${error?.message || error}`);
      return null;
    }
  }

  async embedBatch(texts: string[]): Promise<(EmbeddingResult | null)[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingsModel,
        input: texts,
      });

      return response.data.map((item) => ({
        embedding: item.embedding,
        tokensUsed: Math.floor((response.usage?.total_tokens || 0) / texts.length),
      }));
    } catch (error: any) {
      log(`ERROR: [AIClient] Batch embedding error: ${error?.message || error}`);
      return texts.map(() => null);
    }
  }

  isConfigured(): boolean {
    return !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  }

  async generateText(systemPrompt: string, userMessage: string, options?: { maxTokens?: number; temperature?: number }): Promise<string | null> {
    return this.chat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
    });
  }
}

export const aiClient = new AIClient();
