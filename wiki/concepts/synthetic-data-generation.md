---
entity_id: synthetic-data-generation
type: approach
bucket: self-improving
abstract: >-
  Synthetic data generation uses AI models to produce training or evaluation
  data, enabling agent self-improvement without requiring large human-labeled
  datasets; its key differentiator is closing the data flywheel loop so agents
  can bootstrap capability gains from their own outputs.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/greyhaven-ai-autocontext.md
  - deep/repos/greyhaven-ai-autocontext.md
related:
  - andrej-karpathy
  - retrieval-augmented-generation
  - obsidian
  - zettelkasten
  - markdown-wiki
  - marp
  - openai
  - anthropic
  - obsidian
  - zettelkasten
  - marp
last_compiled: '2026-04-08T02:59:33.701Z'
---
# Synthetic Data Generation

## What It Is

Synthetic data generation is the practice of using AI models to produce training examples, evaluation benchmarks, or structured knowledge that other models (or the same model) consume to improve. In the agent infrastructure context, this means an agent's successful runs, reasoning traces, or distilled knowledge become inputs to fine-tuning pipelines — creating a feedback loop where deployment generates its own training signal.

The core insight is that frontier models are expensive to run repeatedly but cheap to learn from. If you can capture what a frontier model does well and encode that behavior into a cheaper model, you reduce ongoing inference cost while preserving quality. This is the logic behind every "student-teacher" distillation pipeline, every agent harness that exports successful traces, and every LLM-maintained knowledge base that Karpathy describes as wanting to "finetune to have your LLM 'know' the data in its weights instead of just context windows."

Synthetic data generation sits at the intersection of [Self-Improving Agents](../concepts/self-improving-agents.md), [Continual Learning](../concepts/continual-learning.md), and [Reinforcement Learning](../concepts/reinforcement-learning.md). It is the mechanism that makes those concepts operational.

## Why It Matters for Agent Systems

Traditional fine-tuning requires human-labeled datasets. For general capabilities, this scales — you hire annotators. For domain-specific agent behavior (how to handle a billing dispute, how to navigate a specific codebase, how to recover from a particular failure mode), human annotation is prohibitively slow relative to how fast the task space evolves.

Synthetic generation sidesteps this by treating the agent's own execution as a data source. A successful run through a task becomes a training example. A frontier model's analysis of what went wrong becomes a negative example. The knowledge base an LLM compiles from raw documents becomes fine-tuning material for encoding that knowledge into weights.

This creates three distinct value propositions:

1. **Cost reduction**: Replace expensive frontier model calls with cheaper local model inferences once behavior is stable enough to distill.
2. **Specialization**: Encode domain-specific behavior that no general-purpose training set would cover.
3. **Compounding**: Each generation of runs produces training data, which improves the next generation, which produces better training data.

## How It Works

### The Basic Pipeline

The minimal synthetic data pipeline has three stages:

**Collection**: Capture agent execution traces during frontier model runs. What was the input? What was the output? What was the score? Systems like autocontext implement this in `training/export.py` — extracting input-output pairs from high-scoring generations with rubric alignment. The key filtering step is quality gating: only successful runs become training data, not all runs.

**Formatting**: Convert raw traces into a format suitable for fine-tuning. JSONL with instruction-input-output triples is standard. The challenge is that agent traces often contain reasoning steps, tool calls, and multi-turn context that needs to be structured coherently for the training signal to be meaningful.

**Training**: Fine-tune a target model on the formatted examples. Autocontext uses MLX for Apple Silicon and CUDA backends, managed through `training/runner.py`. The trained model is tracked in `training/model_registry.py` with metadata about which scenario it was trained on and what validation scores it achieved.

### Data Quality as the Core Problem

Raw execution traces are noisy. A run that scored well might have succeeded for the wrong reasons — the task was easy, the evaluation was lenient, or the strategy was lucky rather than generalizable. Feeding that into training produces a model that overfits to specific instances rather than learning transferable patterns.

The better systems address this through multiple mechanisms:

**Score filtering**: Only export traces above a quality threshold. Autocontext gates on quality threshold before export; outputs below the threshold are logged but not included in training data.

**Rubric alignment**: Score against explicit rubrics rather than holistic LLM judgment. This makes the quality filter more reliable and gives the training signal structure — the model can learn which rubric dimensions its output satisfied.

**Diversity sampling**: A training set dominated by similar high-scoring examples overfits. The data export step should sample across different strategies, failure modes, and task variations.

**Curator gating**: In autocontext's multi-agent architecture, the `Curator` agent quality-gates knowledge before it can persist to the playbook. This same gating logic extends to what gets exported as training data — the curator rejects low-quality or contradictory lessons before they contaminate the training set.

### Knowledge Base → Weights

[Andrej Karpathy](../concepts/andrej-karpathy.md) describes a concrete use case: an LLM-maintained markdown wiki grows to ~100 articles and ~400K words through incremental compilation from raw documents. At that scale, context-window-based Q&A works. As the wiki grows further, the natural next step is synthetic data generation plus fine-tuning — converting the wiki's structured knowledge into model weights so the LLM "knows" the domain rather than reading it on each query.

This is a specific instantiation of the general pattern: structured knowledge artifacts (markdown files, playbooks, knowledge graphs) become training data when they grow large enough that context-window-based access becomes expensive or unreliable. The wiki becomes a curriculum.

The pipeline:
1. LLM compiles raw sources into structured markdown (this is itself synthetic generation — the LLM synthesizes the wiki)
2. Wiki grows through query-and-file-back cycles (each query output filed back enhances the corpus)
3. At scale threshold, export wiki as fine-tuning examples (Q&A pairs, concept summaries, cross-references)
4. Fine-tune a local model on the exported data
5. Local model handles future queries against the domain; frontier model handles novel edge cases

### Reinforcement Learning Integration

The most powerful synthetic data pipelines connect to reinforcement learning signals. [GRPO](../concepts/grpo.md) and similar algorithms treat model outputs as rollouts and optimize against a reward function. The "synthetic" element is that the reward function itself can be model-based — an LLM judge that scores outputs.

This creates a self-referential loop: model generates outputs → LLM judge scores them → scores become training signal → model improves. The risk is reward hacking: the model learns to maximize the judge's score rather than actual task quality. Mitigations include diverse judge models, rubric-based scoring that's harder to game, and periodic human validation of the reward signal.

[Voyager](../projects/voyager.md) demonstrates a related pattern in Minecraft: the agent generates skill code, executes it, and the successful skills become a library that future agent runs build on. The "synthetic data" here is the skill library itself — agent-generated, agent-consumable.

### Distillation from Multi-Agent Traces

In systems with multiple specialized agents (like autocontext's competitor/analyst/coach/architect/curator architecture), the multi-agent traces are richer training data than single-agent traces. Each agent's output represents a specialized reasoning step:

- The **analyst's** output is training data for "explain what went wrong in this execution"
- The **coach's** output is training data for "update this playbook given these lessons"
- The **architect's** output is training data for "propose tooling improvements given this performance profile"

Distilling this into a local model means the local model can handle each agent role without separate frontier model calls — the frontier-to-local distillation preserves not just what to do but the specialized reasoning patterns for each role.

### Evaluation Data Generation

Synthetic generation applies equally to evaluation data, not just training data. Generating diverse test cases for agent capabilities is hard with human effort but tractable with LLMs:

- Generate edge cases by asking the model to produce examples that would challenge a baseline approach
- Generate adversarial examples by prompting for inputs designed to trigger failure modes
- Generate coverage-directed examples by identifying underrepresented regions of the input space

[LLM-as-Judge](../concepts/llm-as-judge.md) patterns lean heavily on synthetic evaluation — using one model to evaluate another's outputs, which is itself a form of synthetic data generation (generating quality labels).

## Who Implements It

[OpenAI](../projects/openai.md) and [Anthropic](../projects/anthropic.md) use synthetic data generation extensively in their pre-training and RLHF pipelines — though details of their specific approaches are proprietary. What's public: both use model-generated data to scale instruction following and preference learning beyond what human annotation can produce.

At the research level:
- [DSPy](../projects/dspy.md) generates synthetic training data for prompt optimization — the optimizer generates candidate demonstrations and selects the best-performing ones as few-shot examples
- [Voyager](../projects/voyager.md) generates skill code that becomes a self-expanding skill library
- [Darwin Gödel Machine](../projects/darwin-godel-machine.md) generates agent variants that compete and whose successful code modifications become training signal
- [EvoAgentX](../projects/evoagentx.md) and [AgentEvolver](../projects/agentevolver.md) evolve agent configurations using performance data from prior runs

## Practical Implications

### The Feedback Loop Requires a Quality Gate

Without filtering, synthetic data generation amplifies noise. A model trained on its own unfiltered outputs drifts — the errors in generation 1 become training signal for generation 2, which generates worse outputs, which become worse training signal. This is "model collapse." Every production synthetic data pipeline needs explicit quality filtering before data enters training.

The practical fix: score outputs against external rubrics (not just the generating model's self-assessment), maintain a held-out validation set of human-labeled examples to catch drift, and implement rollback mechanisms when trained model performance degrades.

### Compute Budget Shapes What's Feasible

Frontier model runs are expensive. The calculus for synthetic data generation: does the cost of running frontier model to generate training data amortize over the cost savings from running the distilled local model? For high-frequency tasks (millions of inference calls), yes. For low-frequency tasks (dozens of calls), no.

Autocontext's named presets (`config/presets.py`) encode this tradeoff — quick presets minimize generation cost, while long-run presets budget for many frontier model generations specifically because the expected savings from distillation justify the upfront cost.

### Domain Specificity is the Main Advantage

Synthetic data generation for agent self-improvement is not competitive with general-purpose pre-training on broad tasks. Its advantage is domain specificity. A model fine-tuned on successful billing dispute resolution traces will outperform a general model on billing disputes, even if the general model is larger. The synthetic data encodes task-specific patterns that no general training set would contain.

This means synthetic data generation is most valuable in production agent deployments where the task distribution is narrow and stable enough to accumulate meaningful training signal.

## Failure Modes

**Reward hacking**: The generated quality signal (LLM judge, rubric scores) is itself imperfect. Models learn to maximize the proxy rather than the actual task. Mitigation: diverse judges, rubric decomposition, periodic human validation.

**Distribution shift**: The training distribution (successful runs during development) diverges from the deployment distribution (novel inputs in production). The model performs well on the synthetic training set but fails on real queries. Mitigation: monitor deployment distribution and regenerate training data periodically.

**Overfitting to lucky strategies**: A strategy that succeeded because the task was easy, not because the strategy was good, becomes training data. The model learns brittle patterns. Mitigation: score filtering, diversity sampling, and rubric-based evaluation rather than holistic scoring.

**Credit misattribution in multi-agent traces**: When multiple agents contribute to a successful outcome, attributing credit to the right agent's reasoning is hard. Training on the full trace might reinforce reasoning patterns that were incidental rather than causal. Autocontext's `analytics/credit_assignment.py` addresses this but acknowledges the attribution is correlational, not causal.

**Knowledge contamination across tasks**: If training data from different tasks is mixed without task-level scoping, the model learns conflicting patterns. A playbook lesson from customer support tasks contaminates billing dispute behavior. Mitigation: per-task knowledge scoping (autocontext uses per-scenario storage in `knowledge/<scenario>/`).

## When Not to Use It

Skip synthetic data generation when:

- The task distribution is too broad or rapidly changing for accumulated examples to stay relevant
- You lack a reliable quality signal (no rubric, no ground truth, unreliable LLM judge)
- Task volume is too low to amortize the compute cost of generating training data
- The risk of reward hacking is high relative to the benefit (safety-critical tasks where proxy optimization is dangerous)
- You need the full reasoning capability of the frontier model — distilled local models sacrifice capability for cost, and some tasks require the frontier model's full capability

## Unresolved Questions

**How much data is enough?** No published guidance exists on how many synthetic examples are needed to achieve meaningful distillation for agent tasks. The answer is task-dependent, but practitioners have no principled way to estimate sample requirements before committing to a generation campaign.

**Does synthetic data quality plateau?** After N generations of self-improvement, does the quality of synthetic data stop improving? Or can systems compound indefinitely? The theoretical answer (yes, it plateaus at the frontier model's capability ceiling) conflicts with empirical observations from some systems showing continued gains. The resolution likely depends on whether the task has a clear ground truth signal.

**Governance of generated training data**: Who owns data generated by AI systems trained on human data? When synthetic examples derived from proprietary content enter a fine-tuning pipeline, the provenance chain is unclear. This is unresolved legally and practically.

## Alternatives

**Human annotation**: Use when you need ground truth labels that synthetic methods cannot reliably produce, or when your task distribution is too broad for efficient synthetic coverage.

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)**: Use when the knowledge base is large and changes frequently (synthetic fine-tuning encodes a static snapshot; RAG stays current). Karpathy's framing is accurate: at small-to-medium scale, RAG and LLM-maintained wikis work without fine-tuning. Synthetic generation becomes relevant when the knowledge base is large enough that context-window access is expensive.

**[Prompt Optimization](../concepts/prompt-optimization.md)**: Use when the problem is prompt quality rather than model capability. DSPy's approach of optimizing prompts using synthetic demonstrations is often cheaper than fine-tuning and reversible.

**[Continual Learning](../concepts/continual-learning.md)**: Use when you need the model to adapt continuously rather than in discrete training batches. Synthetic data generation typically feeds batch fine-tuning pipelines; continual learning addresses online adaptation.

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md): The broader framework that synthetic data generation enables
- [Reinforcement Learning](../concepts/reinforcement-learning.md): Provides the optimization algorithm that consumes synthetic reward signals
- [LLM-as-Judge](../concepts/llm-as-judge.md): The quality signal generator that gates what becomes training data
- [Execution Traces](../concepts/execution-traces.md): The raw material that synthetic data pipelines process
- [GRPO](../concepts/grpo.md): A specific RL algorithm used with model-generated training data
- [GEPA](../concepts/gepa.md): Evolutionary prompt optimization that generates synthetic candidate solutions
- [Agent Skills](../concepts/agent-skills.md): What synthetic data generation produces when applied to skill acquisition
- [Continual Learning](../concepts/continual-learning.md): The ongoing adaptation process that synthetic data feeds
