# Autocontext

> Recursive self-improving harness that runs scenarios, analyzes outcomes through a multi-agent loop, and distills validated knowledge into reusable playbooks and cheaper local models. Key differentiator: five specialized agents (competitor, analyst, coach, architect, curator) gate what knowledge persists, preventing noise accumulation.

## What It Does

Autocontext takes a real task in plain language, runs it through iterative execution, and carries forward knowledge that actually improved outcomes. The system supports multiple execution modes: `run` for improving behavior across scenario generations, `simulate` for parameter sweeps and replayable outcomes, `investigate` for evidence-driven diagnosis with confidence scoring, `mission` for verifier-driven goals advanced step by step, and `train` for distilling stable behavior into cheaper local runtimes (MLX on Apple Silicon). Inside a run, five agents collaborate: competitor proposes strategies, analyst explains what happened, coach updates playbooks, architect proposes structural changes, and curator gates what knowledge persists. Weak changes are rolled back; successful changes accumulate.

## Architecture

Dual-package system: Python (`autocontext`) for the full control plane (API server, training loop, scenario scaffolding, export) and TypeScript (`autoctx`) for operator-facing workflows (simulations, investigations, mission control, MCP serving). The Python backend uses FastAPI with SQLite. Scenarios, tasks, and missions are first-class objects with typed contracts. Knowledge persists as validated lessons. Artifacts include replays, checkpoints, reports, and packages. Runtime routing spans Anthropic, OpenAI-compatible backends, Ollama, vLLM, MLX, and Pi-based runtimes. GEPA-inspired ASI/Pareto optimizer wired into the improvement loop. Component sensitivity profiling and credit assignment identify which parts of a pipeline drive outcomes.

## Key Numbers

- 695 GitHub stars, 50 forks
- Current release: v0.3.3 (Python and TypeScript)
- 5 agent roles in the inner loop
- Supports 6+ LLM backends (Anthropic, OpenAI, Ollama, vLLM, MLX, Pi)
- Pluggable scoring with Elo and Glicko support
- Apache-2.0 license

## Strengths

- Credit assignment to individual pipeline components goes beyond whole-system evaluation, enabling targeted improvement
- Frontier-to-local distillation (MLX) provides a concrete path from expensive exploration to cheap execution
- The curator gating pattern prevents the knowledge store from filling with noise from marginal or lucky runs

## Limitations

- Star count (695) and early version (0.3.3) suggest the system is pre-production; APIs may change significantly
- The five-agent inner loop adds substantial token cost per iteration; cost-aware loop control helps but does not eliminate the overhead
- Campaign (planned grouping of missions) is still a reserved concept, not a shipped feature

## Alternatives

- [pi-autoresearch.md](pi-autoresearch.md) — use when optimizing a single metric with a simple try/measure/keep loop, without multi-agent analysis
- [gepa.md](gepa.md) — use when optimizing text artifacts specifically, where Pareto-efficient evolutionary search is the right paradigm
- [acontext.md](acontext.md) — use when you want skill-file memory without the full scenario/mission execution framework

## Sources

- [../../raw/repos/greyhaven-ai-autocontext.md](../../raw/repos/greyhaven-ai-autocontext.md) — "run a scenario, task, or mission...evaluate what actually happened...persist validated knowledge and artifacts...distill stable behavior into cheaper local runtimes"
