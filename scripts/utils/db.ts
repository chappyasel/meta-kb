/**
 * SQLite persistence layer for curation state.
 *
 * Replaces build/seen-urls.json with a proper database.
 * Also tracks evaluated items (smoke-tested but not necessarily ingested)
 * and curation run metadata.
 *
 * Uses Bun's native SQLite — no external dependencies.
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const DB_PATH = "build/curate.db";
const OLD_SEEN_PATH = "build/seen-urls.json";

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;

  // Ensure build/ exists
  if (!existsSync("build")) {
    mkdirSync("build", { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA foreign_keys = ON");

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS seen_urls (
      normalized_url TEXT PRIMARY KEY,
      original_url TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS evaluated_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      content_preview TEXT,
      word_count INTEGER,
      has_links INTEGER NOT NULL DEFAULT 0,
      author TEXT,
      smoke_topic_relevance REAL,
      smoke_practitioner_value REAL,
      smoke_novelty REAL,
      smoke_signal_quality REAL,
      smoke_composite REAL,
      smoke_reason TEXT,
      verdict TEXT NOT NULL,
      engagement_likes INTEGER,
      engagement_retweets INTEGER,
      engagement_views INTEGER,
      engagement_stars INTEGER,
      evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS curate_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      query TEXT,
      items_fetched INTEGER NOT NULL DEFAULT 0,
      items_evaluated INTEGER NOT NULL DEFAULT 0,
      items_ingested INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    )
  `);

  // Migrate from old JSON if this is first run
  migrateFromJson(_db);

  return _db;
}

// ─── Seen URLs ────────────────────────────────────────────────────────

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "").replace(/#.*$/, "");
}

/** Returns true if already seen (skip it). Adds to set either way. */
export function markSeen(url: string, source = "manual"): boolean {
  const db = getDb();
  const normalized = normalizeUrl(url);

  const existing = db
    .query("SELECT 1 FROM seen_urls WHERE normalized_url = ?")
    .get(normalized);
  if (existing) return true;

  db.query(
    "INSERT OR IGNORE INTO seen_urls (normalized_url, original_url, source) VALUES (?, ?, ?)",
  ).run(normalized, url, source);
  return false;
}

export function isSeen(url: string): boolean {
  const db = getDb();
  const normalized = normalizeUrl(url);
  return !!db
    .query("SELECT 1 FROM seen_urls WHERE normalized_url = ?")
    .get(normalized);
}

export function seenCount(): number {
  const db = getDb();
  return (db.query("SELECT COUNT(*) as count FROM seen_urls").get() as { count: number }).count;
}

// ─── Evaluated Items ──────────────────────────────────────────────────

export interface EvaluatedItem {
  id: string;
  type: "tweet" | "repo";
  url: string;
  content_preview?: string;
  word_count?: number;
  has_links?: boolean;
  author?: string;
  smoke_topic_relevance?: number;
  smoke_practitioner_value?: number;
  smoke_novelty?: number;
  smoke_signal_quality?: number;
  smoke_composite?: number;
  smoke_reason?: string;
  verdict: "ingested" | "skipped" | "below_threshold" | "too_short" | "duplicate";
  engagement_likes?: number;
  engagement_retweets?: number;
  engagement_views?: number;
  engagement_stars?: number;
}

export function saveEvaluatedItem(item: EvaluatedItem): void {
  const db = getDb();
  db.query(`
    INSERT OR REPLACE INTO evaluated_items
    (id, type, url, content_preview, word_count, has_links, author,
     smoke_topic_relevance, smoke_practitioner_value, smoke_novelty, smoke_signal_quality,
     smoke_composite, smoke_reason, verdict,
     engagement_likes, engagement_retweets, engagement_views, engagement_stars)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.id, item.type, item.url,
    item.content_preview ?? null,
    item.word_count ?? null,
    item.has_links ? 1 : 0,
    item.author ?? null,
    item.smoke_topic_relevance ?? null,
    item.smoke_practitioner_value ?? null,
    item.smoke_novelty ?? null,
    item.smoke_signal_quality ?? null,
    item.smoke_composite ?? null,
    item.smoke_reason ?? null,
    item.verdict,
    item.engagement_likes ?? null,
    item.engagement_retweets ?? null,
    item.engagement_views ?? null,
    item.engagement_stars ?? null,
  );
}

export function isEvaluated(id: string): boolean {
  const db = getDb();
  return !!db
    .query("SELECT 1 FROM evaluated_items WHERE id = ?")
    .get(id);
}

// ─── Curate Runs ──────────────────────────────────────────────────────

export function startRun(type: string, query?: string): number {
  const db = getDb();
  const result = db
    .query("INSERT INTO curate_runs (type, query) VALUES (?, ?) RETURNING id")
    .get(type, query ?? null) as { id: number };
  return result.id;
}

export function completeRun(
  runId: number,
  stats: { items_fetched: number; items_evaluated: number; items_ingested: number },
): void {
  const db = getDb();
  db.query(`
    UPDATE curate_runs
    SET items_fetched = ?, items_evaluated = ?, items_ingested = ?,
        completed_at = datetime('now')
    WHERE id = ?
  `).run(stats.items_fetched, stats.items_evaluated, stats.items_ingested, runId);
}

// ─── Migration from JSON ──────────────────────────────────────────────

function migrateFromJson(db: Database): void {
  // Check if we've already migrated (seen_urls has data)
  const count = (db.query("SELECT COUNT(*) as count FROM seen_urls").get() as { count: number }).count;
  if (count > 0) return;

  if (!existsSync(OLD_SEEN_PATH)) return;

  try {
    const data = JSON.parse(readFileSync(OLD_SEEN_PATH, "utf-8")) as string[];
    if (!Array.isArray(data) || data.length === 0) return;

    console.log(`[db] migrating ${data.length} URLs from ${OLD_SEEN_PATH}...`);

    const insert = db.prepare(
      "INSERT OR IGNORE INTO seen_urls (normalized_url, original_url, source) VALUES (?, ?, ?)",
    );
    const tx = db.transaction(() => {
      for (const url of data) {
        insert.run(url, url, "migrated");
      }
    });
    tx();

    console.log(`[db] migration complete`);
  } catch (err) {
    console.warn(`[db] migration failed: ${err}`);
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
