# Compilation Pipeline Checklist

Copy this checklist and track progress:

```
Compilation Progress:
- [ ] Phase 1: Scan all sources in raw/ and raw/deep/, write build/bucket-sources.json
- [ ] Phase 2: Write 6 synthesis articles (parallel subagents)
  - [ ] wiki/knowledge-substrate.md
  - [ ] wiki/agent-memory.md
  - [ ] wiki/context-engineering.md
  - [ ] wiki/agent-architecture.md
  - [ ] wiki/multi-agent-systems.md
  - [ ] wiki/self-improving.md
- [ ] Phase 3: Write wiki/field-map.md (needs all 6 synthesis articles)
- [ ] Phase 4: Write reference cards (parallel subagents)
  - [ ] wiki/projects/*.md (projects with 3+ sources and 7.0+ relevance)
  - [ ] wiki/concepts/*.md (concepts with 3+ sources and 7.0+ relevance)
- [ ] Phase 5: Generate indexes
  - [ ] wiki/ROOT.md
  - [ ] wiki/indexes/projects.md
  - [ ] wiki/indexes/topics.md
  - [ ] wiki/indexes/missing.md
  - [ ] wiki/comparisons/landscape.md
  - [ ] wiki/README.md
- [ ] Phase 6: Claims + self-eval
  - [ ] build/claims.json (100-200 atomic claims)
  - [ ] build/eval-report.json (30-claim sample, target >80% accuracy)
```

## Verification Gates

After Phase 2: All 6 `wiki/{bucket}.md` files exist and are 3000-5000 words each.

After Phase 4: `wiki/projects/` and `wiki/concepts/` contain reference cards. No orphan entities (every entity mentioned in synthesis articles has a card or appears in missing.md).

After Phase 5: `wiki/ROOT.md` is under 2K tokens. All links in indexes resolve to real files.

After Phase 6: `build/claims.json` has 100-200 claims. `build/eval-report.json` accuracy is above 70%.
