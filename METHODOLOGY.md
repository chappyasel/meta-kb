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
| 3a | Sonnet (sequential) | Synthesis articles with abstracts + staleness markers |
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

The current wiki was built through a three-way compilation followed by a manual merge.

### Three independent compilations

Each system read the same 172 sources and produced a complete wiki independently.

| Metric | Script pipeline | Claude Code (skill graph) | Codex (skill graph) |
|--------|----------------|--------------------------|---------------------|
| Total files | 120 | 56 | 105 |
| Total words | 195,806 | 72,371 | 170,516 |
| Synthesis articles | 5 × ~3,200w | 5 × ~4,000w | 5 × ~3,300w |
| Project cards | 60 | 38 | 52 |
| Concept cards | 48 | 5 | 40 |
| Claims extracted | 237 | 152 | 236 |
| Self-eval accuracy | 82.8% (Haiku) | 86.7% | 70.0% |
| All 8 sections present | 5/5 articles | 5/5 articles | 2/5 articles |

**What each did best:**
- **Script pipeline**: Coverage breadth (120 files, 48 concepts), deep source citations, consistent section structure, highest claim count
- **Claude Code**: Synthesis quality (longest, most opinionated articles), best eval accuracy, best ROOT.md curation
- **Codex**: Unique concept cards (compaction-tree, improvement-loop, skill-book), good reference card depth

**What each did worst:**
- **Script pipeline**: Star count data corruption in ROOT.md, broken concept links (entity names vs IDs)
- **Claude Code**: Only 56 files — reference card generation didn't batch enough concepts
- **Codex**: 3/5 synthesis articles missing key sections, lowest eval accuracy

### Merge strategy

The script pipeline served as the base (most complete coverage), then merged at the sentence level:

- **From Claude Code**: All 5 synthesis articles (stronger openings, better failure modes, more scannable selection guides), ROOT.md, README
- **From Codex**: 9 unique cards not in the script output

### Self-eval results

Full eval (all 216 verifiable claims): 63.9% accuracy (138/216 passed).

| Bucket | Accuracy |
|--------|----------|
| Self-improving | 80% (36/45) |
| Agent memory | 65% (28/43) |
| Agent systems | 65% (28/43) |
| Knowledge bases | 61% (23/38) |
| Context engineering | 49% (23/47) |

**Lessons learned:**
- 30-sample eval is too noisy (±17pp confidence interval). Use `--full-eval` for reliable measurement.
- Separate claim extraction from evaluation — re-extracting claims produces different sets due to LLM non-determinism.
- Most failures are source attribution errors (shallow source cited for a detail that lives in the deep/ source), not factual errors.
