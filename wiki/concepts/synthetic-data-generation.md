---
entity_id: synthetic-data-generation
type: approach
bucket: self-improving
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
related: []
last_compiled: '2026-04-05T05:40:23.277Z'
---
# Synthetic Data Generation

## What It Is

Synthetic data generation means using LLMs or other generative models to produce training or evaluation data automatically, rather than collecting and labeling it by hand. You give a model a task, some examples, or a description of what you need, and it writes the data for you.

The approach spans a spectrum. At one end: simple prompt templates that produce question-answer pairs. At the other: multi-step pipelines where a teacher model generates examples, a separate judge model filters them, and the surviving examples finetune a student model that then generates harder examples for the next round.

In the self-improving systems context, synthetic data generation is the mechanism that moves knowledge from a context window into model weights. Karpathy frames this explicitly: as a markdown wiki grows, the "natural desire is to also think about synthetic data generation + finetuning to have your LLM 'know' the data in its weights instead of just context windows." [Source](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## Why It Matters

Two problems make human-curated data expensive: labeling costs time, and some capabilities have no natural data source. A model that needs to critique its own reasoning, generate step-by-step proofs, or answer questions about a private corpus cannot rely on crawled web data. Synthetic generation sidesteps both problems.

The compounding dynamic matters more than the cost savings. When query outputs get filed back into the knowledge base, and the knowledge base eventually becomes training data, the system accumulates expertise over time without human annotation at each step. Every query adds signal. The bottleneck shifts from "can we label enough examples" to "can we generate examples that are actually good."

## How It Works

### The Basic Loop

1. A teacher model (often the largest available) generates candidate examples given a prompt or seed document.
2. A filter step rejects low-quality outputs. This can be a separate judge model, a deterministic verifier (for code or math), or a self-consistency check across multiple samples.
3. Surviving examples finetune a student model.
4. The student, now more capable, generates harder seeds for the next iteration.

### Applied to Knowledge Bases

In Karpathy's setup, the pipeline is less formal but follows the same logic. Raw sources land in `raw/`. An LLM compiles them into wiki articles in a `wiki/` directory. Query outputs get filed back into the wiki. At some point, the wiki content becomes training data via finetuning, so the model carries domain knowledge in weights rather than relying on context retrieval. [Source](../../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)

The linting loop runs separately: the LLM scans for inconsistencies, imputes missing data via web search, and suggests new article candidates. This functions as a quality filter on the corpus before it ever becomes training data.

### Data Types Produced

- **Question-answer pairs** from source documents
- **Chain-of-thought traces** showing reasoning steps
- **Preference pairs** (chosen/rejected) for RLHF-style training
- **Skill demonstrations** for agent training (tool use, multi-step planning)
- **Adversarial examples** to stress-test edge cases

## Strengths

**No labeling bottleneck.** A domain expert who cannot annotate 10,000 examples can write 20 seed examples and prompt a model to extrapolate.

**Targeted coverage.** You can directly generate examples for failure modes the model currently gets wrong, rather than hoping they appear in a scraped dataset.

**Iterative improvement.** Each finetuning round produces a better generator, which produces better training data. This compounds in a way that static datasets cannot.

**Inspectable.** Unlike opaque retrieval systems, the generated data sits in files you can read and audit before training.

## Critical Limitations

**Quality ceiling from the generator.** The teacher model cannot produce examples that exceed its own understanding. A model that reasons poorly about a domain will generate plausible-sounding but subtly wrong training examples. Finetuning on those examples moves the student toward confident incorrectness. This failure mode is hard to detect without a ground-truth verifier, which often does not exist for open-ended tasks.

**Infrastructure assumption: you have a finetuning pipeline.** Generating synthetic data is cheap. Using it requires infrastructure for data formatting, training runs, evaluation, and deployment. The Karpathy workflow describes the data generation half; the finetuning half requires GPU access, experiment tracking, and regression testing that most practitioners do not have running. The approach implicitly assumes this pipeline exists.

## When Not to Use It

**Safety-critical domains without verifiable ground truth.** Medical diagnosis, legal reasoning, financial advice: a model-as-judge cannot reliably distinguish correct from plausible. Human expert review becomes mandatory, which defeats the cost argument.

**When the base model already covers the domain.** If GPT-4 or Claude already answers your questions well from general training, synthetic finetuning on a small private corpus is unlikely to help and may hurt generalization. Context injection is cheaper and reversible.

**When your source corpus is small and noisy.** Synthetic generation amplifies whatever is in the seeds. A 50-document wiki with inconsistent terminology produces 5,000 training examples with inconsistent terminology. The linting step must precede generation, not follow it.

**Rapidly changing domains.** Weights trained on synthetic data freeze a snapshot. A wiki that gets daily updates needs retrieval, not finetuning, to stay current.

## Unresolved Questions

**How do you evaluate synthetic data quality before training?** The standard answer is "use a judge model," but judge models share failure modes with generator models. No consensus exists on what rigorous pre-training quality filtering looks like for open-ended domains.

**What is the compounding failure rate?** Each generation round introduces some error. Over many rounds of self-improvement, do errors cancel out or accumulate? The research literature on iterated distillation is thin outside of math and code, where verifiers exist.

**How much data justifies a finetuning run versus retrieval?** At 100 wiki articles (Karpathy's scale), finetuning seems premature. At 10,000? 100,000? The crossover point where weights beat context windows for private domain knowledge is not established.

**Who controls the feedback loop?** In a production system where synthetic data automatically flows into training, a single bad generation cycle can degrade the model that generates future data. Governance around when to halt, retrain from scratch, or revert to a prior checkpoint is rarely documented.

## Relationship to Adjacent Approaches

Synthetic data generation sits inside the broader self-improving systems pattern. It is the step that makes context-window knowledge persistent. Without it, every new conversation starts from scratch. With it, accumulated wiki knowledge can travel with the model.

It differs from retrieval in a key way: retrieval is runtime, synthetic training is compile-time. Retrieval stays current; trained weights stay frozen. Most production systems will use both, with retrieval handling recency and weights handling deep domain fluency.

The linting loop in Karpathy's setup functions as a data quality pipeline before any training happens. Running health checks over the wiki, finding inconsistencies, and imputing missing data all improve the eventual training corpus even if finetuning never happens. [Source](../../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)
