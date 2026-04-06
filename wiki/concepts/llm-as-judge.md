---
entity_id: llm-as-judge
type: approach
bucket: self-improving
abstract: >-
  LLM-as-Judge is an evaluation approach where one LLM scores or critiques
  another LLM's outputs, enabling scalable automated quality assessment without
  requiring human annotation for every sample.
sources:
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related: []
last_compiled: '2026-04-05T23:13:49.839Z'
---
# LLM-as-Judge

## What It Is

LLM-as-Judge is an evaluation paradigm where a large language model acts as an automated assessor of another model's outputs. Instead of relying on human annotators or rigid rule-based checks for every evaluation, you prompt a capable LLM (the judge) with a rubric and ask it to score, critique, or rank candidate outputs.

The approach emerged from a practical problem: human evaluation is expensive, slow, and doesn't scale to the iteration speeds modern LLM development requires. Deterministic metrics (BLEU, ROUGE, exact match) work for narrow tasks but fail on open-ended outputs where quality is inherently subjective. LLM-as-Judge occupies the space between these two extremes: cheaper than humans, more semantically flexible than rule-based checks.

## Why It Matters

Three forces made this approach necessary:

1. **Evaluation bandwidth is the bottleneck.** Teams can generate thousands of model outputs per day. Human review throughput caps at hundreds. The gap forces a choice between slow iteration or unevaluated deployments.

2. **Most interesting tasks resist deterministic scoring.** A medical summary that is factually accurate but unreadable scores identically to one that is both accurate and useful under exact-match grading. LLM judges can assess coherence, completeness, tone, and domain fidelity.

3. **Self-improving agent systems require automated feedback loops.** Systems like Reflexion (verbal self-reflection), GEPA (genetic prompt evolution), and the OpenAI self-evolving agents cookbook all depend on automated evaluation signals to close the optimization loop without human checkpoints at every iteration.

## How It Works

### Core Pattern

The minimal implementation involves three components:

**The judge prompt** specifies the evaluation rubric. This can be a binary pass/fail, a numeric score on a defined scale, or a structured assessment across multiple dimensions. The rubric's specificity determines the judge's reliability.

**The input package** includes the original prompt or context, the candidate output being evaluated, and optionally reference outputs or domain-specific ground truth.

**The score extraction** parses the judge's response into a usable signal. This ranges from simple regex on a "Score: X" line to structured JSON output or chain-of-thought reasoning followed by a final verdict.

### Grader Taxonomy

The OpenAI self-evolving agents cookbook [Source](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md) provides a practical four-grader taxonomy that illustrates how LLM-as-Judge fits within a broader evaluation stack:

| Grader Type | Mechanism | When to Use |
|-------------|-----------|-------------|
| Deterministic (Python) | Exact string matching, regex, rule computation | Chemical name presence, word count, format compliance |
| Text similarity | Cosine similarity, BLEU, ROUGE | Semantic proximity to reference content |
| LLM-as-judge (`score_model`) | Rubric-prompted LLM scoring | Holistic quality, nuanced compliance, domain reasoning |
| Human annotation | Expert review | Ground truth calibration, edge cases |

The cookbook's pharmaceutical summarization example uses an LLM judge as the "holistic failsafe when edge cases slip past deterministic checks" — scoring 0.85 pass threshold against a rubric covering technical accuracy, completeness, and regulatory fidelity. The judge catches what the chemical-name regex and cosine similarity miss.

### Scoring Rubric Design

Rubric quality is the primary determinant of judge reliability. The OpenAI cookbook's LLM judge prompt illustrates good practice:

```
Scoring Guidelines:
- 1.0: Almost flawless — comprehensive, faithful, technically accurate
- 0.75-0.99: Excellent — all main facts, trivial omissions only
- 0.5-0.75: Good — most technical information retained
- 0.3-0.5: Significant information missing or minor inaccuracies
- 0.0-0.3: Major omissions, misunderstandings, failure to capture key content
```

Concrete score ranges with explicit criteria reduce variance in judge outputs. Vague rubrics ("rate quality from 1-10") produce inconsistent results across different inputs.

### Integration with Optimization Loops

LLM-as-Judge becomes architecturally significant when embedded in feedback loops. Three integration patterns appear across the source material:

**Reflexion-style verbal feedback**: The judge produces natural language critique rather than (or in addition to) numeric scores. This critique feeds directly into the agent's self-reflection and next-attempt reasoning. Shinn et al. demonstrate that verbal feedback outperforms scalar rewards: on HotPotQA, Reflexion with self-reflection achieves 75% accuracy versus 63% with episodic memory alone and 61% for the base CoT — a 12-percentage-point gap attributable to reflection quality. [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

**Eval-driven prompt optimization**: Each iteration of the self-evolving loop generates summaries, scores them with graders including LLM judges, and uses failures to trigger metaprompt optimization. The loop runs until the aggregate score exceeds a threshold (0.8 in the cookbook example) or hits `max_retry = 10`. [Source](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

**Constructed fitness functions**: In goal-md's framework, when no natural scalar metric exists (documentation quality, code health), the LLM judge becomes part of the constructed fitness function. The agent cannot measure progress without first building the evaluation instrument. [Source](../raw/deep/repos/jmilinovich-goal-md.md)

### Agent Skill Evaluation

Philipp Schmid's practical guidance on agent skill evaluation specifies a concrete workflow: define success criteria across outcome, style, and efficiency dimensions; create 10–12 prompts with deterministic checks; add LLM-as-judge for qualitative assessment; and iterate on skill implementations using eval failures. The combination matters because AI-generated skills often lack the rigor of hand-crafted implementations, making automated evaluation the primary quality gate. [Source](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md)

## Key Benchmarks and Evidence

The most rigorous empirical evidence for LLM-as-Judge effectiveness comes from Reflexion's ablations [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md):

- HumanEval pass@1: 91% (Reflexion) vs 80.1% (GPT-4 baseline) — self-reported
- HotPotQA: 75% vs 61% baseline with ground-truth context — self-reported
- AlfWorld sequential decision-making: 130/134 tasks completed (97%) within 12 trials

These results are from the original Reflexion paper (Shinn et al., 2023) and have not been independently reproduced at scale. The underlying mechanism — verbal self-reflection as feedback — depends directly on judge quality.

The OpenAI cookbook reports a pharmaceutical summarization agent improving from an initial naive prompt to a v5 prompt achieving aggregate scores of 0.802 average across sections. These results are self-reported from a single domain and should not be generalized without domain-specific validation.

## Failure Modes

**Self-serving bias (sycophancy)**: A judge model may prefer outputs that resemble its own training distribution or exhibit patterns it was rewarded for during RLHF. This creates a systematic bias favoring verbose, confident-sounding text regardless of factual accuracy.

**False positives on incorrect outputs**: The most operationally damaging failure mode. The Reflexion paper documents a 16.3% false-positive rate on MBPP Python benchmarks — the judge (self-generated unit tests) passes incorrect code, causing the agent to submit wrong answers with high confidence. In domains with higher stakes than coding benchmarks, this failure mode causes direct harm.

**Reflection without reliable evaluation is harmful**: Reflexion's ablation table is clear: self-reflection without test feedback drops HumanEval Rust performance from 60% to 52%. An unreliable judge is worse than no judge. [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

**Metric gaming in open evaluation modes**: When the judge can be influenced by the system being evaluated (as in open-mode fitness functions), the agent may learn to produce outputs that score well under the specific rubric without genuine quality improvement. The dual-score pattern in goal-md attempts to address this by separating outcome measurement from instrument calibration. [Source](../raw/deep/repos/jmilinovich-goal-md.md)

**Model capability dependency**: Weaker foundation models produce unreliable judgments. Reflexion shows zero improvement when the agent model is StarChat-beta — the same principle applies to the judge. GPT-3.5-class models are the practical floor for reliable LLM-as-Judge implementations as of 2023.

**Rubric drift**: Long optimization loops can cause the judge's effective rubric to drift from the intended criteria, particularly when the judge is also being used to generate improvement suggestions. Without periodic calibration against human annotations, accumulated drift degrades evaluation fidelity.

## When NOT to Use It

**Safety-critical evaluation without human calibration**: LLM judges cannot reliably detect hallucinations, factual errors, or dangerous content in specialized domains (medicine, law, chemistry) without domain-expert validation of the rubric and spot-check verification of judge outputs. The pharmaceutical example in the cookbook uses LLM-as-judge as one signal among four graders, not as the sole arbiter.

**Tasks requiring exploration over refinement**: Reflexion's WebShop failure demonstrates the class of tasks where verbal feedback loops fail. If your agent needs to discover the right approach through diverse exploration rather than refine an approach that's directionally correct, LLM-as-Judge feedback loops reinforce existing strategies rather than promoting useful variation.

**When your foundation model is below GPT-3.5 class**: The approach produces no benefit and may produce negative results (worse than simple retry) when the judge lacks sufficient reasoning capability.

**High-throughput production monitoring at scale**: LLM-as-Judge calls add latency and cost. For systems processing millions of requests daily, sampling strategies and deterministic pre-filters should gate LLM judge invocations to cases where simpler checks have already flagged potential issues.

## Unresolved Questions

**Calibration against human judgment**: Most published implementations don't report inter-rater reliability between LLM judges and human annotators. The correlation between a judge's score and human expert assessment varies substantially by domain and rubric quality. Published calibration studies are sparse.

**Judge model selection**: Should the judge be the same model as the agent, a larger model, or a specialized evaluator? The cookbook uses GPT-4.1 as judge for a GPT-5 agent — the selection logic is not explained. Using a weaker model as judge for a stronger agent creates obvious reliability problems; using the same model risks circular reasoning.

**Adversarial robustness**: How much can a sufficiently capable agent learn to game a specific judge's rubric without improving actual output quality? This is an open research question with significant implications for long-running optimization loops.

**Cost attribution**: At production scale, LLM judge calls can exceed the cost of the primary inference. Published implementations rarely report judge call frequency, cost per evaluation cycle, or cost-quality tradeoffs.

## Alternatives and Selection Guidance

| Alternative | Select When |
|-------------|-------------|
| **Human annotation** | Ground truth calibration, safety-critical domains, rubric development |
| **Deterministic metrics** (BLEU, ROUGE, exact match) | Narrow tasks with well-defined correct answers |
| **Rule-based Python graders** | Format compliance, entity presence, length constraints |
| **Text similarity** (cosine, BM25) | Semantic proximity to reference content matters most |
| **Reward models** (fine-tuned classifiers) | High-volume evaluation where consistency and cost matter more than rubric flexibility |
| **LLM-as-Judge** | Open-ended quality assessment where deterministic checks fail and human annotation is too slow |

In practice, robust evaluation stacks combine multiple grader types. LLM-as-Judge works best as a holistic quality signal layered on top of deterministic checks that handle unambiguous criteria — the architecture demonstrated in the OpenAI cookbook's four-grader setup.

## Practical Implementation Notes

Start with rubric design before implementation. The quality of your judge's scoring rubric determines everything downstream. Invest in rubric development through comparison against human annotations on representative samples before deploying LLM-as-Judge in an optimization loop.

Keep the judge model fixed during optimization runs. Changing the judge mid-loop invalidates score comparisons across iterations.

Track judge reliability metrics alongside task metrics. Monitor the rate at which judge scores disagree with human spot-checks. If this exceeds 15-20%, recalibrate the rubric before continuing optimization.

Use pass thresholds rather than raw scores for go/no-go decisions. The cookbook's 0.85 pass threshold per grader provides more stable optimization signals than optimizing continuous scores, which are sensitive to judge variance.


## Related

- [Self-Improving Agents](../concepts/self-improving-agents.md) — implements (0.6)
