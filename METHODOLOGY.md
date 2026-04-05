# Compilation Methodology

How this wiki was built. The process is reproducible — fork the repo and run it on your own sources.

## Pipeline

```
101 shallow sources (raw/)
        │
        ▼
Deep research: clone 38 repos, read source code + docs + web
Fetch full text for 13 papers
        │
        ▼
51 deep research files (raw/deep/)  ← 140K words of implementation analysis
        │
        ▼
Three independent compilations:
  ├── Script pipeline (compile.ts, Haiku + Sonnet)
  ├── Claude Code agent session (SKILL.md)
  └── Codex agent session (SKILL.md)
        │
        ▼
Best-of-three merge → wiki/
```

## Source collection

**101 shallow sources** ingested via platform-specific scrapers:
- 55 repos: README + GitHub metadata (stars, forks, language, license)
- 13 papers: arXiv abstract + metadata
- 18 tweets: full text + engagement metrics + image downloads
- 19 articles: web content via Defuddle/Jina extraction

Each source gets taxonomy tags (Haiku), a 4-dimension relevance score (Sonnet), and a key insight. Sources below 4.0 composite relevance are filtered.

## Deep research

**51 sources enriched** with implementation-level analysis:
- **38 repos**: cloned, directory mapped, 15-25 key source files read, external documentation fetched, web-searched for blog posts and discussions. LLM synthesis into structured analysis (architecture, core mechanism, design tradeoffs, failure modes, integration patterns, benchmarks).
- **13 papers**: full text fetched from arXiv HTML, synthesized into structured analysis (architecture, core mechanism, experimental results, practical implications).

Average depth: 3,068 words per repo, 1,400 per paper. Total: 140K words.

## Three independent compilations

Each compilation read the same 155 sources and produced a complete wiki independently.

| Metric | Script pipeline | Claude agent | Codex agent |
|--------|----------------|--------------|-------------|
| Total words | 176,120 | 53,492 | 22,833 |
| Synthesis articles | 5 x ~2,800 words | 5 x ~3,300 words | 5 x ~1,100 words |
| Project cards | 72 | 57 | 41 |
| Deep source citations | 53 | 0 | 0 |
| Selection guides | 5/5 articles | 0/5 | 0/5 |
| Failure modes sections | 5/5 articles | 0/5 | 0/5 |
| Divergence sections | 0/5 | 5/5 | 5/5 |
| Cross-cutting themes | 0 | 1 | 0 |

**What each did best:**
- **Script pipeline**: implementation depth, deep source citations, selection guides, benchmark credibility
- **Claude agent**: narrative voice, opinionated synthesis, cross-cutting themes ("Markdown Won", "Agent as Author")
- **Codex agent**: concision, structural clarity, clean prose

**What each did worst:**
- **Script pipeline**: no forward-looking analysis, no divergence sections
- **Claude agent**: zero deep source usage despite 140K words available
- **Codex agent**: synthesis articles too thin for practitioner use

## Best-of-three merge

The final wiki used the script pipeline as the base (only version with deep source citations and code-level detail), then cherry-picked from the agent sessions:

**From Claude agent:**
- Synthesis article openings and narrative framing
- Divergence sections for all 5 articles
- Cross-cutting themes in field-map
- Mermaid diagram with labeled cross-bucket edges

**From Codex agent:**
- Unique concept cards (context-bloat, hallucination-compounding, constructed-fitness-functions)
- Timeline index

## Quality enforcement

All prose checked against the [stop-slop](.claude/skills/stop-slop/SKILL.md) skill: no throat-clearing, no binary contrasts, no adverbs, no false agency, no jargon. Automated lint validates structural integrity (broken links, orphan pages, missing sources, graph consistency, slop patterns).
