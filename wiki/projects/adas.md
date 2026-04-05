---
entity_id: adas
type: project
bucket: self-improving
sources:
  - repos/shengranhu-adas.md
  - repos/alvinreal-awesome-autoresearch.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
related: []
last_compiled: '2026-04-05T05:37:05.167Z'
---
# ADAS: Automated Design of Agentic Systems

**ICLR 2025 | Apache-2.0 | Python | [ShengranHu/ADAS](https://github.com/ShengranHu/ADAS)**

1,551 stars, 234 forks as of April 2026.

---

## What It Does

ADAS defines and explores a research area: automatically discovering new agent architectures rather than hand-designing them. The core claim is that you can treat agent design as a search problem, and a "meta agent" can search that space by writing new agents as code, evaluating them on benchmarks, and iterating.

The paper introduces **Meta Agent Search** as a concrete algorithm within this framing. A meta agent reads the history of previously discovered agents, proposes a new one, programs it in Python, evaluates it, and stores the result. Repeat until you run out of budget or patience.

This is architecturally distinct from systems that tune prompts or hyperparameters. ADAS searches over agent *code*: the logic, tool use patterns, multi-agent coordination structures, and reasoning strategies that constitute an agent's behavior.

---

## Core Mechanism

The search loop lives in `search.py` inside each domain folder (`_arc/`, `_drop/`, `_mgsm/`, `_mmlu/`). Each domain is self-contained.

**The loop:**

1. The meta agent reads an `archive` of previously discovered agents (stored as code strings with their benchmark scores).
2. It reads the current best agent and the full history of attempts.
3. It generates a new agent by writing Python code for a `forward()` function, which defines how the agent processes inputs.
4. `evaluate_forward_fn()` executes the generated code against the benchmark and scores it.
5. The new agent and its score get appended to the archive.
6. Return to step 2.

**Key design decision:** agents are represented as Python code, not as configuration or prompts. The meta agent literally writes `def forward(self, taskInfo)` implementations that can call LLMs, spawn sub-agents, implement voting schemes, chain-of-thought variants, or any other pattern that can be expressed in code.

The meta agent prompt (in `*_prompt.py` files per domain) seeds the search with descriptions of known design patterns: Chain-of-Thought, Self-Consistency, Reflection, LLM-as-a-Judge, Role Assignment. These serve as vocabulary, not constraints. The meta agent can combine them, modify them, or invent new patterns.

**To adapt to a new domain**, the README specifies three changes: modify `evaluate_forward_fn()` for your task's scoring logic, optionally add basic helper functions the meta agent can call, and update domain-specific descriptions in the prompts. The modularity is genuine — the search loop itself doesn't know anything about the domain.

**Safety caveat from the repo:** the system executes model-generated code directly. The README includes an explicit warning that this code may act destructively due to model limitations or misalignment. There is no sandboxing in the base implementation.

---

## Key Numbers

- **1,551 stars**, 234 forks (self-reported via GitHub, independently verifiable).
- **Outstanding Paper at NeurIPS 2024 Open-World Agent Workshop** (self-reported).
- **ICLR 2025** acceptance (independently verifiable).
- Benchmark results in the paper show discovered agents outperforming hand-designed baselines on ARC, DROP, MGSM, and MMLU. These are self-reported in the paper (arXiv:2408.08435); independent replication results are not documented in the repository.

---

## Strengths

**The search space is genuinely open.** Because agents are code, the meta agent can discover patterns that don't exist in its seed vocabulary. The paper documents cases where discovered agents combine reflection, multi-agent debate, and dynamic role assignment in ways no template would have produced.

**Domain adaptation is low-friction.** The domain-specific logic is isolated to `evaluate_forward_fn()` and the prompt descriptions. Plugging in a new benchmark is a few hours of work, not a rewrite.

**The archive accumulates.** Unlike one-shot prompt engineering, each run builds a searchable history of what worked and what didn't. Later iterations have more signal than earlier ones.

**Published, peer-reviewed work.** The ICLR acceptance means the claims were scrutinized. The code matches what the paper describes.

---

## Critical Limitations

**Concrete failure mode — code execution without sandboxing.** The meta agent generates Python that runs directly in your environment. A hallucinated `os.system()` call, an infinite loop, or a file write to the wrong path will execute. The README acknowledges this risk but the base implementation provides no mitigation. Running ADAS on any task with access to sensitive systems or files is a real operational hazard.

**Unspoken infrastructure assumption — OpenAI API cost at scale.** The search loop calls the meta agent (typically GPT-4 class) for every iteration, then calls the generated agent code (which itself makes LLM calls) for every benchmark example, for every candidate agent. On MMLU with hundreds of examples and dozens of search iterations, costs can reach hundreds of dollars per run. The repository has no cost tracking, no budget caps, no early stopping. Teams without API budget visibility will be surprised.

---

## When NOT to Use It

**Don't use ADAS when you need a production agent today.** Meta Agent Search is a research tool for discovering architectures, not a deployment pipeline. The generated code has no safety guarantees, no versioning, and no infrastructure for serving discovered agents.

**Don't use it when your evaluation function is expensive or slow.** The search requires many evaluations. If scoring a candidate agent takes 10 minutes or $50, the outer loop becomes impractical before it has searched enough of the space to find anything interesting.

**Don't use it when you need reproducibility guarantees.** Because the meta agent is stochastic and the generated code varies across runs, two runs with the same seed may find very different architectures. There is no mechanism for deterministic reproduction of a discovered agent without saving the full archive state.

**Don't use it as a substitute for understanding your task.** The meta agent searches based on benchmark performance. If your benchmark has gaps — it doesn't cover edge cases, or it's gameable — the discovered agent will exploit those gaps. Garbage in, garbage out applies with extra force when the agent is optimizing to the metric rather than the underlying goal.

---

## Unresolved Questions

**What happens to discovered agents across domains?** The repository stores archives per domain but has no mechanism for cross-domain transfer. Whether patterns discovered on MGSM generalize to ARC is left to the user to investigate.

**How does search quality scale with meta agent capability?** The implementation uses GPT-4 class models. Whether weaker models produce useful searches, or whether stronger future models produce qualitatively different results, is not documented.

**Governance of the generated code.** There is no review mechanism between code generation and execution. SICA (a related system) added a review committee that evaluates proposed modifications before they run. ADAS has no equivalent. For research use this may be acceptable; for anything approaching deployment it is not. [Source](../../raw/repos/maximerobeyns-self-improving-coding-agent.md)

**What does convergence look like?** The loop runs until you stop it. There is no documented criterion for when the search has saturated, how to detect diminishing returns, or how to compare archives across multiple runs.

---

## Alternatives

**[SICA (Self-Improving Coding Agent)](https://github.com/MaximeRobeyns/self_improving_coding_agent)** — Use SICA when you want the same self-improvement concept applied to a single agent that modifies its own scaffold code with Docker sandboxing, confidence-interval-aware selection, and a mandatory review committee. SICA is more operationally mature. ADAS searches a broader design space; SICA is more conservative but safer. [Source](../../raw/repos/alvinreal-awesome-autoresearch.md)

**[AIDE (aideml)](https://github.com/WecoAI/aideml)** — Use AIDE when your goal is ML engineering performance (Kaggle-style competitions, benchmark optimization) rather than agent architecture discovery. AIDE uses tree search over code variations and is more focused on ML task performance than agent design.

**Manual agent design with evaluation harness** — Use this when you understand your domain well enough to write a reasonable agent by hand and just want to measure it. ADAS makes sense when you genuinely don't know what agent architecture will work and can afford the search cost.

---

*[Source: ShengranHu/ADAS README](../../raw/repos/shengranhu-adas.md) | [Source: awesome-autoresearch index](../../raw/repos/alvinreal-awesome-autoresearch.md)*
