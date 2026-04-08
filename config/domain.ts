/**
 * Domain configuration — the single file to edit when forking meta-kb for a new topic.
 *
 * Every domain-specific value (topic, audience, taxonomy buckets, scoring calibration,
 * cross-cutting themes) lives here. The compilation pipeline, ingestion scripts, and
 * skill files all read from this config.
 */

// ─── Types ─────────────────────────────────────────────────────────────

export interface DomainBucket {
  id: string;           // URL-safe slug, e.g. "knowledge-substrate"
  name: string;         // Display name, e.g. "Knowledge Substrate"
  title: string;        // Synthesis article title, e.g. "The State of LLM Knowledge Substrate"
  color: string;        // Graph cluster color (hex)
  description: string;  // Short description for ROOT.md and indexes
  examples: string;     // Longer examples for taxonomy prompts and scoring
  openingVariant: string; // Per-bucket opening instruction for synthesis articles
}

export interface DomainConfig {
  name: string;              // Project name, e.g. "meta-kb"
  topic: string;             // What the KB covers (used in LLM prompts)
  audience: string;          // Who it's for (used in LLM prompts)
  fieldMapTitle: string;     // H1 of the flagship overview article
  buckets: DomainBucket[];
  scoring: {
    highExamples: string;    // Calibration: what scores 9-10
    midExamples: string;     // Calibration: what scores 6-7
    lowExamples: string;     // Calibration: what scores 3-4
    outOfScope: string[];    // Topics to exclude (common false positives)
    outOfScopeExamples: string; // Detailed false positive descriptions
    primaryPillars: string;  // Which buckets are weighted highest (guidance for scorer)
    practitionerValue: string; // Calibration for practitioner_value scoring dimension
  };
  crossCuttingThemes: string[];
}

// ─── Domain Definition ─────────────────────────────────────────────────

export const domain: DomainConfig = {
  name: "meta-kb",
  topic: "LLM agent infrastructure: knowledge systems, memory, context engineering, agent capabilities, multi-agent coordination, and self-improvement",
  audience: "practitioners who build with LLM agents",
  fieldMapTitle: "The Landscape of LLM Agent Infrastructure",

  buckets: [
    {
      id: "knowledge-substrate",
      name: "Knowledge Substrate",
      title: "The State of LLM Knowledge Substrate",
      color: "#e74c3c",
      description: "compiled wikis, RAG, graph retrieval, vector stores, registries",
      examples: "Karpathy pattern, Obsidian, markdown wikis, RAG alternatives, personal second brains, context graphs, decentralized knowledge graphs",
      openingVariant: "Open with the single most surprising finding from the sources. One specific fact a practitioner would not have predicted 6 months ago. State it as fact in one sentence, then two sentences on why it surprised people.",
    },
    {
      id: "agent-memory",
      name: "Agent Memory",
      title: "The State of Agent Memory",
      color: "#3498db",
      description: "persistent memory, temporal KGs, episodic/semantic split",
      examples: "Mem0, Letta, A-MEM, Zep/Graphiti, episodic/semantic/working memory, cross-session retention",
      openingVariant: "Open with a concrete failure. Name the system, the failure mode, and the consequence. Then zoom out: what does this failure reveal about the current state of agent memory?",
    },
    {
      id: "context-engineering",
      name: "Context Engineering",
      title: "The State of Context Engineering",
      color: "#2ecc71",
      description: "CLAUDE.md, progressive disclosure, compression, context graphs, token budgeting",
      examples: "Context window management, CLAUDE.md/AGENTS.md/SKILL.md standards, context graphs, progressive disclosure, token budgeting, traversal policy",
      openingVariant: "Open with the strongest disagreement in the sources. Two specific projects that made opposite architectural bets. State both positions in one sentence each. Do not resolve it here.",
    },
    {
      id: "agent-architecture",
      name: "Agent Architecture",
      title: "The State of Agent Architecture",
      color: "#f39c12",
      description: "skills, harnesses, tool use, SKILL.md, modular agent design",
      examples: "Skills, harnesses, SKILL.md, tool use patterns, agent frameworks (gstack, everything-claude-code), modular capabilities, prompt optimization, skill composition",
      openingVariant: "Open with a counterintuitive result. Name the system that tried the 'obvious' approach and what actually happened. One sentence on what everyone expected. One sentence on what the data showed.",
    },
    {
      id: "multi-agent-systems",
      name: "Multi-Agent Systems",
      title: "The State of Multi-Agent Systems",
      color: "#1abc9c",
      description: "coordination, shared state, delegation, conflict resolution, trust, signal aggregation",
      examples: "CORAL, multi-agent orchestration, shared state management, agent-to-agent communication, task delegation, signal aggregation, organizational coordination, conflict resolution",
      openingVariant: "Open with a number. A specific benchmark, adoption metric, or failure rate that reframes how practitioners think about multi-agent coordination. State the number, then two sentences on why it matters more than practitioners realize.",
    },
    {
      id: "self-improving",
      name: "Self-Improving Systems",
      title: "The State of Self-Improving Systems",
      color: "#9b59b6",
      description: "autoresearch, Karpathy loop, reflexion, skill accumulation, fitness functions",
      examples: "Auto-improvement loops, observation/correction patterns, health checks, linting, fitness functions, trace-driven optimization, Darwinian/Lamarckian selection",
      openingVariant: "Open with a practitioner's workflow. Describe the specific steps a real practitioner follows when using the leading self-improvement approach. Then reveal where that workflow breaks.",
    },
  ],

  scoring: {
    highExamples: "A tool for building agent memory systems (Mem0), a framework for LLM-compiled knowledge bases, an autonomous self-improving loop system (autoresearch, CORAL), context engineering standards (CLAUDE.md), a multi-agent coordination framework with shared state management",
    midExamples: "A general-purpose RAG framework, a self-optimizing system where the improvement pattern is somewhat transferable, an LLM orchestration tool with memory as one feature, a multi-agent system focused on a narrow domain",
    lowExamples: "A code editor with AI features, a general ML experiment tracker without an improvement loop",
    outOfScope: ["computer vision", "game AI", "robotics", "cryptocurrency", "social media marketing"],
    outOfScopeExamples: `- Computer vision memory (video memory, image memory, visual grounding)
- Game AI or robotics memory systems
- Pure NLP benchmarks without agent/KB applications
- General ML/DL frameworks that happen to use "memory" in architecture names
- Chat UI or conversational AI without knowledge/memory/coordination components
- Code generation tools without knowledge management, self-improving patterns, OR multi-agent coordination`,
    primaryPillars: "Topics 1, 5, and 6 are the primary pillars (Knowledge Substrate, Multi-Agent Systems, Self-Improving Systems). A source about multi-agent coordination patterns, signal aggregation, or shared state management is STILL highly relevant even if applied to a non-KB domain, if the coordination pattern itself is transferable. A source about self-improving loops applied to ML training, code generation, eval harnesses, or any other domain is STILL highly relevant if the improvement pattern itself is transferable to agent systems. Score based on the reusability of the pattern, not the specific domain.",
    practitionerValue: `  9-10: Production-ready library or detailed write-up a practitioner can learn from and apply today. Includes: tools directly relevant to the topic areas, implementations with documented patterns.
  6-7:  Research code with a novel approach that requires significant adaptation, or a conceptual article with transferable insights
  3-4:  Academic paper with no code release, or code that only reproduces paper results without a reusable API
  0-2:  Theoretical framework with no implementation, or tool that solves a completely different problem`,
  },

  crossCuttingThemes: [
    "Markdown as universal interchange format",
    "Git as infrastructure",
    "Finite attention budget (context window as scarce resource)",
    "Agent as author (LLMs writing for LLMs)",
    "Emergence of forgetting",
    "Binary evaluation",
    "Passive telemetry over active contribution",
    "Trust as emergent property",
    "Patterns that scale from single-agent to multi-agent",
  ],
};

// ─── Helpers (derived from config, used by scripts) ────────────────────

/** Bucket IDs as array, e.g. ["knowledge-substrate", "agent-memory", ...] */
export const BUCKET_IDS = domain.buckets.map((b) => b.id);

/** Bucket ID → display name, e.g. { "knowledge-substrate": "Knowledge Substrate" } */
export const BUCKET_NAMES: Record<string, string> = Object.fromEntries(
  domain.buckets.map((b) => [b.id, b.name]),
);

/** Bucket ID → synthesis article title */
export const BUCKET_TITLES: Record<string, string> = Object.fromEntries(
  domain.buckets.map((b) => [b.id, b.title]),
);

/** Bucket ID → color */
export const BUCKET_COLORS: Record<string, string> = Object.fromEntries(
  domain.buckets.map((b) => [b.id, b.color]),
);

/** Bucket ID → short description */
export const BUCKET_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  domain.buckets.map((b) => [b.id, b.description]),
);

/** Taxonomy bucket lines for LLM prompts: "knowledge-bases — Karpathy pattern, ..." */
export const TAXONOMY_LINES = domain.buckets.map(
  (b) => `${b.id} — ${b.examples}`,
);
