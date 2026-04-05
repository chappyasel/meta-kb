---
entity_id: agent-workflow-memory
type: project
bucket: agent-memory
sources:
  - repos/zorazrw-agent-workflow-memory.md
related:
  - Agent Memory
last_compiled: '2026-04-04T21:20:22.466Z'
---
# Agent Workflow Memory (AWM)

**Type:** Project | **Language:** Python | **License:** Apache-2.0

[Source](../../raw/repos/zorazrw-agent-workflow-memory.md) | [Agent Memory](../concepts/agent-memory.md)

---

## What It Does

AWM enables agents to extract reusable "workflow" patterns from past task executions and store them for retrieval on future tasks. Rather than re-deriving solutions from scratch each time, an agent can recognize a familiar task structure, pull a matching workflow, and adapt it—skipping redundant reasoning steps.

The system operates in two modes:
- **Offline:** Workflows are induced from a set of example task demonstrations before deployment
- **Online:** Workflows are induced incrementally from the agent's own experience during task execution

---

## Key Insight

Most agent memory systems store raw trajectories or facts. AWM instead abstracts these into parameterized sub-routines—task-agnostic patterns that generalize across surface-level variations. This keeps memory compact and cross-domain transferable without requiring auxiliary training data or fine-tuning.

---

## Architecture Summary

1. **Workflow Induction:** After completing a task (or from offline examples), an LLM analyzes the trajectory and extracts a generalized procedure, stripping task-specific constants into parameters.
2. **Workflow Storage:** Induced workflows are stored in a retrievable memory bank, indexed by task type or semantic similarity.
3. **Workflow Retrieval & Reuse:** For a new task, relevant workflows are retrieved and injected into the agent's context as structured guidance.

Benchmarks targeted: **WebArena** (live web environments across shopping, Reddit, GitLab, maps) and **Mind2Web** (offline web navigation dataset).

---

## Numbers

| Metric | Value |
|--------|-------|
| GitHub Stars | 415 |
| Forks | 48 |
| Paper | arXiv:2409.07429 |
| Last Updated | April 2026 |

---

## Strengths

- Addresses memory bloat: workflows are compressed abstractions, not raw trajectory dumps
- No fine-tuning required—pure prompting + retrieval approach
- Works in both offline (example-driven) and online (self-improving) settings
- Demonstrated on realistic, multi-step web navigation benchmarks

---

## Limitations

- Workflow quality depends heavily on the LLM's ability to abstract and generalize during induction—weak models may produce overfitted or poorly parameterized workflows
- Retrieval accuracy is a bottleneck: if the wrong workflow is surfaced, it may mislead rather than help
- Evaluated primarily on web navigation; generalization to other agent domains (code execution, tool use, etc.) is not well established
- ~415 stars suggests limited adoption; production readiness is unclear

---

## Alternatives

| System | Approach |
|--------|----------|
| MemGPT | Hierarchical memory with OS-style paging; stores raw context rather than abstracted workflows |
| Reflexion | Stores verbal self-reflection traces; no workflow abstraction layer |
| ExpeL | Experience-based learning via distilled insights; conceptually similar but different extraction mechanism |

---

## When to Use It

AWM is a reasonable fit if you're building agents that repeatedly solve structurally similar tasks (e.g., web automation, form filling, data retrieval workflows) and want efficiency gains without retraining. It's less compelling for highly novel or one-shot task settings where workflow reuse provides little leverage.


## Related

- [Agent Memory](../concepts/agent-memory.md) — implements (0.8)
