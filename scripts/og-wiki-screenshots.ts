/**
 * og-wiki-screenshots.ts — Screenshot the knowledge graph and field map for README
 *
 * Usage: bun run scripts/og-wiki-screenshots.ts
 * Output: wiki/images/graph-preview.png, wiki/images/pipeline-preview.png
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
    await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 2 });
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
    await page.setViewport({ width: 4000, height: 4000, deviceScaleFactor: 2 });
    const svgPath = path.join(IMAGES_DIR, "pipeline.svg");
    await page.goto(`file://${svgPath}`, { waitUntil: "networkidle2", timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Clip using full SVG bounds for top/left/right (includes container backgrounds),
    // but crop the bottom to actual content (grid-rows over-allocates height in shorter rows).
    const clip = await page.evaluate(() => {
      const svg = document.querySelector("svg svg") || document.querySelector("svg");
      if (!svg) return null;
      const svgBox = svg.getBoundingClientRect();

      // Find bottom of actual content (excluding full-width container background rects)
      const allRects = Array.from(svg.querySelectorAll("rect"));
      const maxW = Math.max(...allRects.map((r) => parseFloat(r.getAttribute("width") || "0")));
      const contentEls = allRects.filter((r) => {
        const x = parseFloat(r.getAttribute("x") || "0");
        const w = parseFloat(r.getAttribute("width") || "0");
        return !(x === 0 && w >= maxW - 1);
      });
      const texts = Array.from(svg.querySelectorAll("text"));
      const paths = Array.from(svg.querySelectorAll("path"));
      let maxBottom = 0;
      for (const el of [...contentEls, ...texts, ...paths]) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        maxBottom = Math.max(maxBottom, r.bottom);
      }

      const pad = 30;
      return {
        x: svgBox.left,
        y: svgBox.top,
        width: svgBox.width,
        height: maxBottom - svgBox.top + pad,
      };
    });

    const outPath = path.join(IMAGES_DIR, "pipeline-preview.png");
    if (clip) {
      await page.screenshot({ path: outPath, clip });
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
