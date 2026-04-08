---
entity_id: loop-detection
type: concept
bucket: agent-architecture
abstract: >-
  Loop detection identifies agents stuck in repetitive or circular behavior
  through pattern matching on tool calls, outputs, or state transitions,
  enabling recovery, escalation, or termination before runaway costs or
  deadlocks.
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/memento-teams-memento-skills.md
  - repos/jackchen-me-open-multi-agent.md
  - deep/repos/othmanadi-planning-with-files.md
related:
  - agent-skills
  - claude-code
last_compiled: '2026-04-08T03:06:11.391Z'
---
# Loop Detection

## What It Is

Loop detection is the set of mechanisms that identify when an agent has entered a repetitive behavioral pattern, circular reasoning cycle, or progress-free state. Without it, agents that get stuck continue burning tokens and API budget indefinitely, potentially until context exhaustion or external timeout.

The problem surfaces in several distinct forms. A **tool call loop** occurs when an agent invokes the same tool with identical or near-identical arguments repeatedly. A **reasoning loop** occurs when chain-of-thought produces the same conclusions step after step without new information entering the reasoning. An **output loop** occurs when generated text repeats phrases or conclusions across turns. A **task loop** occurs at a higher level: the agent appears to progress (different tool calls, different outputs) but circles through the same sequence of steps without completing the underlying objective.

Each form requires different detection machinery.

## Why It Matters

Long-horizon tasks expose the failure mode most clearly. An agent writing code may enter a fix-verify-fix-verify cycle where it makes a change, runs tests, observes failure, reverts the change, and repeats. An agent browsing the web may oscillate between two pages. A planning agent may regenerate the same plan after each failed execution attempt without revising its assumptions.

The costs compound quickly. A stuck agent in a 200K context window, firing tool calls every few seconds, can exhaust significant budget in minutes. In multi-agent systems, a stuck subagent blocks downstream agents waiting on its output, cascading into system-wide stalls.

The inverse problem also exists: overly sensitive loop detection terminates agents that are deliberately iterating, such as those running repeated test passes against changing code, or polling an external API waiting for a state change. The threshold between "stuck loop" and "appropriate iteration" is not always obvious.

## How It Works

### Signature-Based Detection

The most direct approach computes a signature for each agent action and tracks signature history. Open Multi-Agent implements this in `loop_detector.py` (referenced in the Memento-Skills source as a parallel implementation), comparing tool names and arguments across a sliding window. If the same signature appears N times within M steps, the detector fires.

A minimal implementation:

```python
from collections import deque
from hashlib import md5
import json

class LoopDetector:
    def __init__(self, window=10, threshold=3):
        self.history = deque(maxlen=window)
        self.threshold = threshold

    def check(self, tool_name: str, args: dict) -> bool:
        sig = md5(json.dumps(
            {"tool": tool_name, "args": args}, sort_keys=True
        ).encode()).hexdigest()
        self.history.append(sig)
        return self.history.count(sig) >= self.threshold
```

This handles exact repetition. Near-repetition (same tool, slightly different arguments) requires fuzzy matching or normalization before hashing. For file write operations, normalizing away line numbers or timestamps prevents false negatives where the agent writes nearly identical content with minor variations.

### Output Similarity Detection

Text output loops require a different approach. Computing cosine similarity between consecutive output embeddings can catch semantic repetition even when surface text varies. A simpler heuristic: measure character-level edit distance between outputs and flag when similarity exceeds a threshold.

[Memento-Skills](../projects/memento.md) explicitly ships `loop_detector.py` alongside `error_recovery.py` as peer modules in its v0.2.0 architecture. The pairing reflects that loops and errors share an intervention pattern: detect the bad state, then recover or escalate.

### Progress-Based Detection

Rather than examining what the agent is doing, progress detection examines whether the agent is accomplishing anything. This requires defining a progress metric for the task type:

- For coding tasks: test pass rate moving over time
- For research tasks: new unique sources encountered per N steps  
- For file tasks: net bytes written to target files per N steps

If the progress metric remains flat across a window, the agent is looping at the task level even if individual actions look varied. This is harder to implement but catches the more subtle category of loops where the agent changes its surface behavior without making actual headway.

The [planning-with-files](../projects/agent-workflow-memory.md) pattern partially addresses this through its `check-complete.sh` Stop hook, which verifies task completion before allowing the agent to terminate. The inverse check, detecting when the agent is stuck rather than complete, requires monitoring whether phase checkboxes are advancing over time.

### Configurable Actions

Once a loop is detected, the system needs to decide what to do. Open Multi-Agent exposes three options through its `loopDetection` configuration on `AgentConfig`:

- **warn**: Log the detection, inject a warning message into the agent's context, continue execution
- **terminate**: Halt the agent, mark the task as failed, propagate the failure upstream
- **custom callback**: Hand control to caller-supplied logic that can inspect the full state and decide

The warn action gives the agent a chance to self-correct. Injecting "You appear to be repeating the same action. Consider a different approach." into context often breaks the pattern, because the model attends to recent context strongly and the meta-observation shifts the generation distribution. This works better than expected given how simple it is.

The terminate action is appropriate when the loop indicates a fundamental planning failure that self-correction cannot fix, or when cost constraints make continued execution unacceptable.

Custom callbacks enable integration with [Human-in-the-Loop](../concepts/human-in-the-loop.md) escalation: pause the agent, surface the detected loop to a human operator, wait for guidance, then resume with injected context from the human's response.

## Implementation in Practice

### Claude Code

[Claude Code](../projects/claude-code.md) manages loop risk through the PreToolUse hook mechanism documented in the planning-with-files skill. By re-reading the task plan before every tool call, the agent maintains goal orientation that reduces aimless cycling. The `check-complete.sh` Stop hook prevents premature termination but does not directly detect in-progress loops.

The CLAUDE.md pattern (see [CLAUDE.md](../concepts/claude-md.md)) also surfaces loop risk through explicit behavioral constraints: rules like "if you have tried the same approach three times, stop and explain the problem" encode loop detection as a behavioral instruction rather than a programmatic check. This has the advantage of working with the model's instruction-following behavior but cannot be verified mechanically.

### Agent Hooks Architecture

The hook-based architectures described in Pawel Huryn's CLAUDE.md decomposition note that hooks "run deterministic code on events. Not AI." This distinction matters for loop detection: a deterministic hook checking tool call history is reliable in a way that asking the agent to notice its own loops is not. The agent may not recognize it is looping, particularly during reasoning loops where each step feels locally coherent.

Practically, this means loop detection belongs in the orchestration layer as a deterministic check, not in the agent's reasoning as a behavioral instruction. Both layers help, but the deterministic check provides the guarantee.

### Multi-Agent Systems

In [multi-agent systems](../concepts/multi-agent-systems.md), loop detection must operate at multiple levels simultaneously. A subagent may loop internally while the coordinator correctly identifies it as stuck and reassigns the task. Or the coordinator may loop at the planning level, repeatedly spawning subagents for the same task after each failure without modifying the task definition.

The Open Multi-Agent architecture addresses this through cascade failure handling in the `TaskQueue`: if a task fails after configured retries, it blocks dependent tasks and ultimately surfaces a failure to the coordinator level. This prevents indefinitely stuck subagents from blocking the system but requires retry limits to be set conservatively.

## Failure Modes

**False positives on legitimate iteration.** An agent polling for a CI build to complete, or running the same test suite repeatedly while making incremental fixes, will trigger naive loop detection. Distinguishing "stuck" from "waiting" requires additional signal: is external state changing between iterations? Is the agent's internal state (plan, findings) evolving?

**Loops that span detection windows.** If the detector uses a window of 10 steps and the loop period is 12 steps, the loop evades detection indefinitely. Adaptive window sizing or multiple overlapping windows at different scales can help but adds complexity.

**Recovery that re-enters the loop.** Injecting a warning into the agent's context may break a specific loop instance without addressing the underlying cause. The agent may continue generating the same overall plan and encounter the same obstacle again. Without root-cause analysis, recovery becomes a bandage on a repeating problem.

**Silent loops in [ReAct](../concepts/react.md) traces.** In ReAct-style agents, the thought-action-observation cycle can loop semantically while producing different surface text. The agent generates a new thought that reaches the same conclusion, takes a slightly different action, observes a similar result, and repeats. Detecting this requires semantic comparison across the full thought trace, not just action signatures.

## When Not to Rely on Loop Detection Alone

Loop detection is a safety mechanism, not a substitute for good task design. If an agent is given an underspecified goal, ambiguous success criteria, or tools that cannot actually accomplish the requested task, it will loop. Detecting and terminating that loop is useful, but the underlying task definition is the real problem.

In cost-sensitive production deployments, loop detection should work alongside token budget limits and wall-clock timeouts as layered defenses. Any one mechanism can fail; all three failing simultaneously is much less likely.

For tasks where iteration is genuinely required and hard to distinguish from looping (complex debugging, exploratory research), [Human-in-the-Loop](../concepts/human-in-the-loop.md) escalation at the loop detection boundary is often preferable to automated termination.

## Relationship to Related Concepts

Loop detection is a specific capability within the broader [Agent Skills](../concepts/agent-skills.md) space, operating at the intersection of [Execution Traces](../concepts/execution-traces.md) (which provide the signal) and [Observability](../concepts/observability.md) (which makes traces available). The [Reflexion](../concepts/reflexion.md) framework addresses a related problem from the inside out: rather than external detection, Reflexion builds self-reflection into the agent's reasoning to identify and correct failure patterns. These approaches are complementary. External loop detection catches cases where the agent's self-reflection fails; Reflexion reduces the number of loops that need external detection.

[Context Management](../concepts/context-management.md) intersects loop detection through the "lost in the middle" problem: as context fills, earlier goals and constraints receive less attention, making goal drift and looping more likely. The planning-with-files PreToolUse hook that reinjects the task plan before every tool call is partly a loop prevention mechanism, keeping goals salient in the attention window.


## Related

- [Agent Skills](../concepts/agent-skills.md) — part_of (0.6)
- [Claude Code](../projects/claude-code.md) — implements (0.5)
