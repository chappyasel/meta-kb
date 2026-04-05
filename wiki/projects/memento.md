---
entity_id: memento
type: project
bucket: agent-memory
sources:
  - repos/agent-on-the-fly-memento.md
  - repos/memento-teams-memento-skills.md
related:
  - Agent Memory
last_compiled: '2026-04-04T21:21:19.261Z'
---
# Memento

## What It Is

Memento is a memory-based continual learning framework for LLM agents that enables improvement from experience **without updating model weights**. The core claim, stated directly in the project title: "Fine-tuning LLM Agents without Fine-tuning LLMs."

Rather than storing static facts or conversation history, Memento stores **trajectories**—successful and failed agent runs—as retrievable cases that inform future decision-making. This is case-based reasoning applied to agentic loops.

A related but distinct project, **Memento-Skills**, extends the concept to autonomous skill design: agents not only recall past cases but rewrite and evolve their own skill definitions at runtime.

[Source](../../raw/repos/agent-on-the-fly-memento.md) | [Source](../../raw/repos/memento-teams-memento-skills.md)

## Key Numbers

| Metric | Memento (core) | Memento-Skills |
|--------|---------------|----------------|
| GitHub Stars | 2,375 | 916 |
| Forks | 276 | 84 |
| License | MIT | — |
| Language | Python 3.12+ | Python 3.12+ |
| Last Updated | 2026-03-31 | 2026-04-03 |

## Architecture

**Memento (core)** uses a **Planner–Executor** architecture over a memory-augmented MDP:

- **Memory store**: Past trajectories (successes and failures) indexed for retrieval
- **Planner**: Retrieves relevant past cases and uses them as context for current decision-making
- **Executor**: Carries out tool calls via MCP tooling
- **Learning loop**: New trajectories feed back into the memory store without any gradient updates

The key inversion from standard RAG: instead of augmenting *retrieval for inference*, Memento augments the *decision-making loop itself* with case-based reasoning as a learned policy.

**Memento-Skills** adds a read-write reflection loop on top of a skill registry:

- 10 built-in skills ship with the framework
- Agents inspect, modify, and create skills in the registry based on live interaction outcomes
- No retraining required; capability improvement shifts from model parameters to the external skill store

## What's Unique

- **No fine-tuning required**: Continual improvement without touching model weights—practically significant given the cost and complexity of fine-tuning
- **OOD generalization**: Case-based retrieval can surface relevant past experience even in out-of-distribution scenarios where parametric memory fails
- **Trajectory-level memory**: Stores *processes*, not just facts—richer signal than typical episodic memory systems
- **Self-evolving skills** (Memento-Skills): Agents autonomously design new capabilities, shifting the bottleneck from model training to skill registry management

## Benchmarks

Memento reports results on the **GAIA** benchmark (validation and test sets) against baselines, with ablation studies across multiple task types. Specific numbers aren't available in the source material, but the project shows competitive performance relative to fine-tuning approaches.

## Strengths

- Addresses a real bottleneck: agent improvement typically requires expensive retraining cycles
- MCP tooling integration suggests practical deployment awareness
- MIT license (core framework)
- Active development (updated early 2026)

## Limitations

- Memory retrieval quality is critical—poor case matching could surface misleading past trajectories and degrade performance
- Memory stores grow unbounded without pruning strategies; unclear how the framework handles this at scale
- Skill self-modification (Memento-Skills) introduces risks: agents could write incorrect or unsafe skill definitions
- No published formal paper referenced in source material; evaluation relies on project-reported benchmarks

## Alternatives

- **[Agent Memory](../concepts/agent-memory.md)** approaches generally: MemGPT, Letta, and similar systems manage memory differently (hierarchical storage rather than trajectory-based CBR)
- Fine-tuning pipelines (the approach Memento explicitly avoids): more computationally expensive but potentially more reliable for capability changes
- RAG-augmented agents: similar retrieval infrastructure but applied to knowledge rather than behavioral trajectories

## Bottom Line

Memento makes a credible case that trajectory memory can substitute for fine-tuning in many agent improvement scenarios. The approach is technically coherent and practically motivated. The main open questions are around memory management at scale and the reliability of autonomous skill modification in Memento-Skills. Worth watching if you're building agents that need to improve from deployment experience without retraining infrastructure.


## Related

- [Agent Memory](../concepts/agent-memory.md) — implements (0.8)
