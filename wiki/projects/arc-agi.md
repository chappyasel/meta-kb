---
entity_id: arc-agi
type: project
bucket: agent-systems
sources:
  - repos/gepa-ai-gepa.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
related:
  - OpenAI
last_compiled: '2026-04-05T06:02:37.122Z'
---
# ARC-AGI

## What It Is

ARC-AGI (Abstraction and Reasoning Corpus for Artificial General Intelligence) is a benchmark designed by François Chollet to test whether AI systems can solve novel reasoning problems through generalization rather than pattern-matching on training data. Each task presents a small number of input/output grid pairs as examples, then asks the model to produce the correct output for a new input. The grids use colored cells, and the transformation rules must be inferred from the examples alone.

The benchmark's core design principle: any human with no domain knowledge should be able to solve tasks with high accuracy, while systems that rely on memorization or brute-force statistical fitting should fail. Tasks require identifying abstract spatial, symmetry, and counting relationships that generalize from 2-5 examples.

ARC-AGI is maintained by the ARC Prize Foundation (a nonprofit) and has been used by OpenAI and other leading labs as a proxy for general reasoning capability.

## Architectural Uniqueness

Most benchmarks measure performance on problems drawn from the same distribution as training data. ARC-AGI explicitly violates this: each task tests a transformation rule that the model has never seen in that exact form. There is no way to memorize correct answers — the test set is withheld, and evaluation requires program synthesis or genuine rule induction.

The benchmark comes in two tiers:
- **ARC-AGI-1** (original, 2019): 400 public training tasks, 400 evaluation tasks, 100 private test tasks
- **ARC-AGI-2** (2025): harder version with increased compositional complexity, released alongside ARC-AGI-Semi-Private to reduce leakage risk

Each task is represented as a JSON file with `train` (examples) and `test` (held-out) pairs. Input/output grids are 2D arrays of integers 0-9, typically small (under 30x30).

## How It Works

**Task format**: A task file contains 2-5 demonstration pairs showing the input grid and the corresponding transformed output. The test input is provided; the solver must produce the test output grid exactly.

**Evaluation**: Answers must match the target grid pixel-for-pixel. Partial credit is not awarded. This binary scoring means a system that gets 80% of cells right scores 0 on that task.

**No text, no language**: ARC-AGI contains no natural language. Tasks are purely visual-spatial, explicitly excluding knowledge encoded in text corpora. This was intended to prevent LLMs from solving tasks via memorized solutions.

**Human baseline**: Chollet measured human performance at roughly 85% on the public set. Human solvers typically take a few minutes per task.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| ARC-AGI-1 public tasks | 400 | ARC Prize Foundation (authoritative) |
| ARC-AGI-1 test tasks | 100 (private) | ARC Prize Foundation |
| Human accuracy | ~85% | Self-reported by Chollet; consistent across multiple small samples |
| GPT-4 (zero-shot, 2023) | ~0-5% | Independently replicated across multiple papers |
| o3 (high-compute, 2024) | ~88% | OpenAI self-reported; not independently reproduced at time of announcement |
| GEPA architecture discovery | 32% → 89.5% | Self-reported by GEPA team; methodology-dependent |
| ARC Prize (2024) | $1M prize pool | ARC Prize Foundation |

The o3 result at 88% generated significant attention but is self-reported by OpenAI under undisclosed compute settings. Independent verification of this number has not been published.

## Strengths

**Leakage resistance**: The private test set is genuinely held out, and the task format prevents web-scraping for answers. ARC-AGI-2 introduces semi-private evaluation to further reduce contamination risk.

**Human interpretability**: Every task has a human-readable solution. This makes failure analysis meaningful — you can look at what a system got wrong and understand why.

**Cheap to run baselines**: Public training tasks are freely available. Researchers can develop and evaluate approaches without paying for API access to private evaluation.

**Genuine difficulty for pattern-matching systems**: Systems that perform well on MMLU, GSM8K, and HumanEval frequently score near zero on ARC-AGI, demonstrating it measures something different.

## Critical Limitations

**Concrete failure mode**: High-compute inference can mask reasoning. When o3 was reported at 88%, the compute budget required was orders of magnitude higher than human compute, yet the score was presented as evidence of human-level reasoning. A human using 10 minutes per task and a model using thousands of inference steps per task are not directly comparable.

**Unspoken infrastructure assumption**: The benchmark assumes the evaluation environment can execute code or run test-time search. Achieving competitive scores typically requires program synthesis frameworks, domain-specific languages, or inference-time search over candidate grid transformations. A researcher expecting to plug in a standard chat API and score above 20% will be disappointed.

## When NOT to Use It

Skip ARC-AGI if you need to benchmark systems on tasks with real-world variation in problem framing, noise, or ambiguity. ARC-AGI tasks are hand-crafted to be clean and unambiguous — performance here does not predict performance on messy real-world visual reasoning. It also is not useful for evaluating language understanding, code generation, or domain knowledge. If your system's core capability is one of those, ARC-AGI will tell you nothing about it.

Do not use ARC-AGI-1 as a definitive reasoning benchmark in papers without addressing contamination. The public training set has been online since 2019, and any model trained on data scraped from the internet after that point has some exposure risk.

## Unresolved Questions

**What does o3's performance actually mean?** The compute budget for o3 at 88% has not been disclosed. Without knowing whether this required 1,000x or 1,000,000x the compute of a human, the comparison to human performance is uninterpretable.

**Does ARC-AGI-2 solve the leakage problem?** Semi-private evaluation reduces one form of leakage but relies on the ARC Prize Foundation controlling the test set. There is no published analysis of whether the harder task distribution is genuinely out-of-distribution for frontier models.

**Program synthesis vs. learned reasoning**: Top-performing systems on ARC-AGI use explicit program synthesis or test-time search (MindsAI, Ryan Greenblatt's approaches). Whether this constitutes the generalization ability the benchmark was designed to measure, or is an exploit of the task format, is debated.

**Governance after ARC Prize**: The ARC Prize Foundation has run a $1M competition, but the long-term governance of the benchmark — who decides whether a new system's score is valid, how compute is normalized — is not publicly documented.

## Alternatives

| Benchmark | Use When |
|-----------|----------|
| [ConceptARC](https://github.com/victorvikram/ConceptARC) | You want ARC tasks grouped by concept category for fine-grained analysis |
| MMLU | Measuring domain knowledge breadth across academic subjects |
| GSM8K / MATH | Evaluating multi-step mathematical reasoning with language |
| BIG-Bench Hard | Testing reasoning across diverse task types with language |
| CRUXEval | Measuring code execution reasoning specifically |

Use ARC-AGI when you want a benchmark that is explicitly designed to resist memorization and measures spatial-abstract generalization. Use something else when you need to benchmark systems on tasks representative of deployed applications.

## Related Pages

- [GEPA](gepa.md) — optimization framework that used ARC-AGI as a benchmark for agent architecture discovery, reporting 32% → 89.5% accuracy improvement via evolutionary search
