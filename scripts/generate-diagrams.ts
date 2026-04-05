#!/usr/bin/env bun
/**
 * Generate visual diagrams from build/graph.json:
 *   1. D2 architecture diagram → wiki/images/field-map.svg
 *   2. D3 interactive knowledge graph → wiki/graph.html
 *
 * Usage: bun run scripts/generate-diagrams.ts [--build-dir=build-v2] [--wiki-dir=wiki-final]
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { KnowledgeGraph } from "./types.js";

const ROOT = join(import.meta.dir, "..");
const BUILD_DIR = join(
  ROOT,
  process.argv.find((a) => a.startsWith("--build-dir="))?.split("=")[1] ?? "build",
);
const WIKI_DIR = join(
  ROOT,
  process.argv.find((a) => a.startsWith("--wiki-dir="))?.split("=")[1] ?? "wiki",
);

const BUCKET_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  "knowledge-bases": { fill: "#fef3c7", stroke: "#f59e0b", label: "Knowledge Bases" },
  "agent-memory": { fill: "#dbeafe", stroke: "#3b82f6", label: "Agent Memory" },
  "context-engineering": { fill: "#d1fae5", stroke: "#10b981", label: "Context Engineering" },
  "agent-systems": { fill: "#fee2e2", stroke: "#ef4444", label: "Agent Systems" },
  "self-improving": { fill: "#ede9fe", stroke: "#8b5cf6", label: "Self-Improving" },
};

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
  const bucketColors: Record<string, string> = {
    "knowledge-bases": "#f59e0b",
    "agent-memory": "#3b82f6",
    "context-engineering": "#10b981",
    "agent-systems": "#ef4444",
    "self-improving": "#8b5cf6",
  };

  // Filter to only nodes that have at least 1 edge (no orphans)
  const connectedIds = new Set<string>();
  for (const edge of graph.edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }
  const filteredNodes = graph.nodes.filter((n) => connectedIds.has(n.id));
  const filteredEdges = graph.edges; // all edges are valid since nodes are filtered from edges

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>meta-kb Knowledge Graph</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
  svg { width: 100vw; height: 100vh; }
  .link { stroke-opacity: 0.3; }
  .link:hover { stroke-opacity: 0.8; }
  .node circle { stroke: #1e293b; stroke-width: 1.5; cursor: pointer; }
  .node circle:hover { stroke: #fff; stroke-width: 2.5; }
  .node text { fill: #94a3b8; font-size: 10px; pointer-events: none; }
  .node.project text { fill: #e2e8f0; font-size: 11px; font-weight: 500; }
  .tooltip { position: absolute; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 14px; color: #e2e8f0; font-size: 12px; pointer-events: none; opacity: 0; transition: opacity 0.15s; max-width: 250px; }
  .tooltip .bucket { color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .tooltip .type { color: #64748b; font-size: 10px; }
  .legend { position: fixed; bottom: 20px; left: 20px; display: flex; gap: 16px; }
  .legend-item { display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 11px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
  h1 { position: fixed; top: 20px; left: 20px; color: #e2e8f0; font-size: 16px; font-weight: 500; }
  .stats { position: fixed; top: 44px; left: 20px; color: #64748b; font-size: 11px; }
</style>
</head>
<body>
<h1>meta-kb Knowledge Graph</h1>
<div class="stats">${filteredNodes.length} entities · ${filteredEdges.length} relationships</div>
<div class="tooltip" id="tooltip"></div>
<div class="legend">
  ${Object.entries(bucketColors)
    .map(([bucket, color]) => {
      const label = bucket
        .split("-")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
      return `<div class="legend-item"><div class="legend-dot" style="background:${color}"></div>${label}</div>`;
    })
    .join("\n  ")}
</div>
<svg></svg>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
const graph = ${JSON.stringify({ nodes: filteredNodes, edges: filteredEdges })};
const colors = ${JSON.stringify(bucketColors)};

const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("svg")
  .attr("viewBox", [0, 0, width, height]);

// Zoom
const g = svg.append("g");
svg.call(d3.zoom().scaleExtent([0.2, 5]).on("zoom", (e) => g.attr("transform", e.transform)));

// Force simulation
const simulation = d3.forceSimulation(graph.nodes)
  .force("link", d3.forceLink(graph.edges).id(d => d.id).distance(d => 120 - d.weight * 60).strength(d => d.weight * 0.3))
  .force("charge", d3.forceManyBody().strength(-200))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collision", d3.forceCollide().radius(d => d.type === "project" ? 30 : 20))
  .force("x", d3.forceX(width / 2).strength(0.03))
  .force("y", d3.forceY(height / 2).strength(0.03));

// Links
const link = g.append("g")
  .selectAll("line")
  .data(graph.edges)
  .join("line")
  .attr("class", "link")
  .attr("stroke", "#475569")
  .attr("stroke-width", d => 0.5 + d.weight * 2);

// Nodes
const node = g.append("g")
  .selectAll("g")
  .data(graph.nodes)
  .join("g")
  .attr("class", d => "node " + d.type)
  .call(d3.drag()
    .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
    .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

node.append("circle")
  .attr("r", d => d.type === "project" ? 8 : d.type === "concept" ? 5 : 4)
  .attr("fill", d => colors[d.bucket] || "#64748b")
  .attr("opacity", d => d.type === "project" ? 0.9 : 0.5);

node.append("text")
  .attr("dx", d => (d.type === "project" ? 12 : 8))
  .attr("dy", 3)
  .text(d => d.name);

// Tooltip
const tooltip = d3.select("#tooltip");
node.on("mouseover", (e, d) => {
  tooltip.style("opacity", 1)
    .html('<div class="bucket">' + d.bucket + '</div><strong>' + d.name + '</strong><div class="type">' + d.type + '</div>')
    .style("left", (e.pageX + 15) + "px")
    .style("top", (e.pageY - 10) + "px");
  // Highlight connections
  const connected = new Set();
  graph.edges.forEach(l => { if (l.source.id === d.id) connected.add(l.target.id); if (l.target.id === d.id) connected.add(l.source.id); });
  node.select("circle").attr("opacity", n => n.id === d.id || connected.has(n.id) ? 1 : 0.1);
  node.select("text").attr("opacity", n => n.id === d.id || connected.has(n.id) ? 1 : 0.1);
  link.attr("stroke-opacity", l => l.source.id === d.id || l.target.id === d.id ? 0.8 : 0.05);
}).on("mouseout", () => {
  tooltip.style("opacity", 0);
  node.select("circle").attr("opacity", d => d.type === "project" ? 0.9 : 0.5);
  node.select("text").attr("opacity", 1);
  link.attr("stroke-opacity", 0.3);
});

simulation.on("tick", () => {
  link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
  node.attr("transform", d => "translate(" + d.x + "," + d.y + ")");
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

  // 1. D2 architecture diagram
  const d2Content = generateD2(graph);
  const d2Path = join(WIKI_DIR, "images", "field-map.d2");
  const svgPath = join(WIKI_DIR, "images", "field-map.svg");
  await writeFile(d2Path, d2Content);

  const proc = Bun.spawn(["d2", "--layout=elk", d2Path, svgPath], {
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
