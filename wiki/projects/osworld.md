---
entity_id: osworld
type: project
bucket: agent-systems
abstract: >-
  OSWorld benchmarks computer-using agents on real GUI tasks across Linux,
  macOS, and Windows, providing 369 tasks with live execution environments — the
  first benchmark requiring agents to operate actual desktop software
  end-to-end.
sources:
  - repos/zorazrw-agent-workflow-memory.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - mcp
  - skill-md
last_compiled: '2026-04-07T01:03:39.298Z'
---
# OSWorld

## What It Does

OSWorld is a benchmark for evaluating agents that control computers through GUI interaction. An agent receives a natural language instruction ("find the largest file in my Downloads folder and email it to John") and must accomplish it by observing screenshots and taking actions in a real operating system — clicking, typing, opening applications, navigating file systems.

The distinguishing characteristic is execution environment fidelity. Unlike web-navigation benchmarks (WebArena, Mind2Web) that operate inside a browser, OSWorld tasks span full desktop environments: LibreOffice, VS Code, GIMP, Google Chrome, Firefox, file managers, terminal emulators. Tasks run in virtualized Linux, macOS, and Windows instances. The benchmark provides 369 tasks with deterministic success evaluation scripts that check actual system state after execution, not just action sequence overlap.

This matters for the [Agent Skills](../concepts/agent-skills.md) research program because computer use is the substrate on which general-purpose agents must eventually operate. Benchmarks like [SWE-Bench](../projects/swe-bench.md) test software engineering specifically; OSWorld tests general computer operation.

## Architecture

### Task Structure

Each task is a JSON record containing: a natural language instruction, the application scope (single-app or multi-app), the required environment snapshot, and a set of evaluation functions. Evaluation functions are Python scripts that inspect post-execution system state — they read files, check application state via accessibility APIs, query databases. This avoids the reliability problems of LLM-as-judge approaches while handling the open-ended nature of GUI tasks.

The 369 tasks cover 9 application domains: web browsing, office productivity (Calc, Impress, Writer), system operations, file management, coding, multimedia, communication, and multi-app workflows. Multi-app tasks require coordinating across two or more applications, which is where most agents fail.

### Environment Infrastructure

OSWorld runs tasks inside virtual machines managed via VMware or VirtualBox. Each task starts from a clean snapshot, executes, and the evaluation script inspects the resulting state. This architecture means:

- Tasks are reproducible (same snapshot, same starting conditions)
- Evaluation is side-effect-free (snapshot revert between tasks)
- The agent sees a real desktop, not a DOM abstraction

The execution loop: agent receives screenshot → agent outputs action (click coordinate, keyboard input, scroll) → environment applies action → agent receives next screenshot. Some configurations also provide accessibility tree data alongside screenshots.

### Agent Interface

Agents interact through a Python API defined in `desktop_env/`. The `DesktopEnv` class manages VM lifecycle, screenshot capture, action execution, and evaluation. Action space includes: `click(x, y)`, `type(text)`, `key(keycode)`, `scroll(x, y, direction)`, `drag(x1, y1, x2, y2)`. No structured application API — the agent must operate through the same interface a human uses.

## Key Numbers

**Task count:** 369 tasks across 9 domains (paper-reported)

**Human baseline:** 72.4% success rate (paper-reported, verified by independent execution)

**Best agent performance at publication (2024):** GPT-4V at approximately 12–18% depending on configuration — a large gap from human performance

**More recent results (per the agent skills survey):**
- CoAct-1: 59.9% on OSWorld (self-reported)
- Proprietary unnamed system: 72.6% on OSWorld-Verified (self-reported by the survey, not independently reproduced)
- SEAgent, an autonomous skill discovery system: 34.5% on 5 novel OSWorld environments vs 11.3% baseline (self-reported)
- Jedi Framework: improved from 5% to 27% through scaled GUI grounding data (self-reported)

The 72.6% figure matching human baseline is notable but treat it with caution — OSWorld-Verified is a curated subset, and the underlying system is unnamed in the survey.

## Strengths

**Genuine end-to-end evaluation.** The benchmark forces agents to handle real application state: a spreadsheet formula that does not compute, a file dialog that opens in the wrong directory, an application that crashes. Other benchmarks abstract these away.

**State-based evaluation.** Success is checked by inspecting actual system state, not by comparing action sequences to ground truth. This means agents get credit for reaching the correct outcome through unconventional paths.

**Cross-OS coverage.** Tasks run on Linux, macOS, and Windows. Agents trained or prompted for one OS often fail on another because window management, file path conventions, and application behavior differ. This makes OSWorld a stress test for generalization.

**Adoption as a reference benchmark.** The agent skills survey documents OSWorld as the primary benchmark for computer-use agents, with multiple research groups reporting results against it. This makes it a credible reference point for comparing systems.

## Limitations

**Concrete failure mode: coordinate brittleness.** Agents must click pixel coordinates derived from screenshots. Screenshot resolution, VM display scaling, and application window positioning all vary. An agent that learns to click a "Save" button at (450, 320) in one environment fails if the window renders at a different position in another. Models that use accessibility trees alongside screenshots partially mitigate this, but pure vision agents are brittle to any rendering variation.

**Unspoken infrastructure assumption: VM management overhead.** Running 369 tasks requires managing ~369 VM snapshots, reverting state between tasks, and capturing screenshots at each step. The infrastructure cost is non-trivial. The benchmark assumes you have access to virtualization hardware (VMware or VirtualBox with sufficient disk and memory) and the ability to orchestrate VM lifecycle at scale. Teams running evaluation on cloud infrastructure hit additional latency from screenshot capture loops. This is not documented as a requirement but is a practical prerequisite.

**Task diversity ceiling.** 369 tasks is small relative to the space of computer operations. High-performing agents may exhibit benchmark-specific overfitting, particularly on common applications like Chrome and LibreOffice that appear frequently. The OSWorld-Verified subset mitigates this somewhat by filtering tasks with ambiguous evaluation, but the core pool remains limited.

**Multi-app task difficulty spike.** Multi-app tasks require maintaining state across application switches, which no current agent architecture handles well. These tasks disproportionately drive down aggregate scores, making it hard to distinguish agents that are genuinely better at cross-application reasoning from agents that happen to avoid these tasks in their evaluation configuration.

## When NOT to Use OSWorld

**You need software engineering evaluation.** OSWorld tests general computer operation. If you want to evaluate code generation, bug fixing, or repository navigation, [SWE-Bench](../projects/swe-bench.md) is the appropriate benchmark — it has larger task counts, established leaderboards, and more granular software-engineering subtasks.

**You need web-only agent evaluation.** For agents that operate exclusively in browsers, WebArena or Mind2Web provide more tasks, more established baselines, and lower infrastructure overhead. OSWorld's value comes from cross-application coverage; if you do not need that, it is more infrastructure than necessary.

**You are resource-constrained.** Running a full OSWorld evaluation requires multiple VMs, significant disk space for snapshots, and considerable wall-clock time for screenshot-loop inference. If you are doing rapid iteration on an agent architecture, a cheaper benchmark (GAIA, or a subset of web navigation tasks) makes more sense for development cycles.

**You need a dynamic web benchmark.** OSWorld tasks run in static VM snapshots. Tasks involving real-time web content (news, stock prices, live search results) are excluded or use cached versions. If your agent needs to operate on live web content, OSWorld's controlled environment is a mismatch.

## Unresolved Questions

**Evaluation script coverage.** The evaluation scripts check specific system state conditions, but it is unclear whether they cover all valid ways to complete a task. A user might save a document in a different format than the evaluator checks, or accomplish a file management task through a path the script does not inspect. The rate of false negatives (correct completions scored as failures) is not reported.

**Benchmark contamination.** As OSWorld tasks become widely cited, they risk appearing in LLM training data. The original paper does not discuss task refresh strategy or versioning. There is no public commitment to rotating tasks or maintaining a held-out test set separate from the development set researchers use for iteration.

**Accessibility tree vs. screenshot tradeoffs.** Some agents use screenshots only; others combine screenshots with accessibility trees. The benchmark supports both but does not report controlled comparisons showing how much accessibility tree data contributes. This makes it hard to compare agents that use different observation modalities.

**Cost at scale.** Running state-of-the-art vision models (GPT-4V, Claude 3, Gemini) on 369 multi-step tasks with screenshots at each step is expensive. The paper does not report API costs for baseline evaluations. For research groups without substantial compute budgets, full benchmark runs may be prohibitive.

## Relationship to Agent Skills and Skill Discovery

OSWorld functions as the primary proving ground for computer-use agent research. SEAgent, documented in the [Agent Skills](../concepts/agent-skills.md) survey, explicitly targets novel OSWorld environments — it discovers skills for unseen applications and achieves 34.5% vs 11.3% for baseline agents on those tasks. CUA-Skill achieves 57.5% on the related WindowsAgentArena benchmark using structured knowledge engineering.

The benchmark's role mirrors [SWE-Bench](../projects/swe-bench.md) in the coding agent ecosystem: it is the reference point that skill acquisition papers must beat, which concentrates research effort and makes progress comparable across groups. The [skill.md](../concepts/skill-md.md) specification — the three-level progressive disclosure architecture for agent skills — was partly motivated by the challenge OSWorld revealed: agents need procedural knowledge about how to operate specific applications, and that knowledge cannot all fit in a context window.

## Alternatives

**[SWE-Bench](../projects/swe-bench.md):** Use when evaluating software engineering agents specifically. Larger task pool, cleaner evaluation, stronger community infrastructure.

**[AppWorld](../projects/appworld.md):** Use when evaluating agents on API-based application interaction rather than GUI operation. Lower infrastructure overhead, complementary coverage.

**[GAIA](../projects/gaia.md):** Use when evaluating general question answering with tool use, rather than sustained GUI control. Simpler to run, broader capability coverage.

**WebArena / Mind2Web:** Use when evaluating browser-only agents. More tasks, more baselines, less VM overhead.

## Sources

[Deep: Agent Skills Survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) — covers OSWorld benchmark results and agent performance figures

[Deep: Agent Workflow Memory](../raw/deep/repos/zorazrw-agent-workflow-memory.md) — contextualizes OSWorld within the broader agent evaluation ecosystem

## Related

- [Agent Skills](../concepts/agent-skills.md) — the skill abstraction layer OSWorld is used to evaluate
- [skill.md](../concepts/skill-md.md) — progressive disclosure specification motivated in part by GUI agent challenges
- [SWE-Bench](../projects/swe-bench.md) — analogous benchmark for software engineering agents
- [AppWorld](../projects/appworld.md) — API-based application interaction benchmark
- [ReAct](../concepts/react.md) — reasoning and acting framework underlying most OSWorld agent implementations
- [Model Context Protocol](../concepts/mcp.md) — complementary infrastructure for tool connectivity in agent stacks
