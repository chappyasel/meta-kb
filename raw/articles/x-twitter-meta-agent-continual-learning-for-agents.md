---
url: 'https://x.com/essamsleiman/status/2041224799746428944'
type: article
author: '@essamsleiman'
date: '2026-04-07'
tags:
  - self-improving
  - agent-systems
  - production-optimization
  - harness-engineering
  - LLM-judges
  - continuous-improvement
  - anthropic-sdk
key_insight: >-
  Meta-agent demonstrates that harness optimization can work effectively on
  unlabeled production traces using LLM judges as surrogate evaluators, rather
  than requiring expensive labeled data—this shifts agent improvement from
  offline experimentation to continuous production feedback loops where most
  real agents operate.
relevance_scores:
  topic_relevance: 10
  practitioner_value: 10
  novelty: 9
  signal_quality: 9
  composite: 9.7
  reason: >-
    Meta-agent is a directly on-topic self-improving agent system that
    implements continuous harness optimization from production traces using LLM
    judges—a novel, production-ready, open-source implementation of
    self-improvement loops (topic 6) with agent architecture optimization (topic
    4) and persistent filesystem memory across iterations.
---
## meta-agent: continual learning for agents

> Published on X (Twitter) by @essamsleiman on 2026-04-07

![Cover image](https://pbs.twimg.com/media/HFPsr_da0AAZCJc.jpg)

**We built [meta-agent](https://github.com/canvas-org/meta-agent): an open-source library that automatically and continuously improves agent harnesses from production traces.**

Point it at an existing agent, a stream of unlabeled production traces, and a small labeled holdout set.

An LLM judge scores unlabeled production traces as they stream.

A proposer reads failed traces and writes one targeted harness update at a time, such as changes to prompts, hooks, tools, or subagents.

The update is kept only if it improves holdout accuracy.

On **[tau-bench](https://github.com/sierra-research/tau-bench) v3 airline,** meta-agent improved holdout accuracy from 67% to 87%.

We open-sourced meta-agent. It currently supports [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview), with more frameworks coming soon. Try it here: \[[GitHub repo](https://github.com/canvas-org/meta-agent)\]

## **Why**

Recent work shows that optimizing the harness layer can materially improve agent performance.

On TerminalBench-2, vanilla Claude Code with Claude Haiku 4.5 scores 27.5%. The best hand-engineered harness on the same model reaches 35.5%, with no fine-tuning ([Meta-Harness, Lee et al. 2026](https://arxiv.org/abs/2603.28052)).

Recent systems have also shown that harnesses can be improved automatically through iterative search ([Autoresearch, Karpathy 2026](https://github.com/karpathy/autoresearch); [Meta-Harness, Lee et al. 2026](https://arxiv.org/abs/2603.28052)).

But those methods usually depend on strong evaluation signals during search, such as labels, tests, or deterministic checks. Agents typically run on messy customer workflows where labeled reward is sparse or unavailable.

meta-agent is built for exactly that production setting: it reads traces from the running agent, uses an LLM judge to score them, and proposes harness updates from the failure patterns it finds.

## **How it works**

You provide an existing agent, a stream of unlabeled production traces, and a small labeled holdout set.

**Read.** Collect traces from the running agent.

**Judge.** Score those traces with an LLM judge.

**Propose.** Read failed traces, identify a recurring failure pattern, and write one targeted harness update.

**Validate.** Evaluate the new harness on the holdout set and keep it only if holdout accuracy improves.

**Repeat.** Continue the loop with the updated harness.

**Filesystem memory.** meta-agent stores each harness candidate, its scores, and its traces on disk. This gives the proposer persistent memory across iterations. Before proposing a change, it can search prior candidates, per-task traces, and scores to see what failed, what has already been tried, and which changes actually improved performance.

## What the optimizer can change

The optimizer can modify the parts of the harness that most directly shape agent behavior:

- the system prompt
- lifecycle hooks for tool use
- stop conditions and error handling
- custom tools, permission logic, and subagents
- other control logic around the model

It makes one targeted change at a time and prefers the smallest effective fix.

## **Results**

**Tau-bench v3** is a benchmark for conversational customer service agents. We evaluate on the airline domain (50 tasks), where the agent must follow policy and resolve customer requests.

**Setup:** We split the 50 airline tasks into 35 for search and 15 for holdout. The agent used Haiku 4.5, the proposer used Opus 4.6, and holdout was always graded with the official tau evaluator.

Starting from a 67% baseline, the judge-based search run reached 87% holdout accuracy. In our current setup, this was higher than the 80% reached by our labeled-search variant.

Harness optimization on tau-bench airline with Haiku 4.5. The LLM-judge search run improved holdout accuracy from 67% to 87%, while the labeled-search variant reached 80%.

For LLM-judge search, we replaced gold labels on the search split with an LLM judge that reads each trace and produces a short critique of the agent’s failure. The proposer sees natural-language error descriptions, such as “the agent refunded without checking the cancellation policy.” This may provide a richer optimization signal than binary supervision alone, and could help explain why the judge-based run potentially outperformed our labeled-search variant in this setup.

**Note:** These are single-run results on a small benchmark split. We plan to expand the evaluation with multiple runs and variance estimates in future work.

## Harness Evolution

The harness did not improve in one shot. The proposer iterated through multiple attempts, learning from failure traces at each step. The table below shows the progression for our best-performing run (Critique, 87% holdout).

Starting from a vanilla harness, the proposer first added a stop condition to keep the agent from quitting early, but this reduced holdout because the agent stayed engaged while hallucinating answers. It then rewrote the system prompt with tool-use rules, which encouraged tool use but added too much prompt overhead.

The key improvement came when the proposer moved business rules into a skill, raising holdout to 80%. In the final step, it corrected factual errors in that skill, reaching 87%.

The full improvement came from just three harness components: a stop condition, a rewritten system prompt, and a skill containing domain rules.

## What we learned

**Judge-based search is viable on unlabeled traces.** We use an LLM judge to score unlabeled search traces during optimization, while keeping a small labeled holdout set to decide whether to keep an update. In our current setup, this reached 87% holdout accuracy, compared with 80% for our labeled-search variant.

**Persistent trace memory helps.** Giving the proposer access to prior harnesses, traces, and scores helped it avoid repeating failed changes and even catch errors in its own earlier policy rules.

**Proposer tends to overfit.** Early iterations often fixed the specific traces the proposer saw rather than writing general behavioral rules, which improved search accuracy while hurting holdout. We reduced this by adding a simple instruction:

"State your change as a rule about agent behavior. If you can only justify it by pointing to specific traces, it's too narrow."

**The proposer prompt matters.** Small changes to the proposer’s instructions had a large effect on optimization quality.

## **Try it today**

Download [meta-agent](https://github.com/canvas-org/meta-agent) and get started today.

Point it at your agent, a task set, and a labeled holdout split. In our experiments, the optimizer found its best harness within 4-10 iterations. You get a ranked set of harnesses with per-task traces explaining what changed and why. Let us know what you think!

## **What's next**

- **More frameworks.** meta-agent currently supports Claude Agent SDK. We plan to add support for Codex SDK, OpenCode SDK, and other agent frameworks.
- **Better proposer optimization.** The proposer has strong leverage on final harness quality. We want to explore a meta-loop that improves the proposer’s own instructions over time, including better failure abstraction and clustering.
- **More benchmarks.** We plan to evaluate on broader agent benchmarks, including SWE-bench, TerminalBench-2, and domain-specific customer service tasks.
