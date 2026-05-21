import type { Agent, AgentMeta } from './types.js';

const registry = new Map<string, Agent>();

export function registerAgent(agent: Agent): void {
  registry.set(agent.id, agent);
}

export function getAgent(id: string): Agent | undefined {
  return registry.get(id);
}

export function listAgents(): AgentMeta[] {
  return Array.from(registry.values()).map((a) => a.describe());
}
