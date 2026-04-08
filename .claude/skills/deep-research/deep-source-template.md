# Deep Source File Template

## Repo deep source (raw/deep/repos/{slug}.md)

```yaml
---
url: 'https://github.com/owner/repo'
type: repo
author: owner
date: 'YYYY-MM-DD'
tags:
  - knowledge-substrate    # at least one taxonomy bucket (see config/domain.ts)
  - specific-tag
key_insight: >-
  1-2 sentences on why this matters, based on deep analysis not just README.
stars: 12345              # from original source
forks: 678
language: Python
license: Apache-2.0
deep_research:
  method: source-code-analysis
  files_analyzed:
    - src/core/memory.py
    - src/storage/graph.py
  external_docs:
    - https://docs.example.com/architecture
  analyzed_at: 'YYYY-MM-DD'
  original_source: repos/owner-repo.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 7
  signal_quality: 9
  composite: 8.7
  reason: Brief scoring rationale
---

## Architecture Overview

[How the codebase is organized. Key modules, entry points, data flow.]

## Core Mechanism

[The key algorithm/pattern. Reference specific files and functions.
Include simplified code snippets.]

## Design Tradeoffs

[What they chose, what they gave up, why.]

## Failure Modes & Limitations

[What breaks, when, edge cases, scaling challenges.]

## Integration Patterns

[How it connects to LLM providers, frameworks, databases.]

## Benchmarks & Performance

[Actual numbers. Verify README claims against code.]
```

## Paper deep source (raw/deep/papers/{slug}.md)

```yaml
---
url: 'https://arxiv.org/abs/XXXX.XXXXX'
type: paper
author: 'Author Names'
date: 'YYYY-MM-DD'
tags:
  - agent-memory             # at least one taxonomy bucket (see config/domain.ts)
key_insight: >-
  Based on full paper analysis, not just abstract.
deep_research:
  method: paper-full-text
  text_length: 45000
  analyzed_at: 'YYYY-MM-DD'
  original_source: papers/slug.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 9
  composite: 8.7
  reason: Brief scoring rationale
---

## Architecture Overview

## Core Mechanism

## Design Tradeoffs

## Experimental Results

## Failure Modes & Limitations

## Practical Implications
```
