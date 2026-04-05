import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { RawSourceType } from "../types.js";

// ─── Provider ───────────────────────────────────────────────────────────

let provider: ReturnType<typeof createAnthropic> | null = null;

function getProvider() {
  if (!provider) {
    provider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return provider;
}

// ─── Taxonomy (shared across prompts) ───────────────────────────────────

const TAXONOMY_BUCKETS = [
  "knowledge-bases — Karpathy pattern, Obsidian, markdown wikis, RAG alternatives, personal second brains",
  "agent-memory — Mem0, Letta, A-MEM, Zep/Graphiti, episodic/semantic/working memory",
  "context-engineering — Context window management, CLAUDE.md/AGENTS.md/SKILL.md standards, context graphs",
  "agent-systems — Skills, harnesses, orchestration (gstack, everything-claude-code, Anthropic Skills), modular agent capabilities, skill composition",
  "self-improving — Auto-improvement loops, observation/correction patterns, health checks, linting",
];

// ─── Insight + Tags ─────────────────────────────────────────────────────

const insightSchema = z.object({
  key_insight: z.string().describe(
    "1-2 sentences on why this matters for builders of LLM knowledge bases. Be specific and non-obvious.",
  ),
  tags: z.array(z.string()).describe(
    "3-7 tags. At least one from taxonomy buckets (knowledge-bases, agent-memory, context-engineering, agent-systems, self-improving), plus topic-specific tags.",
  ),
});

const INSIGHT_SYSTEM_PROMPT = `You analyze content about LLM knowledge bases, agent memory, and AI tooling.
Given source content, extract:
- key_insight: 1-2 sentences on why this matters for builders of LLM knowledge bases. Be specific and non-obvious.
- tags: 3-7 tags. Include at least one from these taxonomy buckets where relevant:
  ${TAXONOMY_BUCKETS.join("\n  ")}
  Then add topic-specific tags (e.g., "obsidian", "rag", "zettelkasten", "vector-store").`;

export type InsightResult = z.infer<typeof insightSchema>;

export async function generateInsightAndTags(
  content: string,
  sourceType: RawSourceType,
): Promise<{ key_insight: string; tags: string[] }> {
  try {
    const truncated = content.slice(0, 6000);
    const { object } = await generateObject({
      model: getProvider()("claude-haiku-4-5"),
      schema: insightSchema,
      system: INSIGHT_SYSTEM_PROMPT,
      prompt: `Source type: ${sourceType}\n\n${truncated}`,
    });

    return {
      key_insight: object.key_insight,
      tags: object.tags,
    };
  } catch (err) {
    console.warn(`  LLM insight call failed, using fallback: ${err}`);
    return {
      key_insight: fallbackInsight(content),
      tags: fallbackTags(content),
    };
  }
}

// ─── Relevance Scoring ──────────────────────────────────────────────────

const relevanceSchema = z.object({
  topic_relevance: z.number().describe(
    "0-10: How directly does this relate to the 5 topic areas? 10=core topic, 5=tangential, 0=unrelated",
  ),
  practitioner_value: z.number().describe(
    "0-10: How useful for a developer building an LLM KB or agent memory system? 10=immediately actionable, 0=no practical value",
  ),
  novelty: z.number().describe(
    "0-10: Does this introduce a new idea or approach? 10=genuinely novel, 5=solid known execution, 0=nothing new",
  ),
  signal_quality: z.number().describe(
    "0-10: Is the content substantive enough to extract insights? 10=detailed architecture/paper, 5=basic description, 0=empty stub",
  ),
  reason: z.string().describe("1 sentence explaining the scores"),
});

export type RelevanceScore = z.infer<typeof relevanceSchema> & {
  composite: number;
};

const RELEVANCE_SYSTEM_PROMPT = `You are a relevance scorer for "meta-kb", an LLM-compiled knowledge base covering how to build LLM knowledge bases and agent intelligence systems.

The knowledge base covers 5 topic areas:
1. Knowledge Bases — The Karpathy pattern (raw sources -> LLM-compiled .md wiki), Obsidian workflows, markdown wikis, compiled vs curated approaches, NotebookLM, personal second brains, RAG alternatives
2. Agent Memory — Persistent memory for LLM agents (Mem0, Letta, A-MEM, Zep/Graphiti, LangMem, Cognee), episodic/semantic/working memory architectures, cross-session knowledge retention
3. Context Engineering — Context window management, CLAUDE.md/AGENTS.md/SKILL.md standards, prompt engineering for knowledge, context graphs, context compression
4. Agent Systems — Skills, harnesses, orchestration (gstack, everything-claude-code, Anthropic Skills), modular agent capabilities, skill composition patterns, how agents discover and chain tools
5. Self-Improving Systems — Autonomous observe/correct/improve loops in ANY domain (not just knowledge bases). Includes: autoresearch (Karpathy's pattern for autonomous ML experimentation), self-optimizing evaluation harnesses, agents that modify their own code/skills/architecture, self-healing systems, reward hacking and failure modes of improvement loops, health checks, gap detection, linting. The PATTERN of self-improvement matters more than the specific domain it's applied to.

IMPORTANT: Topics 1 and 5 are the primary pillars. A source about self-improving loops applied to ML training, code generation, eval harnesses, or any other domain is STILL highly relevant if the improvement pattern itself is transferable to knowledge base systems. Score based on the reusability of the pattern, not the specific domain.

NOT in scope (common false positives):
- Computer vision memory (video memory, image memory, visual grounding)
- Game AI or robotics memory systems
- Pure NLP benchmarks without agent/KB applications
- General ML/DL frameworks that happen to use "memory" in architecture names
- Chat UI or conversational AI without knowledge/memory components
- Code generation tools without knowledge management features OR self-improving patterns

SCORING CALIBRATION:

topic_relevance:
  9-10: A tool for building agent memory systems (Mem0), a framework for LLM-compiled knowledge bases, an autonomous self-improving loop system (autoresearch, CORAL), context engineering standards (CLAUDE.md)
  6-7:  A general-purpose RAG framework, a self-optimizing system where the improvement pattern is somewhat transferable, an LLM orchestration tool with memory as one feature
  3-4:  A code editor with AI features, a general ML experiment tracker without an improvement loop
  0-2:  A video understanding system, a computer vision benchmark, a robotics simulation environment

practitioner_value:
  9-10: Production-ready library or detailed write-up a developer can learn from and apply today. Includes: tools for building agent memory, autoresearch implementations, self-improving loop architectures with documented patterns.
  6-7:  Research code with a novel approach that requires significant adaptation, or a conceptual article with transferable insights
  3-4:  Academic paper with no code release, or code that only reproduces paper results without a reusable API
  0-2:  Theoretical framework with no implementation, or tool that solves a completely different problem

novelty:
  9-10: First implementation of a genuinely new architecture (Zettelkasten-inspired agent memory, temporal knowledge graphs, self-optimizing eval harnesses, autonomous multi-agent evolution)
  6-7:  Meaningful improvement on existing patterns (faster retrieval, better compression, novel hybrid approach, new failure mode analysis)
  3-4:  Standard implementation of well-known patterns (basic RAG, simple vector store wrapper)
  0-2:  Direct clone or thin wrapper of existing tools

signal_quality:
  9-10: Detailed README with architecture diagrams, benchmarks, clear API docs, comparison to alternatives
  6-7:  Good README with installation and basic usage, some architecture description
  3-4:  Minimal README, description only, no usage examples
  0-2:  Empty repo, no README, stub project`;

export async function scoreRelevance(
  content: string,
  sourceType: RawSourceType,
): Promise<RelevanceScore | null> {
  try {
    const truncated = content.slice(0, 4000);
    const { object } = await generateObject({
      model: getProvider()("claude-sonnet-4-6"),
      schema: relevanceSchema,
      system: RELEVANCE_SYSTEM_PROMPT,
      prompt: `Source type: ${sourceType}\n\n${truncated}`,
    });

    const composite =
      0.4 * object.topic_relevance +
      0.3 * object.practitioner_value +
      0.15 * object.novelty +
      0.15 * object.signal_quality;

    return {
      ...object,
      composite: Math.round(composite * 10) / 10,
    };
  } catch (err) {
    console.warn(`  LLM relevance scoring failed: ${err}`);
    return null;
  }
}

// ─── Fallbacks (only used when generateObject fails entirely) ───────────

function fallbackInsight(content: string): string {
  const firstSentence = content.match(/^[^.!?]+[.!?]/)?.[0] ?? "";
  return firstSentence.slice(0, 200) || "No insight generated.";
}

function fallbackTags(content: string): string[] {
  const keywords = [
    "knowledge-base",
    "agent-memory",
    "context-engineering",
    "rag",
    "obsidian",
    "vector-store",
    "self-improving",
    "skills",
  ];
  const lower = content.toLowerCase();
  return keywords.filter(
    (k) => lower.includes(k.replace("-", " ")) || lower.includes(k),
  );
}
