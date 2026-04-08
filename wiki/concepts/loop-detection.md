---
entity_id: loop-detection
type: concept
bucket: agent-architecture
abstract: >-
  Loop detection identifies when agents repeat tool calls or outputs
  unproductively, using pattern matching and configurable responses
  (warn/terminate/callback) to prevent infinite execution cycles.
sources:
  - deep/repos/othmanadi-planning-with-files.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/jackchen-me-open-multi-agent.md
  - repos/memento-teams-memento-skills.md
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
related:
  - agent-skills
  - claude-code
last_compiled: '2026-04-08T23:23:32.412Z'
---
# Loop Detection

## What It Is

Loop detection is the set of mechanisms an agent runtime uses to recognize when execution has entered a cycle that will not converge on a result. Without it, an agent that gets stuck will exhaust its context window, drain token budgets, or run until an external timeout fires. With it, the runtime can intervene, escalate to a human, or terminate cleanly.

The problem appears in two distinct forms. The first is **exact repetition**: the agent issues the same tool call with the same arguments multiple times in sequence. The second is **semantic stagnation**: the agent's outputs vary superficially (different phrasings, slightly different arguments) but make no progress toward the goal. Exact repetition is tractable with hash comparison. Semantic stagnation requires either more sophisticated comparison or heuristics like step count limits.

Loop detection sits at the boundary between agent execution and agent safety. It is not about correctness of individual steps but about the shape of the execution trace as a whole.

## Why It Matters

LLM agents running [ReAct](../concepts/react.md)-style loops are vulnerable to a specific failure mode: the model reaches a local reasoning state where each step looks individually plausible but the sequence cycles. A web-scraping agent might repeatedly try to load a page that returns 403, each time reasoning "I should try again." A coding agent might oscillate between two edits, each one "fixing" what the previous one broke. A planning agent might rewrite its plan file repeatedly without marking any tasks complete.

These cycles are not hypothetical edge cases. The [planning-with-files](../raw/deep/repos/othmanadi-planning-with-files.md) documentation explicitly encodes "error persistence" as a principle: failed actions with stack traces must be logged so the agent can update its beliefs rather than retry blindly. The Manus AI architecture that inspired that skill identified ~33% of agent actions spent on plan-file updates as a sign of pathological overhead. The [Memento-Skills](../raw/repos/memento-teams-memento-skills.md) framework added `loop_detector.py` as a dedicated module in v0.2.0, treating it as a first-class architectural concern alongside error recovery.

At scale, undetected loops translate directly to wasted API spend. At the infrastructure level, they can fill message queues, block downstream agents, and produce misleading [Observability](../concepts/observability.md) traces where high activity looks like progress.

## How It Works

### Exact-Match Detection

The simplest form compares consecutive tool calls against a sliding window of recent calls. Each call is represented as a tuple of `(tool_name, serialized_arguments)`. When a new call matches something in the window, the detector fires.

```python
# Simplified from loop_detector.py pattern
from collections import deque
import hashlib, json

class LoopDetector:
    def __init__(self, window=5, threshold=2):
        self.window = deque(maxlen=window)
        self.threshold = threshold

    def check(self, tool_name: str, args: dict) -> bool:
        key = hashlib.md5(
            json.dumps({"tool": tool_name, "args": args}, sort_keys=True).encode()
        ).hexdigest()
        count = self.window.count(key)
        self.window.append(key)
        return count >= self.threshold
```

The window size and threshold are the two tunable parameters. A window of 5 with threshold of 2 catches "called the same thing twice in the last 5 steps." Tightening either catches loops faster but increases false positives on legitimately repetitive work (like writing multiple similar files).

### Output-Based Detection

For semantic stagnation, detecting identical tool calls is insufficient because the agent may vary its arguments while producing no net progress. A cruder but practical heuristic is to compare text output similarity across recent turns. This can use edit distance, n-gram overlap, or embedding cosine similarity.

The [open-multi-agent](../raw/repos/jackchen-me-open-multi-agent.md) framework documents its `loopDetection` field on `AgentConfig` as catching agents "repeating the same tool calls or text output." The text output comparison implies some form of string similarity check rather than exact hashing.

### Step Count Hard Limits

The simplest defense is a maximum step count. If an agent has not produced a terminal output after N tool calls, execution stops. This is blunt — it kills slow-but-correct agents along with stuck ones — but it bounds worst-case cost. Most production frameworks implement step limits as a floor defense independent of pattern-based detection.

### Lifecycle Hook Integration

More sophisticated runtimes integrate loop detection into their [Execution Traces](../concepts/execution-traces.md) hook system. The [planning-with-files skill](../raw/deep/repos/othmanadi-planning-with-files.md) uses a `Stop` hook that runs `check-complete.sh` before allowing the agent to terminate. This is the inverse of loop detection: rather than catching unproductive repetition, it catches premature termination. Both are instances of the same pattern — intercepting execution state transitions and running checks before allowing the transition.

The `PreToolUse` hook in that architecture also functions as indirect loop detection: by injecting the current plan before every tool call, it gives the agent current information about what has already been completed, reducing the probability of re-doing finished work.

The [open-multi-agent](../raw/repos/jackchen-me-open-multi-agent.md) framework exposes loop detection as a configurable field:

```typescript
const agent: AgentConfig = {
  name: 'worker',
  model: 'claude-sonnet-4-6',
  loopDetection: {
    windowSize: 5,
    threshold: 2,
    action: 'terminate',  // or 'warn' or custom callback
  },
}
```

The three actions represent an escalation ladder: log and continue, stop the agent cleanly, or hand control to application code. The custom callback option enables [Human-in-the-Loop](../concepts/human-in-the-loop.md) intervention — the application can prompt for user input before deciding whether to retry with a modified approach or abort.

### Multi-Agent Loop Detection

In [Multi-Agent Systems](../concepts/multi-agent-systems.md), loops can span agent boundaries. Agent A sends a task to Agent B, B produces output that triggers A to send the same task again. This is harder to detect because no single agent's trace shows the repetition — it only appears in the message bus or orchestration layer.

The [open-multi-agent](../raw/repos/jackchen-me-open-multi-agent.md) architecture handles this at the `TaskQueue` level, which maintains a dependency graph. A task that completes and re-enters the queue without advancing the dependency graph can be flagged. This requires the orchestrator to track task identity across re-submissions, not just within a single agent's turn.

## Implementation Locations

**[Claude Code](../projects/claude-code.md)**: Implements loop detection through its hook system. The `Stop` hook pattern from planning-with-files prevents premature termination; there is no publicly documented specific loop detection module, but the hook infrastructure provides the integration points.

**[Agent Skills](../concepts/agent-skills.md)**: The planning-with-files skill encodes loop prevention indirectly: mandatory error logging prevents retry loops by ensuring the agent has information about prior failures; the `check-complete.sh` stop guard prevents termination-then-restart cycles.

**[Memento-Skills](../projects/memento.md)**: Added `loop_detector.py` and `error_recovery.py` as distinct modules in v0.2.0, making loop detection an explicit architectural primitive rather than an implicit behavior.

**[LangGraph](../projects/langgraph.md)**: Exposes recursion limits as a graph-level configuration parameter. Because LangGraph compiles agent behavior as a state machine graph, it can enforce loop detection at the graph traversal level rather than within individual node execution.

**open-multi-agent**: Documents `loopDetection` on `AgentConfig` with configurable window, threshold, and action — the most explicit public API among the frameworks surveyed.

## Failure Modes

**False positives on legitimately repetitive work**: An agent tasked with processing 50 files will call `file_write` 50 times. A naive detector with a low threshold terminates it early. Detection must distinguish repetition-by-design from stuck repetition. One heuristic: legitimate repetition involves different arguments; stuck repetition involves identical arguments.

**Cross-agent loop blindness**: Intra-agent detectors cannot see loops that span agent boundaries in multi-agent pipelines. The orchestration layer must track task re-submission independently.

**Threshold calibration drift**: A window and threshold that work for one task type fail for another. An agent doing code review might legitimately re-read the same file multiple times as it cross-references sections. Threshold values baked into configuration rather than derived from task semantics will misfire.

**Semantic stagnation without exact repetition**: The hardest case. An agent that generates slightly different bash commands each turn, none of which succeed, will evade hash-based detection indefinitely. Catching this requires progress measurement — some notion of whether the agent's state is advancing toward the goal — which is task-dependent and hard to generalize.

**Loop detection itself causing loops**: A recovery action that injects additional context or retries with a modified prompt can, if misconfigured, trigger another loop. The [Reflexion](../concepts/reflexion.md) pattern of self-critique and retry is structurally similar to a loop — the difference is convergence, which the detector cannot always predict.

## Design Tradeoffs

**Sensitivity vs. false positive rate**: Tighter detection (smaller window, lower threshold) catches loops faster but terminates legitimate repetitive tasks. Most frameworks default to conservative settings (warn before terminate) to avoid disrupting valid work.

**In-process vs. out-of-process detection**: Running detection inside the agent loop is low-latency but shares the agent's failure modes. An agent in a bad state might also corrupt its own loop detector state. Out-of-process monitoring (a separate watchdog) is more robust but adds infrastructure complexity.

**Deterministic vs. statistical detection**: Hash comparison is deterministic and cheap. Embedding-based similarity is probabilistic and expensive. Most deployed systems use hash comparison with step count limits as a backstop, reserving embedding comparison for cases where false negatives are especially costly.

**Action on detection**: Terminate is safe but loses partial progress. Warn-and-continue allows the developer to observe the pattern before deciding. Custom callbacks enable the most nuanced responses but require the application to implement recovery logic. The right choice depends on whether partial results have value and whether human intervention is available.

## Relationship to Adjacent Concepts

Loop detection is one component of [Execution Traces](../concepts/execution-traces.md) analysis — the broader practice of monitoring what an agent actually does versus what it was asked to do. It connects to [Context Management](../concepts/context-management.md) because loops consume context budget; the same mechanisms that detect loops can also trigger context compaction or summarization before the window fills.

In [Self-Improving Agents](../concepts/self-improving-agents.md), loop detection has an additional role: a loop that is detected and logged becomes training signal. The Memento-Skills reflection loop uses failed executions to update skill utility scores — a loop that terminates cleanly produces better training data than one that runs until timeout.

[Human-in-the-Loop](../concepts/human-in-the-loop.md) integration is the natural escalation path when automatic recovery fails. The open-multi-agent `onApproval` callback pattern and the custom loop detection callback represent the same architectural idea: preserve human agency over whether to continue, modify, or abort a stuck execution.

## What the Documentation Doesn't Explain

Most framework documentation describes what loop detection does, not how to calibrate it for specific task types. There is no published guidance on threshold values derived from task complexity, context window size, or expected tool call frequency.

The interaction between loop detection and [Context Compression](../concepts/context-compression.md) is undocumented. If a compaction event triggers mid-loop (because context is filling), the agent loses memory of its recent actions. A loop detector with a short window will also lose that history, potentially resetting its detection state at exactly the wrong moment.

Multi-tenant scenarios (multiple users sharing an agent pool) introduce cross-task state pollution risk if loop detection state is not properly scoped per execution. None of the frameworks surveyed address this explicitly.


## Related

- [Agent Skills](../concepts/agent-skills.md) — implements (0.4)
- [Claude Code](../projects/claude-code.md) — implements (0.4)
