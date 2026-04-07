# Changelog

Compilation history for the meta-kb wiki.

## 2026-04-07 — V5: Opus Synthesis + Prompt Surgery

- **Sources:** 178 total (126 raw + 52 deep research)
- **Entities:** 139 resolved (111 full articles, 28 stubs) + 15 restored from V3
- **Wiki:** 149 articles (77 project cards, 66 concept cards, 5 synthesis, field map)
- **Graph:** 139 nodes, 470 edges
- **Synthesis model:** Opus for 5 synthesis articles (Sonnet for all other passes)
- **Prompt changes:** 3 opening variants (no more "shifted from X to Y"), hardened Convergence/Takes, new Deprecated Approaches section, banned-words list, anti-slop at prompt top
- **Link validation:** 53 broken internal links fixed to zero
- **Writing quality:** Em dashes 1600+ → 1 in synthesis, banned words → 1 occurrence
- **Claims:** 206 extracted, 30 sampled, 24 passed (80.0% accuracy)
- **Accuracy progression:** V3 63.9% → V4 78.6% → V5 80.0%

## 2026-04-06 — V4: Script Pipeline + Karpathy Loop

- **Sources:** 124 raw sources compiled
- **Entities:** 134 total (108 full articles, 26 stubs)
- **Synthesis model:** Sonnet
- **Claims:** 211 extracted, 78.6% accuracy after 3 eval iterations
- **Note:** Deleted 42 entity cards from V3 to improve per-article accuracy, which broke 23.5% of internal links

## 2026-04-06 — V3: Three-Way Merge

- **Sources:** 172 raw sources compiled
- **Compilation:** Three-way (script pipeline + Claude Code skill graph + Codex skill graph), best-of-three merged
- **Wiki:** 176 articles (5 synthesis, 91 project cards, 72 concept explainers)
- **Claims:** 239 extracted, 63.9% accuracy (216 tested, 138 passed)
