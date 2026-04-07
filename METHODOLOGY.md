# Compilation Methodology

How this wiki was built. The process is reproducible — fork the repo, edit [`config/domain.ts`](config/domain.ts), and run it on your own sources.

## Pipeline

```
raw/                   Sources: tweets, repos, papers, articles
  │                    Each scored for relevance (Sonnet) and tagged (Haiku)
  ▼
raw/deep/              Deep research: clone repos, read source code,
  │                    fetch docs, synthesize architecture-level analysis
  ▼
build/                 Entity extraction → resolution → knowledge graph
  │
  ▼
wiki/                  Synthesis articles, reference cards, field map,
  │                    ROOT.md, indexes, comparison table
  ▼
build/claims.json      Claim extraction → self-eval → auto-fix → re-eval
build/eval-report.json
```

## Source collection

Sources are ingested via platform-specific scrapers (`bun run ingest <url>`):
- **Repos**: README + GitHub metadata (stars, forks, language, license)
- **Papers**: arXiv abstract + metadata
- **Tweets**: full text + engagement metrics + image downloads
- **Articles**: web content via Defuddle/Jina extraction

Each source gets taxonomy tags (Haiku), a 4-dimension relevance score (Sonnet), and a key insight extraction. Scoring dimensions: topic_relevance (0.4 weight), practitioner_value (0.3), novelty (0.15), signal_quality (0.15). Sources below 4.0 composite relevance are filtered from compilation.

## Deep research

Shallow sources (README scrapes, paper abstracts) tell you WHAT a project does. Deep research tells you HOW it works.

- **Repos**: cloned, directory mapped, 15-25 key source files read, external documentation fetched, web-searched for blog posts and discussions. LLM synthesis into structured analysis (architecture, core mechanism, design tradeoffs, failure modes, integration patterns, benchmarks).
- **Papers**: full text fetched from arXiv HTML, synthesized into structured analysis (architecture, core mechanism, experimental results, practical implications).

## Compilation

Two paths produce the same output structure. Both read taxonomy and domain context from `config/domain.ts`.

### Path A: Script pipeline (compile.ts)

Deterministic pipeline using the Anthropic API, resumable via `--from-pass`:

| Pass | Model | What |
|------|-------|------|
| 0 | — | Load & index all sources |
| 1a | Haiku (parallel) | Entity extraction per source |
| 1b | Sonnet (×1) | Entity resolution & dedup |
| 2 | Sonnet (×1) | Graph construction from co-occurrences |
| 3a | Opus (sequential) | Synthesis articles with abstracts + staleness markers |
| 3b | Sonnet (parallel) | Reference cards with abstracts |
| 3c | Sonnet (sequential) | Claim extraction from synthesis articles |
| 4 | — | Field map, ROOT.md, indexes, README |
| 5 | — | Diagrams + backlinks |
| 6 | — | Changelog |
| 7 | Sonnet (parallel) | Self-eval: verify claims against sources |

Cost: ~$15-18 per full compilation. Runtime: ~30 minutes.

### Path B: Skill graph (agent-native)

Six skills in `.claude/skills/compile-*` form a pipeline orchestrated by `compile-wiki`:

| Skill | What | Parallelizable |
|-------|------|---------------|
| `compile-wiki` | Orchestrator — scans sources, sequences phases | — |
| `compile-synthesis` | One synthesis article per bucket | Yes (subagents) |
| `compile-cards` | Reference cards for entities | Yes (batched) |
| `compile-field-map` | Systems overview connecting all areas | No |
| `compile-index` | ROOT.md, indexes, README, comparison table | No |
| `compile-claims` | Claim extraction + self-eval | No |

Works with Claude Code, Codex, or any agent that can read `.claude/skills/`.

## Self-eval loop

The pipeline closes a self-improvement loop: extract claims → evaluate → fix → re-evaluate.

1. **Extract claims** (Pass 3c): Sonnet reads each synthesis article and extracts 25-40 atomic, verifiable statements with source provenance, confidence levels, and temporal scope.
2. **Evaluate** (Pass 7): Each claim verified by Sonnet against its cited raw source. Binary PASS/FAIL.
3. **Fix**: Source attribution errors corrected — typically a shallow source cited when evidence is in the deep/ source.
4. **Re-evaluate**: Re-verify to confirm accuracy improved.

Most failures are source attribution errors, not factual errors. The claim states a detail that exists in the deep research files but cites a shallower source that discusses the topic without containing the specific evidence.

## Quality enforcement

All prose checked against the [stop-slop](.claude/skills/stop-slop/SKILL.md) skill: no throat-clearing, no binary contrasts, no adverbs, no false agency, no jargon. See [compile/quality.md](compile/quality.md) for the full quality criteria.

Every synthesis article includes:
- `abstract` in frontmatter (1-2 sentence key finding)
- `source_date_range` and `staleness_risk` (low/medium/high based on source recency)
- Source conflict flags where sources disagree on facts

---

## How this wiki was compiled

### V5 (current): Script pipeline with Opus synthesis

The current wiki was compiled by the script pipeline (`bun run compile`) with Opus for synthesis articles and Sonnet for reference cards. Key improvements over prior versions:

- **Opus for synthesis** (Pass 3a): Produces more varied prose, fewer AI patterns, stronger analytical commitments. Added $3.30 incremental cost over Sonnet.
- **Prompt surgery**: Three randomized opening variants per article (no more "the field shifted from X to Y" formula), hardened Convergence sections requiring falsifiable claims, hardened "What the Field Got Wrong" requiring named projects and evidence, new "Deprecated Approaches" section, banned-words list at prompt top.
- **Entity restoration**: 15 reference cards restored from V3 compilation (8 concepts, 7 projects) that serve as cross-domain connective tissue.
- **Link validation**: Post-processing sweep in Pass 5 replaces broken internal links with plain text. Fixed 53 broken links to zero.
- **Deep source boost**: Sort priority +1.0 for deep research files, ensuring architectural detail appears first in prompt context.

| Metric | Value |
|--------|-------|
| Sources | 178 (126 raw + 52 deep research) |
| Wiki files | 156 markdown files, 267K words |
| Project cards | 77 |
| Concept cards | 66 |
| Entities | 139 (111 full articles, 28 stubs) |
| Claims extracted | 206 |
| Self-eval accuracy | 80.0% (24/30 sampled) |
| Broken internal links | 0 |
| Em dashes in synthesis | 1 (down from 1600+) |

### V3 (historical): Three-way merge

The V3 wiki was built through a three-way compilation. Each system (script pipeline, Claude Code skill graph, Codex skill graph) read 172 sources independently and produced a complete wiki. The script pipeline served as the base (most complete coverage), with Claude Code's synthesis articles (stronger openings, better failure modes) and Codex's unique concept cards merged in.

V3 full eval: 63.9% accuracy (138/216 claims passed). The Karpathy loop improved this to 78.6% (V4) and then 80.0% (V5) through prompt iteration.

**Key learnings across versions:**
- Three-way compilation produced better coverage (176 entities) but lower accuracy (63.9%). Single-pipeline with prompt surgery produced fewer entities (139) but higher accuracy (80.0%).
- Source attribution is the quality bottleneck, not factual accuracy. Most eval failures cite the wrong source file, not wrong facts.
- Claim extraction is non-deterministic. Re-extracting from the same articles produces different sets. Pin claim sets and iterate.
- Prompt surgery (varied openings, banned words, hardened takes) eliminated formulaic AI patterns without reducing accuracy.
