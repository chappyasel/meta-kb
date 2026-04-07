---
entity_id: karpathy-loop
type: concept
bucket: self-improving
abstract: >-
  The Karpathy Loop is a scored, version-controlled iteration cycle where an
  agent modifies one file per round, keeps changes that improve a numeric
  metric, and reverts ones that don't — enabling unattended overnight
  optimization of any scoreable artifact.
sources:
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
related:
  - andrej-karpathy
  - cursor
  - autoresearch
last_compiled: '2026-04-07T11:49:13.875Z'
---
# Karpathy Loop

## What It Is

The Karpathy Loop is an automated improvement cycle named after [Andrej Karpathy](../concepts/andrej-karpathy.md) following his release of the `autoresearch` repository in early 2026. The pattern distills a workflow Karpathy already used manually — make a change, test it, keep or discard, repeat — into a form a coding agent can execute unattended across dozens or hundreds of rounds overnight.

Fortune named it "The Karpathy Loop." The repo hit 42,000 GitHub stars in its first week. The name stuck because the mechanism is transferable: Karpathy demonstrated it on ML training code, [Tobi Lütke](../concepts/tobi-lutke.md) applied it to Shopify's Liquid templating engine and got 53% faster rendering from 93 automated commits, and others have since run it on prompts, skill files, email templates, and ad copy. None of those applications require ML knowledge or a GPU.

## Core Mechanism

Three components define every loop run:

**The target file.** The single file the agent is allowed to edit. A system prompt, a [SKILL.md](../concepts/skill-md.md), an email template, a training configuration. One file per run. This constraint is structural: the agent can only improve the target because everything else is locked.

**The eval file.** A scoring harness the agent cannot touch after the first round. It generates outputs from the current target file, grades them against a set of binary yes/no questions, and prints a percentage. Karpathy made `prepare.py` read-only in his repo for this reason. If the agent could modify the eval, it would find ways to pass the test rather than improve the output.

**The instruction file.** A human-written file that tells the agent what to try, what constraints to observe, and how to behave when the loop stalls.

Each cycle:
1. Read the current target file
2. Decide one change to try
3. Generate outputs and score them with the eval harness
4. If score improved: `git commit`
5. If score dropped or held flat: `git reset`
6. Repeat

At roughly 5 minutes per cycle and 12 cycles per hour, a single overnight run produces 50–100 evaluated iterations. API cost runs $5–25 depending on model and cycle count. Any coding agent that can read files, write files, and use git executes the loop — [Cursor](../projects/cursor.md), [Claude Code](../projects/claude-code.md), Windsurf, [OpenAI Codex](../projects/codex.md).

The eval criteria are the hardest part to get right. They must be binary (yes/no, never 1–7 scales), numbering 3–6 per run. Below 3 and the agent finds loopholes. Above 6 and it games the checklist rather than improving the actual output. Every criterion must be scoreable by a stranger in one sentence.

## Why It Works Beyond ML

The mechanism has no ML-specific components. Three conditions determine whether any artifact qualifies:

1. The output can be scored with a number
2. That scoring runs without a human in the loop
3. Only one file changes per round

All three satisfied: the loop works. Any one missing: it won't converge.

Karpathy ran the loop on code he'd already optimized manually for months and found 20 improvements he'd missed, including a bug in his attention implementation. The improvements stacked and transferred to a larger model for an 11% speedup. The lesson from that result is the point: human manual iteration is rate-limited. The loop is not.

## Concrete Results

- **Karpathy's ML training code:** 20 improvements found in code already manually optimized, 11% speedup. (Self-reported)
- **Shopify's Liquid engine (Tobi Lütke):** 93 automated commits, 53% faster rendering, 61% fewer memory allocations, 974 unit tests still passing. (Self-reported, widely circulated)
- **Landing page copy skill (Aakash Gupta demo):** Baseline 41.3%, reached 92% in 4 rounds with 3 changes kept and 1 reverted. (Self-reported, single anecdote)
- **Email reply rates (MindStudio-documented teams):** 2–4% baseline to 8–12% over 4–6 weeks. (Self-reported, aggregate, not independently validated)

All figures above are self-reported. No independent third-party benchmark exists for the general pattern as of this writing.

## Strengths

**Rate multiplier for iteration.** A human running a manual test-edit-evaluate cycle on a prompt might complete 8–10 rounds in a day. The loop runs 100 overnight. For any problem where quality compounds across iterations, this gap matters.

**Automatic regression detection.** Because the eval is frozen and git tracks every state, a change that degrades quality gets reverted without human review. The experiment log is the git history.

**No ML prerequisites.** The pattern applies to anything with a scoreable output: prompts, [skill files](../concepts/skill-md.md), email templates, job descriptions, content templates, agent configurations.

**Composable with existing agent infrastructure.** Any coding agent using git can run it. The loop is a convention, not a framework. [AutoResearch](../projects/autoresearch.md) implements the specific ML variant; the general pattern runs on whatever agent you already use.

## Critical Limitations

**Concrete failure mode — eval gaming.** When criteria exceed 6, or are imprecisely defined, the agent optimizes for checklist compliance rather than real quality. An output can score 90% on 8 binary questions while reading like something no human would publish. The score becomes detached from the underlying quality you actually care about. This is not a edge case — it's the most common failure mode in practice, and it's invisible until you read the output.

**Unspoken infrastructure assumption.** The loop assumes the eval harness runs deterministically and fast. For artifacts where evaluation requires real user behavior (email reply rates, ad click-through), the feedback loop lengthens from minutes to days or weeks, eliminating the overnight iteration advantage. You need either a proxy metric that correlates with the real outcome or API access to a platform that returns signal automatically.

**Local maximum risk.** The loop is a greedy hill-climber. Each round commits changes that raise the score and reverts ones that don't. It cannot take a score decrease to escape a plateau toward a better region. A run that stalls at 75% may be stuck at a local maximum with no mechanism to get out.

**Score inflation from prompt-generated evals.** If the agent writes the initial eval criteria based on a description of your goals rather than examples of genuinely good outputs, the criteria may be too easy to satisfy. The score climbs quickly but the output quality doesn't match.

## When NOT to Use It

**No stable numeric proxy exists.** If you cannot write 3–6 binary questions that correlate tightly with what you actually want, the loop will optimize the wrong thing. Defining the eval is the human's job and cannot be delegated to the agent.

**The feedback signal requires real users.** Conversion rates, retention, virality — anything that requires actual human behavior in production cannot serve as the eval. The loop needs a signal that runs in minutes, not weeks.

**The target artifact is deeply interdependent.** Prompts or configs that interact with five other components in complex ways may require changes to multiple files simultaneously. The one-file-per-round constraint breaks when the improvement space requires coordinated edits.

**Quality judgment is inherently subjective and contextual.** Brand voice, tone, creative writing — domains where "better" depends on human taste rather than binary criteria produce evals that mislead more than they guide.

## Relationship to Adjacent Concepts

The Karpathy Loop is a specific instantiation of a broader [self-improving agent](../concepts/self-improving-agent.md) pattern. It differs from [Reflexion](../concepts/reflexion.md) in that Reflexion improves agent behavior through verbal reflection added to memory, while the Karpathy Loop improves a static artifact through scored iteration with version control. [GEPA](../concepts/gepa.md) and [AgentEvolver](../projects/agentevolver.md) operate on agent prompts similarly but use evolutionary selection across populations rather than greedy single-file iteration.

[DSPy](../projects/dspy.md)'s prompt optimization operates on similar principles — score a prompt, modify it, re-evaluate — but within a structured framework with defined optimizers rather than a free-form agent loop.

The eval criteria the loop depends on are a form of [LLM-as-Judge](../concepts/llm-as-judge.md) when scoring is done by a model rather than a deterministic function. When [SKILL.md](../concepts/skill-md.md) files are the target artifact, the loop produces [procedural memory](../concepts/procedural-memory.md) improvements: better instructions for how to perform a task.

[Automatic curriculum](../concepts/automatic-curriculum.md) and [continual learning](../concepts/continual-learning.md) address related problems at the model weight level rather than the artifact level.

## Unresolved Questions

**Eval quality bootstrapping.** The loop's output quality is bounded by the quality of the eval criteria. The documentation and community guides offer templates, but no systematic method exists for verifying that your binary questions actually correlate with the real outcome you care about before you run 100 cycles.

**Improvement ceiling.** Across multiple runs on the same artifact, does the loop converge and stay converged, or do later runs find that earlier improvements were fragile? No published data exists on multi-run stability.

**Cost at scale for high-token artifacts.** At ~18,000 tokens per cycle, a 100-round run on a complex agent system prompt could cost significantly more than $25 if the eval requires generating long outputs. The cost estimates circulating assume short-to-medium artifacts.

**Governance for production systems.** If the loop runs overnight and commits changes to a skill file or system prompt in production, who reviews the diff before deployment? The pattern is described in the context of development workflows, but the boundary between "overnight optimization" and "unreviewed production change" is not addressed.

## Alternatives

- **[DSPy](../projects/dspy.md)** — Use when you want structured prompt optimization with defined optimizers (MIPROv2, COPRO) and a compiled pipeline rather than an open-ended agent loop
- **[Reflexion](../concepts/reflexion.md)** — Use when the goal is improving agent decision-making through memory rather than refining a static artifact
- **Manual A/B testing** — Use when the feedback signal requires real user behavior and no proxy metric is available
- **[GEPA](../concepts/gepa.md) / evolutionary approaches** — Use when the search space is large enough that greedy hill-climbing reliably gets stuck and population-based search is warranted

---

*Sources: [The Product Channel by Sid Saladi](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md), [AI by Aakash](../raw/articles/ai-by-aakash-the-ultimate-autoresearch-guide.md), [@aakashgupta tweet](../raw/tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md)*


## Related

- [Andrej Karpathy](../concepts/andrej-karpathy.md) — created_by (1.0)
- [Cursor](../projects/cursor.md) — implements (0.5)
- [AutoResearch](../projects/autoresearch.md) — implements (0.8)
