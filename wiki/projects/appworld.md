---
entity_id: appworld
type: project
bucket: agent-systems
abstract: >-
  AppWorld is a benchmark for evaluating LLM agents on multi-app task completion
  involving real APIs, databases, and stateful workflows; its key differentiator
  is requiring agents to chain actions across interdependent apps with
  persistent side effects.
sources:
  - repos/modelscope-agentevolver.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
related: []
last_compiled: '2026-04-06T02:13:53.405Z'
---
# AppWorld

## What It Is

AppWorld is a benchmark environment for testing LLM agents on tasks that require interacting with realistic, interconnected applications. Where most agent benchmarks test single-tool use or static QA, AppWorld simulates a world of nine apps (email, calendar, file system, banking, shopping, and others) with real APIs, persistent SQLite databases, and stateful side effects. An agent completing a task must plan across multiple apps, sequence API calls correctly, and handle the consequences of previous actions.

The benchmark distinguishes two difficulty splits: `test-normal` (standard multi-step tasks) and `test-challenge` (harder tasks requiring more complex reasoning and longer action chains). Primary metrics are Task Goal Completion (TGC) and Scenario Goal Completion (SGC), both measuring whether agents achieved the intended end state rather than whether they followed a particular path.

AppWorld has become a de facto standard for evaluating agents on realistic app-interaction tasks. Multiple papers in the agent systems space report results against it, including ACE, SAGE, and AgentEvolver.

## Core Mechanism

AppWorld runs a local server that hosts the nine interconnected apps. Each app exposes a REST-like API. The agent receives a natural language task, then issues a sequence of API calls. The environment tracks state in SQLite, so actions taken in one app can affect what's available in another. An agent told to "send last month's invoice to the vendor" must retrieve the invoice from the file system, look up the vendor contact in address book, and compose an email, all while handling whatever the previous state of those databases contains.

The evaluation checks end state, not trajectory. If an agent achieves the correct final state through an unexpected sequence of calls, it still scores. This design reduces the benchmark's sensitivity to surface-level prompt formatting while keeping the task grounded in real system behavior.

Tasks are parameterized so the same scenario type can be instantiated with different data, reducing memorization risk. The `test-challenge` split increases complexity by requiring agents to infer implicit dependencies or handle edge cases in app behavior.

## Key Numbers

Reported scores from recent work (all self-reported by paper authors, not independently audited):

| System | Model | TGC (test-normal) | Notes |
|---|---|---|---|
| ReAct baseline | GPT-4 class | ~63.7% | From ACE paper |
| ACE | DeepSeek-V3.1 | 76.2% | +12.5% over baseline |
| SAGE | Unspecified | 72.0% | 26% fewer steps, 59% fewer tokens |
| AgentEvolver | Qwen2.5-14B | 48.7% avg@8 | 69.4% best@8 |
| IBM-CUGA | GPT-4.1 | ~59.4% avg | Production agent; ACE matches it on overall avg |

ACE's claim that a smaller open-source model (DeepSeek-V3.1) matches a GPT-4.1-based production agent on AppWorld overall, and beats it by 8.4% TGC on `test-challenge`, is the most striking result. These numbers are self-reported; no third party has audited the evaluation setup.

AgentEvolver's numbers (Qwen2.5-7B starts at 1.8% without training, reaches 51.2% best@8 after full self-evolution) illustrate how dramatically performance varies by training setup. The gap between avg@8 and best@8 indicates high variance across rollouts.

## Strengths

AppWorld tests something most benchmarks ignore: stateful, multi-app coordination with real side effects. An agent cannot hallucinate an API response because the server either returns data or it does not. Persistent state means mistakes compound rather than reset, which more closely mirrors production agent environments.

The parameterized task instantiation and end-state evaluation make it more robust to prompt gaming than benchmarks graded on output text. The two difficulty splits let researchers track both baseline capability and headroom for improvement.

AppWorld has accumulated enough third-party results to function as a rough calibration point. When a new method claims improvement, AppWorld provides a common frame for comparison, and the existing diversity of scores (1.8% to 76.2%) means the benchmark still discriminates at most capability levels.

## Critical Limitations

**Concrete failure mode:** AppWorld's server runs locally and requires specific environment setup. Agents fail for reasons unrelated to intelligence: incorrect API call formatting, missing authentication headers, or malformed JSON payloads that the server rejects. These low-level failures are hard to distinguish from genuine task failures in logged results. A paper reporting 63.7% TGC may be measuring partly how well its prompting handles AppWorld's specific API conventions rather than general agent capability.

**Unspoken infrastructure assumption:** AppWorld assumes the agent runs in an environment where it can make HTTP calls to a local server. This rules out cloud-only inference setups where the agent cannot reach a local endpoint. Any deployment that routes agent calls through an API proxy or sandboxed execution environment needs non-trivial infrastructure changes before AppWorld runs correctly.

## When NOT to Use It

AppWorld is the wrong benchmark if your agent system operates over unstructured documents, open-domain web search, or code generation. Its nine-app world is realistic for personal productivity tasks but not representative of enterprise software ecosystems, developer tooling, or research workflows. Reporting AppWorld scores as evidence of general agent capability overstates what the benchmark covers.

If you need to evaluate agents on long-horizon planning with sparse feedback, AppWorld's relatively tight API structure provides more scaffolding than real-world deployments offer. Agents that score well on AppWorld may perform worse when the API documentation is missing, inconsistent, or written in a different format.

## Unresolved Questions

The documentation does not explain how AppWorld handles task ambiguity when multiple valid end states exist. Some natural language instructions admit more than one correct interpretation. Whether the evaluator scores these as correct or incorrect, and by what criteria, is unclear from published descriptions.

The relationship between AppWorld's difficulty splits and real-world task complexity is not characterized. The `test-challenge` split is harder, but there is no published analysis mapping challenge task features (longer chains, more apps, more implicit dependencies) to agent error modes. This makes it hard to know whether improving on `test-challenge` reflects a general capability gain or an artifact of the specific task types included.

Cost at scale is also undocumented. Running AppWorld evaluations across many rollouts (AgentEvolver uses avg@8 and best@8) with frontier models accumulates API costs that the papers do not report. Practitioners replicating results need to budget for this.

## Alternatives

- **[GAIA](../projects/gaia.md):** Use when you need to evaluate general assistant capability across diverse question types, not specifically app interaction. GAIA is broader but less operationally grounded.
- **[SWE-Bench](../projects/swe-bench.md):** Use when your agent's primary task is code editing and software engineering. SWE-Bench tests a narrower domain but with real GitHub repositories.
- **[LongMemEval](../projects/longmemeval.md):** Use when you need to evaluate memory and recall over long interaction histories rather than multi-app task completion.

AppWorld is the right choice when your agent is specifically designed to interact with structured APIs and coordinate across multiple software systems, and you want a benchmark with enough published results to calibrate against other systems.

## Related Concepts

- [ReAct](../concepts/react.md): The standard prompting baseline most AppWorld papers compare against.
- [Agent Skills](../concepts/agent-skills.md): SAGE uses AppWorld as its primary evaluation environment for skill-augmented reinforcement learning.
- [Context Engineering](../concepts/context-engineering.md): ACE's highest AppWorld scores come from evolving system prompts rather than changing the model.
- [Execution Traces](../concepts/execution-traces.md): AppWorld's end-state evaluation makes execution traces available as training signal for self-improving agents.
- [Self-Improving Agents](../concepts/self-improving-agents.md): AgentEvolver and SAGE both use AppWorld as the environment for training agents that improve through rollout experience.
