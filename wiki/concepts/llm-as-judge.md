---
entity_id: llm-as-judge
type: approach
bucket: self-improving
abstract: >-
  LLM-as-Judge uses a language model to automatically score agent outputs
  against defined criteria, replacing human annotators in evaluation and
  optimization loops with scalable but bias-prone automated assessment.
sources:
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
related: []
last_compiled: '2026-04-08T03:01:56.863Z'
---
# LLM-as-Judge

## What It Is

LLM-as-Judge is an evaluation pattern where a language model scores the outputs of another model or agent. You provide a rubric, the output under review, and optionally reference material; the judge returns a score, a pass/fail verdict, or both. The approach trades annotator time for API calls, enabling evaluation at the speed of generation rather than the speed of human review.

The pattern appears across several contexts: offline quality benchmarking, online feedback loops where scores drive prompt updates, A/B testing between model versions, and production monitoring for model drift. Its defining feature is that the evaluation criteria live in a prompt rather than in hand-coded logic, so the judge can assess qualities that resist deterministic measurement: tone, factual coherence, regulatory compliance, domain-appropriate terminology.

## How It Works

A judge invocation has four components:

**System prompt (rubric)**: Defines the evaluation criteria and scoring scale. A well-specified rubric names the qualities being measured, gives anchors for each score level, and specifies output format (usually a single number). Without rubric specificity, the judge defaults to surface-level impressions.

**Input context**: What the generator received. Including this lets the judge check faithfulness and relevance, not just standalone quality.

**Output under review**: The text being scored.

**Score range and threshold**: Usually 0-1 with a pass threshold (0.85 is common in practice). Binary pass/fail is simpler but loses gradient information useful for comparing candidates.

A concrete example from the OpenAI self-evolving agents cookbook illustrates the structure:

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
                "technical facts... Return a numerical score between 0 and 1..."
                "\n- 1.0: comprehensive, faithful, technically accurate"
                "\n- 0.75-0.99: all main facts, trivial omissions only"
                "\n- 0.5-0.75: most technical information retained"
                "\n- 0.3-0.5: significant information missing"
                "\n- 0.0-0.3: major omissions or misunderstandings"
            ),
        },
        {
            "role": "user",
            "content": "Section:\n{{item.section}}\nSummary:\n{{sample.output_text}}",
        },
    ],
    "range": [0, 1],
    "pass_threshold": 0.85,
}
```

The judge runs after each generation. Its score triggers downstream logic: accept the output, reject it, or feed the failure back to a meta-prompt agent that rewrites the generator's system prompt.

## Role in Optimization Loops

LLM-as-Judge becomes more consequential when embedded in an automated improvement loop. The pattern, described in the self-evolving agents cookbook from OpenAI, looks like this:

1. A generator produces an output
2. One or more graders score it (mix of deterministic Python checks and LLM judge)
3. If the score falls below threshold, a meta-prompt agent receives the judge's reasoning and rewrites the generator's system prompt
4. The updated generator runs again on the same input
5. The loop continues until pass or retry limit

The LLM judge is usually the last grader applied, serving as a holistic failsafe after deterministic checks catch obvious failures. Deterministic graders (word count, entity presence, regex matches) are cheaper, faster, and consistent, so they filter easy failures before the more expensive judge call.

The same loop structure underpins the Karpathy Loop pattern: score, commit on improvement, reset on regression, repeat at scale. In that framing the evaluation function is the critical investment; the LLM judge expands what that function can measure.

## Where LLM-as-Judge Fits in a Grader Stack

Production eval stacks typically combine multiple grader types. From the OpenAI cookbook example evaluating pharmaceutical document summaries:

| Grader | Type | What it catches |
|---|---|---|
| Entity presence check | Deterministic Python | Missing chemical names |
| Length deviation | Deterministic Python | Verbosity or truncation |
| Cosine similarity | Text similarity metric | Semantic drift from source |
| LLM-as-judge | Score model | Holistic factual fidelity |

The LLM judge handles what the others cannot: cases where all entities are present, length is acceptable, and semantic similarity passes, but the summary distorts a relationship or misattributes a property. It also produces natural-language reasoning that feeds directly into meta-prompt rewriting.

## Strengths

**Evaluates non-decomposable quality.** Tone, regulatory compliance, factual coherence, and domain appropriateness do not reduce cleanly to rules. A judge can assess all four in a single call.

**Generates actionable feedback.** Unlike a cosine similarity score, a judge reasoning trace says "the summary omits the CAS registry number and misattributes the molecular weight." That text can feed directly into a meta-prompt optimization step.

**Scales with generation.** Human annotation throughput does not scale with API call volume. A judge runs at the same speed as the generator and costs a fraction of human review.

**Enables A/B evaluation without labeled data.** You can compare two model versions on the same inputs by running the judge against both outputs and comparing aggregate scores.

## Limitations

**Positional and self-enhancement bias.** Judges prefer outputs that appear first in pairwise comparisons and tend to favor outputs from their own model family. These biases are well-documented (independently validated) and affect absolute scores and rankings in predictable ways. A judge from model family A rating output from model family A versus family B is not a neutral evaluation.

**Sycophancy toward confident-sounding text.** Outputs that use assertive phrasing and dense domain vocabulary score higher even when factually incorrect. A judge optimizing for "sounds authoritative" and one optimizing for "is accurate" produce different rankings for the same outputs.

**Rubric sensitivity.** Small wording changes in the system prompt produce different score distributions. A rubric that says "comprehensive" elicits different behavior than one that says "exhaustive." This makes cross-run comparisons unreliable unless the rubric is versioned and frozen.

**Circular optimization risk.** When a generator and judge share the same base model, optimizing the generator against the judge's scores may improve performance on the judge without improving performance on actual task success. The judge can be gamed.

**Concrete failure mode.** A judge scoring pharmaceutical summaries with a rubric emphasizing "technical completeness" will reward verbose outputs that repeat source material nearly verbatim. The word-count grader and the LLM judge can pull in opposite directions, with the judge consistently failing short but accurate summaries that the word-count grader passes. Score aggregation logic needs to handle this tension explicitly rather than averaging.

## Unspoken Infrastructure Assumption

LLM-as-Judge assumes the judge model is stable across evaluation runs. In practice, model providers update weights, change safety filters, and deprecate versions. A score distribution produced with `gpt-4.1` in one month may not reproduce with the same model identifier six months later. Evaluation pipelines that depend on LLM-as-Judge scores for regression detection need to pin model versions and re-establish baseline distributions after any model update, which adds operational overhead that most implementations ignore.

## When Not to Use It

Skip LLM-as-Judge when:

- **The success criterion is fully deterministic.** If the correct answer is a regex match, a number within tolerance, or a specific string, a deterministic check is cheaper, faster, and more consistent.
- **You need legal defensibility.** LLM scores cannot be audited in the way human annotations can. Regulated contexts (clinical trials, financial disclosures) that require documented evaluation methodology should not rely on LLM judgment as primary evidence.
- **The generator and judge are from the same model family and you care about cross-model comparison.** Self-preference bias will distort results.
- **Your eval budget is tight and deterministic graders cover the failure modes you actually care about.** Adding an LLM judge call for every output increases cost and latency without proportional benefit if the failures are detectable by simpler means.
- **The rubric is unstable.** If your quality criteria are still being debated, you will produce an eval infrastructure that measures a moving target. Stabilize criteria before automating measurement.

## Unresolved Questions

**Score calibration across judges.** There is no standard for what a 0.8 means across different judge models or rubrics. Comparing scores from different evaluation setups requires re-calibration work that most teams do not do.

**Cost at scale.** A judge call per generation is affordable in a notebook; it becomes significant in a continuous monitoring loop processing thousands of production outputs daily. The cost structure is rarely modeled before deployment.

**Conflict resolution in multi-grader stacks.** When deterministic graders pass and the LLM judge fails, or vice versa, which signal governs? The OpenAI cookbook uses a lenient pass ratio (75% of graders must pass) as a heuristic. Whether this is the right aggregation strategy for a given domain is not addressed by most implementations.

**Judge version governance.** Who decides when to update the judge model, and how are historical scores adjusted? This is unaddressed in most LLM-as-Judge deployments.

## Alternatives

- **Deterministic graders**: Faster, cheaper, consistent, but cannot measure holistic quality. Use when success criteria decompose into rules.
- **Human annotation**: Gold standard for accuracy and defensibility. Use when sample size is small, stakes are high, or you are calibrating an LLM judge.
- **Reward models trained on human preferences** (e.g., RLHF reward heads): More stable than prompt-based judges once trained, but require labeled data to build and re-train on distribution shift.
- **Reference-based metrics** (BLEU, ROUGE, BERTScore): Cheap and reproducible but correlate poorly with human judgment on open-ended generation. Use for sanity checks, not primary evaluation.
- **[GRPO](../concepts/grpo.md) and similar RL-from-model-feedback approaches**: Use the judge signal to fine-tune the generator rather than just prompt it. More expensive but produces durable improvements rather than prompt-level patches.

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md): LLM-as-Judge is the primary feedback signal that enables automated self-improvement without human annotation.
- [Prompt Optimization](../concepts/prompt-optimization.md): Judge scores drive automated prompt rewriting in meta-prompt loops.
- [GEPA](../concepts/gepa.md): A structured prompt evolution framework that uses LLM-as-Judge scores as its fitness function.
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md): Judges are used to filter synthetic data quality before it enters training sets.
- [Human-in-the-Loop](../concepts/human-in-the-loop.md): The practical alternative or complement when LLM judgment is insufficient.
- [Reinforcement Learning](../concepts/reinforcement-learning.md): LLM-as-Judge extends naturally into reward modeling for RL-based fine-tuning.
- [Observability](../concepts/observability.md): Production judge scores feed monitoring dashboards for drift detection.
