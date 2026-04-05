---
entity_id: react
type: approach
bucket: agent-systems
abstract: >-
  ReAct (Reasoning + Acting) interleaves chain-of-thought reasoning traces with
  tool-use actions in a single LLM prompt loop, letting agents diagnose and
  correct errors mid-task rather than committing to actions blindly.
sources:
  - articles/lil-log-llm-powered-autonomous-agents.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
  - Reflexion
  - GPT-4
  - Chain-of-Thought
last_compiled: '2026-04-05T20:24:57.347Z'
---
# ReAct: Reasoning and Acting in Language Models

## What It Is

ReAct is a prompting strategy and agent execution pattern introduced by Yao et al. (2022) that interleaves reasoning traces with action steps in an LLM's output. Where a pure actor ([Chain-of-Thought](../concepts/chain-of-thought.md)) thinks but does not act, and a pure actor (function-calling without reasoning) acts but does not reflect, ReAct alternates between three token types:

- **Thought**: the model's internal reasoning about the current state
- **Action**: a tool call or environment interaction (search, code execution, API call)
- **Observation**: the result returned from the environment

This three-part loop continues until the model produces a final answer or halts. The core bet is that surfacing reasoning in the same context window where observations arrive lets the model course-correct dynamically rather than committing to a plan upfront.

ReAct sits at the base of much of the modern agent stack. [Reflexion](../concepts/reflexion.md) extends it with episodic memory and verbal self-reflection. Voyager's iterative prompting mechanism uses ReAct-style refinement within each skill generation cycle. Memento-Skills builds a full multi-stage agent pipeline on top of a ReAct execution loop with its own loop detection, reflection supervisor, and skill library.

---

## Core Mechanism

### The Thought-Action-Observation Loop

A ReAct trace looks like this:

```
Thought: I need to find who wrote the 2022 paper on language agents.
Action: Search("ReAct language agents 2022")
Observation: "ReAct: Synergizing Reasoning and Acting in Language Models, Yao et al., 2022"
Thought: The authors are Yao et al. I should verify the first author's affiliation.
Action: Lookup("Shunyu Yao")
Observation: "Princeton University, Google Brain"
Thought: I have enough to answer.
Action: Finish("Shunyu Yao, Princeton/Google Brain")
```

The model generates this sequence autoregressively. Each observation is appended to the context, making the full trace visible when the model generates the next thought. This is the functional difference from a pipeline that runs reasoning and acting as separate stages: in ReAct, observations update the reasoning process in real time.

### Why Interleaving Matters

Standard chain-of-thought reasoning has no grounding mechanism. The model can hallucinate facts and proceed confidently. A pure action loop can spiral into tool calls without any sense of whether the retrieved information is useful. Interleaving solves both:

- The thought before an action narrows the action space, reducing irrelevant tool calls
- The thought after an observation interprets what the retrieval actually means for the task
- If an observation contradicts a prior assumption, the next thought can revise the plan

The Reflexion paper quantifies a related dynamic: self-reflection after failed attempts provides a 12-point accuracy gain over episodic memory alone (63% to 75% on HotPotQA). The observation-triggered thought is the micro-level version of the same principle: pausing to interpret before acting again.

### Prompt Format and Few-Shot Setup

The original ReAct formulation uses few-shot prompting. The prompt contains 2-6 exemplars, each showing a full Thought/Action/Observation trajectory for a solved task. The model pattern-matches to this format and generates its own traces at inference time.

There is no architectural constraint here. ReAct is a prompting convention, not a framework. You can implement it with a basic text completion API by:

1. Prepending few-shot examples
2. Intercepting model output at `Action:` lines
3. Executing the action, getting a result
4. Appending `Observation: [result]` to the context
5. Resuming generation

This simplicity is why ReAct became ubiquitous. Any framework that supports tool-use and interleaved reasoning (LangChain, AutoGPT, smolagents, most production agent systems) is implementing a variant of this pattern.

---

## How It Works: Implementation Details

### Context Window as Working Memory

ReAct uses the context window as the agent's working memory. The entire trace history is passed on every generation step. This means:

- The model has full trace visibility for reasoning
- Token costs grow linearly with trace length
- Long tasks hit context limits unless the trace is truncated or summarized

The ACE paper addresses a downstream version of this problem: when contexts are iteratively rewritten to manage length, they suffer "context collapse" (progressive information loss). ACE's fix is incremental delta updates that append rather than rewrite, a direct response to the memory management problem that long ReAct traces create.

### Action Space Definition

The action set must be defined and the model must know about it. In the original paper, actions are: `Search(query)`, `Lookup(entity)`, `Finish(answer)`. In production agents, the action space expands to code execution, API calls, file operations, and custom tools.

The model selects actions via in-context learning from the few-shot examples. More sophisticated implementations constrain action selection to prevent the model from generating malformed tool calls -- Memento-Skills uses `tool_gate.py` for whitelist enforcement, and its `ToolBridge` validates and normalizes arguments before dispatch.

### Stopping Conditions

The basic stopping condition is a `Finish` action. Production systems add:

- Maximum turn limits (Memento-Skills caps at 30 ReAct turns per skill execution)
- Loop detection (repeated identical action signatures, alternating A-B-A-B patterns, low effect ratios)
- Information saturation detection (when consecutive observations add no new entities)

Without these, agents can enter observation spirals where they keep searching without producing output. Memento-Skills documents four distinct loop detection patterns in its `LoopDetector` class, which addresses exactly this failure mode.

---

## Relation to Other Approaches

### ReAct as Component vs. Architecture

In the original paper, ReAct is the entire architecture. In practice, it has become a component embedded in larger systems:

- **Reflexion** uses ReAct as the actor's generation strategy, then wraps it with a self-reflection loop that persists across trials
- **Voyager** uses ReAct-style iterative refinement within each skill generation cycle, gated by a self-verification critic
- **Memento-Skills** runs a ReAct loop at execution time within a 4+1 stage pipeline (Intent → Planning → Execution → Reflection → Finalize)
- **Chain-of-Thought** is the thought component without the action component; ReAct is the extension that adds environment interaction

This layering means "does this system use ReAct?" is often the wrong question. Most agent systems use something like ReAct at the execution layer while adding memory, planning, and reflection above it.

### Relation to [RAG](../concepts/retrieval-augmented-generation.md)

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) retrieves external context before generation, typically in a single retrieval step. ReAct retrieves iteratively, with each retrieval informed by the model's current reasoning state. For multi-hop questions where the right query depends on a prior answer, ReAct's sequential retrieval substantially outperforms single-step RAG. The original paper reports ReAct halves hallucination rates and error propagation on HotPotQA compared to chain-of-thought alone.

---

## Strengths

**Grounding at every step.** Observations arrive in context before the next thought, so the model cannot build a long chain of reasoning on top of a hallucinated fact without encountering contradicting evidence.

**Transparent failure diagnosis.** The thought trace is human-readable. When an agent fails, the trace shows exactly where reasoning went wrong. This is not true of pure action loops.

**Composability.** ReAct is format-agnostic. Any LLM that can follow few-shot examples can run it. This has made it the default execution loop in most agent frameworks.

**Dynamic plan adjustment.** A ReAct agent can abandon an approach mid-trace if observations indicate it will not work. A fixed-plan agent commits to the plan upfront and cannot adapt.

---

## Critical Limitations

### Long-Horizon Task Degradation

**Concrete failure mode:** On WebShop (web-based shopping agent requiring creative exploration), Reflexion with ReAct shows zero improvement across trials. The model generates confident-sounding thoughts but cannot diagnose why its search queries return irrelevant results. The ReAct loop provides no benefit when the problem requires diverse exploration rather than corrective refinement of a known approach. Reflection quality is bounded by whether the model can identify what went wrong -- and for ambiguous retrieval failures, it often cannot.

**Unspoken infrastructure assumption:** ReAct assumes observations are reliable and fast. If tool calls are slow (API latency, database queries), the sequential Thought-Action-Observation loop is slow by construction -- you cannot parallelize it without breaking the interleaving that makes it work. Production systems that need concurrency must add parallel tool dispatch layers on top of the basic loop, which complicates trace integrity.

### Context Window as Bottleneck

Every step appends to the context. For tasks requiring 50+ tool calls, the trace itself becomes a significant fraction of the available context, leaving less room for relevant retrieved content. Truncation or compression introduces the context collapse problem that ACE identifies. There is no clean solution within the basic ReAct formulation.

### Weak Model Failure

The Reflexion paper tests ReAct on StarChat-beta and reports zero improvement over baseline. ReAct's benefits are an emergent property of sufficient model capability -- the model must be able to generate coherent thoughts that actually influence subsequent actions. Smaller or fine-tuned models often produce thoughts that are syntactically correct but semantically disconnected from the observations they follow.

---

## When Not to Use It

**Single-step retrieval tasks.** If your task requires one lookup and one answer, the overhead of a reasoning loop adds latency and token cost with no benefit. Use direct RAG.

**Latency-sensitive applications.** Each Thought-Action-Observation cycle is a synchronous round-trip: LLM call, tool call, LLM call. Tasks that require 10+ turns will have 10x the latency of a single-shot approach.

**Tasks requiring broad exploration.** When the problem demands trying many diverse approaches rather than refining one approach, ReAct's convergent reasoning traces bias the agent toward exploitation over exploration. Diversity-promoting sampling or explicit exploration strategies are better fits.

**Weak base models.** If your model cannot reliably follow few-shot trace formats or generate coherent mid-trace reasoning, ReAct's thoughts become noise that misleads rather than guides the next action.

---

## Unresolved Questions

**Optimal thought verbosity.** How long should thoughts be? Very short thoughts ("I need more information") add structure without content. Very long thoughts consume tokens that could be used for observations. No systematic study has established the right thought length as a function of task complexity.

**Thought quality measurement.** Traces are human-readable but it is unclear how to measure whether a thought is actually good -- does it correctly identify the current state? Does it lead to a better action? Most evaluations measure final task success, not intermediate reasoning quality.

**Scaling to large action spaces.** The original paper uses 3 actions. Production agents have dozens to hundreds of tools. How the model selects relevant actions as the action space grows is not well characterized. Few-shot examples cannot cover the full space, and tool descriptions in the context compete with task-relevant content for attention.

**Failure detection.** When should a ReAct agent conclude it cannot complete a task? Fixed turn limits are blunt. The agent may give up just before success or persist far past the point of utility. Building a reliable "I am stuck" detector without false positives is an open problem.

---

## Alternatives

| Alternative | When to choose it |
|-------------|-------------------|
| Chain-of-Thought | No external tools needed; pure reasoning task |
| Single-step RAG | One retrieval is sufficient; latency matters |
| [Reflexion](../concepts/reflexion.md) | Multi-trial task with clear success/failure signal; want learning across attempts |
| Plan-and-execute | Task structure is known upfront; can parallelize sub-tasks |
| Voyager-style curriculum + skill library | Open-ended long-horizon task; agent needs to accumulate reusable capabilities over many tasks |
| ReAct + ACE | Production agent that must improve over time without fine-tuning; context length management is a concern |


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.4)
- [Reflexion](../concepts/reflexion.md) — implements (0.6)
- [GPT-4](../projects/gpt-4.md) — implements (0.5)
- [Chain-of-Thought](../concepts/chain-of-thought.md) — part_of (0.6)
