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

export type TaxonomyBucket =
  | "knowledge-bases"
  | "agent-memory"
  | "context-engineering"
  | "agent-systems"
  | "self-improving";

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
