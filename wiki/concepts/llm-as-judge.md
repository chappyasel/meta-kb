---
entity_id: llm-as-judge
type: approach
bucket: self-improving
abstract: >-
  LLM-as-Judge uses a language model to score or critique another model's
  outputs, enabling automated quality evaluation without human annotation at
  each step.
sources:
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - repos/langchain-ai-langgraph-reflection.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - deep/repos/anthropics-skills.md
related:
  - agent-skills
  - langchain
last_compiled: '2026-04-07T11:54:44.608Z'
---
# LLM-as-Judge

## What It Is

LLM-as-Judge is an evaluation technique where one language model assesses the output quality of another. You feed the judge a rubric, the original input, and the output to grade, then interpret the returned score or critique. The approach substitutes for human annotation in cases where quality is hard to specify as a deterministic rule but easy to describe in natural language.

The technique appears across the evaluation stack: as an online monitor scoring live production traces, as an offline evaluator validating prompt changes before deployment, as a grader inside self-improvement loops that iterate on prompts until a threshold is reached, and as a signal source for fine-tuning pipelines.

Its key differentiator from alternatives is coverage. Deterministic checks (exact match, regex, schema validation, cosine similarity) test narrow, specifiable properties. Human annotation tests everything but costs time. LLM-as-Judge covers the gap: qualitative properties like coherence, helpfulness, regulatory appropriateness, or factual plausibility that have no clean programmatic definition but can be described to a model in a few sentences.

## Core Mechanism

The judge receives a structured prompt containing:

1. A **rubric** describing what good looks like (scoring criteria, scale, and what to penalize)
2. The **task input** (the question or instruction the main agent received)
3. The **output under evaluation**
4. Optionally, a **reference answer** for correctness checks

The judge returns a score on a numeric scale (0–1 is standard) and sometimes a textual rationale. Systems that require traceable decisions collect both.

From the OpenAI self-evolving agents cookbook, a concrete rubric:

```
"A score of 1 means the summary is almost flawless: comprehensive, highly faithful, 
and technically accurate, with virtually no important details missing.
0.75-0.99 indicates excellent work: all main facts represented, trivial omissions possible.
0.5-0.75 indicates good but imperfect..."
```

This is the `score_model` grader type in OpenAI Evals, called with `gpt-4.1` and a pass threshold of `0.85`. The grader lives alongside deterministic graders (Python-based chemical name checking, word length deviation, cosine similarity) rather than replacing them. Each grader type catches different failure modes; LLM-as-Judge provides the holistic failsafe for edge cases that rule-based metrics miss. [Source](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

In [LangGraph reflection loops](../projects/langgraph.md), the judge plays a different role: instead of returning a score, it returns either nothing (pass) or a critique message that gets injected back into the main agent's conversation as a new user turn. The main agent then revises its answer. The loop terminates when the judge returns empty. [Source](../raw/repos/langchain-ai-langgraph-reflection.md)

For [Agent Skills](../concepts/agent-skills.md) evaluation, the judge runs as one tier in a three-tier testing stack. Tier 3 (~$0.15, ~30 seconds) uses LLM-based quality scoring to assess qualitative skill output improvements. A comparator subagent runs blind evaluation of two outputs without knowing which had the skill active. [Source](../raw/deep/repos/anthropics-skills.md)

## Four Roles in Practice

**Online monitoring**: Evaluators run continuously on production traces. In LangSmith, you configure them to score all traces, a sampled subset, or a filtered set based on criteria. The judge assesses the full agent trajectory, not just the final output: did the agent use the right tools, in the right order, with the right parameters? This catches quality drift that metrics like latency or error rate miss entirely. [Source](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

**Offline evaluation**: Before shipping a prompt change or model update, you run the updated agent against a dataset of real production failures and compare judge scores to the baseline. Passing evaluations accumulate into a permanent regression test suite. A change that improves scores on targeted failures but drops scores on other cases fails the gate before reaching users.

**Self-improvement loops**: The OpenAI cookbook implements a loop where the summarization agent generates output, four graders score it (including LLM-as-Judge at threshold 0.85), and if the lenient pass threshold fails, a metaprompt agent rewrites the system prompt. The loop retries up to `MAX_OPTIMIZATION_RETRIES = 3` per section. The prompt evolves from "You are a summarization assistant. Given a section of text, produce a summary." to a 400-word specification that preserves exact chemical nomenclature, isotopic labels, and regulatory citations verbatim. [Source](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

**Skill evaluation**: @_philschmid's practical guide recommends 10-12 test prompts with deterministic checks combined with LLM-as-Judge for qualitative assessment, then iterating on skill implementations based on eval failures. The combination matters because AI-generated skills often lack rigor, and judge-driven iteration catches failures that the skill author wouldn't anticipate. [Source](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md)

## Implementation Variants

**Direct scoring**: Judge returns a number on a defined scale. The rubric anchors each score range to specific observable properties to reduce variance between runs.

**Binary pass/fail**: `create_llm_as_judge` from `openevals` with `feedback_key="pass"` returns a boolean plus a comment. Used in the LangGraph reflection example with `o3-mini` as the judge model.

**Comparative judgment**: Two outputs are shown side-by-side and the judge picks the better one without knowing which was produced by which system. Used in the Anthropic skills-creator for blind evaluation of with-skill vs. baseline. Reduces position bias compared to absolute scoring.

**Trajectory evaluation**: Judge sees the full execution trace (tool calls, intermediate outputs, final response) rather than just the final answer. More expensive but catches cases where the right answer came from wrong reasoning, or the wrong tool sequence happened to produce an acceptable output.

## Calibration Against Human Judgment

Raw judge scores are unreliable without calibration. LangSmith's annotation workflow explicitly routes traces where human reviewers and the automated judge disagree into a calibration queue. Reviewers label those cases, the labeled examples retune the judge prompt, and the loop repeats until judge scores match human ratings within an acceptable margin. Without this process, you're optimizing against a metric that may not track actual quality.

The GEPA optimization variant (Genetic-Pareto) in the OpenAI cookbook uses a more sophisticated approach: it trains candidate prompts on one data split and validates on another, then uses judge scores on the validation split to select prompts that generalize rather than overfit to the training graders. The best GEPA prompt scored 0.235 on the full validation set compared to 0.218 for the baseline, with the judge playing the same role as the other graders but contributing to a multi-objective optimization across all four criteria simultaneously. [Source](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

## Failure Modes

**Sycophancy bias**: Judges tend to favor outputs that match their own generation style. A GPT-4 judge evaluating GPT-4 outputs will score them higher than equivalent outputs from smaller models. Position bias is a related problem: in comparative evaluation, judges favor the first option at rates above chance.

**Domain blindness**: A judge without domain expertise will fail to catch specialized errors. A legal agent citing plausible but nonexistent precedents, or a medical agent giving technically correct but clinically dangerous guidance, may score well on a general-purpose rubric. The OpenAI cookbook's `chemical_name_grader` is a Python grader specifically because the judge couldn't reliably verify exact isotopic notation like `[1-¹³C]Pyruvate` vs `[1-13C]Pyruvate`.

**Rubric gaming**: If the same judge model runs the improvement loop and the final evaluation, the loop can produce outputs that score well on the judge's rubric while degrading on held-out human quality assessments. The train/test split in GEPA and the blind comparative evaluation in skill-creator both attempt to mitigate this.

**Score compression**: Judges avoid extreme scores. Outputs that are clearly excellent or clearly terrible often cluster in the 0.7-0.9 range rather than separating at 0.0 and 1.0. This reduces the discriminative power of absolute scoring for corner cases. Comparative judgment tends to perform better for ranking fine-grained quality differences.

**Inconsistency at scale**: Running the same judge prompt on the same input multiple times produces different scores. The skill-creator documentation addresses this directly: running 3x per query to get reliable trigger rates, using mean ± stddev for variance analysis. Single-run scores are insufficient for high-stakes decisions.

## When Not to Use It

Skip LLM-as-Judge when:

- The property you're measuring has a deterministic ground truth. Use exact match, schema validation, or Python checks instead. They're faster, cheaper, and not subject to judge variance.
- Your budget can't absorb the cost. The OpenAI cookbook's full eval loop (20 queries × 3 runs × 5 iterations) costs ~$0.15 for the judge tier but compounds quickly at scale. At 10,000 traces per day with a judge on every trace, costs accumulate before calibration confirms the judge is actually measuring what you care about.
- The domain requires expertise the judge model lacks and you can't encode that expertise into the rubric. Some failure modes in specialized regulated domains need human review. LLM-as-Judge is a complement to human annotation queues, not a replacement.
- You need real-time evaluation at low latency. Judge calls add 1-5 seconds per evaluation. Sampling rather than evaluating every trace is the standard workaround.

## Unresolved Questions

The documentation from all sources leaves several operational questions unanswered:

- **Judge model selection**: Which model should judge? The OpenAI cookbook uses `gpt-4.1` for the LLM judge and `o3-mini` in the LangGraph reflection example. There's no published guidance on when to use a stronger judge vs. a cheaper one, or whether the judge should match, exceed, or differ from the model being evaluated.

- **Calibration cadence**: How often should judge prompts be recalibrated against human labels? None of the implementations specify a maintenance cycle. A judge calibrated at launch may drift as the underlying model updates or as the distribution of inputs shifts.

- **Score aggregation**: When combining deterministic and LLM-based graders, the OpenAI cookbook uses a simple average. The GEPA variant uses multi-objective Pareto optimization. There's no guidance on which aggregation method is appropriate for which use cases.

- **Governance at scale**: Who controls the rubric in a production system, and how do rubric changes get reviewed? A rubric change can silently shift the optimization target across the entire agent improvement loop.

## Related Concepts

- [Self-Improving Agent](../concepts/self-improving-agent.md): LLM-as-Judge is the feedback signal that makes self-improvement loops possible without human annotation at each step.
- [Agent Skills](../concepts/agent-skills.md): The skill-creator meta-skill uses LLM-as-Judge as one component of its three-tier evaluation framework.
- [Reflexion](../concepts/reflexion.md): A related pattern where the same model generates verbal self-criticism rather than using a separate judge.
- [GEPA](../concepts/gepa.md): Extends LLM-as-Judge signals into Pareto-based prompt optimization.
- [Prompt Engineering](../concepts/prompt-engineering.md): Rubric design for judges is itself a prompt engineering problem; rubric quality directly determines judge reliability.
- [LangChain](../projects/langchain.md): The `openevals` library provides `create_llm_as_judge` used in LangGraph reflection examples.
- [Decision Traces](../concepts/decision-traces.md): Judge evaluation of full trajectories rather than final outputs requires trace-level visibility.
