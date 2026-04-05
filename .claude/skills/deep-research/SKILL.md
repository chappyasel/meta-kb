---
name: deep-research
description: >
  Deep-researches a project or paper for the meta-kb knowledge base. Clones
  repos to read source code, fetches full paper text, and produces structured
  analysis files in raw/deep/. Use when asked to deep-research, deep-dive,
  analyze source code, or enrich a source with implementation details.
---

# Deep Research for meta-kb

Produce a structured deep-research source file for a project (repo) or paper.
Output goes to `raw/deep/repos/` or `raw/deep/papers/`.

## When to use

- User asks to "deep research" or "deep dive" a project/paper
- User wants implementation details beyond what the README provides
- User wants to verify claims (benchmarks, performance numbers)
- User wants architecture analysis of a specific codebase

## Quick start

```
1. Determine target type: repo or paper
2. For repos: clone, map structure, read key files, synthesize
3. For papers: fetch full text, synthesize
4. Write structured output to raw/deep/
5. Link original source via deep_researched frontmatter field
```

## Option A: Use the script

```bash
# Single URL
bun run research https://github.com/mem0ai/mem0

# Multiple
bun run research https://github.com/mem0ai/mem0 https://arxiv.org/abs/2501.13956

# All unresearched sources
bun run research --all
bun run research --repos-only
bun run research --papers-only
```

## Option B: Manual deep research

When the script can't handle a source (private repo, non-arXiv paper, etc.),
follow this checklist manually:

### For repositories

```
- [ ] Clone the repo: git clone --depth 1 <url> .tmp/<slug>
- [ ] Map directory structure (skip node_modules, .git, build, dist)
- [ ] Identify 15-25 key files (entry points, core modules, config, schemas, examples)
- [ ] Read those files (up to 1000 lines each)
- [ ] Check for local docs: ARCHITECTURE.md, DESIGN.md, CONTRIBUTING.md, docs/
- [ ] Fetch external docs: look in README for docs sites, blogs, guides (WebFetch them)
- [ ] Read examples/ directory for usage patterns
- [ ] Write analysis with these sections:
      ## Architecture Overview
      ## Core Mechanism
      ## Design Tradeoffs
      ## Failure Modes & Limitations
      ## Integration Patterns
      ## Benchmarks & Performance
- [ ] Save to raw/deep/repos/<slug>.md with frontmatter
      IMPORTANT: slug MUST match the original raw file's slug exactly.
      If raw source is raw/repos/mem0ai-mem0.md, deep file MUST be
      raw/deep/repos/mem0ai-mem0.md (not mem0.md or mem0ai-mem0-deep.md)
- [ ] Add deep_researched field to original raw/repos/<slug>.md
- [ ] Clean up .tmp/
```

### For papers

```
- [ ] Fetch full text from arxiv.org/html/<id> or ar5iv.labs.arxiv.org/html/<id>
- [ ] If no HTML, try PDF extraction or manual reading
- [ ] Write analysis with these sections:
      ## Architecture Overview
      ## Core Mechanism
      ## Design Tradeoffs
      ## Experimental Results
      ## Failure Modes & Limitations
      ## Practical Implications
- [ ] Save to raw/deep/papers/<slug>.md with frontmatter
- [ ] Add deep_researched field to original raw/papers/<slug>.md
```

## Output format

See [deep-source-template.md](deep-source-template.md) for the exact file format.

## Thoroughness requirements

Deep research means going BEYOND source code. For every repo:

1. **Read 15-25 source files** (up to 1000 lines each). Trace execution paths
   through core modules. Read examples/ for usage patterns.
2. **Fetch external documentation** — this is critical and non-optional:
   - Check README for docs site links (docs.*, help.*, *.readthedocs.io, *.gitbook.io)
   - WebFetch those docs: architecture pages, API references, guides, blog posts
   - Check for local docs: ARCHITECTURE.md, DESIGN.md, CONTRIBUTING.md, docs/
   - Documentation explains the WHY behind decisions; code explains the HOW.
     Both are needed for a complete analysis.
3. **Target 4000-6000 words** per repo, 2000-4000 per paper. If your analysis
   is under 3000 words, you haven't gone deep enough.

## Quality criteria

Every deep source file must:

1. **Name specific files and functions** — "the `Memory` class in `mem0/memory.py`"
   not "the memory management module"
2. **Verify README claims** — if the README says "90% fewer tokens", find the
   benchmark code or say the claim is unverified
3. **Explain tradeoffs concretely** — "chose Neo4j over embedding-only because
   temporal validity requires edge properties" not "uses a graph database"
4. **Document failure modes** — what breaks at scale, what edge cases exist,
   what the maintainers acknowledge as limitations
5. **Be honest** — if the code is simpler than the README implies, say so
6. **Incorporate documentation insights** — if the project has docs explaining
   architecture decisions, integration guides, or performance characteristics,
   these MUST be reflected in the analysis

## How deep sources flow into compilation

After deep research, run `bun run compile` to recompile the wiki. The compiler:
- Loads deep sources from `raw/deep/` alongside regular sources
- Gives deep sources 2.5x more body content in synthesis prompts
- Both shallow and deep sources are indexed; deep sources add implementation
  detail while shallow sources provide engagement metrics (stars, etc.)
