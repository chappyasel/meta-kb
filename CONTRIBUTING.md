# Contributing

The easiest way to contribute is to add a source. Open a PR with a `.md` file in `raw/{tweets,repos,papers,articles}/`.

## Adding a source

### Option A: Use the ingestion script (recommended)

```bash
bun run ingest <url>
```

This auto-detects the platform (GitHub, arXiv, X/Twitter, article), fetches content, generates taxonomy tags (via Haiku), and scores relevance (via Sonnet). Requires `ANTHROPIC_API_KEY` in `.env`.

### Option B: Add a markdown file manually

Create a file in the appropriate `raw/` subdirectory with this frontmatter:

```yaml
---
url: https://...
type: tweet | repo | paper | article
author: Name
date: YYYY-MM-DD
tags: [knowledge-bases, agent-memory, ...]
key_insight: "Why this source matters"
---

[Source content here]
```

Then run `bun run rescore` to generate relevance scores.

## What makes a good source

Sources should be about building LLM knowledge bases, agent memory, context engineering, agent systems, or self-improving systems. See [`config/domain.ts`](config/domain.ts) for the full taxonomy and scoring calibration.

High-value sources:
- Repos with working implementations (not just READMEs)
- Papers with novel architecture or evaluation methodology
- Practitioner write-ups with concrete lessons learned
- Tweets that crystallize an emerging pattern

Low-value sources (will score below threshold and be filtered):
- General AI news or hype
- Tangentially related tooling (pure DevOps, pure frontend)
- Marketing content without technical depth

## Recompiling the wiki

After adding sources:

```bash
bun run compile       # full recompilation
bun run lint          # verify structural integrity
```

## Quality standards

See [compile/quality.md](compile/quality.md) for the full criteria. The short version:
- Every claim cites a specific source
- Comparisons include a recommendation (no "both have pros and cons")
- Failure modes get evocative names ("stale memory poisoning", not "data quality issues")
- All projects receive equal depth and equal criticism

## Deep research

If you want to contribute deeper analysis of a specific project or paper:

```bash
bun run research <url>    # clones repo, reads source files, synthesizes analysis
```

This produces structured analysis in `raw/deep/` covering architecture, core mechanisms, design tradeoffs, failure modes, and benchmarks. Deep research files are the highest-value contributions — they're what separates this wiki from README scrapes.
