---
entity_id: llm-as-judge
type: approach
bucket: self-improving
abstract: >-
  LLM-as-Judge uses language models as automated evaluators to score agent
  outputs, enabling scalable feedback signals without human annotation for every
  iteration.
sources:
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
related: []
last_compiled: '2026-04-08T23:19:16.236Z'
---
# LLM-as-Judge

## What It Is

LLM-as-Judge is an evaluation pattern where a language model scores, ranks, or provides feedback on another model's outputs. Instead of requiring human annotators to review every agent response, a judge model applies a rubric and returns a scalar score, a binary pass/fail, or natural language reasoning about quality.

The pattern sits at the intersection of [Self-Improving Agents](../concepts/self-improving-agents.md), [Prompt Optimization](../concepts/prompt-optimization.md), and [Synthetic Data Generation](../concepts/synthetic-data-generation.md). It solves a specific bottleneck: human evaluation doesn't scale to the iteration speed agentic systems require. Running 100 overnight experiments, as the Karpathy Loop pattern enables, is only practical if evaluation costs near-zero per cycle.

## Why It Matters

Agent self-improvement requires a feedback signal. Without one, there's no gradient to follow. Human feedback is the gold standard but costs time and money per data point. Deterministic tests cover objective criteria (did the output contain the chemical name? is it under 500 words?) but miss semantic and qualitative judgment.

LLM-as-Judge fills the gap between these two. It applies human-like qualitative judgment at machine speed and machine cost. This makes it the enabling component for closed-loop improvement systems: agent produces output, judge scores it, optimizer updates the prompt or policy, repeat.

## How It Works

### Core Mechanism

The judge receives a prompt containing:

1. A rubric specifying what good output looks like
2. The input the agent received
3. The agent's output

It returns a score (typically 0–1) and often a reasoning trace explaining the score.

A concrete example from the OpenAI self-evolving agents cookbook shows this implementation:

```python
{
    "name": "llm_as_judge",
    "type": "score_model",
    "model": "gpt-4.1",
    "input": [
        {
            "role": "system",
            "content": (
                "You are an expert technical summarization evaluator. "
                "Evaluate whether the summary captures and preserves the important "
                "technical facts and specific details from the section...\n\n"
                "Scoring Guidelines:\n"
                "- Return a numerical score between 0 and 1...\n"
                "- A score of 1 means the summary is almost flawless..."
            ),
        },
        {
            "role": "user",
            "content": "Section:\n{{item.section}}\nSummary:\n{{sample.output_text}}"
        },
    ],
    "range": [0, 1],
    "pass_threshold": 0.85,
}
```

The judge model (here `gpt-4.1`) evaluates the summarization agent's output against the source section. The `pass_threshold` of 0.85 determines whether the agent's current prompt version is acceptable.

### Grader Composition

LLM-as-Judge rarely operates alone in production. It typically runs alongside deterministic graders in a multi-signal evaluation stack. The OpenAI cookbook example uses four graders together:

| Grader | Type | What It Checks |
|--------|------|----------------|
| Chemical name retention | Python (deterministic) | Exact string match for domain entities |
| Summary length | Python (deterministic) | Inverse deviation from target word count |
| Cosine similarity | Text similarity | Semantic closeness to source |
| LLM-as-Judge | Score model | Holistic quality via rubric |

The design rationale: deterministic graders catch obvious failures cheaply, stabilizing optimization before semantic tuning begins. The LLM judge handles edge cases that rule-based metrics miss.

### Integration Into Feedback Loops

In a self-evolving loop, LLM-as-Judge output feeds directly into prompt optimization:

1. Agent produces output
2. Judge scores output, returns score + reasoning
3. If score falls below threshold, reasoning becomes input to a metaprompt agent
4. Metaprompt agent rewrites the system prompt
5. New prompt is evaluated; if it passes, it replaces the old one

The `collect_grader_feedback()` function in the cookbook extracts actionable feedback from judge reasoning and passes it to the optimizer. When the LLM judge fails, its `reasoning` field (extracted from the judge's chain-of-thought) becomes the natural language diagnosis for what went wrong.

### Prompt Design for Judges

Judge prompt quality determines result quality. Effective judge prompts share several properties:

- **Anchored scoring scale**: Map score ranges to concrete behavioral descriptions, not vague quality levels. "0.75–0.99 indicates excellent work: all main facts represented, trivial omissions only" is better than "high score means good."
- **Separation of concerns**: The judge evaluates the output against the input, not against some abstract ideal. The rubric should reference the actual source material.
- **No self-reference**: The judge prompt should not describe itself or explain what it's doing. State the criteria and score.

## Who Uses It and How

### Automated Retraining Pipelines

[Self-Improving Agents](../concepts/self-improving-agents.md) systems use LLM-as-Judge as their inner evaluation loop. The OpenAI self-evolving agents pattern pairs judge scores with a pass threshold and max retry count. If the judge consistently fails a prompt version, the system flags for human review rather than spinning indefinitely.

The Karpathy Loop (popularized via AutoResearch) applies this at scale: git commit when score improves, git reset when it drops. 12 evaluation cycles per hour, 100 overnight. The evaluation function is the critical path.

### Skill Evaluation

Agent skills, particularly AI-generated ones, often lack test coverage. The recommended pattern applies 10–12 deterministic test prompts for objective checks, then adds LLM-as-Judge for qualitative assessment. Failures from both layers drive iteration on the skill implementation.

### Model Version Comparison

Judge scores enable A/B testing of model versions without human raters. The cookbook's `compare_model_candidates()` function runs the same improved prompt against multiple models (`gpt-5`, `gpt-5-mini`), evaluates each with the judge, and promotes the winning combination. This pattern works for model version selection, temperature tuning, and reasoning effort configuration.

### GEPA Integration

[GEPA](../concepts/gepa.md) (Genetic-Pareto prompt evolution) uses LLM-as-Judge scores as its fitness function. The GEPA adapter's `evaluate()` method calls the judge pipeline for each candidate prompt and returns scalar scores that drive Pareto-front selection. The judge's natural language feedback feeds the reflection step, where a separate LLM proposes prompt revisions based on what failed.

## Strengths

**Qualitative judgment at scale**: Captures semantic and stylistic quality that deterministic metrics miss. A cosine similarity check won't tell you the output buried the most important fact in the third sentence; a well-designed judge will.

**Natural language diagnostics**: Unlike numerical metrics, judge reasoning is directly actionable. The reasoning string flows into the metaprompt optimizer without transformation.

**Domain adaptability**: Rubrics can encode domain-specific knowledge (FDA regulatory requirements, code correctness criteria, customer service tone standards) that would require complex heuristics to encode deterministically.

**Threshold-based gating**: Pass/fail thresholds enable automatic promotion decisions in CI-style pipelines without human approval on every iteration.

## Critical Limitations

**Concrete failure mode — positional bias**: LLM judges exhibit systematic bias toward certain output positions (preferring the first option in pairwise comparisons, preferring longer outputs). A judge scoring summaries may reward verbosity over accuracy, or score outputs differently depending on whether the source section appears before or after the generated summary in the prompt. This bias is rarely disclosed in evaluation results and can silently corrupt optimization by promoting the wrong behaviors.

**Unspoken infrastructure assumption**: LLM-as-Judge assumes the judge model is stable across evaluation runs. If the judge model is updated (by the API provider, mid-experiment), historical scores become incomparable. An experiment running overnight may use a different effective model version at hour 1 versus hour 8, producing score drift unrelated to the agent's actual improvement.

## When NOT to Use It

**High-stakes domains with legal liability**: Judge scores are probabilistic. In domains where incorrect outputs carry legal or safety consequences (clinical decision support, legal document review), LLM-as-Judge should gate entry to human review, not replace it. Using judge pass/fail as the final production gate in these contexts shifts accountability to a model that may be confidently wrong.

**When you have ground truth**: If you have a reference answer or verifiable correct output, use exact match or symbolic verification instead. LLM-as-Judge introduces noise and latency where deterministic evaluation would give cheaper, more reliable signal.

**High evaluation frequency with cost sensitivity**: At millions of evaluations per day, judge inference costs accumulate significantly. Distilling the judge into a smaller classifier or using embedding-based scoring may be more appropriate at that scale.

**Novel domains without rubric development time**: A judge is only as good as its rubric. If you can't articulate what "good" looks like in enough detail to anchor the scoring scale, judge outputs will reflect the model's priors rather than your actual requirements.

## Unresolved Questions

**Calibration and drift**: How do you detect when a judge's scores have drifted relative to actual human judgment? Most implementations lack systematic calibration against human rater data.

**Judge selection**: Which model should judge which task? Using the same model family to judge its own outputs (a GPT-5 agent judged by GPT-4.1) introduces correlated blind spots. The community lacks standard guidance here.

**Score aggregation across graders**: When combining judge scores with deterministic graders (average vs. weighted sum vs. all-must-pass), the aggregation choice significantly affects which prompt versions get promoted. The OpenAI cookbook uses both average score and pass ratio with separate thresholds, but the interaction between these isn't formally analyzed.

**Judge prompt versioning**: If the judge prompt changes during a long optimization run (to fix a bias or add criteria), earlier scores become incommensurable with later ones. Version-controlling judge prompts alongside the agent prompts they evaluate is rarely discussed.

## Alternatives

**Human evaluation**: Use when ground truth quality matters, when you're establishing baselines, or when the domain is too novel to write a reliable rubric. Slower and more expensive, but the reference standard.

**Deterministic metrics** (exact match, BLEU, ROUGE, code execution): Use when outputs have verifiable correct answers or when objective criteria (length, format, entity presence) are sufficient. Always prefer these when available; they're cheaper and don't hallucinate scores.

**Embedding-based similarity** (cosine similarity, BERTScore): Use when you need semantic similarity without the cost of a full LLM inference. Works well as a complementary signal alongside a judge, not as a replacement.

**Reward models**: Use in reinforcement learning pipelines where you need a differentiable or high-throughput signal. Reward models are trained specifically for evaluation and can be faster and cheaper than general-purpose LLMs at inference time. See [GRPO](../concepts/grpo.md) and [Reinforcement Learning](../concepts/reinforcement-learning.md).

**[GEPA](../concepts/gepa.md)**: When you need prompt optimization with structured candidate search rather than greedy hill-climbing, GEPA uses LLM-as-Judge as a component but adds genetic-Pareto selection across candidates — appropriate when simple threshold-based iteration converges too quickly to local optima.
