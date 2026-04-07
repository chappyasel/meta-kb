---
entity_id: synthetic-data-generation
type: approach
bucket: self-improving
abstract: >-
  Synthetic data generation uses LLMs or algorithmic methods to create
  artificial training data, enabling model self-improvement without human
  annotation at scale.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/memodb-io-acontext.md
  - deep/repos/memodb-io-acontext.md
related:
  - rag
  - andrej-karpathy
  - openai
  - progressive-disclosure
last_compiled: '2026-04-07T11:56:14.359Z'
---
# Synthetic Data Generation

## What It Is

Synthetic data generation produces artificial training examples using LLMs, templates, or simulation rather than human-labeled real-world data. In the context of building agent intelligence and knowledge systems, the term covers a spectrum: from GPT-4 generating question-answer pairs over a document corpus, to an agent's own execution traces being distilled into structured skill files, to [Andrej Karpathy](../concepts/andrej-karpathy.md) describing finetuning a model on a self-maintained markdown wiki so domain knowledge lives in weights rather than context windows.

The concept sits at the intersection of two trends. First, the cost of human annotation has always constrained what capabilities labs can train into models. Second, capable frontier models can now produce outputs good enough to train smaller or specialized models, creating feedback loops that compound over time. Synthetic data generation is the mechanism that closes those loops.

## Why It Matters

The core appeal: human annotation scales linearly with effort. Synthetic generation scales with compute. For domain-specific knowledge, annotation requires domain experts; synthetic generation requires a prompt and a capable base model. For self-improving agent systems, it enables a pipeline where an agent's successful runs directly improve its future performance without a human in the loop.

[Karpathy's LLM knowledge base workflow](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) illustrates the natural endpoint of this thinking. After describing how an LLM maintains a ~400K word markdown wiki through self-healing linting loops, he notes: "As the repo grows, the natural desire is to also think about synthetic data generation + finetuning to have your LLM 'know' the data in its weights instead of just context windows." The progression is explicit: context-based retrieval works at small scale, but incorporating knowledge into model weights requires synthetic data to bridge the gap.

## How It Works

### Data Generation Patterns

**Distillation-based generation** uses a capable teacher model to produce outputs that train a smaller student. OpenAI's original InstructGPT work showed that human feedback could be bootstrapped; subsequent work showed that GPT-4 outputs could substitute for human labels in many settings. The quality ceiling is the teacher model's capability on that task.

**Self-play and red-teaming** generates diverse scenarios by having models challenge themselves. Constitutional AI at [Anthropic](../projects/anthropic.md) uses a model to critique and revise its own outputs, generating preference data without human raters per example.

**Trace distillation** converts execution traces from successful agent runs into structured training examples. The [Acontext](../raw/deep/repos/memodb-io-acontext.md) system makes this concrete: when an agent completes a task, a three-stage pipeline extracts what happened, classifies it (SOP, failure warning, or factual content), and writes it to structured skill files. The distillation stage (`llm/prompt/skill_distillation.py`) calls an LLM-as-judge that decides whether to `skip_learning`, `report_success_analysis`, `report_failure_analysis`, or `report_factual_content`. Each category generates different structured output: success analyses extract `generalizable_pattern` and `applies_when` fields; failure analyses extract `flawed_reasoning` and `prevention_principle`. This is synthetic data generation operating at the skill/knowledge layer rather than the weight layer, but the logic is identical: execution experience gets converted to reusable structured knowledge.

**Question-answer pair generation** takes a corpus and generates Q&A pairs covering it. This is the most common pattern for domain-specific finetuning. A model reads documentation, generates questions a user might ask, generates ideal answers, and the pairs become finetuning data. Filtering pass (another LLM call, or heuristics) removes low-quality pairs.

**Augmentation** expands existing datasets by paraphrasing, translation, or transforming examples. Less powerful than generation from scratch but lower risk of hallucination.

### The Self-Improvement Loop

In agent systems, synthetic data generation enables a closed loop:

1. Agent runs on real tasks
2. Successful traces get distilled into training examples (or, in Acontext's case, skill files)
3. Future agent instances load those skills or get finetuned on them
4. Performance improves on similar tasks
5. New tasks generate new traces

The loop's quality depends entirely on the distillation step. Bad distillation produces garbage training data that degrades performance. Acontext's `skip_learning` classification specifically exists to prevent noise accumulation; the system prompt enforces that trivial tasks ("simple lookups, small talk, calculations") don't generate skill entries.

The [Darwin Gödel Machine](../projects/darwin-godel-machine.md), [Voyager](../projects/voyager.md), and [EvoAgentX](../projects/evoagentx.md) all implement variants of this loop. Voyager generates skill code from Minecraft execution; Darwin Gödel Machine generates and tests self-modifications; EvoAgentX evolves agent workflows. Synthetic data generation is the substrate they all share.

### Finetuning Integration

Generating data is only half the work. Incorporating it into model weights requires a finetuning pipeline. The typical sequence:

1. Generate candidate examples (Q&A pairs, instruction-response pairs, preference pairs)
2. Filter by quality (perplexity, another LLM-as-judge pass, human spot-check)
3. Format for the target model's training format
4. Run supervised finetuning (SFT) or [GRPO](../concepts/grpo.md)-style reinforcement learning
5. Evaluate on held-out tasks before deploying

The filtering step is where most production pipelines diverge from toy examples. Without filtering, finetuning on synthetic data often produces models that are confidently wrong. [LLM-as-Judge](../concepts/llm-as-judge.md) filtering helps but introduces the teacher model's biases as selection pressure.

### Knowledge Base as Synthetic Data Source

Karpathy's workflow treats the wiki itself as a pre-finetuning artifact. The LLM maintains a coherent, interlinked, linted knowledge base. That knowledge base becomes training data. The linting loop (finding inconsistencies, imputing missing data, discovering connections for new articles) functions as a quality pass over the synthetic corpus before it ever hits a training pipeline. Outputs from queries get filed back into the wiki, accumulating into a richer training set over time.

This differs from naive synthetic data generation in one key way: the wiki has structure (backlinks, categories, articles) that makes it a higher-quality training signal than raw Q&A pairs. Structure encodes relationships between concepts that flat pairs miss.

## Who Uses It

**Model training labs** like [OpenAI](../projects/openai.md) and Anthropic use synthetic data at scale to extend coverage into domains where human annotation is expensive or sparse. [DeepSeek](../projects/deepseek.md)'s R1 training used synthetic chain-of-thought data to bootstrap reasoning capabilities. [GPT-4](../projects/gpt-4.md) itself was trained on data that included synthetic components.

**Agent memory systems** like Acontext treat distillation as operational synthetic data generation, running continuously in production rather than as a one-time training pipeline.

**Domain-specific finetuning** practitioners use synthetic generation to extend models into narrow verticals (legal, medical, financial) without requiring thousands of annotated expert examples.

**RAG pipeline builders** generate synthetic Q&A pairs from their document corpus to evaluate retrieval quality before deploying. If the model can't answer questions that were generated from the documents, retrieval is the bottleneck.

## Practical Implications

### For [Self-Improving Agents](../concepts/self-improving-agent.md)

The critical design question is whether synthetic data lives in context (skill files, retrieved documents) or weights (finetuned model). Context-based approaches are faster to update and more transparent; weight-based approaches generalize better across phrasings and don't require retrieval infrastructure. Most production systems will need both.

The Acontext architecture illustrates context-based synthetic data well: skill files are generated from execution traces, human-readable, and immediately usable without any training run. Karpathy's endpoint (finetuning the wiki into weights) is weight-based. Neither is complete alone: context-based systems struggle as knowledge scales; weight-based systems require periodic expensive retraining.

### For Knowledge Base Quality

Synthetic data quality correlates directly with source quality. Generating Q&A pairs from a poorly written, internally inconsistent document corpus produces unreliable training data. Karpathy's linting loop addresses this by running health checks before treating the wiki as a data source. The practical lesson: invest in source quality before investing in generation pipelines.

### For [Continual Learning](../concepts/continual-learning.md)

Finetuning on synthetic data risks [catastrophic forgetting](../concepts/catastrophic-forgetting.md): the model forgets general capabilities while learning the new domain. Standard mitigations include mixing synthetic domain data with general capability data during training, using LoRA-style parameter-efficient methods that update fewer weights, and evaluating on general benchmarks after domain finetuning. Ignoring this produces models that answer domain questions well but fail at adjacent reasoning tasks.

## Failure Modes

**Hallucination amplification.** If the teacher model generates factually incorrect examples and the filter doesn't catch them, finetuning bakes those errors into the student model. Unlike retrieval systems where bad data can be corrected by updating the corpus, finetuned errors require retraining to fix.

**Distribution collapse.** A model trained primarily on its own outputs loses diversity. Responses converge toward certain phrasings, formats, and reasoning patterns. This shows up as a model that handles common cases well but fails on edge cases its synthetic training data didn't cover. The problem compounds across generations if the loop runs without injection of real-world data.

**Distillation quality bottleneck.** In trace-distillation systems like Acontext, if the distillation LLM misclassifies a failure as a success, a misleading SOP gets written to the skill files with no validation step before it's used by future agents. The quality of the distillation prompt directly determines the quality of everything downstream.

**Coverage gaps from generation bias.** LLMs generate synthetic examples that reflect their training distribution. If the teacher model has weak coverage of certain subdomains, synthetic generation from that model will also have weak coverage. Evaluating coverage requires knowing what you don't know, which is difficult to automate.

**Annotation artifacts.** Models trained heavily on synthetic data sometimes learn stylistic artifacts from the generator (specific phrases, formatting patterns, reasoning templates) rather than the underlying capability. This shows up as high benchmark scores but poor performance on real-world tasks with different surface form.

## When Not to Use It

Synthetic data generation is the wrong default when the task requires factual grounding the teacher model doesn't have. Generating synthetic medical training data from a general-purpose LLM produces confident-sounding but unreliable examples that could actively harm a specialized model's calibration.

For small, well-defined domains where expert annotation is feasible (a few hundred examples from subject-matter experts), human annotation typically produces better data than synthetic generation, with less risk of amplifying errors.

For agent systems where transparency and correctability matter more than knowledge compression, context-based skill files (Acontext's approach) are more appropriate than finetuning. Finetuned knowledge is opaque; skill files are inspectable and editable.

If your context window is large enough and your knowledge base is small enough, [RAG](../concepts/rag.md) or direct file loading is simpler and more maintainable than a synthetic data pipeline. Karpathy's own experience: at ~100 articles and ~400K words, direct LLM reasoning over the wiki worked without RAG. Finetuning becomes attractive when the corpus exceeds what fits in context reliably.

## Unresolved Questions

**Verification at scale.** Filtering synthetic data with another LLM call is the standard approach, but it's unclear how much verification quality degrades as data volume grows. Most practitioners run spot-check sampling rather than exhaustive verification.

**Loop stability.** How many iterations of self-improvement via synthetic data can run before quality degrades? Some research suggests instability appears after 3-5 model generations trained on their own outputs, but the threshold is task-dependent and not well characterized for production agent systems.

**Attribution and licensing.** Synthetic data generated from proprietary models may inherit licensing restrictions from those models. Whether finetuning on GPT-4 outputs to create a competing model violates OpenAI's terms of service has been legally contested. The field lacks settled norms here.

**Evaluation contamination.** If benchmarks are used to generate synthetic training data, benchmark performance no longer measures generalization. As synthetic data pipelines become more automated, tracking which benchmarks have been contaminated becomes harder.

## Related Concepts

- [Self-Improving Agent](../concepts/self-improving-agent.md): synthetic data generation is the primary mechanism agents use to improve from experience
- [LLM-as-Judge](../concepts/llm-as-judge.md): the standard filtering and classification mechanism in synthetic data pipelines
- [Karpathy Loop](../concepts/karpathy-loop.md): the iterative knowledge base maintenance workflow that motivates synthetic finetuning
- [Chain-of-Thought](../concepts/chain-of-thought.md): synthetic reasoning traces are among the most effective forms of synthetic data
- [Reinforcement Learning](../concepts/reinforcement-learning.md): RLHF and RLAIF pipelines treat synthetic preference data as reward signal
- [GRPO](../concepts/grpo.md): training method that can consume synthetic preference data for reasoning improvement
- [Memory Evolution](../concepts/memory-evolution.md): the broader concept of agent knowledge changing over time, of which synthetic data generation is one mechanism
- [Continual Learning](../concepts/continual-learning.md): incorporating synthetic data without catastrophic forgetting
- [Retrieval-Augmented Generation](../concepts/rag.md): the alternative to weight incorporation; synthetic data generation becomes relevant when RAG reaches scale limits
- [Automatic Curriculum](../concepts/automatic-curriculum.md): structuring synthetic data generation so difficulty increases progressively
