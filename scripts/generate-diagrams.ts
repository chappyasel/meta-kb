#!/usr/bin/env bun
/**
 * Generate visual diagrams from build/graph.json:
 *   1. D2 architecture diagram → wiki/images/pipeline.svg
 *   2. D3 interactive knowledge graph → wiki/graph.html
 *
 * Usage: bun run scripts/generate-diagrams.ts [--build-dir=build-v2] [--wiki-dir=wiki-final]
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { KnowledgeGraph } from "./types.js";
import { domain, BUCKET_NAMES } from "../config/domain.js";

const ROOT = join(import.meta.dir, "..");
const BUILD_DIR = join(
  ROOT,
  process.argv.find((a) => a.startsWith("--build-dir="))?.split("=")[1] ?? "build",
);
const WIKI_DIR = join(
  ROOT,
  process.argv.find((a) => a.startsWith("--wiki-dir="))?.split("=")[1] ?? "wiki",
);

// D2 diagram colors (fill/stroke pairs for each bucket)
const D2_PALETTE: Record<string, { fill: string; stroke: string }> = {
  "#e74c3c": { fill: "#fef3c7", stroke: "#f59e0b" },
  "#3498db": { fill: "#dbeafe", stroke: "#3b82f6" },
  "#2ecc71": { fill: "#d1fae5", stroke: "#10b981" },
  "#f39c12": { fill: "#fee2e2", stroke: "#ef4444" },
  "#9b59b6": { fill: "#ede9fe", stroke: "#8b5cf6" },
};

const BUCKET_COLORS: Record<string, { fill: string; stroke: string; label: string }> = Object.fromEntries(
  domain.buckets.map((b) => {
    const palette = D2_PALETTE[b.color] ?? { fill: "#f3f4f6", stroke: "#6b7280" };
    return [b.id, { ...palette, label: b.name }];
  }),
);

// ─── D2 Architecture Diagram ───────────────────────────────────────────

function generateD2(graph: KnowledgeGraph): string {
  const lines: string[] = [];
  lines.push("direction: right");
  lines.push("");

  // Strict: top 3 projects per bucket only (15 nodes total)
  const edgeCounts = new Map<string, number>();
  for (const edge of graph.edges) {
    edgeCounts.set(edge.source, (edgeCounts.get(edge.source) ?? 0) + 1);
    edgeCounts.set(edge.target, (edgeCounts.get(edge.target) ?? 0) + 1);
  }

  const bucketNodes: Record<string, typeof graph.nodes> = {};
  for (const node of graph.nodes) {
    (bucketNodes[node.bucket] ??= []).push(node);
  }

  const selectedIds = new Set<string>();

  for (const [bucket, config] of Object.entries(BUCKET_COLORS)) {
    const projects = (bucketNodes[bucket] ?? [])
      .filter((n) => n.type === "project")
      .sort((a, b) => (edgeCounts.get(b.id) ?? 0) - (edgeCounts.get(a.id) ?? 0))
      .slice(0, 3);

    if (projects.length === 0) continue;

    lines.push(`${bucket}: ${config.label} {`);
    lines.push(`  style.fill: "${config.fill}"`);
    lines.push(`  style.stroke: "${config.stroke}"`);
    lines.push(`  style.border-radius: 10`);
    lines.push("");
    for (const node of projects) {
      selectedIds.add(node.id);
      lines.push(`  ${node.id}: ${node.name} {`);
      lines.push(`    style.fill: "#ffffff"`);
      lines.push(`    style.stroke: "${config.stroke}"`);
      lines.push(`    style.border-radius: 6`);
      lines.push(`    style.font-size: 13`);
      lines.push("  }");
    }
    lines.push("}");
    lines.push("");
  }

  // Only cross-bucket edges between selected nodes, skip competes_with/created_by noise
  const edgeLabels: Record<string, string> = {
    implements: "implements",
    alternative_to: "alt to",
    part_of: "part of",
    extends: "extends",
    supersedes: "replaces",
  };

  for (const edge of graph.edges) {
    if (!selectedIds.has(edge.source) || !selectedIds.has(edge.target)) continue;
    if (edge.type === "competes_with" || edge.type === "created_by") continue;
    if (edge.weight < 0.4) continue;
    const srcNode = graph.nodes.find((n) => n.id === edge.source);
    const tgtNode = graph.nodes.find((n) => n.id === edge.target);
    if (!srcNode || !tgtNode) continue;
    if (srcNode.bucket === tgtNode.bucket) continue; // only cross-bucket

    const label = edgeLabels[edge.type] ?? edge.type;
    lines.push(`${srcNode.bucket}.${edge.source} -> ${tgtNode.bucket}.${edge.target}: ${label} {`);
    lines.push(`  style.stroke: "#64748b"`);
    lines.push("}");
  }

  return lines.join("\n");
}

// ─── D3 Interactive Knowledge Graph ────────────────────────────────────

function generateD3Html(graph: KnowledgeGraph): string {
  const bucketColors: Record<string, string> = Object.fromEntries(
    domain.buckets.map((b) => [b.id, BUCKET_COLORS[b.id]?.stroke ?? "#6b7280"]),
  );

  const bucketLabels: Record<string, string> = BUCKET_NAMES;

  // --- Data augmentation ---

  // Compute degree for each node
  const degreeMap = new Map<string, number>();
  for (const edge of graph.edges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
  }

  // Filter orphans
  const connectedNodes = graph.nodes.filter((n) => (degreeMap.get(n.id) ?? 0) > 0);
  const entityEdges = [...graph.edges]; // original edges only

  // Classify tiers and compute radius
  const maxDegree = Math.max(...[...degreeMap.values()]);
  const augmentedNodes: any[] = connectedNodes.map((n) => {
    const degree = degreeMap.get(n.id) ?? 0;
    let tier: string;
    let radius: number;
    if (degree >= 10) {
      tier = "primary";
      radius = 10 + Math.sqrt((degree - 10) / (maxDegree - 10)) * 11;
    } else if (degree >= 3) {
      tier = "secondary";
      radius = 6 + ((degree - 3) / 6) * 3;
    } else {
      tier = "leaf";
      radius = 4;
    }
    return { ...n, _tier: tier, _degree: degree, _radius: radius };
  });

  // Add 5 hub nodes
  const hubNodes = Object.keys(bucketColors).map((bucket) => ({
    id: `hub-${bucket}`,
    name: bucketLabels[bucket],
    type: "hub",
    bucket,
    _tier: "hub",
    _degree: 0,
    _radius: 40,
  }));

  // Add hub edges (invisible, structural only)
  const hubEdges = augmentedNodes.map((n) => ({
    source: n.id,
    target: `hub-${n.bucket}`,
    type: "cluster",
    weight: 0.5,
  }));

  const allNodes = [...hubNodes, ...augmentedNodes];
  const allEdges = [...entityEdges, ...hubEdges];

  const entityCount = augmentedNodes.length;
  const edgeCount = entityEdges.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${domain.name} Knowledge Graph</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
  svg { width: 100vw; height: 100vh; }
  .tooltip { position: absolute; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; color: #e2e8f0; font-size: 12px; pointer-events: none; opacity: 0; transition: opacity 0.15s; max-width: 300px; line-height: 1.5; }
  .tooltip .bucket-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
  .tooltip .name { font-weight: 600; font-size: 14px; }
  .tooltip .meta { color: #64748b; font-size: 10px; }
  .tooltip .connections { margin-top: 6px; border-top: 1px solid #334155; padding-top: 6px; font-size: 11px; color: #94a3b8; }
  .tooltip .connections div { margin-bottom: 2px; }
  .tooltip .conn-type { color: #64748b; font-size: 9px; }
  h1 { position: fixed; top: 20px; left: 20px; color: #e2e8f0; font-size: 16px; font-weight: 500; z-index: 10; }
  .stats { position: fixed; top: 44px; left: 20px; color: #64748b; font-size: 11px; z-index: 10; }
</style>
</head>
<body>
<h1>${domain.name} Knowledge Graph</h1>
<div class="stats">${entityCount} entities · 5 clusters · ${edgeCount} relationships</div>
<div class="tooltip" id="tooltip"></div>
<svg></svg>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
const graph = ${JSON.stringify({ nodes: allNodes, edges: allEdges })};
const colors = ${JSON.stringify(bucketColors)};
const bucketLabels = ${JSON.stringify(bucketLabels)};

const width = window.innerWidth;
const height = window.innerHeight;
const cx = width / 2, cy = height / 2;
const hubRadius = Math.min(width, height) * 0.28;

// Polygon positions for bucket hubs (starting from top, clockwise)
const bucketOrder = ${JSON.stringify(domain.buckets.map((b) => b.id))};
const hubPositions = {};
bucketOrder.forEach((bucket, i) => {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / bucketOrder.length;
  hubPositions[bucket] = { x: cx + Math.cos(angle) * hubRadius, y: cy + Math.sin(angle) * hubRadius };
});

// Seeded PRNG for deterministic layout
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);

// Initialize node positions
graph.nodes.forEach(d => {
  if (d._tier === "hub") {
    const hp = hubPositions[d.bucket];
    d.x = d.fx = hp.x;
    d.y = d.fy = hp.y;
  } else {
    const hp = hubPositions[d.bucket];
    const angle = rng() * Math.PI * 2;
    const dist = 30 + rng() * 120;
    d.x = hp.x + Math.cos(angle) * dist;
    d.y = hp.y + Math.sin(angle) * dist;
  }
});

// Custom cluster force
function clusterForce(strength) {
  let nodes;
  const force = (alpha) => {
    for (const d of nodes) {
      if (d._tier === "hub") continue;
      const hp = hubPositions[d.bucket];
      d.vx += (hp.x - d.x) * strength * alpha;
      d.vy += (hp.y - d.y) * strength * alpha;
    }
  };
  force.initialize = (n) => { nodes = n; };
  return force;
}

// Boundary force
function boundaryForce(w, h, padding) {
  let nodes;
  const force = () => {
    for (const d of nodes) {
      if (d._tier === "hub") continue;
      if (d.x < padding) d.vx += (padding - d.x) * 0.1;
      if (d.x > w - padding) d.vx += (w - padding - d.x) * 0.1;
      if (d.y < padding) d.vy += (padding - d.y) * 0.1;
      if (d.y > h - padding) d.vy += (h - padding - d.y) * 0.1;
    }
  };
  force.initialize = (n) => { nodes = n; };
  return force;
}

// Only real edges for link force (include hub edges for clustering)
const simulation = d3.forceSimulation(graph.nodes)
  .force("link", d3.forceLink(graph.edges).id(d => d.id)
    .distance(d => d.type === "cluster" ? 80 : 100 - d.weight * 40)
    .strength(d => d.type === "cluster" ? 0.7 : d.weight * 0.15))
  .force("cluster", clusterForce(0.25))
  .force("charge", d3.forceManyBody().strength(d => d._tier === "hub" ? -400 : d._tier === "primary" ? -150 : -60))
  .force("collision", d3.forceCollide().radius(d => d._radius + 3).strength(0.8))
  .force("bounds", boundaryForce(width, height, 10))
  .alphaDecay(0.03);

const svg = d3.select("svg").attr("viewBox", [0, 0, width, height]);

// Defs for glow filter
svg.append("defs").html(\`
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="6" result="blur"/>
    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
  </filter>
\`);

const g = svg.append("g");
const zoom = d3.zoom().scaleExtent([0.2, 8]).on("zoom", (e) => g.attr("transform", e.transform));
svg.call(zoom);
// Initial 1.1x zoom centered on the graph
const initScale = 1.1;
svg.call(zoom.transform, d3.zoomIdentity.translate(cx * (1 - initScale), cy * (1 - initScale)).scale(initScale));

// Render only entity-to-entity edges (not hub edges)
const visibleEdges = graph.edges.filter(e => e.type !== "cluster");
const link = g.append("g")
  .selectAll("line")
  .data(visibleEdges)
  .join("line")
  .attr("stroke", "#64748b")
  .attr("stroke-width", d => 0.8 + d.weight * 2)
  .attr("stroke-opacity", d => 0.35 + d.weight * 0.25);

// Separate hub nodes and entity nodes
const entityData = graph.nodes.filter(d => d._tier !== "hub");
const hubData = graph.nodes.filter(d => d._tier === "hub");

// Entity nodes (rendered BEFORE hubs so hubs appear on top)
const node = g.append("g")
  .selectAll("g")
  .data(entityData)
  .join("g")
  .attr("class", d => "node tier-" + d._tier)
  .call(d3.drag()
    .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }))
  .style("cursor", "pointer");

node.append("circle")
  .attr("r", d => d._radius)
  .attr("fill", d => colors[d.bucket] || "#64748b")
  .attr("opacity", d => d._tier === "primary" ? 1.0 : d._tier === "secondary" ? 0.7 : 0.35)
  .attr("stroke", d => d._tier === "primary" ? "rgba(255,255,255,0.3)" : "none")
  .attr("stroke-width", d => d._tier === "primary" ? 1 : 0);

// Labels: always visible for primary, hidden for others
node.append("text")
  .attr("dx", d => d._radius + 4)
  .attr("dy", 3)
  .attr("fill", "#e2e8f0")
  .attr("font-size", d => d._degree >= 20 ? "14px" : "13px")
  .attr("font-weight", d => d._degree >= 20 ? "600" : "500")
  .attr("pointer-events", "none")
  .attr("opacity", d => d._tier === "primary" ? 1 : 0)
  .text(d => d.name);

// Hub nodes — rendered AFTER entities so they appear on top
const hubNode = g.append("g")
  .selectAll("g")
  .data(hubData)
  .join("g")
  .attr("class", "hub-node")
  .style("cursor", "pointer");

// Background rect to occlude nodes behind hub labels
hubNode.append("rect")
  .attr("x", -82).attr("y", -24)
  .attr("width", 164).attr("height", 48)
  .attr("rx", 13).attr("ry", 13)
  .attr("fill", "#0f172a")
  .attr("opacity", 0.85);

hubNode.append("rect")
  .attr("x", -80).attr("y", -22)
  .attr("width", 160).attr("height", 44)
  .attr("rx", 12).attr("ry", 12)
  .attr("fill", d => colors[d.bucket])
  .attr("fill-opacity", 0.2)
  .attr("stroke", d => colors[d.bucket])
  .attr("stroke-width", 1.5)
  .attr("filter", "url(#glow)");

hubNode.append("text")
  .attr("text-anchor", "middle")
  .attr("dy", 5)
  .attr("fill", "#fff")
  .attr("font-size", "16px")
  .attr("font-weight", "700")
  .attr("pointer-events", "none")
  .text(d => d.name);

// Tooltip
const tooltip = d3.select("#tooltip");

function showTooltip(e, d) {
  // Build connection list
  const connections = [];
  visibleEdges.forEach(l => {
    const src = typeof l.source === "object" ? l.source : { id: l.source };
    const tgt = typeof l.target === "object" ? l.target : { id: l.target };
    if (src.id === d.id) connections.push({ name: tgt.name || tgt.id, type: l.type, label: l.label });
    if (tgt.id === d.id) connections.push({ name: src.name || src.id, type: l.type, label: l.label });
  });
  const topConns = connections.slice(0, 5);

  const color = colors[d.bucket] || "#94a3b8";
  let html = '<div class="bucket-label" style="color:' + color + '">' + (bucketLabels[d.bucket] || d.bucket) + '</div>';
  html += '<div class="name">' + d.name + '</div>';
  html += '<div class="meta">' + d.type + (d._degree ? ' · ' + d._degree + ' connections' : '') + '</div>';
  if (topConns.length > 0) {
    html += '<div class="connections">';
    topConns.forEach(c => {
      html += '<div>' + c.name + ' <span class="conn-type">' + (c.label || c.type) + '</span></div>';
    });
    if (connections.length > 5) html += '<div style="color:#475569">+' + (connections.length - 5) + ' more</div>';
    html += '</div>';
  }

  tooltip.style("opacity", 1).html(html)
    .style("left", (e.pageX + 15) + "px")
    .style("top", (e.pageY - 10) + "px");
}

function highlightNeighborhood(d) {
  const connected = new Set();
  visibleEdges.forEach(l => {
    const sid = typeof l.source === "object" ? l.source.id : l.source;
    const tid = typeof l.target === "object" ? l.target.id : l.target;
    if (sid === d.id) connected.add(tid);
    if (tid === d.id) connected.add(sid);
  });

  node.select("circle").attr("opacity", n => n.id === d.id || connected.has(n.id) ? 1 : 0.05);
  node.select("text").attr("opacity", n => {
    if (n.id === d.id || connected.has(n.id)) return 1;
    return 0;
  });
  link.attr("stroke-opacity", l => {
    const sid = typeof l.source === "object" ? l.source.id : l.source;
    const tid = typeof l.target === "object" ? l.target.id : l.target;
    return (sid === d.id || tid === d.id) ? 0.8 : 0.02;
  });
  hubNode.select("rect").attr("fill-opacity", h => h.bucket === d.bucket ? 0.25 : 0.05);
  hubNode.select("text").attr("opacity", h => h.bucket === d.bucket ? 1 : 0.2);
}

function highlightCluster(bucket) {
  node.select("circle").attr("opacity", n => n.bucket === bucket ? 1 : 0.05);
  node.select("text").attr("opacity", n => n.bucket === bucket && n._tier === "primary" ? 1 : n.bucket === bucket && n._tier === "secondary" ? 1 : 0);
  link.attr("stroke-opacity", l => {
    const src = typeof l.source === "object" ? l.source : { bucket: null };
    const tgt = typeof l.target === "object" ? l.target : { bucket: null };
    if (src.bucket === bucket && tgt.bucket === bucket) return 0.5;
    if (src.bucket === bucket || tgt.bucket === bucket) return 0.15;
    return 0.02;
  });
  hubNode.select("rect").attr("fill-opacity", h => h.bucket === bucket ? 0.3 : 0.05);
  hubNode.select("text").attr("opacity", h => h.bucket === bucket ? 1 : 0.2);
}

function resetHighlight() {
  tooltip.style("opacity", 0);
  node.select("circle").attr("opacity", d => d._tier === "primary" ? 1.0 : d._tier === "secondary" ? 0.7 : 0.35);
  node.select("text").attr("opacity", d => d._tier === "primary" ? 1 : 0);
  link.attr("stroke-opacity", d => 0.35 + d.weight * 0.25);
  hubNode.select("rect").attr("fill-opacity", 0.15);
  hubNode.select("text").attr("opacity", 1);
}

// Entity node events
node.on("mouseover", (e, d) => {
  showTooltip(e, d);
  highlightNeighborhood(d);
}).on("mouseout", resetHighlight);

// Hub node events
hubNode.on("mouseover", (e, d) => {
  showTooltip(e, d);
  highlightCluster(d.bucket);
}).on("mouseout", resetHighlight);

// Tick
simulation.on("tick", () => {
  link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
  node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
  hubNode.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
});
</script>
</body>
</html>`;
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("Generating diagrams...\n");

  const graphPath = join(BUILD_DIR, "graph.json");
  const graph: KnowledgeGraph = JSON.parse(await readFile(graphPath, "utf-8"));
  console.log(`  Graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  await mkdir(join(WIKI_DIR, "images"), { recursive: true });

  // 1. D2 architecture diagram (hand-authored, not generated — just compile to SVG)
  const d2Path = join(WIKI_DIR, "images", "pipeline.d2");
  const svgPath = join(WIKI_DIR, "images", "pipeline.svg");

  const proc = Bun.spawn(["d2", "--layout=elk", "--pad=40", d2Path, svgPath], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  if (proc.exitCode === 0) {
    console.log(`  ✓ D2 architecture diagram: ${svgPath}`);
  } else {
    const stderr = await new Response(proc.stderr).text();
    console.error(`  ✗ D2 failed: ${stderr.slice(0, 200)}`);
  }

  // 2. D3 interactive knowledge graph
  const htmlContent = generateD3Html(graph);
  const htmlPath = join(WIKI_DIR, "graph.html");
  await writeFile(htmlPath, htmlContent);
  console.log(`  ✓ D3 knowledge graph: ${htmlPath}`);

  console.log("\nDone.");
}

main().catch(console.error);
