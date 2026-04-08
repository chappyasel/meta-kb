/**
 * Bird CLI wrapper for fetching Twitter/X data.
 *
 * Adapted from social-engine's bird-cli.ts pattern.
 * Handles JSON parsing, auth propagation, and error detection.
 */

import { Database } from "bun:sqlite";
import { pbkdf2Sync, createDecipheriv } from "node:crypto";
import { copyFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

// ─── Types ────────────────────────────────────────────────────────────

export interface BirdTweet {
  id: string;
  text: string;
  createdAt: string;
  replyCount: number;
  retweetCount: number;
  likeCount: number;
  conversationId: string;
  author: { username: string; name: string };
  authorId: string;
  // Entities (for URL extraction)
  entities?: {
    urls?: Array<{ expanded_url?: string; url?: string }>;
  };
  // X Article (bird returns this natively for article tweets)
  article?: {
    title: string;
    previewText: string;
  };
  // Quoted tweet (bird field name)
  quotedTweet?: BirdTweet;
  // Legacy quote field (some bird versions)
  quote?: BirdTweet;
  // Media
  media?: Array<{ type: string; url: string }>;
  // Reply chain
  inReplyToId?: string;
}

export interface BirdResponse {
  tweets: BirdTweet[];
  nextCursor?: string;
}

interface BirdResult {
  ok: boolean;
  data: any;
  raw: string;
  error: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────

const CHROME_COOKIES_PATH = join(
  homedir(),
  "Library/Application Support/Google/Chrome/Default/Cookies",
);

let authReady = false;

export async function ensureAuth(): Promise<boolean> {
  if (authReady) return true;
  if (process.env.AUTH_TOKEN && process.env.CT0) {
    authReady = true;
    return true;
  }

  try {
    const proc = Bun.spawnSync(
      ["security", "find-generic-password", "-s", "Chrome Safe Storage", "-w"],
      { stdout: "pipe", stderr: "pipe" },
    );
    const password = new TextDecoder().decode(proc.stdout).trim();
    if (!password) {
      console.error("[bird] Keychain returned empty password");
      return false;
    }

    const key = pbkdf2Sync(password, "saltysalt", 1003, 16, "sha1");

    if (!existsSync(CHROME_COOKIES_PATH)) {
      console.error("[bird] Chrome Cookies DB not found");
      return false;
    }

    const tmpDir = mkdtempSync(join(tmpdir(), "bird-cookies-"));
    const tmpDb = join(tmpDir, "Cookies");
    try {
      copyFileSync(CHROME_COOKIES_PATH, tmpDb);
      for (const ext of ["-wal", "-shm"]) {
        if (existsSync(CHROME_COOKIES_PATH + ext)) {
          copyFileSync(CHROME_COOKIES_PATH + ext, tmpDb + ext);
        }
      }

      const db = new Database(tmpDb, { readonly: true });
      const rows = db
        .query(
          `SELECT name, encrypted_value FROM cookies
           WHERE name IN ('auth_token', 'ct0')
           AND (host_key LIKE '%x.com' OR host_key LIKE '%twitter.com')`,
        )
        .all() as Array<{ name: string; encrypted_value: Buffer }>;
      db.close();

      const tokens: Record<string, string> = {};
      for (const row of rows) {
        const enc = Buffer.from(row.encrypted_value);
        if (enc.slice(0, 3).toString() !== "v10") continue;
        const ciphertext = enc.slice(3);
        const iv = Buffer.alloc(16, 0x20);

        try {
          const decipher = createDecipheriv("aes-128-cbc", key, iv);
          const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
          const match = decrypted.toString("utf-8").match(/[0-9a-f]{40,}/);
          if (match) tokens[row.name] = match[0];
        } catch {
          const d2 = createDecipheriv("aes-128-cbc", key, iv);
          d2.setAutoPadding(false);
          let decrypted = Buffer.concat([d2.update(ciphertext), d2.final()]);
          const padLen = decrypted[decrypted.length - 1];
          if (padLen && padLen > 0 && padLen <= 16) {
            decrypted = decrypted.slice(0, decrypted.length - padLen);
          }
          const match = decrypted.toString("utf-8").match(/[0-9a-f]{40,}/);
          if (match) tokens[row.name] = match[0];
        }
      }

      if (!tokens.auth_token || !tokens.ct0) {
        console.error("[bird] Could not extract auth cookies from Chrome");
        return false;
      }

      process.env.AUTH_TOKEN = tokens.auth_token;
      process.env.CT0 = tokens.ct0;
      Bun.env.AUTH_TOKEN = tokens.auth_token;
      Bun.env.CT0 = tokens.ct0;
      authReady = true;
      return true;
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`[bird] Auth failed: ${err}`);
    return false;
  }
}

// ─── Bird CLI calls ───────────────────────────────────────────────────

async function bird(args: string[]): Promise<BirdResult> {
  const proc = Bun.spawn(["bird", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...Bun.env },
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const isAuthError =
      stderr.includes("Missing required credentials") ||
      stderr.includes("Missing auth_token");
    if (isAuthError) {
      console.error("[bird] AUTH FAILED — run ensureAuth() first");
    } else {
      console.error(`[bird] '${args.join(" ")}' failed (exit ${exitCode}): ${stderr.slice(0, 300)}`);
    }
    return { ok: false, data: null, raw: stdout, error: stderr };
  }

  if (!stdout.trim()) return { ok: true, data: null, raw: "", error: "" };

  try {
    return { ok: true, data: JSON.parse(stdout), raw: stdout, error: "" };
  } catch {
    return { ok: true, data: null, raw: stdout, error: "" };
  }
}

/** Parse bird response — may be an array or { tweets: [...] } */
function parseTweets(data: any): BirdTweet[] {
  if (Array.isArray(data)) return data;
  if (data?.tweets && Array.isArray(data.tweets)) return data.tweets;
  return [];
}

/**
 * Fetch the home "For You" feed.
 */
export async function fetchHomeFeed(count = 50): Promise<BirdTweet[]> {
  const result = await bird(["home", "--json", "-n", String(count)]);
  if (!result.ok || !result.data) return [];
  return parseTweets(result.data);
}

/**
 * Search tweets by query.
 */
export async function searchTweets(query: string, count = 20): Promise<BirdTweet[]> {
  const result = await bird(["search", query, "--json", "-n", String(count)]);
  if (!result.ok || !result.data) return [];
  return parseTweets(result.data);
}

/**
 * Extract expanded (non-social) URLs from a bird tweet's entities.
 */
const SOCIAL_DOMAINS = new Set([
  "twitter.com", "x.com", "pic.twitter.com", "t.co",
  "linkedin.com", "lnkd.in", "youtube.com", "youtu.be",
  "instagram.com", "facebook.com", "tiktok.com",
]);

export function extractTweetUrls(tweet: BirdTweet): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const entityUrls = tweet.entities?.urls;
  if (Array.isArray(entityUrls)) {
    for (const u of entityUrls) {
      const expanded = u.expanded_url ?? u.url;
      if (!expanded || seen.has(expanded)) continue;
      try {
        const host = new URL(expanded).hostname.replace("www.", "");
        if (SOCIAL_DOMAINS.has(host)) continue;
      } catch { continue; }
      seen.add(expanded);
      urls.push(expanded);
    }
  }

  // Also check quoted tweet
  if (tweet.quote?.entities?.urls) {
    for (const u of tweet.quote.entities.urls) {
      const expanded = u.expanded_url ?? u.url;
      if (!expanded || seen.has(expanded)) continue;
      try {
        const host = new URL(expanded).hostname.replace("www.", "");
        if (SOCIAL_DOMAINS.has(host)) continue;
      } catch { continue; }
      seen.add(expanded);
      urls.push(expanded);
    }
  }

  return urls;
}

/**
 * Count words in text (excluding URLs).
 */
export function wordCount(text: string): number {
  return text.replace(/https?:\/\/\S+/g, "").split(/\s+/).filter(Boolean).length;
}
