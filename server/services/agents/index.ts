/**
 * Multi-Agent System Index
 * 
 * Exports all agents and utilities for the multi-agent pipeline
 */

// Base types and utilities
export { AgentBase, AGENT_CONFIGS, AgentMessageBus, messageBus } from "./AgentBase";
export type { AgentType, MessageType, AgentMessage, AgentConfig } from "./AgentBase";

// Individual agents
export { ScoutAgent, scoutAgent } from "./ScoutAgent";
export type { ScoutInput, ScoutOutput } from "./ScoutAgent";
export { AnalystAgent, analystAgent } from "./AnalystAgent";
export type { AnalystInput, AnalystOutput } from "./AnalystAgent";
export { StrategistAgent, strategistAgent } from "./StrategistAgent";
export type { StrategistInput, StrategistOutput } from "./StrategistAgent";
export { ComposerAgent, composerAgent } from "./ComposerAgent";
export type { ComposerInput, ComposerOutput } from "./ComposerAgent";
export { AuditorAgent, auditorAgent } from "./AuditorAgent";
export type { AuditorInput, AuditorOutput } from "./AuditorAgent";

// Initialize all agents on the message bus
import { messageBus } from "./AgentBase";
import { scoutAgent } from "./ScoutAgent";
import { analystAgent } from "./AnalystAgent";
import { strategistAgent } from "./StrategistAgent";
import { composerAgent } from "./ComposerAgent";
import { auditorAgent } from "./AuditorAgent";

/**
 * Initialize the multi-agent system
 */
export function initializeAgents(): void {
    messageBus.register(scoutAgent, "scout");
    messageBus.register(analystAgent, "analyst");
    messageBus.register(strategistAgent, "strategist");
    messageBus.register(composerAgent, "composer");
    messageBus.register(auditorAgent, "auditor");

    console.log("[MultiAgent] All 5 agents registered and ready");
}

/**
 * Run the full pipeline with raw intel input
 */
export async function runAgentPipeline(rawIntel: string, source: string = "manual") {
    return messageBus.runPipeline({
        rawContent: rawIntel,
        source,
    });
}
