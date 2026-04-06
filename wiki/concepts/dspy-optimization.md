---
entity_id: dspy-optimization
type: approach
bucket: self-improving
abstract: >-
  Eval-Driven Development: build evaluation frameworks before building agent
  systems, then iterate on measurable metrics. Distinguishes itself by treating
  evals as the primary engineering artifact rather than a testing afterthought.
sources:
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - deep/repos/jmilinovich-goal-md.md
related: []
last_compiled: '2026-04-05T23:19:33.925Z'
---
# Eval-Driven Development

## What It Is

Eval-Driven Development (EDD) is a methodology for building LLM-based agent systems where you construct the evaluation framework first, then use automated metrics to guide iterative improvement. The analogy to Test-Driven Development is deliberate but imprecise: where TDD tests binary pass/fail correctness, EDD optimizes toward scalar quality scores across dimensions that resist binary judgment.

The core claim: agent behavior is too probabilistic and multidimensional for correctness-only testing. You need measurement instruments that capture nuanced quality signals, and you need those instruments before you start building, so that every iteration has a clear definition of "better."

## Why It Emerged

Agent systems fail in ways that unit tests don't catch. A skill might pass every deterministic check but still produce outputs that are stylistically wrong, inefficient, or that drift from intended behavior as the system evolves. Three converging pressures pushed EDD into focus:

**The code generation bottleneck dissolved.** LLMs write adequate code quickly. The bottleneck shifted to validation, regression prevention, and behavior maintenance as systems change. [auto-harness](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md) frames this explicitly: "It is no longer writing code. It is everything that comes after."

**AI-generated skills lack rigor.** Agent skills are frequently LLM-generated and untested. [Philipp Schmid's evaluation guide](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md) identifies this as a specific risk: AI-generated skills "often lack the rigor of hand-crafted implementations," making eval-driven iteration essential rather than optional.

**Most domains have no natural metric.** Karpathy's autoresearch pattern works when a scalar metric already exists (bits-per-byte on a language modeling benchmark). Most software quality dimensions, documentation quality, code health, architectural fitness, don't have pre-built rulers. The [goal-md project](../raw/deep/repos/jmilinovich-goal-md.md) identifies metric construction as the hard problem: "you have to construct the metric before you can optimize it."

## Core Mechanism

EDD operates through four phases that repeat across the development lifecycle:

**Phase 1: Define success criteria.** Before writing the system, specify what "good" looks like across three dimensions: outcome (did it do the right thing?), style (does it match expected patterns?), and efficiency (did it use appropriate resources?). These criteria become the spec that the eval framework encodes.

**Phase 2: Build the measurement instrument.** Write the scoring script, eval suite, or benchmark before building the system. For domains with natural metrics (test pass rate, API latency), this means wrapping existing tools. For domains without them, this means constructing the metric from scratch: decomposing quality dimensions, assigning weights, writing scripts that mechanically evaluate each component.

**Phase 3: Run the system, observe failures, iterate.** The improvement loop is: measure, diagnose, act, verify, keep or revert, log. Failures cluster into patterns rather than isolated incidents. Addressing clusters, not individual cases, prevents overfitting to specific examples while generalizing to root causes.

**Phase 4: Accumulate constraints.** Fixed failures become permanent regression cases. The eval suite grows with each resolved failure cluster. This is the compounding property: every improvement is additive because the system can't backslide past what it's already solved.

## Implementation Patterns

### Deterministic Tests + LLM-as-Judge

The most common implementation pairs mechanically verifiable checks with probabilistic quality assessment. Schmid's pattern uses 10-12 prompts with deterministic checks (did the tool get called? did the output parse?) plus LLM-as-judge for qualitative criteria (is the tone appropriate? is the explanation clear?). Deterministic checks catch regressions reliably. The LLM judge catches quality drift that binary tests miss.

### The Dual-Score Pattern

When an agent builds or modifies its own evaluation infrastructure, a single score creates gaming risk. goal-md's dual-score pattern separates:

- **Outcome score**: Is the thing being measured actually improving?
- **Instrument score**: Can the measurement be trusted?

The decision rule is explicit: if instrument score falls below a threshold, fix the instrument before optimizing the outcome. This prevents a failure mode where the agent "fixes" documentation to satisfy a broken linter, improving the score while degrading the actual output.

### Failure Clustering

auto-harness demonstrates that mining failures from production traces and clustering them by root cause outperforms case-by-case debugging. A fix that resolves a cluster generalizes because it addresses the underlying cause rather than individual symptoms. The reported result on Tau3 benchmark tasks: score improvement from 0.56 to 0.78 (~40%) while maintaining a regression gate that prevented backsliding. This benchmark result is self-reported by NeoSigma.

### Metric Mutability Classification

goal-md formalizes three stances toward the scoring instrument:

- **Locked**: The agent cannot modify the scoring code. Appropriate when the metric is well-understood and trusted (test execution time, bundle size).
- **Split**: The agent can improve the measurement instrument (add tests, fix linters) but not redefine what counts as success. The dual-score pattern applies here.
- **Open**: The agent can modify both the system and the evaluation criteria. Necessary for early-stage projects where the fitness function is being designed alongside the system, but carries the highest gaming risk.

Treating metric mutability as an explicit architectural decision rather than an implicit assumption distinguishes this from ad-hoc eval setups.

## Key Files and Artifacts

In a mature EDD setup, the evaluation infrastructure lives in first-class files:

- **Scoring script** (`scripts/score.sh` or equivalent): The fitness function. In goal-md's implementation, a 456-line bash script with no dependencies beyond standard Unix tools that outputs both human-readable and JSON-formatted scores.
- **Regression suite** (`workspace/suite.json` in auto-harness): Maintained by the coding agent, not the human. Grows with each resolved failure cluster.
- **Iteration log** (`iterations.jsonl` in goal-md): Appends one JSON line per iteration with before/after scores, action taken, result (kept/reverted), and a note. Cross-session memory that prevents repeating failed experiments.
- **Persistent learnings** (`workspace/learnings.md` in auto-harness): What worked, what didn't, what the agent needs from you.

## Strengths

**Compound reliability.** The regression gate is what makes gains accumulate. Without it, optimization loops cover the same ground repeatedly. With it, every improvement raises the floor permanently.

**Domain generality.** By treating metric construction as part of the methodology rather than a prerequisite, EDD extends autonomous optimization to domains without natural metrics. Documentation quality, code health, and architectural fitness all become optimizable targets once you build the ruler.

**Failure mode diagnosis.** Clustering failures by root cause rather than fixing incidents in isolation produces fixes that generalize. This is the difference between patching symptoms and addressing causes.

**Context management.** auto-harness's sub-agent pattern (sub-agents own verbose output, parent sees only summaries) keeps context manageable across long-running optimization sessions, a practical engineering constraint that purely conceptual frameworks ignore.

## Limitations

**Metric construction is hard.** Building the ruler requires deep domain understanding. You must decompose quality into measurable components, assign meaningful weights, and write a scoring script before optimization begins. For teams without that domain knowledge, the methodology stalls at phase 2.

**Open-mode gaming risk.** When an agent can modify both the system and its own evaluation criteria, it can find degenerate solutions that inflate both scores without genuine improvement. The dual-score pattern mitigates but doesn't eliminate this.

**Scoring script fragility.** Bash-based scoring scripts using grep and regex matching are brittle to formatting changes. goal-md's score.sh demonstrates this: an unexpected markdown heading format can break detection. Edge cases like empty files or unusual encodings often go unhandled.

**Action catalog staleness.** Static action catalogs don't grow as optimization progresses. In long-running sessions, the agent exhausts the catalog and must discover new actions independently. There's no formal mechanism for updating the catalog based on discoveries.

**No noise handling.** Neither goal-md nor auto-harness have built-in noise detection. Keep/revert decisions are binary based on score delta. Flaky metrics (Lighthouse scores, tests with non-deterministic behavior) can produce false keeps and false discards.

## When Not to Use It

**Domains with well-defined correctness criteria.** If your system either passes or fails a test suite with no meaningful middle ground, standard TDD suffices. EDD overhead isn't justified.

**One-shot deliverables.** If the system ships once and doesn't evolve, the evaluation infrastructure investment doesn't pay off. EDD's value compounds over time.

**Teams that can't write scoring scripts.** The methodology requires someone who can decompose quality into mechanically verifiable checks. If that skill is absent, you'll build measurement instruments that capture the wrong thing, and iteration will optimize toward the wrong target.

**Early exploration.** When you don't yet know what "good" looks like, building evaluation infrastructure before exploration can lock you into the wrong quality model. Some discovery work should precede EDD adoption.

## Unresolved Questions

**How do you validate the measurement instrument?** The dual-score pattern identifies instrument trustworthiness as a separate concern but doesn't specify how to verify that the instrument itself is measuring the right thing. This is a meta-evaluation problem that none of the current implementations address systematically.

**At what cadence should eval suites be retired?** Regression suites grow indefinitely under EDD. Old cases may become irrelevant as the system evolves. There's no guidance on pruning cases that no longer reflect production behavior.

**Human evaluation integration.** goal-md's supervised mode includes human approval gates, and its video scoring requires a `QUALITY.md` file containing "APPROVED." How to structure human-in-the-loop evaluation at scale, when it's worth the cost, and how to prevent it from becoming a bottleneck remains underdeveloped.

## Related Patterns

**autoresearch (Karpathy)**: The intellectual ancestor. Agent + fitness function + loop. Assumes the fitness function already exists. EDD generalizes by treating metric construction as part of the problem. See [goal-md](../raw/deep/repos/jmilinovich-goal-md.md).

**Goal-Oriented Action Planning (GOAP)**: Goal-first specification of agent behavior from game AI. EDD borrows the goal-first orientation but applies it to continuous improvement rather than discrete action selection.

**AGENTS.md / CLAUDE.md patterns**: Agent instruction files that bootstrap agent behavior. Complementary to EDD but focused on capability declaration rather than optimization objectives.
