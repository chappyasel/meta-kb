---
entity_id: appworld-benchmark
type: project
bucket: agent-systems
abstract: >-
  AppWorld is a benchmark for evaluating LLM agents on realistic multi-app tasks
  in a sandboxed mobile environment; distinguishes itself by requiring
  long-horizon, multi-step planning across interdependent simulated applications
  with deterministic correctness checking.
sources:
  - repos/modelscope-agentevolver.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
related: []
last_compiled: '2026-04-05T23:19:15.985Z'
---
# AppWorld

## What It Is

AppWorld is a benchmark and evaluation environment for testing LLM agents on realistic, multi-step tasks that span multiple simulated mobile applications. An agent interacts with a sandboxed environment containing apps like email, calendar, banking, and contacts, and must complete tasks that require planning across app boundaries — for example, reading an email to find a meeting time, checking the calendar, and updating a contact record accordingly.

The benchmark distinguishes itself from simpler tool-use evaluations by requiring genuine multi-step planning where earlier actions constrain later ones, and where mistakes compound rather than being independently recoverable.

## Two Primary Metrics

AppWorld evaluates agents on two complementary metrics:

**Task Goal Completion (TGC):** Whether the agent completed the specified task objectives, regardless of path taken.

**Scenario Completion (SGC):** Whether the agent completed the full scenario correctly, including intermediate states and not just final outputs.

The split between TGC and SGC matters. An agent can score well on TGC by finding shortcuts that satisfy goal conditions without necessarily following the intended multi-step path. SGC catches this by evaluating correctness throughout execution.

There are two difficulty splits: `test-normal` and `test-challenge`, with the challenge split requiring more complex reasoning chains.

## Benchmark Results from the Field

AppWorld has attracted substantial use as a standard evaluation target. Reported numbers (all self-reported by paper authors unless noted):

**ACE framework** (Agentic Context Engineering, Zhang et al.):
- DeepSeek-V3.1 + ACE: 76.2% TGC on test-normal, representing +12.5% over a ReAct baseline of 63.7%
- Online adaptation mode: +5.9% TGC over baseline
- On the AppWorld leaderboard, ACE with an open-source model matched IBM-CUGA (GPT-4.1-based) on overall average and exceeded it by +8.4% TGC on test-challenge
[Source](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

**SAGE** (Skill Augmented GRPO for self-Evolution):
- 72.0% TGC, 60.7% SGC
- 8.9% absolute improvement over baseline
- 26% fewer interaction steps, 59% fewer generated tokens
[Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

**AgentEvolver** (ModelScope, 7B and 14B models):
- 7B model: 32.4% avg@8, 51.2% best@8
- 14B model: 48.7% avg@8, 69.4% best@8
- Baseline Qwen2.5-7B without training: 1.8% avg@8
[Source](../raw/repos/modelscope-agentevolver.md)

These numbers are all self-reported by research teams. The leaderboard comparison between ACE and IBM-CUGA is the closest thing to head-to-head independent validation available in the sources, though both systems are still evaluated on the same fixed benchmark split rather than through independent third-party auditing.

## What AppWorld Tests Well

**Long-horizon planning with dependencies.** Tasks require sequencing actions where step N gates step N+1. This catches agents that can execute individual tool calls correctly but fail to maintain state and intent across a full task trajectory.

**Multi-app coordination.** Many realistic tasks span application boundaries. AppWorld's design forces agents to transfer context between simulated apps, exposing failures in information tracking across tool boundaries.

**Deterministic correctness checking.** The sandboxed environment enables ground-truth verification of task outcomes, avoiding the subjectivity problems that plague open-ended generation benchmarks. This makes AppWorld results more credible than benchmarks relying on LLM judges.

**Sensitivity to efficiency.** The SAGE results showing 26% fewer steps and 59% fewer tokens at competitive accuracy suggest AppWorld captures not just correctness but interaction efficiency — an important signal for production agent systems.

## Critical Limitations

**The sandboxed environment is not the real world.** AppWorld's simulated apps have deterministic behavior and no external dependencies. Real mobile apps have rate limits, authentication flows, inconsistent APIs, and ambiguous states. Agents that score well on AppWorld may fail on equivalent real tasks because the benchmark eliminates the noise and variability that characterizes production environments.

The unspoken infrastructure assumption: AppWorld requires running the environment server locally. Teams building on cloud infrastructure or restricted compute environments face setup friction that the documentation treats as solved. AgentEvolver's quick-start guide (`cd env_service/environments/appworld && bash setup.sh`) suggests a self-contained setup, but production-scale parallel evaluation requires replicating the environment across workers, and the benchmark does not specify how to do this safely without task state contamination.

## When Not to Use AppWorld

**When your agent targets a single application domain.** AppWorld's value is in cross-app coordination. A coding agent, a document processing agent, or a customer service agent operating within one application context will not get useful signal from AppWorld's multi-app tasks.

**When you need real-world robustness measurement.** AppWorld's sandboxed environment eliminates flakiness, authentication failures, and API inconsistency. If your deployment target has those properties, AppWorld scores will overestimate real-world performance.

**When your primary concern is speed.** AppWorld tasks require many interaction steps by design. Evaluating a large model across the full benchmark is expensive in both API calls and time. For rapid iteration during development, smaller or faster benchmarks may be more practical.

## Unresolved Questions

The sources do not explain several things that matter for interpreting AppWorld results:

**Leaderboard governance.** Who controls the leaderboard? How are submissions validated? The ACE paper claims to match a production agent on the overall leaderboard, but the process for verifying that competing systems used equivalent resources (model size, inference budget, context length) is not described.

**Task construction methodology.** How were the benchmark tasks designed, and by whom? Whether tasks were constructed to avoid contamination with LLM pretraining data affects how much reported scores reflect genuine reasoning versus pattern matching on familiar task structures.

**Environment reproducibility.** The benchmark environment is a simulated app ecosystem. Whether the environment version is pinned across evaluations, and whether different research groups run identical environment versions, affects comparability of reported numbers across papers.

**Evaluation cost at scale.** Running evaluation across hundreds of multi-step tasks with large models is expensive. Papers report final scores without consistently reporting evaluation cost, making it hard to assess whether reported results are the product of extensive hyperparameter tuning on the benchmark or single-run evaluations.

## Alternatives

**OSWorld / WindowsAgentArena:** For evaluating agents on real GUI interactions rather than simulated app APIs. Use these when your agent operates on actual computer interfaces rather than structured API calls. OSWorld-Verified has reached human-level performance (72.6% vs 72.4% human baseline), making it a more demanding target than AppWorld for frontier models.

**SWE-bench:** For coding and software engineering tasks specifically. Claude Opus 4.6 reaches 79.2% on SWE-bench Verified. Use SWE-bench when your agent's primary function is code generation or software modification rather than multi-app task execution.

**BFCL-v3:** For evaluating function-calling precision. AgentEvolver reports results on both AppWorld and BFCL-v3 together; BFCL-v3 isolates tool-use accuracy from planning. Use BFCL-v3 when you need to diagnose whether failures come from tool invocation errors or from planning failures.

**AndroidWorld:** For evaluating agents on Android-specific tasks. UI-TARS-2 reaches 73.3% success rate. Use AndroidWorld when your deployment target is specifically mobile Android rather than a general multi-app environment.

## Related Concepts

AppWorld scores appear across multiple research threads in this space: context optimization methods like [ACE](../papers/zhang-agentic-context-engineering.md) use it as a primary benchmark, skill-learning systems like SAGE demonstrate efficiency gains on it, and self-evolving agent frameworks like AgentEvolver use it to show that small models trained with RL can match larger baselines. This makes AppWorld a reasonable common currency for comparing agent training and optimization approaches, though the diversity of methods evaluated on it also means reported numbers reflect very different resource budgets.
