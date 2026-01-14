/**
 * Multi-Agent AI System
 * 
 * Base classes and types for the 5-agent architecture:
 * - Scout: Gathers intel from feeds
 * - Analyst: Interprets trends and patterns
 * - Strategist: Recommends actions
 * - Composer: Drafts content
 * - Auditor: Quality control
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { log } from "../../lib/logger";

// Agent Types
export type AgentType = "scout" | "analyst" | "strategist" | "composer" | "auditor";

export type MessageType = "intel" | "insight" | "action" | "content" | "audit" | "feedback";

export type ModelProvider = "openai" | "gemini";

// Message structure for inter-agent communication
export interface AgentMessage {
    id: string;
    from: AgentType;
    to: AgentType;
    type: MessageType;
    payload: any;
    timestamp: Date;
    traceId: string; // Links full chain
    parentMessageId?: string;
}

// Agent configuration
export interface AgentConfig {
    name: AgentType;
    displayName: string;
    provider: ModelProvider;
    model: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
}

// Default agent configurations
export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
    scout: {
        name: "scout",
        displayName: "🔍 Scout Agent",
        provider: "openai",
        model: "gpt-4o-mini",
        systemPrompt: `You are the Scout Agent for Scan2Plan, a 3D laser scanning and BIM modeling company.

Your role is to:
1. Process raw intel from RSS feeds, APIs, and web sources
2. Extract key entities (companies, locations, dollar values, deadlines)
3. Score relevance (0-100) based on fit with Scan2Plan's services
4. Flag duplicates and low-quality items
5. Categorize intel into: opportunity, competitor, policy, technology, partnership, market, regulation, event, talent

Output structured JSON with extracted data.`,
        temperature: 0.3,
        maxTokens: 1000,
    },
    analyst: {
        name: "analyst",
        displayName: "📊 Analyst Agent",
        provider: "gemini",
        model: "gemini-1.5-pro",
        systemPrompt: `You are the Analyst Agent for Scan2Plan, a 3D laser scanning and BIM modeling company.

Your role is to:
1. Analyze intel items for patterns and trends
2. Connect dots between seemingly unrelated items
3. Calculate opportunity-to-capability match scores
4. Identify competitor strategies and market shifts
5. Generate weekly trend digests

Provide deep insights, not just summaries.`,
        temperature: 0.5,
        maxTokens: 2000,
    },
    strategist: {
        name: "strategist",
        displayName: "🎯 Strategist Agent",
        provider: "openai",
        model: "gpt-4o",
        systemPrompt: `You are the Strategist Agent for Scan2Plan, a 3D laser scanning and BIM modeling company.

Your role is to:
1. Prioritize opportunities by ROI potential
2. Make bid/no-bid recommendations with reasoning
3. Suggest pricing strategies based on competition
4. Recommend team/resource allocation
5. Generate "What to do this week" action items for the CEO

Be decisive and action-oriented.`,
        temperature: 0.4,
        maxTokens: 1500,
    },
    composer: {
        name: "composer",
        displayName: "✍️ Composer Agent",
        provider: "openai",
        model: "gpt-4o",
        systemPrompt: `You are the Composer Agent for Scan2Plan, a 3D laser scanning and BIM modeling company.

Your role is to:
1. Draft follow-up emails personalized to buyer persona
2. Generate proposal language and executive summaries
3. Create marketing content (LinkedIn posts, case studies)
4. Write RFP responses using company capabilities
5. Maintain brand voice across all content

Be professional, confident, and compelling.`,
        temperature: 0.7,
        maxTokens: 2000,
    },
    auditor: {
        name: "auditor",
        displayName: "🛡️ Auditor Agent",
        provider: "openai",
        model: "gpt-4o-mini",
        systemPrompt: `You are the Auditor Agent for Scan2Plan, a 3D laser scanning and BIM modeling company.

Your role is to:
1. Check all agent outputs for brand voice compliance
2. Verify red line adherence (never promise what we can't deliver)
3. Fact-check claims and statistics
4. Ensure governance policy compliance
5. Approve or reject content with specific feedback

Return PASS/FAIL with detailed reasoning.`,
        temperature: 0.2,
        maxTokens: 500,
    },
};

// Initialize AI clients
let openaiClient: OpenAI | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

function getOpenAI(): OpenAI | null {
    if (!openaiClient) {
        const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        if (apiKey) {
            openaiClient = new OpenAI({
                apiKey,
                baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
            });
        }
    }
    return openaiClient;
}

function getGemini(): GoogleGenerativeAI | null {
    if (!geminiClient) {
        const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
            geminiClient = new GoogleGenerativeAI(apiKey);
        }
    }
    return geminiClient;
}

/**
 * Base class for all agents
 */
export abstract class AgentBase {
    protected config: AgentConfig;
    protected messageHistory: AgentMessage[] = [];

    constructor(config: AgentConfig) {
        this.config = config;
        log(`[${config.displayName}] Initialized`);
    }

    /**
     * Process an incoming message and generate a response
     */
    async process(message: AgentMessage): Promise<AgentMessage | null> {
        log(`[${this.config.displayName}] Processing message from ${message.from}`);

        try {
            const response = await this.callModel(message.payload);

            if (!response) {
                log(`WARN: [${this.config.displayName}] No response from model`);
                return null;
            }

            const outMessage: AgentMessage = {
                id: crypto.randomUUID(),
                from: this.config.name,
                to: this.getNextAgent(),
                type: this.getOutputType(),
                payload: response,
                timestamp: new Date(),
                traceId: message.traceId,
                parentMessageId: message.id,
            };

            this.messageHistory.push(outMessage);
            return outMessage;

        } catch (error) {
            log(`ERROR: [${this.config.displayName}] ${error}`);
            return null;
        }
    }

    /**
     * Call the AI model with the given input
     */
    protected async callModel(input: any): Promise<any> {
        const userPrompt = this.buildPrompt(input);

        if (this.config.provider === "openai") {
            return this.callOpenAI(userPrompt);
        } else if (this.config.provider === "gemini") {
            return this.callGemini(userPrompt);
        }

        throw new Error(`Unknown provider: ${this.config.provider}`);
    }

    protected async callOpenAI(userPrompt: string): Promise<any> {
        const client = getOpenAI();
        if (!client) {
            log(`WARN: [${this.config.displayName}] OpenAI not configured`);
            return null;
        }

        const response = await client.chat.completions.create({
            model: this.config.model,
            messages: [
                { role: "system", content: this.config.systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
        });

        const content = response.choices[0]?.message?.content;
        return this.parseResponse(content || "");
    }

    protected async callGemini(userPrompt: string): Promise<any> {
        const client = getGemini();
        if (!client) {
            log(`WARN: [${this.config.displayName}] Gemini not configured`);
            return null;
        }

        const model = client.getGenerativeModel({ model: this.config.model });
        const result = await model.generateContent([
            this.config.systemPrompt,
            userPrompt,
        ].join("\n\n"));

        const content = result.response.text();
        return this.parseResponse(content);
    }

    /**
     * Build the prompt for this agent - override in subclasses
     */
    protected abstract buildPrompt(input: any): string;

    /**
     * Parse the model response - override in subclasses
     */
    protected abstract parseResponse(content: string): any;

    /**
     * Get the next agent in the chain
     */
    protected abstract getNextAgent(): AgentType;

    /**
     * Get the output message type
     */
    protected abstract getOutputType(): MessageType;
}

/**
 * Agent Message Bus - routes messages between agents
 */
export class AgentMessageBus {
    private agents: Map<AgentType, AgentBase> = new Map();
    private messageLog: AgentMessage[] = [];

    /**
     * Register an agent with the bus
     */
    register(agent: AgentBase, type: AgentType): void {
        this.agents.set(type, agent);
        log(`[MessageBus] Registered ${type} agent`);
    }

    /**
     * Send a message to an agent
     */
    async send(message: AgentMessage): Promise<AgentMessage | null> {
        this.messageLog.push(message);

        const agent = this.agents.get(message.to);
        if (!agent) {
            log(`WARN: [MessageBus] No agent registered for ${message.to}`);
            return null;
        }

        const response = await agent.process(message);
        if (response) {
            this.messageLog.push(response);
        }

        return response;
    }

    /**
     * Run a full pipeline starting with initial input
     */
    async runPipeline(
        initialInput: any,
        startAgent: AgentType = "scout"
    ): Promise<AgentMessage[]> {
        const traceId = crypto.randomUUID();
        const results: AgentMessage[] = [];

        let message: AgentMessage | null = {
            id: crypto.randomUUID(),
            from: "scout", // External trigger
            to: startAgent,
            type: "intel",
            payload: initialInput,
            timestamp: new Date(),
            traceId,
        };

        while (message) {
            const response = await this.send(message);
            if (response) {
                results.push(response);

                // Stop at auditor or if no next agent
                if (response.from === "auditor") {
                    break;
                }

                // Continue to next agent
                message = {
                    ...response,
                    id: crypto.randomUUID(),
                };
            } else {
                break;
            }
        }

        log(`[MessageBus] Pipeline complete. ${results.length} messages processed.`);
        return results;
    }

    /**
     * Get message history for a trace
     */
    getTrace(traceId: string): AgentMessage[] {
        return this.messageLog.filter(m => m.traceId === traceId);
    }
}

// Export singleton message bus
export const messageBus = new AgentMessageBus();
