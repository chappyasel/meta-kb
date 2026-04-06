---
entity_id: osworld
type: project
bucket: agent-systems
abstract: >-
  OSWorld is a benchmark for evaluating GUI-based computer agents on realistic
  operating system tasks spanning multiple applications, distinguished by its
  reproducible environment infrastructure and cross-application task scope.
sources:
  - repos/modelscope-agentevolver.md
  - repos/zorazrw-agent-workflow-memory.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
related: []
last_compiled: '2026-04-05T23:16:44.884Z'
---
# OSWorld

## What It Is

OSWorld is a research benchmark designed to measure how well computer-use agents handle real tasks inside operating systems. An agent receives a natural language instruction ("schedule a meeting in the calendar app and attach the spreadsheet from Downloads") and must complete it by interacting with a live GUI, the same way a human would: clicking, typing, navigating menus.

The benchmark covers tasks that span multiple applications simultaneously, which is the key differentiator from earlier GUI evaluation setups that tested single-application scripted interactions. A task might require switching between a browser, a file manager, and a terminal to complete a coherent goal.

## Core Mechanism

OSWorld provides sandboxed virtual machine environments where agents observe screenshots or accessibility trees and produce mouse/keyboard actions. The evaluation infrastructure spins up reproducible OS states so that task completion can be measured against ground-truth outcomes rather than intermediate action sequences. This matters because GUI tasks are long-horizon: a wrong click early can make the final state unmeasurable if evaluated naively.

Task difficulty comes from several sources: applications have real UI layouts that change with version updates, tasks require transferring information between applications with no shared API, and partial completion produces plausible-looking but incorrect states that are hard to auto-evaluate.

The benchmark has been used to validate GUI grounding models and agent skill systems. SEAgent (an autonomous skill discovery system) scored 34.5% on five novel OSWorld environments versus an 11.3% baseline, and CUA-Skill (structured procedural knowledge encoding) reached 57.5% on the related WindowsAgentArena benchmark. On OSWorld itself, CoAct-1 reached 59.9% success rate versus a 72.4% human baseline; a proprietary system on OSWorld-Verified reached 72.6%, effectively matching human performance on that subset. These figures come from the agent skills survey ([Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)) and are self-reported or drawn from leaderboard submissions rather than independently audited reproductions.

## Key Numbers

- Human baseline: 72.4% success rate on the standard split
- Best reported agent (CoAct-1): 59.9% on standard split
- OSWorld-Verified subset: 72.6% (human-level, one proprietary system)
- SEAgent improvement over baseline on novel environments: +23.2 percentage points

All benchmark figures above are self-reported or leaderboard-sourced. The OSWorld-Verified result deserves scrutiny: the "Verified" subset is presumably curated for task clarity and evaluator reliability, so the headline "matches human performance" applies to a filtered distribution, not the full task set.

## Strengths

**Reproducible environment infrastructure.** Sandboxed VM states mean two researchers can run the same agent on the same task and get comparable results. Many earlier GUI benchmarks suffered from environment drift as applications updated.

**Cross-application tasks.** Tasks that require coordinating two or three applications expose agent brittleness that single-app evaluations miss. An agent that handles browser navigation perfectly may fail when it needs to export a file and then attach it elsewhere.

**Real UI layouts.** Unlike benchmarks built on mock or simplified interfaces, OSWorld uses actual application GUIs, so results transfer to deployment conditions more directly.

**Grounding signal.** The accessibility tree observation mode gives structured element representations, enabling evaluation of both raw vision-based agents and agents that consume structured UI information.

## Critical Limitations

**Concrete failure mode.** Evaluation correctness depends on detecting final system state. When an agent takes a wrong action mid-task, the evaluation script must correctly identify that the outcome differs from ground truth. For tasks where the final state is visually ambiguous (a document that looks correct but has invisible formatting errors, a calendar event with the wrong timezone), automated evaluation may report false positives. The benchmark cannot exhaustively handle all partial-completion edge cases.

**Unspoken infrastructure assumption.** Running OSWorld at scale requires spinning up virtual machines per task, per agent run. This is nontrivial compute: researchers with limited cloud budgets will face significant friction reproducing full benchmark runs. The papers that cite OSWorld results rarely report infrastructure costs, so the benchmark is more accessible as a citation target than as an evaluation platform for resource-constrained groups.

## When NOT to Use It

OSWorld is the wrong choice when you need to evaluate agents on a narrow, well-defined task category (single-application automation, API-based workflows, code generation). The overhead of VM-based evaluation is unjustified for scoped tasks where lighter benchmarks exist. It is also inappropriate when you need statistically robust evaluation across many seeds quickly: the infrastructure cost per task run limits the number of trials most teams can afford, which increases variance in reported results.

If your agent operates entirely via API or command line with no GUI interaction, OSWorld provides no useful signal.

## Unresolved Questions

**Evaluator reliability at scale.** Auto-evaluation of GUI task completion is genuinely hard. The benchmark uses a mix of deterministic state checks and, for some tasks, LLM-based judgment. The error rate of the evaluator itself, and how it interacts with different agent strategies, is not well documented in benchmark papers that cite OSWorld results.

**Task distribution coverage.** The benchmark includes tasks across several application categories, but the distribution of task types and difficulty levels, and how well that distribution represents real computer use, is not independently validated.

**Version drift.** Application UIs change. A task designed against a specific version of an office suite may become unsolvable or trivially easier after an update. The maintenance burden for keeping tasks current is not publicly described.

**Governance.** Who maintains OSWorld, how new tasks are vetted, and what the process is for handling evaluator bugs or disputed results are unclear from available documentation.

## Alternatives

**Mind2Web:** Web-only tasks with ground-truth action annotations. Use when you need cross-website generalization evaluation and can tolerate offline (not live-execution) evaluation. The Agent Workflow Memory paper ([Source](../raw/deep/repos/zorazrw-agent-workflow-memory.md)) reports step success rates of 45.1% with AWM on Mind2Web cross-task evaluation, suggesting it discriminates agent quality well for web navigation.

**WebArena:** Live web navigation in sandboxed browser environments. Use when your agent focuses on web tasks and you want execution-based (not annotation-based) evaluation with lower infrastructure cost than full OS virtualization.

**WindowsAgentArena:** Windows-specific OS tasks. Use when your deployment target is Windows specifically and you want results that map directly to that environment.

**AppWorld:** Multi-app task evaluation with strong auto-evaluation infrastructure. Use when you need fine-grained step-level metrics and labeled supervision for training context adaptation systems.

## Related Concepts

OSWorld results appear as primary evidence in work on [agent skill acquisition](../concepts/agent-skills.md), GUI grounding models, and computer-use agent architectures. The SEAgent and CUA-Skill results cited above treat OSWorld performance as the primary validity signal for their respective approaches.
