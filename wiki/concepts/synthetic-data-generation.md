---
entity_id: synthetic-data-generation
type: approach
bucket: self-improving
abstract: >-
  Synthetic data generation creates artificial training data to improve AI
  models, with frontier-to-local distillation as the key pattern: large models
  produce examples that teach smaller ones to handle tasks cheaper.
sources:
  - deep/repos/greyhaven-ai-autocontext.md
  - repos/greyhaven-ai-autocontext.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
related:
  - andrej-karpathy
  - openai
  - anthropic
  - obsidian
  - zettelkasten
  - markdown-wiki
  - marp
last_compiled: '2026-04-08T23:16:38.163Z'
---
# Synthetic Data Generation

## What It Is

Synthetic data generation covers techniques for creating artificial training examples rather than collecting them from human-labeled sources. For LLM agents specifically, this means generating input-output pairs, trajectories, reasoning chains, or preference annotations that can train or fine-tune models on capabilities they need but don't have good natural data for.

The core insight driving current practice: frontier models (GPT-4, Claude Opus, Gemini Ultra) can produce high-quality demonstrations of tasks that smaller, cheaper models struggle with. Those demonstrations become training data. The smaller model learns to approximate the frontier model's behavior at a fraction of the inference cost. [Andrej Karpathy](../concepts/andrej-karpathy.md) identified this trajectory explicitly: as a knowledge base grows, "the natural desire is to also think about synthetic data generation + finetuning to have your LLM 'know' the data in its weights instead of just context windows."

This makes synthetic data generation the bridge between [context engineering](../concepts/context-engineering.md) (what you put in the prompt) and weight-level capability (what the model knows permanently).

## Why It Matters for Agent Systems

Agent infrastructure creates a particular data scarcity problem. Useful training data for agents requires complete trajectories: the initial state, every tool call, every intermediate observation, the final answer, and ideally a quality signal. Human labelers cannot easily produce this at scale. Existing web data doesn't contain it. So agent developers face a choice: train on sparse, noisy human demonstrations, or generate dense, structured demonstrations synthetically.

[Self-improving agents](../concepts/self-improving-agents.md) make this especially acute. A system like [Voyager](../projects/voyager.md) generates its own skill library through execution. Autocontext exports training data from successful runs to distill frontier behavior into local models. The training pipeline in `autocontext/training/` (specifically `training/export.py` and `training/runner.py`) captures input-output pairs from high-scoring generations, then fine-tunes local models via MLX on Apple Silicon or CUDA backends. The distilled model eventually replaces the frontier model for that scenario, reducing cost while preserving learned behavior.

[OpenAI](../projects/openai.md) and [Anthropic](../projects/anthropic.md) both use synthetic data in pre-training and alignment pipelines, though the specifics remain proprietary. The general pattern is public: generate candidate responses with a capable model, filter by quality criteria, use for supervised fine-tuning or [reinforcement learning](../concepts/reinforcement-learning.md) from feedback.

## Core Patterns

### Frontier-to-Local Distillation

The highest-value pattern currently in production. A frontier model generates demonstrations of a task. A smaller local model trains on those demonstrations. Quality gating filters out demonstrations below a threshold before training. The smaller model learns to reproduce frontier-quality outputs at local inference costs.

Autocontext's implementation illustrates the concrete mechanism: `training/export.py` extracts (prompt, response) pairs from SQLite run logs for generations that scored above the quality threshold. `training/runner.py` handles the fine-tuning call. `training/model_registry.py` tracks trained models with metadata (which scenario they were trained on, their validation scores). When a distilled model meets the promotion threshold, it replaces the frontier model for future runs of that scenario.

The economics are straightforward: frontier API calls cost orders of magnitude more than local inference. If a task repeats frequently enough, the training cost pays for itself quickly.

### Trajectory Generation for Agent Tasks

Standard supervised fine-tuning trains on (input, output) pairs. Agent tasks require (state, action, observation, state, action, ..., final answer) trajectories. Generating these synthetically means either:

- Running a capable agent on the task and recording its trace
- Having a frontier model generate plausible trajectories given a problem description
- Using execution to verify trajectory quality (did the final answer match the ground truth?)

[Execution traces](../concepts/execution-traces.md) are particularly valuable because they carry implicit quality signals: traces that completed successfully and produced correct outputs are positive examples; traces that failed are negative examples or can be used for preference learning.

### Constitutional and Self-Critique Data

Models can generate critiques of their own outputs and revisions in response. [Chain-of-thought](../concepts/chain-of-thought.md) reasoning can be generated synthetically by prompting a model to think step-by-step, then using those reasoning chains as training data to teach smaller models to reason. This is how much of the current "reasoning model" infrastructure works: generate chain-of-thought with a capable model, train a smaller model to produce similar chains.

[Reflexion](../concepts/reflexion.md) uses a related pattern: an agent generates a self-critique of a failed attempt, then uses that critique to revise. The critique-revision pairs are themselves synthetic data about how to improve responses.

### Knowledge Distillation into Weights

Karpathy's wiki system points at a specific use case: as a personal knowledge base grows (he mentions ~100 articles, ~400K words), retrieving relevant content via context injection becomes expensive and unreliable. The alternative is to distill the knowledge into model weights through fine-tuning, so the model "knows" the information without needing it in the context window. This converts [retrieval-augmented generation](../concepts/retrieval-augmented-generation.md)'s runtime cost into a one-time training cost.

[Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

### Quality Filtering and Verification

Synthetic data quality varies enormously. Unfiltered synthetic data can hurt model performance more than no fine-tuning at all. Standard filtering approaches:

- **LLM-as-judge**: Use a capable model to score generated examples. [LLM-as-judge](../concepts/llm-as-judge.md) introduces its own biases but scales well. Autocontext's `execution/llm_judge.py` uses multi-sample evaluation with a 4-tier fallback parser for score extraction.
- **Execution verification**: For code or math, run the answer and check correctness. Binary signal, high reliability.
- **Human review**: Expensive but highest quality. Used for small high-stakes datasets.
- **Self-consistency**: Generate multiple solutions, keep examples where multiple samples agree.

## Implementation Details

### Data Formats

Training data for fine-tuning typically takes one of three forms:

- **Supervised fine-tuning (SFT)**: `{"prompt": "...", "completion": "..."}` pairs in JSONL format
- **Preference data**: `{"prompt": "...", "chosen": "...", "rejected": "..."}` for DPO or similar methods
- **Conversation format**: Multi-turn chat formatted per the target model's chat template

[GRPO](../concepts/grpo.md) and similar reinforcement learning methods require reward signals rather than direct demonstrations, but synthetic data generation feeds into the reward model training as well.

### Volume Requirements

Effective fine-tuning on a narrow task typically needs hundreds to low thousands of high-quality examples. Trying to teach broad capability requires much more. For specialist agent skills (handling a specific type of customer query, writing code in a particular style, using a particular tool set), 500-2000 filtered examples often suffice for meaningful improvement. For general capability expansion, synthetic data alone is insufficient.

### Contamination Risks

Synthetic data generated by a frontier model carries that model's biases, errors, and knowledge cutoff. Fine-tuning on frontier-generated data can transfer:
- Incorrect factual beliefs
- Stylistic patterns that don't generalize
- Failure modes the frontier model has

This is why execution-based verification is valuable for tasks where correctness is checkable. For tasks where it isn't, quality filtering is imperfect.

## Practical Applications

**Agent skill acquisition**: [Voyager](../projects/voyager.md) generates a skill library through execution in Minecraft. Skills that successfully complete tasks get stored; the model learns to retrieve and compose them. This is synthetic data generation through self-play.

**Self-improving harnesses**: Autocontext exports successful run trajectories as training data. The `training/export.py` function pulls high-scoring (prompt, response) pairs from SQLite, filters by generation quality score, and formats for fine-tuning. Stable behavior trained into a local model reduces frontier API costs for repeated tasks.

**Capability elicitation**: Sometimes a model has latent capability but doesn't apply it reliably. Generating demonstrations of the model using that capability correctly, then fine-tuning on those demonstrations, can surface it more consistently. This is how many "reasoning" fine-tunes work.

**Domain adaptation**: A general model fine-tuned on synthetic examples drawn from a specific domain (medical records, legal documents, code in a specific framework) often outperforms the general model on that domain, even if the synthetic data was itself generated by the general model.

## Failure Modes

**Data poisoning through quality failures**: Bad data degrades model performance. If the quality filter is too permissive, synthetic data introduces errors faster than it teaches capabilities. Autocontext's curator agent attempts to prevent this at the knowledge level before distillation, but the filtering problem recurses: who grades the grader?

**Distribution collapse**: Fine-tuning on synthetic data from one frontier model can collapse the smaller model's output distribution toward that model's particular style and failure modes. The smaller model becomes a worse version of the frontier model rather than an efficient specialist.

**Reward hacking in RL pipelines**: When synthetic data feeds a reward model, the policy being trained can learn to satisfy the reward model without actually improving on the underlying task. This is a well-documented problem in [reinforcement learning](../concepts/reinforcement-learning.md) from AI feedback pipelines.

**Cost of generation at scale**: Generating enough high-quality synthetic data for a meaningful fine-tune requires substantial frontier API costs. For niche tasks with small example budgets this is fine; for broad capability improvement the economics often don't work.

**Stale knowledge**: Data generated from a frontier model carries that model's knowledge cutoff. For tasks involving current events or rapidly-changing domains, synthetic data ages out quickly.

## When Not to Use It

Skip synthetic data generation when:

- The task changes frequently enough that trained weights become stale faster than the training cycle
- Ground truth verification is unavailable and human quality review is too expensive to scale
- The capability gap between frontier and local is so large that the local model cannot learn the task even with good data
- Per-query volume is low enough that frontier API costs don't justify training investment
- The goal is knowledge incorporation into a frequently-updated knowledge base (use [RAG](../concepts/retrieval-augmented-generation.md) instead; fine-tuning doesn't handle updates well)

## Relationship to Other Concepts

Synthetic data generation connects [self-improving agents](../concepts/self-improving-agents.md) to weight-level learning. Without it, agent improvement is limited to [context engineering](../concepts/context-engineering.md), [prompt optimization](../concepts/prompt-optimization.md), and [memory](../concepts/agent-memory.md). With it, accumulated knowledge can graduate from context (expensive per-query) into weights (one-time training cost, permanent retrieval).

[GEPA](../concepts/gepa.md) uses a related idea at the prompt level: generate candidate prompt improvements, evaluate them, keep the Pareto-optimal set. The optimization target is a text artifact rather than model weights, but the generate-evaluate-filter loop is the same.

[DSPy](../projects/dspy.md) systematizes prompt optimization in ways that can feed synthetic data pipelines: optimized prompts generate better demonstrations, better demonstrations produce better fine-tunes, fine-tuned models need less prompt engineering.

## Unresolved Questions

**Attribution across training runs**: When a model trained on synthetic data produces an error, tracing that error back to specific training examples is difficult. Current tooling provides limited lineage tracking between synthetic data sources and trained model behavior.

**Diminishing returns curves**: How much synthetic data is enough for a given task? The answer is empirical and task-specific. No reliable method exists to predict in advance how many examples are needed for a target performance level.

**Cross-domain transfer**: Does synthetic data for task A help on related task B? Often yes, but predicting transfer is unreliable. Systems like autocontext scope knowledge per-scenario precisely because cross-scenario transfer is unpredictable.

**Legality and license**: Synthetic data generated by frontier models may inherit the terms of service constraints of those models. Using frontier-generated data to train competing models is explicitly prohibited by some providers' terms. This creates legal uncertainty for teams building local model replacements for frontier capabilities.


## Related

- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.5)
- [OpenAI](../projects/openai.md) — implements (0.5)
- [Anthropic](../projects/anthropic.md) — implements (0.5)
- [Obsidian](../projects/obsidian.md) — implements (0.3)
- [Zettelkasten](../concepts/zettelkasten.md) — implements (0.3)
- [Markdown Wiki](../concepts/markdown-wiki.md) — implements (0.4)
- [MARP](../projects/marp.md) — implements (0.3)
