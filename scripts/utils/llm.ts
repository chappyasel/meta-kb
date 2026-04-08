import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { RawSourceType } from "../types.js";
import { domain, BUCKET_IDS, TAXONOMY_LINES } from "../../config/domain.js";

// ─── Provider ───────────────────────────────────────────────────────────

let provider: ReturnType<typeof createAnthropic> | null = null;

function getProvider() {
  if (!provider) {
    provider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return provider;
}

// ─── Insight + Tags ─────────────────────────────────────────────────────

const insightSchema = z.object({
  key_insight: z.string().describe(
    `1-2 sentences on why this matters for ${domain.audience}. Be specific and non-obvious.`,
  ),
  tags: z.array(z.string()).describe(
    `3-7 tags. At least one from taxonomy buckets (${BUCKET_IDS.join(", ")}), plus topic-specific tags.`,
  ),
});

const INSIGHT_SYSTEM_PROMPT = `You analyze content about ${domain.topic}.
Given source content, extract:
- key_insight: 1-2 sentences on why this matters for ${domain.audience}. Be specific and non-obvious.
- tags: 3-7 tags. Include at least one from these taxonomy buckets where relevant:
  ${TAXONOMY_LINES.join("\n  ")}
  Then add topic-specific tags.`;

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
    "0-10: How directly does this relate to the topic areas? 10=core topic, 5=tangential, 0=unrelated",
  ),
  practitioner_value: z.number().describe(
    `0-10: How useful for ${domain.audience}? 10=immediately actionable, 0=no practical value`,
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

const bucketDescriptions = domain.buckets
  .map((b, i) => `${i + 1}. ${b.name} — ${b.examples}`)
  .join("\n");

const RELEVANCE_SYSTEM_PROMPT = `You are a relevance scorer for "${domain.name}", an LLM-compiled knowledge base covering ${domain.topic}.

The knowledge base covers ${domain.buckets.length} topic areas:
${bucketDescriptions}

${domain.scoring.primaryPillars}

NOT in scope (common false positives):
${domain.scoring.outOfScopeExamples}

SCORING CALIBRATION:

topic_relevance:
  9-10: ${domain.scoring.highExamples}
  6-7:  ${domain.scoring.midExamples}
  3-4:  ${domain.scoring.lowExamples}
  0-2:  ${domain.scoring.outOfScope.map((s) => `A ${s} system`).join(", ")}

practitioner_value:
${domain.scoring.practitionerValue}

novelty:
  9-10: First implementation of a genuinely new architecture or pattern
  6-7:  Meaningful improvement on existing patterns (faster retrieval, better compression, novel hybrid approach, new failure mode analysis)
  3-4:  Standard implementation of well-known patterns
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
  const lower = content.toLowerCase();
  return BUCKET_IDS.filter(
    (id) => id.split("-").some((k) => lower.includes(k)),
  );
}
