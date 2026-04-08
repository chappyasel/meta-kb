/**
 * og-grid.ts — Compose a 15x7 grid of screenshots into an OG image.
 *
 * Usage: bun run scripts/og-grid.ts
 * Output: og/og-image.png (2400x1260)
 */

import sharp from "sharp";
import { readdirSync } from "fs";
import path from "path";
import { domain } from "../config/domain.ts";

const SS_DIR = path.join(import.meta.dirname, "..", "og", "screenshots");
const OUT_PATH = path.join(import.meta.dirname, "..", "og", "og-image.png");

const COLS = 15;
const ROWS = 7;
const CELLS = COLS * ROWS; // 105
const WIDTH = 2400;
const HEIGHT = 1260;
const CELL_W = WIDTH / COLS;   // 160
const CELL_H = HEIGHT / ROWS;  // 180

/** Shuffle array in place (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  const files = readdirSync(SS_DIR).filter((f) => f.endsWith(".png"));
  console.log(`Found ${files.length} screenshots, picking ${CELLS}`);

  const selected = shuffle([...files]).slice(0, CELLS);

  // Process each screenshot: resize to fill cell (cover), crop to cell size
  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < selected.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const filePath = path.join(SS_DIR, selected[i]);

    const isRepo = selected[i].startsWith("repo-");
    const cellBuf = await sharp(filePath)
      .resize(CELL_W, CELL_H, { fit: "cover", position: isRepo ? "left top" : "top" })
      .toBuffer();

    composites.push({
      input: cellBuf,
      left: col * CELL_W,
      top: row * CELL_H,
    });
  }

  // Radial vignette overlay (dark edges, transparent center)
  const vignetteSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="v" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="black" stop-opacity="0"/>
        <stop offset="70%" stop-color="black" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.7"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#v)"/>
  </svg>`;

  // Text overlay with heavy shadow
  const textSvg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="black" flood-opacity="1"/>
        <feDropShadow dx="0" dy="0" stdDeviation="20" flood-color="black" flood-opacity="1"/>
        <feDropShadow dx="0" dy="0" stdDeviation="50" flood-color="black" flood-opacity="1"/>
        <feDropShadow dx="0" dy="0" stdDeviation="100" flood-color="black" flood-opacity="1"/>
      </filter>
    </defs>
    <rect x="100" y="340" width="2200" height="580" rx="30"
      fill="black" fill-opacity="0.7"/>
    <text x="50%" y="40%" text-anchor="middle" dominant-baseline="middle"
      font-family="Geist Mono" font-size="360" font-weight="bold"
      fill="white" filter="url(#shadow)">
      ${domain.name}
    </text>
    <text x="50%" y="60%" text-anchor="middle" dominant-baseline="middle"
      font-family="Geist Mono" font-size="86" font-weight="bold"
      fill="white" filter="url(#shadow)">
      A self-improving knowledge base
    </text>
    <text x="50%" y="68%" text-anchor="middle" dominant-baseline="middle"
      font-family="Geist Mono" font-size="86" font-weight="bold"
      fill="white" filter="url(#shadow)">
      about LLM agent infrastructure
    </text>
  </svg>`;

  composites.push({
    input: Buffer.from(vignetteSvg),
    left: 0,
    top: 0,
  });

  composites.push({
    input: Buffer.from(textSvg),
    left: 0,
    top: 0,
  });

  // Create the grid
  await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(OUT_PATH);

  console.log(`Done → ${OUT_PATH} (${WIDTH}x${HEIGHT})`);
}

main();
