---
entity_id: agent0
type: project
bucket: agent-architecture
abstract: >-
  Agent0 is a research framework from UNC/Salesforce/Stanford that trains agents
  to self-improve on reasoning tasks using zero human-curated data, via a
  curriculum agent/executor co-evolution loop with tool-integrated reasoning.
sources:
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - repos/aiming-lab-agent0.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
related:
  - agent-zero
last_compiled: '2026-04-08T23:28:00.108Z'
---
# Agent0

## What It Is

Agent0 (and its multimodal sibling Agent0-VL) is an academic research framework for training [Self-Improving Agents](../concepts/self-improving-agents.md) from scratch without human-labeled data. Published by researchers from UNC-Chapel Hill, Salesforce Research, and Stanford in late 2025, it proposes a specific mechanism: two agents co-evolving against each other, one generating tasks and one solving them, with external tools available throughout.

The repository sits at ~1,100 stars as of early 2026. This is a research artifact, not a production framework.

## Core Mechanism

The architecture centers on a **symbiotic curriculum loop**:

- **Curriculum Agent**: generates increasingly difficult tasks, calibrated to sit at the frontier of what the Executor can currently solve
- **Executor Agent**: solves those tasks using tool-integrated reasoning (code execution, calculators, search)

Neither agent requires external reward signal or labeled training data. The Executor's success rate on Curriculum-generated tasks provides the feedback signal. The loop runs iteratively: Executor improves, Curriculum detects the new capability frontier, proposes harder tasks, repeat.

Agent0-VL extends this with a dual-role architecture where the same model alternates between **Solver** (multi-turn tool reasoning) and **Verifier** (structured feedback generation, self-reward scoring). This eliminates even the need for a separate reward model.

The training backend uses VeRL (the RL framework), and base models are [Qwen](../projects/qwen.md) variants (Qwen3-8B-Base for language, Qwen2.5-VL-7B and Qwen3-VL-8B for vision-language). Code lives under `./Agent0/` and `./Agent0-VL/` in the repository.

## Benchmark Numbers

All numbers below are self-reported from the Agent0 papers. No independent reproduction is documented in the sources.

**Agent0 (language, Qwen3-8B-Base):**
- +18.3% on mathematical reasoning benchmarks (49.2 → 58.2 avg across AMC, Minerva, MATH, GSM8K, Olympiad, AIME)
- +22.0% on general reasoning benchmarks (34.5 → 42.1 overall avg)
- Beats Absolute Zero, R-Zero, and Socratic-Zero across most metrics

**Agent0-VL-7B (vision-language):**
- 65.6 avg across MathVerse, MathVision, MathVista, WeMath, HallBench, ChartQA, MMMU
- vs. 58.3 for Qwen2.5-VL-7B base (+12.5%)
- Beats ThinkLite-VL-7B (62.9) and MM-Eureka-7B (60.2)

**Agent0-VL-8B:**
- 74.6 avg, outperforms GPT-4o (60.5) on the same benchmark set
- Claims state-of-the-art among open-source models at this scale

The iterative improvement curve across 3 evolution rounds shows diminishing gains: +5.2%, +4.0%, +2.8%. This is consistent with RL fine-tuning saturation patterns but the papers do not analyze where the ceiling is.

## What It's Genuinely Good At

**Zero-data bootstrapping**: The curriculum/executor loop genuinely eliminates the human annotation bottleneck. This is the cleanest demonstration of that pattern among the self-improvement frameworks listed alongside it (EvoAgentX, AgentEvolver, etc.).

**Tool-integrated reasoning**: The framework treats external tools as first-class citizens of the reasoning process, not post-hoc additions. This integration is baked into both training and inference.

**Multimodal extension**: Agent0-VL applies the same self-evolution pattern to vision-language tasks without fundamental architectural changes, suggesting the core mechanism generalizes across modalities.

## Critical Limitations

**Domain specificity**: Agent0 improves on mathematical and visual reasoning benchmarks. There is no evidence it transfers to other domains like code generation, long-horizon planning, or knowledge retrieval. The curriculum agent can only propose tasks within the scope of what it can verify, and mathematical correctness is far easier to verify automatically than, say, writing quality or factual accuracy.

**Infrastructure assumption (unstated)**: The framework requires substantial GPU compute to run the RL training loop. The VeRL backend and Qwen3-8B-Base starting point are not lightweight. Reproducing the +18% math improvement requires training infrastructure that most practitioners lack. The README provides no compute budget estimates.

**Concrete failure mode**: The curriculum agent can propose tasks the executor will never solve (too hard) or tasks it trivially solves (too easy). If calibration drifts, the signal collapses. The papers describe "frontier tasks" but do not detail the difficulty estimation mechanism or what happens when it miscalibrates over many iterations.

## When NOT to Use It

- You need a deployable agent system. Agent0 is a training framework, not an inference framework.
- Your domain lacks automatic verifiability. If you cannot programmatically check whether an agent solved a task correctly, the self-evolution loop has no signal to run on.
- You need cross-session persistent memory. Agent0 has no memory architecture; it improves model weights, not runtime state. Compare [Letta](../projects/letta.md) or [MemGPT](../projects/memgpt.md) for that use case.
- You want tool-using agents without training. [LangChain](../projects/langchain.md) or [LangGraph](../projects/langgraph.md) handle runtime tool integration without the RL loop.

## Unresolved Questions

The documentation and papers leave several things unexplained:

- **Curriculum calibration**: How exactly does the curriculum agent estimate task difficulty? Is there a separate difficulty model, or does it use the executor's recent success rate as a proxy?
- **Saturation**: The three-iteration experiments show diminishing returns. Is there a principled stopping criterion, or does training just stop at iteration 3 by convention?
- **Cost at scale**: No compute budget appears in the repository or papers. Reproducing these results blind requires reverse-engineering from the base model and VeRL configuration.
- **Generalization beyond math**: The papers acknowledge math as the test domain but make no claims about other domains. The architecture's applicability to open-ended tasks remains untested.
- **Stability**: Multi-agent co-evolution can produce degenerate dynamics (curriculum agent collapses to trivial tasks, executor overfits). No ablation addresses this risk.

## Relationship to Related Work

Agent0 sits in the self-improving agents cluster alongside [EvoAgentX](../projects/evoagentx.md) (which evolves workflow prompts and structures rather than model weights) and [AgentEvolver](../projects/agentevolver.md) (which uses trajectory-based credit assignment). The key distinction: Agent0 modifies the model itself through RL, while EvoAgentX and AgentEvolver operate at the prompt/workflow level without weight updates.

The curriculum/executor pattern echoes [Voyager](../projects/voyager.md)'s skill curriculum in Minecraft, but Agent0 applies it to mathematical reasoning and trains weights rather than accumulating a skill library. The [Reflexion](../concepts/reflexion.md) pattern is also related but operates via verbal self-critique within a single session rather than cross-session weight updates.

Agent0 is listed as competing with [Agent Zero](../projects/agent-zero.md) in this card's metadata, but the two are quite different: Agent Zero is a deployable autonomous agent with persistent memory and tool plugins; Agent0 is a training framework for improving reasoning capabilities.

## Alternatives

| Use Case | Alternative |
|---|---|
| Runtime tool use without training | [LangGraph](../projects/langgraph.md) |
| Persistent memory across sessions | [Letta](../projects/letta.md) |
| Workflow-level self-optimization | [EvoAgentX](../projects/evoagentx.md) |
| Prompt optimization without RL | [DSPy](../projects/dspy.md) |
| General autonomous agent with skills | [Agent Zero](../projects/agent-zero.md) |

## Sources

- [Repository README](../raw/repos/aiming-lab-agent0.md)
- [Turing Post survey article](../raw/articles/turing-post-9-open-agents-that-improve-themselves.md)
- Papers: arXiv:2511.16043 (Agent0), arXiv:2511.19900 (Agent0-VL)


## Related

- [Agent Zero](../projects/agent-zero.md) — competes_with (0.5)
