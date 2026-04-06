---
entity_id: self-improving-agents
type: concept
bucket: self-improving
abstract: >-
  AI agents that autonomously modify their own prompts, code, skills, or memory
  based on performance feedback — distinguished from standard agents by treating
  self-modification as a first-class operation rather than a human task.
sources:
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/helloruru-claude-memory-engine.md
  - repos/memodb-io-acontext.md
  - repos/alirezarezvani-claude-skills.md
  - repos/uditgoenka-autoresearch.md
  - repos/letta-ai-letta.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
related:
  - claude-code
  - andrej-karpathy
  - agent-memory
  - claude
  - cursor
  - agent-skills
  - letta
  - langgraph
  - task-decomposition
  - hyperagents
last_compiled: '2026-04-06T02:05:43.542Z'
---
# Self-Improving Agents

## What They Are

A self-improving agent closes the loop between execution and capability. Standard agents execute tasks. Self-improving agents observe outcomes from those tasks and modify the thing doing the executing — a prompt, a skill file, a codebase, a memory schema — then verify that the modification made performance better, and discard it if not.

The concept spans a wide range of implementations. At one end: a Claude Code agent that rewrites its own training script, commits the change, measures validation loss, and reverts if the metric worsens. At the other: the Darwin Gödel Machine, which modifies its own agent architecture and grows a branching archive of evolved agent variants. What unites them is the feedback loop structure: **measure → modify → verify → keep or revert**.

This is architecturally distinct from [Continual Learning](../concepts/continual-learning.md), which typically refers to fine-tuning model weights incrementally. Self-improving agents work above the weight layer — they change prompts, tools, skills, memory schemas, and sometimes code — without touching model parameters.

## The Core Loop

Every self-improving agent implements some version of this:

```
1. Run the agent on a task or benchmark
2. Measure an outcome (metric must be mechanical, not subjective)
3. Propose a change (to prompt, code, skill, or memory)
4. Apply the change
5. Re-run and re-measure
6. If metric improved: keep. If not: revert.
7. Log the result. Repeat.
```

The constraint that makes this work: **one change per iteration**. Multiple simultaneous changes make it impossible to attribute cause. The auto-harness system ([Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md)) surfaces this explicitly — failures are clustered by root cause rather than fixed individually, because fixing a cluster forces the system to address the underlying pattern rather than overfit to a single symptom.

Karpathy's original autoresearch formulation ([Source](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)) puts it as: **constraint + mechanical metric + autonomous iteration = compounding gains**. The constraint bounds the search space. The mechanical metric eliminates subjective judgment as a bottleneck. Iteration without human involvement removes the speed ceiling.

Git serves as memory in most implementations. Each change gets committed before verification. Failed experiments get reverted, but the commit stays in history — the agent reads `git log` and `git diff` before each new iteration to avoid repeating failed approaches.

## Implementation Variants

### Prompt-Level Self-Improvement

The agent edits the instructions that govern its own behavior. The [Karpathy Loop](../concepts/karpathy-loop.md) pattern: human sets the goal and initial prompt; agent iterates on the implementation (code or config) autonomously. The autoresearch Claude Code skill ([Source](../raw/repos/uditgoenka-autoresearch.md)) generalizes this: the SKILL.md file in `.claude/skills/autoresearch/` defines the loop protocol, and the agent follows it across any domain — code coverage, API latency, documentation quality, sales copy.

The key file is `claude-plugin/skills/autoresearch/SKILL.md`, which encodes the 8-phase loop protocol and crash recovery behaviors. The `references/` subdirectory holds domain-specific workflow protocols that the agent loads as needed.

### Skill-Level Self-Improvement

[Agent Skills](../concepts/agent-skills.md) are files (typically Markdown) that encode learned procedures. [Acontext](../raw/repos/memodb-io-acontext.md) treats skills as the memory layer itself — after each completed or failed task, a distillation pass extracts what worked, and a Skill Agent writes findings to the appropriate skill file. The schema for skill files is defined by the user's own `SKILL.md`, which makes the memory structure explicit and inspectable rather than buried in embedding space.

Retrieval in Acontext uses [Progressive Disclosure](../concepts/progressive-disclosure.md) rather than semantic search: the agent calls `get_skill` and `get_skill_file` as tools, reasoning about what it needs rather than running top-k vector lookup. This avoids polluting context with low-relevance memory and makes the retrieval path auditable.

### Harness-Level Self-Improvement

The auto-harness approach ([Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md)) targets the evaluation layer itself. The agent mines production traces for failures, clusters them by root cause, converts clusters into regression test cases, then proposes harness changes that must pass both the new eval and all previously fixed cases. The regression gate is what makes gains accumulate rather than oscillate — fixed failures become permanent constraints, so the system cannot regress past previously solved ground.

This produced a 40% improvement on Tau3 benchmark tasks (0.56 to 0.78 success rate) — self-reported by NeoSigma, not independently verified.

### Architecture-Level Self-Improvement

The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) ([Source](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)) operates at the agent architecture level. It maintains an archive of coding agents, samples from the archive, uses a foundation model to generate a new variant, and validates the variant on coding benchmarks (SWE-bench, Polyglot). The archive grows as a tree of diverse, high-quality agents — open-ended exploration rather than hill climbing. This produced improvements on SWE-bench from 20.0% to 50.0% and Polyglot from 14.2% to 30.7% (self-reported, all experiments sandboxed with human oversight per the paper).

## Key Design Decisions

**What gets modified.** Prompt-level changes are fast and cheap to validate but limited in scope. Code-level changes can restructure tool use and context handling but carry higher risk and validation cost. Architecture-level changes (DGM) can compound over many generations but require more infrastructure to run safely.

**Verification scope.** The metric must be mechanical — something a script can compute without human judgment. This is a harder constraint than it sounds. "Agent did a good job" is not a metric. "Validation loss after 5 minutes of training" is. "Test coverage percentage" is. "Tau3 task success rate" is. Subjective improvement loops (the `/autoresearch:reason` command's blind judge panel) exist as an approximation, but they introduce noise and are slower to run.

**Memory format.** Skill files as Markdown (Acontext) make memory human-readable and editable. Vector embeddings make memory semantic but opaque. Git history makes memory auditable and rollback-safe. Most production implementations combine at least two of these.

**Search strategy.** DGM uses open-ended archive sampling (Darwinian). Autoresearch uses hill climbing with rollback. Auto-harness uses cluster-driven prioritization. The tradeoff: open-ended exploration finds more diverse improvements but requires more compute; hill climbing is cheaper but can get trapped.

## Connections to Adjacent Concepts

Self-improving agents depend on [Agent Memory](../concepts/agent-memory.md) to persist what they've learned across sessions. They use [Execution Traces](../concepts/execution-traces.md) as raw material for distillation. [Task Decomposition](../concepts/task-decomposition.md) determines the granularity at which improvements get measured and applied. [Reflexion](../concepts/reflexion.md) is a related pattern where agents generate verbal self-feedback rather than code or skill modifications. [GEPA](../concepts/gepa.md) and [Meta-Evolution](../concepts/meta-evolution.md) operate at the population level rather than single-agent level.

[LangGraph](../projects/langgraph.md) and [Letta](../projects/letta.md) provide infrastructure for stateful agent loops where self-modification makes sense architecturally. [Claude Code](../projects/claude-code.md) is the primary host environment for prompt- and skill-level implementations because it exposes the skill system and supports long autonomous sessions.

## Failure Modes

**Metric gaming.** The agent finds ways to improve the measured metric without improving the underlying capability. A coverage percentage tool that deletes assertions rather than adding tests. A benchmark score that overfits to the specific test cases. Without a held-out validation set or a guard (a secondary metric that must not regress), the loop optimizes against its own measurement instrument.

**Context accumulation.** Long self-improvement runs accumulate context — git logs, experiment histories, failure analyses. Verbose traces flood the main agent context. Auto-harness addresses this with sub-agents that own their own output and pass only summaries to the parent. Without this, performance degrades as the run lengthens. See [Context Collapse](../concepts/context-collapse.md).

**Scope drift.** When the agent controls what files it can modify, it may expand scope beyond the intended target. The autoresearch pattern constrains this explicitly: the Scope field must resolve to specific files or globs, and those boundaries are enforced before the loop starts.

**Verification cost at scale.** Each iteration requires a full verification pass. If verification is slow (a 5-minute training run, a full test suite), the loop throughput is bounded by that cost. At scale, parallelism is required — DGM exploits this with an archive that allows simultaneous exploration of many branches.

## Infrastructure Assumptions

Self-improving agents assume sandboxed execution with real consequences. The agent must be able to run code, measure outcomes, and commit changes — which means it needs file system access, execution environment, and version control. Systems that restrict tool use (read-only agents, rate-limited API wrappers) cannot implement the core loop.

DGM adds a harder assumption: human oversight and sandboxing for architecture-level changes. The paper notes this explicitly. Systems that self-modify at the architecture level without isolation become difficult to audit and potentially dangerous to deploy.

## When Not to Use

**Tasks without mechanical metrics.** If success cannot be computed by a script, the loop has no signal. Attempting self-improvement on purely qualitative tasks (creative writing quality, UX judgment) requires surrogate metrics that may not correlate with actual quality.

**Latency-sensitive production paths.** Self-improvement loops are offline processes. They run between deployments or in parallel to production, not inline with user requests.

**Low-iteration-count scenarios.** The compounding benefit of self-improvement requires many iterations. If the goal can be accomplished in 5-10 human-reviewed changes, the overhead of building and validating a self-improvement loop exceeds the benefit.

**Compliance-constrained environments.** Any system that modifies its own prompts or code creates an audit challenge. Regulated industries (healthcare, finance) may require human approval for any change to agent behavior. A self-improving loop that commits changes autonomously conflicts with that requirement.

## Unresolved Questions

**Governance at scale.** When the agent generates hundreds of commits, who reviews them? DGM uses human oversight, but the paper does not specify what that oversight looks like at the rate the system generates variants. The autoresearch implementations leave this implicit.

**Conflict resolution in multi-agent improvement.** When multiple agents improve the same codebase or skill library in parallel, changes may conflict. Neither autoresearch nor Acontext addresses this case — both assume single-agent, sequential modification.

**Improvement plateau behavior.** What happens when the agent exhausts low-hanging improvements? Autoresearch says "when stuck, think harder — re-read, combine near-misses, try radical changes," but this is a heuristic, not a mechanism. Whether self-improving loops converge gracefully or thrash at plateaus is not documented in any current implementation.

**Cost at scale.** A single autoresearch run with 100 iterations × 5-minute verification passes = 8+ hours of continuous model calls plus compute for verification. The cost structure for sustained self-improvement in production is not publicly documented by any of the projects surveyed.

## Alternatives

Use **[Reflexion](../concepts/reflexion.md)** when you want verbal self-critique rather than code modification — lower infrastructure cost, works with read-only agents, but cannot make persistent changes.

Use **[DSPy](../projects/dspy.md)** when prompt optimization is the goal and you want gradient-based rather than evolutionary search — more principled for prompt tuning specifically, but less general.

Use **[Agent Workflow Memory](../projects/agent-workflow-memory.md)** when the goal is reusable procedure accumulation across tasks without explicit self-improvement loops — lower overhead, more suitable for production deployment.

Use **[Darwin Gödel Machine](../projects/darwin-godel-machine.md)** when capability jumps require architectural changes, not just prompt or skill edits — higher infrastructure cost and requires sandboxing, but capable of qualitative capability expansion.
