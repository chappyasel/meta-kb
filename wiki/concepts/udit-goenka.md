---
entity_id: udit-goenka
type: person
bucket: agent-architecture
abstract: >-
  Udit Goenka is an Indian founder and AI builder who created the Claude Code
  autoresearch skill, generalizing Karpathy's ML self-improvement loop into a
  10-command markdown-based agent framework for any measurable domain.
sources:
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/uditgoenka-autoresearch.md
  - repos/uditgoenka-autoresearch.md
related:
  - claude-code
  - andrej-karpathy
  - autoresearch
last_compiled: '2026-04-08T23:24:54.412Z'
---
# Udit Goenka

## Who He Is

Udit Goenka is a self-taught founder and angel investor based in India. He built [TinyCheque](https://tinycheche.com), described as India's first agentic AI venture studio, and [Firstsales.io](https://firstsales.io), a sales automation tool. He has backed 38 startups with 6 exits and has worked with or advised over 700 startups. He is active on X as [@iuditg](https://x.com/iuditg).

## Key Contribution: Claude Autoresearch

Goenka's primary contribution to the agent infrastructure space is [AutoResearch](../projects/autoresearch.md), a [Claude Code](../projects/claude-code.md) skill that generalizes [Andrej Karpathy's](../concepts/andrej-karpathy.md) autoresearch loop beyond ML training to any domain with a measurable metric.

Karpathy's original system was a 630-line `train.py` modified by an agent over hundreds of GPU experiments to minimize validation bits-per-byte. Goenka took the same constraint-metric-loop pattern and encoded it entirely as markdown: approximately 5,000+ lines of structured prompt files distributed via the Claude Code plugin marketplace. The resulting system, `uditgoenka/autoresearch`, reached 3,142 GitHub stars and 241 forks.

The skill implements a strict 8-phase loop (precondition checks, review, ideate, modify, commit, verify, decide, log) with git as the agent's memory system. Every iteration commits before verifying, uses `git revert` rather than `git reset --hard` to preserve failed experiments in history, and reads `git log` at the start of each round. He expanded the core loop into 10 specialized subcommands: `plan`, `debug`, `fix`, `security`, `ship`, `scenario`, `predict`, `learn`, and `reason`. The `reason` subcommand is architecturally distinct, using adversarial multi-agent debate with blind judging to converge on subjective decisions where no scalar metric exists.

His stated design philosophy: humans set strategy (goal, metric, scope), agents handle tactics (implementation choices, iteration). This separation appears throughout the skill's `references/core-principles.md` as seven principles, the most cited being that mechanical metrics are the prerequisite for autonomous loops.

## Related Work

- [AutoResearch](../projects/autoresearch.md): the project he created
- [Claude Code](../projects/claude-code.md): the runtime the skill targets
- [Andrej Karpathy](../concepts/andrej-karpathy.md): originator of the autoresearch pattern Goenka generalized
- [Self-Improving Agents](../concepts/self-improving-agents.md): the broader concept his work instantiates
