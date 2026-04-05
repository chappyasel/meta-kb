/**
 * og-screenshot-all.ts — Screenshot every raw source for OG grid selection.
 *
 * Usage: bun run scripts/og-screenshot-all.ts
 * Output: og/screenshots/{type}-{slug}.png
 *
 * Skips files that already have a screenshot (re-run safe).
 * Pass --force to re-screenshot everything.
 * Pass --only tweets|repos|articles|papers to limit to one type.
 * Concurrency: 5 pages at a time.
 */

import puppeteer, { type Browser } from "puppeteer";
import { readFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from "fs";
import matter from "gray-matter";
import path from "path";

const OG_DIR = path.join(import.meta.dirname, "..", "og", "screenshots");
const RAW_DIR = path.join(import.meta.dirname, "..", "raw");
const CONCURRENCY = 5;

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const onlyType = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

interface Source {
  type: string;
  slug: string;
  url: string;
  author: string;
  filePath: string;
}

/** Extract tweet ID from an X/Twitter URL */
function tweetId(url: string): string | null {
  const m = url.match(/status\/(\d+)/);
  return m ? m[1] : null;
}

/** Extract @username from an X/Twitter URL */
function tweetUser(url: string): string | null {
  const m = url.match(/x\.com\/([^/]+)\/status/);
  return m ? m[1] : null;
}

/** Collect all raw sources */
function collectSources(): Source[] {
  const sources: Source[] = [];
  const types = onlyType ? [onlyType] : ["tweets", "repos", "articles", "papers"];

  for (const dir of types) {
    const dirPath = path.join(RAW_DIR, dir);
    if (!existsSync(dirPath)) continue;

    for (const file of readdirSync(dirPath)) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(dirPath, file);
      const { data } = matter(readFileSync(filePath, "utf-8"));
      if (!data.url) continue;

      const type = data.type || dir.replace(/s$/, "");
      const slug = file.replace(/\.md$/, "");
      const author = (data.author as string) || "";
      sources.push({ type, slug, url: data.url, author, filePath });
    }
  }

  return sources;
}

/** Screenshot a single source */
async function screenshotSource(browser: Browser, source: Source): Promise<void> {
  const outPath = path.join(OG_DIR, `${source.type}-${source.slug}.png`);

  if (!force && existsSync(outPath)) {
    console.log(`  skip ${source.type}/${source.slug} (exists)`);
    return;
  }

  const isTweet = source.type === "tweet";
  const isRepo = source.type === "repo";

  const page = await browser.newPage();

  try {
    if (isTweet) {
      const id = tweetId(source.url);
      if (!id) {
        console.log(`  ✗ ${source.type}/${source.slug} — can't extract tweet ID`);
        return;
      }

      // First try the embed renderer
      await page.setViewport({ width: 550, height: 900, deviceScaleFactor: 2 });
      const embedUrl = `https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=light`;
      await page.goto(embedUrl, { waitUntil: "networkidle2", timeout: 30_000 });
      await page.waitForSelector("article", { timeout: 10_000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));

      // Check if this is an article-link tweet (embed just shows x.com/i/article/... link)
      const isArticleTweet = await page.evaluate(() => {
        const text = document.body?.innerText || "";
        return text.includes("x.com/i/article/");
      });

      if (isArticleTweet) {
        // Fall back to the full tweet page which renders articles properly
        console.log(`  ↻ ${source.slug} is an X article, using tweet page`);
        await page.setViewport({ width: 800, height: 900, deviceScaleFactor: 2 });
        await page.goto(source.url, { waitUntil: "networkidle2", timeout: 30_000 });
        await new Promise((r) => setTimeout(r, 3000));
        await page.screenshot({ path: outPath, fullPage: false });
      } else {
        // Normal tweet — element screenshot
        const article = await page.$("article");
        if (article) {
          await article.screenshot({ path: outPath });
        } else {
          await page.screenshot({ path: outPath, fullPage: false });
        }
      }
    } else if (isRepo) {
      // Repos: load page then scroll to README
      await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
      await page.goto(source.url, { waitUntil: "networkidle2", timeout: 30_000 });
      await new Promise((r) => setTimeout(r, 2000));

      // Scroll to the README article element
      await page.evaluate(() => {
        const readme = document.querySelector("article.markdown-body");
        if (readme) {
          readme.scrollIntoView({ block: "start" });
          window.scrollBy(0, -40);
        }
      });
      await new Promise((r) => setTimeout(r, 1000));

      await page.screenshot({ path: outPath, fullPage: false });
    } else {
      // Articles and papers: standard full viewport screenshot
      await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
      await page.goto(source.url, { waitUntil: "networkidle2", timeout: 30_000 });
      await new Promise((r) => setTimeout(r, 2000));
      await page.screenshot({ path: outPath, fullPage: false });
    }

    console.log(`  ✓ ${source.type}/${source.slug}`);
  } catch (err: any) {
    console.log(`  ✗ ${source.type}/${source.slug} — ${err.message.slice(0, 80)}`);
  } finally {
    await page.close();
  }
}

/** Process sources with bounded concurrency */
async function processAll(browser: Browser, sources: Source[]) {
  let i = 0;
  async function next(): Promise<void> {
    while (i < sources.length) {
      const source = sources[i++];
      await screenshotSource(browser, source);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => next());
  await Promise.all(workers);
}

async function main() {
  mkdirSync(OG_DIR, { recursive: true });

  const sources = collectSources();
  console.log(`Found ${sources.length} sources`);
  console.log(
    `  tweets: ${sources.filter((s) => s.type === "tweet").length}, ` +
      `repos: ${sources.filter((s) => s.type === "repo").length}, ` +
      `articles: ${sources.filter((s) => s.type === "article").length}, ` +
      `papers: ${sources.filter((s) => s.type === "paper").length}`
  );
  if (force) console.log("  --force: re-screenshotting all");
  if (onlyType) console.log(`  --only: ${onlyType}`);

  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 60_000,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  await processAll(browser, sources);
  await browser.close();

  const screenshots = readdirSync(OG_DIR).filter((f) => f.endsWith(".png"));
  console.log(`\nDone. ${screenshots.length} screenshots in og/screenshots/`);
}

main();
