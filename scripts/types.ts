// ─── Raw Source Schema ──────────────────────────────────────────────────

export type RawSourceType =
  | "tweet"
  | "repo"
  | "paper"
  | "article"
  | "docs"
  | "video"
  | "discussion";

export interface RawSourceFrontmatter {
  url: string;
  type: RawSourceType;
  author: string;
  date: string; // YYYY-MM-DD
  tags: string[];
  key_insight: string;
  // Engagement metrics (optional, type-dependent)
  likes?: number;
  retweets?: number;
  views?: number;
  stars?: number;
  forks?: number;
  points?: number;
  // Media
  images?: string[]; // Relative paths to downloaded images: ["images/{slug}/image.jpg"]
  // Structured fields for repos (extracted from body by migration)
  language?: string;
  license?: string;
  maturity?: string; // "production" | "beta" | "alpha" | "concept" | "archived"
  // Relevance scores (added by ingestion scoring)
  relevance_scores?: {
    topic_relevance: number;
    practitioner_value: number;
    novelty: number;
    signal_quality: number;
    composite: number;
    reason: string;
  };
}

// ─── Engagement Metrics ────────────────────────────────────────────────

export interface Engagement {
  likes: number;
  retweets: number;
  views: number;
}

// ─── Taxonomy ───────────────────────────────────────────────────────────

/** Bucket ID string — valid values defined in config/domain.ts */
export type TaxonomyBucket = string;

export type EntityType = "concept" | "project" | "person" | "approach";

// ─── Intermediate Graph (build/) ────────────────────────────────────────

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  bucket: TaxonomyBucket;
  description: string;
  source_refs: string[];
  aliases: string[];
  article_level: "full" | "stub";
  relevance_composite?: number;
}

export type EdgeType =
  | "implements"
  | "alternative_to"
  | "part_of"
  | "created_by"
  | "competes_with"
  | "extends"
  | "supersedes";

export interface GraphNode {
  id: string;
  name: string;
  type: EntityType;
  bucket: TaxonomyBucket;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: EdgeType;
  weight: number; // 0.0-1.0
  label?: string;
}

export interface KnowledgeGraph {
  version: 1;
  compiled_at: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: Record<string, { label: string; node_count: number; color: string }>;
}

// ─── Wiki Page Frontmatter (output) ─────────────────────────────────────

export interface WikiFrontmatter {
  entity_id: string;
  type: EntityType;
  bucket: TaxonomyBucket;
  sources: string[];
  related: string[];
  last_compiled: string;
  // Progressive disclosure & staleness
  abstract?: string;
  source_date_range?: string; // "YYYY-MM-DD to YYYY-MM-DD"
  newest_source?: string; // "YYYY-MM-DD"
  staleness_risk?: "low" | "medium" | "high";
}

// ─── Landscape Table ────────────────────────────────────────────────────

export interface LandscapeRow {
  name: string;
  bucket: TaxonomyBucket;
  tagline: string;
  approach: string;
  license: "OSS" | "Proprietary" | "Open Core" | "Freemium";
  stars: number | null;
  maturity: "production" | "beta" | "alpha" | "concept" | "archived";
  differentiator: string;
  language: string;
  entity_id: string;
}

// ─── Claims & Eval ─────────────────────────────────────────────────────

export type ClaimType = "empirical" | "architectural" | "comparative" | "directional";
export type ClaimConfidence = "verified" | "reported" | "inferred";

export interface Claim {
  id: string; // "claim-a1b2c3d4e5f6" (content-hash based)
  content: string; // atomic verifiable statement
  content_hash: string; // SHA-256(content + "|" + article_ref), first 12 hex chars
  type: ClaimType;
  confidence: ClaimConfidence;
  source_refs: string[]; // raw/ paths cited in support
  article_ref: string; // wiki bucket name, e.g. "agent-memory"
  entity_refs: string[]; // entity IDs mentioned
  temporal_scope: string | null; // "as of 2026-04" or null for timeless
  created_at: string; // ISO timestamp of first extraction
  updated_at: string; // ISO timestamp of last extraction
  status: "active" | "stale" | "superseded"; // lifecycle status
}

export interface ClaimsFile {
  version: number;
  compiled_at: string;
  total: number;
  claims: Claim[];
}

export interface EvalResult {
  claim_id: string;
  verdict: "PASS" | "FAIL";
  reason: string;
}

export interface EvalReport {
  version: number;
  compiled_at: string;
  total_claims: number;
  sample_size: number; // claims actually verified with LLM this run
  carried_forward: number; // claims reused from eval cache
  total_evaluated: number; // sample_size + carried_forward
  accuracy: number;
  results: EvalResult[];
  failures: Array<{
    claim_id: string;
    claim: string;
    article_ref: string;
    source_ref: string;
    reason: string;
  }>;
  by_type: Record<string, { sampled: number; passed: number }>;
  by_bucket: Record<string, { sampled: number; passed: number }>;
}

// ─── Eval Cache ───────────────────────────────────────────────────────

export interface EvalCacheEntry {
  claim_content_hash: string;
  verdict: "PASS" | "FAIL";
  reason: string;
  source_ref: string; // the actual source that was verified (may be deep/ fallback)
  source_hash: string; // SHA-256 of that source at verification time
  verified_at: string;
  bucket: string;
}

export interface EvalCache {
  version: 1;
  config_hash: string; // reuse computeConfigHash() — single source of truth
  entries: Record<string, EvalCacheEntry>; // keyed by claim content_hash
}

// ─── Compilation Diff ─────────────────────────────────────────────────

export interface ArticleDiff {
  bucket: string;
  word_count_before: number;
  word_count_after: number;
  sections_added: string[]; // ## headings that are new
  sections_removed: string[]; // ## headings that disappeared
  sections_changed: string[]; // ## headings with different content
  citations_added: string[]; // from frontmatter sources diff
  citations_removed: string[]; // from frontmatter sources diff
  entities_added: string[]; // from frontmatter entities/related diff
  entities_removed: string[]; // from frontmatter entities/related diff
}

export interface CompilationDiff {
  version: 1;
  compiled_at: string;
  articles: ArticleDiff[];
  cards_added: string[];
  cards_removed: string[];
  cards_regenerated: string[];
}
