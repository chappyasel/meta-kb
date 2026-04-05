/**
 * og-wiki-screenshots.ts — Screenshot the knowledge graph and field map for README
 *
 * Usage: bun run scripts/og-wiki-screenshots.ts
 * Output: wiki/images/graph-preview.png, wiki/images/field-map-preview.png
 */

import puppeteer from "puppeteer";
import path from "path";

const WIKI_DIR = path.join(import.meta.dirname, "..", "wiki");
const IMAGES_DIR = path.join(WIKI_DIR, "images");

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // Knowledge graph (interactive HTML)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
    const graphPath = path.join(WIKI_DIR, "graph.html");
    await page.goto(`file://${graphPath}`, { waitUntil: "networkidle2", timeout: 30_000 });
    // Let the D3 force simulation settle
    await new Promise((r) => setTimeout(r, 5000));
    const outPath = path.join(IMAGES_DIR, "graph-preview.png");
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`✓ graph → ${outPath}`);
    await page.close();
  }

  // Field map (SVG rendered in browser for proper fonts)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
    const svgPath = path.join(IMAGES_DIR, "field-map.svg");
    await page.goto(`file://${svgPath}`, { waitUntil: "networkidle2", timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 1000));

    const dims = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const bbox = svg.getBoundingClientRect();
      return { width: bbox.width, height: bbox.height };
    });

    const outPath = path.join(IMAGES_DIR, "field-map-preview.png");
    if (dims) {
      await page.screenshot({
        path: outPath,
        clip: { x: 0, y: 0, width: dims.width, height: dims.height },
      });
    } else {
      await page.screenshot({ path: outPath, fullPage: true });
    }
    console.log(`✓ field-map → ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log("\nDone.");
}

main();
