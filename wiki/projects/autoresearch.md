---
entity_id: autoresearch
type: project
bucket: self-improving
sources:
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/human-agent-society-coral.md
  - repos/karpathy-autoresearch.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - repos/alvinreal-awesome-autoresearch.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
related:
  - Claude Code
  - Andrej Karpathy
  - Self-Improving Agent
  - Research Orchestration
last_compiled: '2026-04-04T21:15:02.194Z'
---
# AutoResearch

## What It Is

AutoResearch is a pattern and tooling ecosystem for autonomous agent-driven research loops, where AI agents iteratively explore a problem space—optimizing code, hyperparameters, or experimental configurations—without continuous human involvement. The concept spans a minimal reference implementation by Andrej Karpathy and the more structured CORAL multi-agent framework built on top of it.

The core loop: a human engineers a prompt describing the research objective, an agent autonomously runs experiments, commits improvements, and iterates—indefinitely in principle.

## Origin and Key Demonstration

Karpathy's public experiment ran autoresearch on `nanochat` (a stripped-down LLM training codebase, ~630 lines, single-GPU) for ~2 days. The agent found ~20 independent improvements to validation loss on a depth=12 model. All improvements transferred to depth=24 models, and stacking them reduced "Time to GPT-2" on the leaderboard from **2.02 hours to 1.80 hours (~11% improvement)**.

His framing: the human's job shifts from directly optimizing code to *engineering the agent's behavior via prompt design*. The bottleneck is prompt quality, not human iteration speed.

[Source](../../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md) | [Source](../../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)

## Architecture Summary

**Minimal version (Karpathy's reference repo):**
- Single training script (`.py`) the agent modifies
- Single prompt file (`.md`) the human controls
- Agent works on a git feature branch, committing improvements as it finds them
- Evaluation gate: lower validation loss after a fixed-duration run (5 minutes)
- No orchestration overhead—just a loop and a metric

**CORAL (multi-agent extension):**
- Persistent shared knowledge store: `.coral/public/` holds `attempts`, `notes`, and `skills`
- Multiple agents can build on each other's discoveries without synchronization overhead
- Designed for scaling beyond single-agent bottlenecks
- 120 GitHub stars, MIT license, Python

[Source](../../raw/repos/human-agent-society-coral.md)

## What's Unique

- **Cascading validation**: discoveries on small models transfer to larger ones—validates that the agent is finding real signal, not overfitting to evaluation quirks
- **Prompt-as-lever**: research velocity becomes a function of prompt engineering quality rather than researcher hours
- **Git-native**: the agent's work history is transparent and auditable via commits
- **Metric-gated**: any efficiently-evaluable metric can substitute for validation loss, making the pattern broadly applicable

## Key Numbers

| Metric | Value |
|--------|-------|
| Improvement achieved | ~11% reduction in training time |
| Agent runtime | ~2 days unattended |
| Changes found | ~20, all additive |
| CORAL stars | 120 |
| Reference codebase size | ~630 lines |

## Strengths

- Demonstrated real, transferable improvements on a non-trivial benchmark on a first attempt
- Low infrastructure requirements for the minimal version
- Human remains in control of objective framing without being in the optimization loop
- CORAL adds multi-agent scaling without requiring tight synchronization

## Limitations

- Requires a **cheap, fast, reliable evaluation signal**—works well for training loss, much harder for open-ended research tasks
- Agent finds improvements within the space the prompt describes; novel research directions still require human framing
- No published results on tasks beyond hyperparameter/architecture optimization
- CORAL is early-stage (120 stars, alpha-labeled topics)
- Transfer from small to large models isn't guaranteed to hold across all problem types

## Alternatives

- [Claude Code](../projects/claude-code.md) — general coding agent; lacks the iterative experiment loop structure
- AlphaEvolve / Codex — cited in CORAL's topic tags as related prior work
- Standard HPO tools (Optuna, Ray Tune) — more structured but human-in-the-loop and not self-directing

## Related Concepts

- [Self-Improving Agent](../concepts/self-improving-agent.md)
- [Research Orchestration](../concepts/research-orchestration.md)

## Related People

- Andrej Karpathy — originated the public demonstration and reference implementation

---

*Honest assessment: The 11% result is real and impressive for a naive first attempt. But the pattern currently excels at a narrow task class—optimizing within a well-defined, quickly-evaluable search space. Whether it scales to genuine open-ended research remains undemonstrated.*
