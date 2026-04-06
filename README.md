# meta-kb

![meta-kb](og-image.png)

A self-improving LLM knowledge base about self-improving LLM knowledge systems.

Inspired by [Andrej Karpathy's tweet](https://x.com/karpathy/status/2039805659525644595) about using LLMs to compile and maintain markdown wikis from raw sources. This repo applies that pattern to the topic of LLM knowledge systems itself, then adds a self-improvement loop. The repo IS the demo.

Raw sources (tweets, repos, papers, articles) go into `raw/`. The deep research pipeline clones repos, reads source code, fetches documentation, and writes structured analysis to `raw/deep/`. The compiler extracts entities, builds a knowledge graph, generates synthesis articles and reference cards, then extracts atomic claims and verifies them against sources. Each compilation run feeds accuracy metrics back into the next.

**What makes this different:**
- **Self-improving** — the compiler extracts atomic claims, verifies each against its cited source, and auto-fixes source attribution errors without human intervention.
- **Deep research** — not just README scrapes. The pipeline clones repos, reads 15-25 source files, fetches docs, and synthesizes architecture-level analysis.
- **Dual compilation** — both a deterministic script pipeline and an agent-native skill graph produce the same output. Run both for a comparison diff.
- **Neutral** — all projects (including the author's own) receive the same depth and the same criticism.

## Browse the wiki

**Start here:** [The Landscape of LLM Knowledge Systems](wiki/field-map.md)

**Deep dives:**
- [The State of LLM Knowledge Bases](wiki/knowledge-bases.md)
- [The State of Agent Memory](wiki/agent-memory.md)
- [The State of Context Engineering](wiki/context-engineering.md)
- [The State of Agent Systems](wiki/agent-systems.md)
- [The State of Self-Improving Systems](wiki/self-improving.md)

**Compare tools:** [Landscape Comparison Table](wiki/comparisons/landscape.md) | [Interactive Knowledge Graph](wiki/graph.html)

| Knowledge Graph | Compilation Pipeline |
|:---:|:---:|
| [![Knowledge Graph](wiki/images/graph-preview.png)](wiki/graph.html) | [![Compilation Pipeline](wiki/images/pipeline-preview.png)](wiki/field-map.md) |

**How it was built:** [METHODOLOGY.md](METHODOLOGY.md) | [System Design](DESIGN.md)

## Contributing

PR a `.md` file into `raw/{tweets,repos,papers,articles}/` with YAML frontmatter:

```yaml
---
url: https://...
type: tweet | repo | paper | article
author: Name
date: YYYY-MM-DD
tags: [knowledge-bases, agent-memory, ...]
key_insight: "Why this source matters"
---

[Source content]
```

If you add files via `bun run ingest`, they're scored automatically. If you add `.md` files manually, run `bun run rescore` to generate relevance scores. Then `bun run compile` to regenerate the wiki.

See [compile/quality.md](compile/quality.md) for content standards.

## Fork this for your own topic

This is a general-purpose knowledge compiler. To build your own wiki on any topic:

1. **Fork this repo** and clear `raw/` and `wiki/`
2. **Define your domain** — edit [`config/domain.ts`](config/domain.ts) with your topic, audience, taxonomy buckets, and scoring calibration. This is the single file that controls all domain-specific behavior.
3. **Add sources** — use `bun run ingest <url>` (scores automatically) or manually add `.md` files to `raw/` with YAML frontmatter
4. **Compile** — run `bun run compile` (run `bun run rescore` first if you added files manually)

Both compilation paths (script pipeline and agent skill graph) read from `config/domain.ts`, so they adapt automatically to your topic.

Example topics people could build: ML papers survey, security research tracker, startup playbook, programming language ecosystem map, open-source alternatives directory.

## Setup

```bash
bun install
cp .env.example .env  # add your ANTHROPIC_API_KEY
```

Environment variables:
- `ANTHROPIC_API_KEY` — for compilation and scoring
- `APIFY_API_TOKEN` — for Twitter scraping (ingestion only)
- `GITHUB_TOKEN` — for GitHub API (ingestion only)
- `XQUIK_API_KEY` — for X article extraction (optional, ingestion only)

## Adding sources

```bash
bun run ingest <url1> [url2] ...       # ingest sources (auto-detects platform)
bun run research <url1> [url2] ...     # deep-research specific repos or papers
bun run research --all                 # deep-research all unresearched sources
```

The ingestion script detects platform (GitHub, arXiv, X/Twitter, general articles), supports awesome-list detection and X article extraction via Xquik. Each source gets taxonomy tags (via Haiku), a 4-dimension relevance score (via Sonnet), and a key insight extraction automatically. To re-score all sources (e.g., after changing `config/domain.ts`), run `bun run rescore`.

Deep research goes further — cloning repos, reading 15-25 key source files, fetching documentation, then synthesizing structured analysis (architecture, design tradeoffs, failure modes, benchmarks) into `raw/deep/`. See the [deep-research skill](.claude/skills/deep-research/SKILL.md) for the full methodology.

## Two ways to compile

### Path A: Skill graph (agent-native)

Ask any AI coding agent: **"Compile the wiki from raw sources."**

The [compile-wiki skill](.claude/skills/compile-wiki/SKILL.md) orchestrates a 6-phase pipeline using subagents — each phase has its own skill with focused context. Synthesis articles and reference cards compile in parallel via subagents. Works with Claude Code, Codex, Cursor, or any agent that can read `.claude/skills/`.

### Path B: Script pipeline (deterministic)

```bash
bun run compile       # raw/ → build/ → wiki/
bun run lint          # verify structural integrity
bun run diagrams      # generate D2 + D3 visualizations
```

Both paths produce the same output structure. Run both for a comparison diff between agent-native and deterministic compilation.

<!-- stats:start (auto-updated by bun run compile) -->
## Stats

- **Sources:** 172 curated (63 repos, 13 papers, 24 tweets, 21 articles) + 51 deep research files
- **Wiki:** 176 articles (5 synthesis, 91 project cards, 72 concept explainers, field map, indexes)
- **Deep research:** 140K words of source-code-level analysis
- **Self-eval:** 239 atomic claims extracted, sampled and verified against sources each compilation
- **Compiled by:** 3 independent systems (script pipeline, Claude Code skill graph, Codex skill graph), best-of-three merged
<!-- stats:end -->

## Roadmap

- [ ] **Incremental recompilation** — process only new/changed sources instead of full recompile
- [ ] **Entity regression prevention** — warn before dropping articles that existed in the previous compilation
- [ ] **GitHub Actions auto-compile** — recompile wiki on PR merge, enabling community contributions
- [ ] **Pinned claim sets** — separate claim extraction from evaluation for stable accuracy tracking; passing claims become regression tests
- [ ] **Eval-driven prompt evolution** — feed failure reasons from Pass 7 back into Pass 3a/3b prompts (the GEPA "actionable side information" pattern)
- [ ] **Temporal claim decay** — auto-expire time-sensitive claims (star counts, benchmarks) and flag articles for refresh
- [ ] **Freshness loop** — automated re-verification of expired claims against live sources
- [ ] **Blind review agent** — separate validator that reads the wiki cold and flags quality issues the claim-level eval misses
- [ ] **Knowledge compaction** — progressive summarization and pruning of stale content (Raw → Daily → Weekly → Root)
- [ ] **Proactive disclosure** — surface relevant context agents didn't ask for, beyond ROOT.md table-of-contents
- [ ] **Coverage gap detection** — identify thin areas and generate research targets
- [ ] **Source acquisition loop** — semi-autonomous discovery and ingestion of new sources from detected gaps
- [ ] **Curation pass** — merge overlapping concept pages, fold benchmark cards into synthesis articles, re-source or prune the 109 reference cards with zero citations

See [DESIGN.md](DESIGN.md) for the full architectural vision.

## License

Code: MIT. Wiki content: CC-BY-SA 4.0. See [LICENSE](LICENSE).
