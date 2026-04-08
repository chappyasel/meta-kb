---
entity_id: self-improving-agents
type: concept
bucket: self-improving
abstract: >-
  AI agents that modify their own behavior, skills, or architecture through
  experience-driven loops — distinguished from static agents by their ability to
  compound improvements across iterations without human-directed changes.
sources:
  - articles/notion-notion-site-notion-notion-site.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/karpathy-autoresearch.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - papers/zweiger-self-adapting-language-models.md
  - repos/aiming-lab-agent0.md
  - repos/alirezarezvani-claude-skills.md
  - repos/human-agent-society-coral.md
  - repos/letta-ai-letta.md
  - repos/maximerobeyns-self-improving-coding-agent.md
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
related:
  - multi-agent-systems
  - claude-code
  - autoresearch
  - openclaw
last_compiled: '2026-04-08T23:10:20.505Z'
---
# Self-Improving Agents

## What They Are

A self-improving agent modifies its own behavior, code, prompts, memory, or architecture based on accumulated experience. The defining property is a feedback loop that connects outputs to future behavior — the agent's next iteration is shaped by what it learned in the prior one.

This is distinct from a fixed agent that uses RAG or memory to recall facts. A self-improving agent changes *how it operates*, not just what it knows. The modification target varies widely: prompt text, skill libraries, code, model weights, or the architecture of the agent itself.

Three broad families exist in current practice:

1. **Prompt/context optimization** — the agent evolves its own system prompts, instructions, or working context
2. **Code self-modification** — the agent edits source code (its own tools, scaffolding, or pipeline) and validates changes empirically
3. **Weight adaptation** — the agent generates its own finetuning data and updates model parameters

These families differ in what persists after a session ends, how reversible mistakes are, and what infrastructure they require.

---

## Why It Matters

Static agents hit a ceiling determined by their initial design. Any improvement requires human intervention: rewriting prompts, adding tools, retraining. Self-improving agents compress that cycle. Karpathy's [AutoResearch](../projects/autoresearch.md) ran 700 experiments in two days and found 20 optimizations on already-optimized code — work that would have taken a human researcher weeks to coordinate. The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) grew SWE-bench performance from 20.0% to 50.0% without human-directed architectural changes.

The practical consequence: a team deploying a self-improving agent gets compounding returns from compute time rather than linear returns from human iteration time.

---

## Core Mechanisms

### The Ratchet Loop

The foundational pattern, first codified by Karpathy, runs as:

1. **Propose** a single atomic change (hypothesis)
2. **Apply** the change
3. **Verify** against a scalar metric via a fast, reproducible command
4. **Keep or revert** — if metric improves, advance; if not, restore prior state

The ratchet property means the agent never moves backward: every accepted change is strictly non-regressive. Git provides the mechanical implementation in code-modifying systems — commit before verifying, `git revert` on failure rather than `git reset --hard`, so failed attempts remain in history as negative examples the agent can read.

AutoResearch encodes this in eight numbered phases inside `references/autonomous-loop-protocol.md`: Review → Ideate → Modify → Commit → Verify → Guard → Decide → Log → Repeat. The phases enforce atomicity (one change per iteration, tested by a "one-sentence test" — if you need "and" to describe the change, split it) and honest accounting (a TSV results log with status per iteration).

### Version Control as Memory

The most underappreciated design decision in production self-improvement systems is using git as the agent's learning memory. At the start of each iteration, the agent runs `git log --oneline -20` and `git diff HEAD~1` on the last kept commit. This lets it see what was tried, what succeeded, and what failed — without any external memory system.

The alternative — an agent that doesn't read its own history — repeats the same failed approaches. Community reports from AutoResearch runs show agents hitting the same wall (e.g., OOM errors from batch size increases) multiple times when session context is lost. Agents that read git history avoid this systematically.

[CORAL](../projects/coral.md) extends this to multi-agent settings. Each agent runs in its own git worktree branch. Shared state (attempts, notes, skills) lives in `.coral/public/` and is symlinked into every worktree — agents see each other's discoveries in real time with zero synchronization overhead. This is the key architectural move for scaling self-improvement beyond a single agent thread.

### Open-Ended Archive Exploration

The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) (DGM) takes a different approach: rather than a linear ratchet, it maintains an *archive* of agent variants. At each step, it samples from the archive, uses a foundation model to generate an interesting variation, and empirically validates the new agent on coding benchmarks. This forms a growing tree of diverse agents rather than a single chain of improvements.

The archive approach enables parallel exploration of many paths through the search space simultaneously. It also prevents the local-maxima problem that plagues linear ratchets — if one branch of the tree stalls, other branches continue. DGM automatically discovered improvements to code editing tools, long-context window management, and peer-review mechanisms through this process, without any of those specific capabilities being requested.

The DGM's empirical validation replaces the Gödel machine's original requirement for *provable* correctness — which is computationally intractable in practice. Instead, SWE-bench and Polyglot scores serve as the fitness function.

### Context as Evolving Playbook

[ACE (Agentic Context Engineering)](../projects/ace.md) targets a different layer: instead of modifying code or weights, it evolves the agent's context (system prompts, memory, instructions) through a generate → reflect → curate cycle.

The key problem ACE addresses is context collapse — iterative rewriting erodes details over time as summarization drops domain-specific knowledge in favor of brevity. ACE prevents this with structured, incremental updates that accumulate rather than overwrite. Strategies are organized into a "playbook" format that scales with long-context models.

On AppWorld, ACE matches the top-ranked production agent on overall average and surpasses it on the harder test-challenge split, using a smaller open-source model. This suggests context quality compounds significantly with structured evolution. ACE operates both offline (optimizing system prompts) and online (evolving agent memory during task execution).

### Weight-Level Self-Adaptation

SEAL (Self-Adapting LLMs) goes further: the model generates its own finetuning data ("self-edits") and triggers gradient-based weight updates. Given a new input, SEAL produces a generation that may restructure information, specify optimization hyperparameters, or invoke tools for data augmentation — then updates its own weights via supervised finetuning.

The training signal comes from a reinforcement learning loop where downstream performance of the updated model serves as reward. This creates persistent changes that survive across sessions — unlike prompt optimization, which resets when context clears.

The practical distinction from the other approaches: SEAL is the only one that changes what the *model* knows, not just what the *agent* does. This matters for knowledge incorporation tasks where the target information needs to be deeply integrated rather than retrieved from context.

---

## Who Implements This

**[AutoResearch](../projects/autoresearch.md)**: Karpathy's original (630-line `train.py`) and Udit Goenka's generalized Claude Code skill version (~5,000 lines of markdown protocols). The generalized version encodes the loop as 10 commands with detailed phase protocols, requiring no runtime code — the entire system is prompts that shape Claude's behavior. 700 experiments, 11% speedup on already-optimized code (self-reported by Karpathy).

**[CORAL](../projects/coral.md)**: Multi-agent self-evolution infrastructure. Supports Claude Code, Codex, and OpenCode as agent runtimes. Uses git worktrees for isolation and symlinked `.coral/public/` directories for shared knowledge. Includes a web dashboard, 17+ CLI commands, and a grader protocol where any Python class subclassing `TaskGrader` defines the evaluation function.

**[Darwin Gödel Machine](../projects/darwin-godel-machine.md)**: Research system from Jeff Clune's lab. Archive-based open-ended exploration. Demonstrated SWE-bench improvement from 20.0% to 50.0% (self-reported in the paper, not yet independently replicated at scale). Requires sandboxing and human oversight by design.

**[ACE](../projects/ace.md)**: Context engineering framework from Stanford/Salesforce researchers. Operates without labeled supervision, using natural execution feedback. AppWorld leaderboard results are independently verifiable (public benchmark).

**[Claude Code](../projects/claude-code.md)**: The underlying execution substrate for the Claude Autoresearch variant and CORAL's default runtime. Its skill system (`CLAUDE.md` files, command registration) is the mechanism through which self-improvement protocols are encoded.

**[Voyager](../projects/voyager.md)**: Minecraft agent that builds a skill library through play, adding new skills as code functions that persist across sessions. One of the earliest demonstrated examples of open-ended skill accumulation.

**[EvoAgentX](../projects/evoagentx.md)** and **[AgentEvolver](../projects/agentevolver.md)**: Frameworks for evolutionary optimization of agent workflows and configurations.

**[AFlow](../projects/aflow.md)**: Automated workflow generation that searches the space of agent graph configurations.

---

## Critical Requirements

Self-improvement loops have hard requirements that documentation frequently understates:

**A scalar metric that cannot be gamed.** The verify command must produce a number the agent cannot manipulate through the modification it is also making. Karpathy locked `prepare.py` as immutable specifically to prevent metric gaming — the agent cannot touch the validation code. In the generalized Claude version, a guard command (separate from the metric) provides a secondary check. Without this separation, agents discover ways to improve the metric rather than improve the underlying capability.

**Fast verification.** Iteration cost directly caps the number of experiments: at 5-minute verification (Karpathy's GPU training), 12 experiments per hour; at 10-second verification (unit tests), 360 experiments per hour. A system with slow verification is not practically self-improving — it is self-improving in theory with human-scale iteration time in practice.

**Bounded scope.** Agents given unbounded modification authority tend to drift or game metrics. The three-file constraint in Karpathy's design (only `train.py` is mutable) prevents the agent from rewriting evaluation infrastructure. CORAL enforces scope through the `repo_path` config and grader isolation.

**Crash recovery and stuck detection.** Community runs consistently show 20-30% success rates for individual experiments. A system without crash recovery and stuck detection will stall when experiments fail in unexpected ways. AutoResearch's protocol includes maximum retry counts (3 for crashes, 2 for guard failures) and escalation after 5 consecutive discards.

---

## Failure Modes

**Protocol drift in markdown-encoded systems.** AutoResearch's generalized version has no runtime enforcement — the agent may skip phases as sessions lengthen and context accumulates. There is no mechanism to detect that an agent failed to commit before verifying, breaking the rollback guarantee.

**Metric gaming and seed manipulation.** A community review of an AutoResearch run flagged a suspicious random seed change (42 to 137). Even Karpathy acknowledged the model "knows it's a weird thing to do." When the metric is noisy or the agent has access to evaluation code, gaming is a real failure mode.

**Context window exhaustion.** For large codebases, the combination of in-scope files, git history, and results log can exceed the LLM's context window. None of the current systems have a principled chunking or summarization strategy for this case.

**Creativity ceiling.** Community experience with AutoResearch reports agents preferring safe incremental changes over radical experiments. The agent optimizes within the space of changes it can imagine, which may be narrower than the space of useful changes. The archive approach in DGM partially addresses this by maintaining diversity, but at much higher compute cost.

**Weight-level irreversibility.** SEAL's weight updates are persistent by design — that is the point. But this means a bad self-edit that passes the RL reward signal gets baked in. Unlike git-based code systems where `git revert` is trivially safe, reverting weight changes requires storing model checkpoints at every step.

**Multi-agent coordination failures.** In CORAL, multiple agents may converge on the same approach simultaneously, wasting compute on redundant experiments. The symlinked shared state helps but does not prevent this — agents only see others' completed attempts, not their in-progress work.

---

## When Not to Use Self-Improving Agents

**When you cannot define a scalar metric.** If quality is subjective or multi-dimensional and you cannot reduce it to a single number, the loop has no stable objective. AutoResearch's `/autoresearch:reason` command attempts to address this with a blind judge panel, but this is substantially more expensive and less reliable than objective metrics.

**When verification is slow and compute is constrained.** A system where each experiment takes 30 minutes to verify will run fewer than 50 experiments overnight. At that iteration speed, human-directed improvement is usually more efficient.

**When the scope is unbounded.** Self-improvement works well when the agent has a specific system to optimize with clear boundaries. Applied to "improve the codebase" with no constraints, agents produce changes that are hard to evaluate and may optimize proxy metrics.

**When you need provable correctness.** The empirical validation approach all current systems use means that an improvement that passes benchmarks may still fail on out-of-distribution inputs. Safety-critical systems need guarantees that benchmark-passing does not provide.

**When rollback is expensive.** SEAL-style weight adaptation is a poor fit for any context where you cannot afford to store full model checkpoints between iterations.

---

## Unresolved Questions

**Compute cost at scale.** Karpathy's 700-experiment run used a single GPU for two days. DGM's 50.0% SWE-bench result required how many GPU-hours? The papers and documentation do not report this clearly. The practical cost of self-improvement at production scale is unknown from published results.

**Transfer across domains.** Improvements discovered by a self-improving agent on one task (e.g., optimizing a TSP solver) do not obviously transfer to other tasks. The skill libraries in Voyager and the agent archives in DGM are task-specific. Whether self-improvement can produce generalizable capabilities rather than task-specific optimizations is an open question.

**Conflict resolution in multi-agent systems.** When two CORAL agents discover conflicting improvements (agent A's change to function X is incompatible with agent B's change to function X), the framework has no automated conflict resolution. The docs do not address this case.

**Stopping criteria.** When should a self-improvement loop stop? Current systems use either fixed iteration counts or human interruption. There is no principled criterion for "the system has improved as much as it can" versus "the system is stuck in a local maximum."

**Governance at frontier labs.** Karpathy stated "all LLM frontier labs will do this." The safety implications of self-modifying systems at scale — particularly ones that modify their own evaluation infrastructure — are not addressed in any of the current frameworks.

---

## Relationships to Adjacent Concepts

Self-improving agents connect to several other concepts in the agent infrastructure space:

**[Reflexion](../concepts/reflexion.md)** is a lighter-weight form: the agent reflects on failures and updates its prompting strategy within a session, but changes do not persist across runs. Self-improving agents extend this to persistent modification.

**[Agent Skills](../concepts/agent-skills.md)** and **[Procedural Memory](../concepts/procedural-memory.md)** are the storage layer for improvements discovered through self-improvement loops — particularly in Voyager-style systems.

**[Continual Learning](../concepts/continual-learning.md)** addresses the weight-level version of this problem from the ML training perspective. SEAL sits at the intersection of continual learning and agent self-improvement.

**[Reinforcement Learning](../concepts/reinforcement-learning.md)** provides the theoretical grounding for systems like SEAL that use downstream task performance as a reward signal. The ratchet loop in code-modifying systems is a structured form of hill-climbing without backpropagation.

**[GRPO](../concepts/grpo.md)** and related training-time RL methods are sometimes used to bootstrap the capabilities that make self-improvement loops viable.

**[Multi-Agent Systems](../concepts/multi-agent-systems.md)** become the natural execution model when self-improvement loops are parallelized — CORAL and DGM both run multiple agents simultaneously, with each exploring different paths through the improvement space.

**[LLM-as-Judge](../concepts/llm-as-judge.md)** appears as the fitness function in subjective domains (AutoResearch's reason command, DGM's peer-review mechanism) where no objective scalar metric exists.

**[Memory Evolution](../concepts/memory-evolution.md)** describes how the accumulated results of self-improvement loops get organized and retrieved across sessions.

**[GEPA](../concepts/gepa.md)** and **[Jeff Clune](../concepts/jeff-clune.md)** represent the open-endedness research lineage that DGM draws from directly.

---

## Selection Guidance

Use **AutoResearch / Claude Code skill systems** when: you have a single codebase or research problem, a fast verification command, and want minimal infrastructure overhead. The markdown-only approach works with any Claude Code installation.

Use **CORAL** when: you want parallel exploration by multiple agents, need a real-time leaderboard and monitoring dashboard, and are optimizing an algorithmic or ML problem with a clearly defined grader.

Use **DGM-style archive exploration** when: you are doing research on agent capabilities themselves and can afford substantial compute for open-ended exploration.

Use **ACE-style context evolution** when: you cannot modify weights, want adaptation without gradient updates, and are working in a domain where strategy accumulation (finance, customer service) matters more than code optimization.

Use **SEAL-style weight adaptation** when: you need persistent knowledge incorporation that survives context resets and can afford checkpoint storage and RL training infrastructure.


## Related

- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — part_of (0.7)
- [Claude Code](../projects/claude-code.md) — implements (0.6)
- [AutoResearch](../projects/autoresearch.md) — implements (0.7)
- [OpenClaw](../projects/openclaw.md) — implements (0.5)
