/**
 * Domain configuration — the single file to edit when forking meta-kb for a new topic.
 *
 * Every domain-specific value (topic, audience, taxonomy buckets, scoring calibration,
 * cross-cutting themes) lives here. The compilation pipeline, ingestion scripts, and
 * skill files all read from this config.
 */

// ─── Types ─────────────────────────────────────────────────────────────

export interface DomainBucket {
  id: string;           // URL-safe slug, e.g. "knowledge-bases"
  name: string;         // Display name, e.g. "Knowledge Bases"
  title: string;        // Synthesis article title, e.g. "The State of LLM Knowledge Bases"
  color: string;        // Graph cluster color (hex)
  description: string;  // Short description for ROOT.md and indexes
  examples: string;     // Longer examples for taxonomy prompts and scoring
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
  };
  crossCuttingThemes: string[];
}

// ─── Domain Definition ─────────────────────────────────────────────────

export const domain: DomainConfig = {
  name: "meta-kb",
  topic: "building LLM knowledge bases and agent intelligence systems",
  audience: "practitioners who build with LLM agents",
  fieldMapTitle: "The Landscape of LLM Knowledge Systems",

  buckets: [
    {
      id: "knowledge-bases",
      name: "Knowledge Bases",
      title: "The State of LLM Knowledge Bases",
      color: "#e74c3c",
      description: "compiled wikis, RAG, graph retrieval, vectorless approaches",
      examples: "Karpathy pattern, Obsidian, markdown wikis, RAG alternatives, personal second brains",
    },
    {
      id: "agent-memory",
      name: "Agent Memory",
      title: "The State of Agent Memory",
      color: "#3498db",
      description: "persistent memory, temporal KGs, episodic/semantic split",
      examples: "Mem0, Letta, A-MEM, Zep/Graphiti, episodic/semantic/working memory",
    },
    {
      id: "context-engineering",
      name: "Context Engineering",
      title: "The State of Context Engineering",
      color: "#2ecc71",
      description: "CLAUDE.md, progressive disclosure, compression, context graphs",
      examples: "Context window management, CLAUDE.md/AGENTS.md/SKILL.md standards, context graphs",
    },
    {
      id: "agent-systems",
      name: "Agent Systems",
      title: "The State of Agent Systems",
      color: "#f39c12",
      description: "SKILL.md, skill registries, harnesses, multi-agent orchestration",
      examples: "Skills, harnesses, orchestration (gstack, everything-claude-code, Anthropic Skills), modular agent capabilities, skill composition",
    },
    {
      id: "self-improving",
      name: "Self-Improving",
      title: "The State of Self-Improving Systems",
      color: "#9b59b6",
      description: "autoresearch, Karpathy loop, reflexion, skill accumulation",
      examples: "Auto-improvement loops, observation/correction patterns, health checks, linting",
    },
  ],

  scoring: {
    highExamples: "A tool for building agent memory systems (Mem0), a framework for LLM-compiled knowledge bases, an autonomous self-improving loop system (autoresearch, CORAL), context engineering standards (CLAUDE.md)",
    midExamples: "A general-purpose RAG framework, a self-optimizing system where the improvement pattern is somewhat transferable, an LLM orchestration tool with memory as one feature",
    lowExamples: "A code editor with AI features, a general ML experiment tracker without an improvement loop",
    outOfScope: ["computer vision", "game AI", "robotics", "cryptocurrency", "social media marketing"],
    outOfScopeExamples: `- Computer vision memory (video memory, image memory, visual grounding)
- Game AI or robotics memory systems
- Pure NLP benchmarks without agent/KB applications
- General ML/DL frameworks that happen to use "memory" in architecture names
- Chat UI or conversational AI without knowledge/memory components
- Code generation tools without knowledge management features OR self-improving patterns`,
    primaryPillars: "Topics 1 and 5 are the primary pillars. A source about self-improving loops applied to ML training, code generation, eval harnesses, or any other domain is STILL highly relevant if the improvement pattern itself is transferable to knowledge base systems. Score based on the reusability of the pattern, not the specific domain.",
  },

  crossCuttingThemes: [
    "Markdown as universal interchange format",
    "Git as infrastructure",
    "Finite attention budget (context window as scarce resource)",
    "Agent as author (LLMs writing for LLMs)",
    "Emergence of forgetting",
    "Binary evaluation",
  ],
};

// ─── Helpers (derived from config, used by scripts) ────────────────────

/** Bucket IDs as array, e.g. ["knowledge-bases", "agent-memory", ...] */
export const BUCKET_IDS = domain.buckets.map((b) => b.id);

/** Bucket ID → display name, e.g. { "knowledge-bases": "Knowledge Bases" } */
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
