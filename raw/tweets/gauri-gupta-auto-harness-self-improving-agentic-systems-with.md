---
url: 'https://x.com/gauri__gupta/status/2040251170099524025'
type: tweet
author: '@gauri__gupta'
date: '2026-04-04'
tags:
  - self-improving
  - agent-systems
  - auto-evals
  - failure-mining
  - regression-testing
  - harness-evolution
  - continuous-improvement
key_insight: >-
  The bottleneck in agent systems has shifted from code generation to continuous
  validation and improvement—auto-harness demonstrates that treating failures as
  clustered patterns (not isolated incidents) and converting them into evolving
  regression test suites enables 40% performance gains while maintaining
  reliability constraints that compound over time.
likes: 1101
retweets: 124
views: 137866
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 7
  composite: 8.3
  reason: >-
    Auto-harness is a directly relevant self-improving agent system that
    implements trace-driven failure clustering, auto-eval generation, and
    regression-safe harness evolution—core patterns for self-improving
    systems—with open-sourced code and a concrete 40% benchmark improvement
    demonstrating real production applicability.
---
## Tweet by @gauri__gupta

https://t.co/gpEE2rstjm

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 1,101 |
| Retweets | 124 |
| Views | 137,866 |


---

## auto-harness: Self improving agentic systems with auto-evals (open-sourced !)

Connect your agent and let it cook over the weekend. We just open-sourced our auto-harness — a self-improving loop that finds your agent's failures, turns them into evals, and fixes them. All Autonomously. 

We got a lot of responses from people wanting to try the self-improving loop on their own agent. So we open-sourced our setup.

We show our auto agent harness improvement system on Tau3 benchmark tasks where the agent’s score improves from 0.56 to 0.78 (~40% jump) while mining failures and auto maintaining live evals.



The bottleneck has moved. It is no longer writing code. It is everything that comes after: validating behavior, catching regressions, debugging failures, and maintaining evaluations and reliability as systems evolve and user behaviors drift.

The new era of engineering will be designing systems that can sustain and improve themselves over time. This includes building robust harnesses that define how agents operate, evaluation layers that continuously measure behavior, constraints that bound system outputs, and feedback loops that convert failures into actionable signals.


The self-improvement loop:

A flywheel that gets better with agent experience and feedback in real-time.

Mine failures from production traces

Cluster by root cause, and generate evaluation tracking candidates

Convert failure clusters into reusable living eval cases

Propose and validate harness changes autonomously in a test environment

Accept only changes that both improve performance and don’t regress on previously fixed failures



What does this mean for real production systems:

At each iteration, the agent explores multiple candidates and self-recovers from failed experiment iterations. The result is an agentic harness that evolves faster and more reliably than humans ever could, leveraging far more context, running vastly more experiments, and exploring them in parallel.

Failures are treated as recurring patterns rather than isolated incidents. High-impact failure modes are systematically identified, prioritized, and driven towards resolution, enabling continuous, measurable improvements in system behavior.

The evaluation set is not static, it evolves with the system. The regression set grows with each resolved failure cluster contributing new cases. Fixes become tested constraints, making future improvements harder but more reliable.

The self-improvement shifts reliability from a manual debugging loop to an automated improvement process, saving substantial engineering time in maintaining complex, real-world agent systems.



Our learnings from this experiment:

Clustering failures is key: Grouping failures by their proposed fix forces you to attack the underlying cause rather than each symptom in isolation. It also prevents the optimizer from overfitting to individual cases — a fix that resolves a cluster generalizes.

Sub-agents and recursive summarization helps manage context: Verbose traces flood the main agent context fast. Sub-agents own their own output and the parent only sees the summary. This helps manage bloated context across long-running tasks.

The regression gate is what makes gains compound: Fixed failures become permanent test cases. The system can't backslide past what it's already solved. Without the gate you're optimizing in a loop — the same ground covered, again and again. With it, every improvement is additive and the bar only ever moves in one direction.

Human instructions matter: Tightening the loop framework with instructions, bias rules, optimization-specific playbooks, tools and skills matters the most. The meta-layer is where the real leverage is. 



The open-source auto-harness library:

We are releasing a simplified version of our setup for people to try and experiment with!
Point it at your agent. Leave it running. Come back to a better agent with evals. https://github.com/neosigmaai/auto-harness

```bash

| `agent/agent.py` | The agent being optimized (OpenAI Agents SDK template) |
| `benchmark.py` | Runs your benchmark, returns per-task rewards |
| `gating.py` | Two-step gate: eval suite pass rate + full `val_score` |
| `record.py` | Appends iteration results to `workspace/results.tsv` |
| `workspace/suite.json` | Regression suite — maintained by the coding agent, not you |
| `workspace/learnings.md` | Persistent log: what worked, what didn't, what the agent needs from you |
| `PROGRAM.md` | Instructions the coding agent follows — where you steer the loop |
```

Watch our system perform agent harness evolution in real-time!

At NeoSigma, we are shaping this future. We are building the infrastructure to support this feedback loop in real-world systems, helping teams capture failures, convert them into structured evaluation signals, and use them to drive continuous improvements in agent behavior.

Full blog writeup here: neosigma.ai/blog/self-improving-agentic-systems
Open-source library: https://github.com/neosigmaai/auto-harness

If you are deploying agent systems and want to close the feedback loop in real production systems faster, we would love to talk.  Join the waitlist for access: https://www.neosigma.ai/waitlist
