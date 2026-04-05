---
entity_id: react
type: approach
bucket: agent-systems
sources:
  - repos/yusufkaraaslan-skill-seekers.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - repos/affaan-m-everything-claude-code.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/memento-teams-memento-skills.md
related: []
last_compiled: '2026-04-05T05:24:18.747Z'
---
# ReAct (Reasoning + Acting)

## What It Is

ReAct is a prompting framework introduced by Yao et al. at ICLR 2023 that structures LLM agent behavior by interleaving explicit reasoning traces ("thoughts") with discrete actions and environmental observations. Rather than generating actions blindly from input, or reasoning without grounding, a ReAct agent alternates: think → act → observe → think → act → observe, until it produces a final answer.

The name is a portmanteau of "reasoning" and "acting." The core insight is that scratchpad-style reasoning (as in chain-of-thought prompting) becomes substantially more useful when the model can act on external tools between reasoning steps, and external observations can update the reasoning trace.

## How It Works

A ReAct trajectory follows a structured cycle:

```
Thought: I need to find the capital of France.
Action: search[capital of France]
Observation: Paris is the capital of France.
Thought: I now know the answer.
Action: finish[Paris]
```

Each component serves a distinct function:

**Thought** steps are unconstrained natural language reasoning. The model can decompose the problem, assess what it knows, plan next steps, or reflect on a failed observation. These traces are not grounded in external state — they are the model's internal monologue, surfaced as text.

**Action** steps are structured calls to external tools. In the original paper, actions included search, lookup (find next occurrence of a term on the current Wikipedia page), and finish. In deployed systems, actions expand to arbitrary tool calls: web search, code execution, file reads, API calls, database queries.

**Observation** steps contain the result returned by the environment after executing an action. Observations are injected into the context window as part of the turn, so subsequent thoughts can reference them.

The model generates thoughts and actions autoregressively. The environment executes actions and injects observations. This loop continues for a fixed number of steps or until the model emits a finish action.

### Why Interleaving Matters

Pure chain-of-thought reasoning hallucinates facts because it has no mechanism to verify claims against external state. Pure action sequences (acting without explicit reasoning) tend to fail on multi-step tasks because the model cannot track intermediate conclusions. ReAct solves both problems: the thought steps produce a scratchpad that carries state across observations, while the action steps ground claims in external lookups.

The original paper demonstrated this on HotpotQA (multi-hop question answering), FEVER (fact verification), ALFWorld (text-based household tasks), and WebShop (online shopping). On HotpotQA, ReAct outperformed chain-of-thought by reducing hallucination, and outperformed action-only baselines on task completion. These results are from the original paper authors (self-reported), though the paper was peer-reviewed at ICLR.

## What Gets Built on Top of It

ReAct is less a system and more a structural template. Most LLM agent frameworks treat it as a default scaffold or explicit reference point.

The mem-agent project from Dria describes its scaffold as "inspired by the ReAct framework (Yao et al., 2023)," using `<think>`, `<python>`, and `<reply>` XML blocks to implement the thought/action/observation cycle with Pythonic tool calling over JSON. [Source](../../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

The everything-claude-code project implements a harness with hooks, agents, and skills that follow ReAct-style looping — its `/loop-start`, `/loop-status`, and continuous verification commands reflect the same think-act-observe structure, adapted to software development workflows. [Source](../../raw/repos/affaan-m-everything-claude-code.md)

Reflexion (Shinn et al., 2023) builds on ReAct by adding a self-reflection step: after a trajectory fails, a separate LLM summarizes what went wrong and stores that reflection in a long-term memory buffer, which the actor can consult on the next attempt. Voyager (Wang et al., 2023) uses a similar loop structure but adds a skill library — successful trajectories are saved as reusable programs.

## Practical Implementation Choices

**Thought block format**: Original ReAct uses plain text prefixed with "Thought:". Modern implementations use XML tags (`<think>...</think>`) or fenced sections, making it easier to parse actions programmatically and strip thoughts from user-facing output. The mem-agent paper notes they changed `<thoughts>` to `<think>` to align with Qwen3 thinking model conventions.

**Action format**: The original paper uses structured string actions like `search[query]`. Modern deployments use JSON function calls or Python code blocks. The Dria DPAB benchmark found Python code blocks outperform JSON for tool calling on nearly all tested models, attributing this to the prevalence of Python in pretraining data.

**Stopping conditions**: ReAct agents need an explicit termination mechanism. Common approaches: a `finish[answer]` action type, a maximum step count, or detection of an empty action block. Without this, agents can loop indefinitely. The mem-agent training work discovered reward hacking where agents would maximize format rewards by filling all available turns — solved by adding step-decaying rewards and a max-turns penalty.

**Context growth**: Each turn appends thoughts, actions, and observations to the context window. On long tasks, this fills context rapidly. The mem-agent paper cites this as the central problem motivating dynamic memory: rather than keeping everything in context, the agent writes summaries to external files and retrieves them selectively.

## Failure Modes

**Repetitive loops**: An agent that fails an action (e.g., a search returning no results) may re-attempt the same action with identical parameters. Without explicit loop detection or a mechanism to vary strategy on failure, agents stall.

**Thought-action disconnection**: The model can produce a plausible-sounding thought that is logically inconsistent with the subsequent action, or vice versa. The thought stream is not formally verified — it is generated text, subject to the same hallucination risks as any LLM output.

**Observation processing**: If an observation is long (e.g., a large webpage), the model may fail to extract the relevant portion, either ignoring it or generating a thought that mischaracterizes it. ReAct has no built-in retrieval or summarization of observations.

**Context exhaustion**: In its vanilla form, ReAct stores the entire trajectory in context. A 20-step trajectory with substantial observations can consume most of a 200k-token window. Projects like MemGPT and mem-agent address this directly, but base ReAct does not.

## When Not to Use It

ReAct adds overhead — every action is preceded by a thought, and every observation triggers further reasoning. For tasks with a single known action (e.g., "translate this text"), the thought loop adds latency and tokens with no benefit.

ReAct also assumes the available actions are useful. If the tool set is incomplete or unreliable, the thought-act-observe cycle degrades quickly: the model reasons about what it needs, fails to get it, and either loops or hallucinates a substitute observation. Tool reliability is a prerequisite, not something ReAct provides.

ReAct is also a poor fit when latency is the primary constraint. Each thought-action-observation turn requires at least one model call (often more, if tools involve additional API calls). For real-time applications, the multi-turn structure is prohibitive.

## Unresolved Questions

**How many thought tokens are enough?** The original paper treats thought as free-form and unbounded. Modern implementations tune this aggressively — the everything-claude-code project recommends `MAX_THINKING_TOKENS=10000` against a default of 31,999 to cut costs. The tradeoff between reasoning depth and token cost is empirically determined per task, not principled.

**When should an agent decide it cannot proceed?** ReAct provides no formal mechanism for detecting when a task is infeasible or when the available tools are insufficient. The clarification task in mem-agent (asking the user when a query is ambiguous) is a hand-engineered addition, not something ReAct specifies.

**Reward design for multi-step correctness**: Training agents on ReAct-style trajectories with RL requires rewards that incentivize task completion without enabling reward hacking through format compliance. The mem-agent paper devotes substantial attention to this problem, finding that naïve format rewards caused agents to maximize turn count rather than complete tasks efficiently.

## Alternatives

**Chain-of-Thought (CoT)**: Use when no external tools are needed and reasoning alone suffices. CoT is faster and cheaper than ReAct but hallucinates on knowledge-intensive tasks.

**Tool-augmented generation without explicit reasoning**: Some systems call tools without interleaved thought traces. Use when task structure is fixed, actions are deterministic, and multi-step reasoning isn't required. Lower overhead than ReAct.

**Reflexion**: Use when tasks are repeated or can be retried, and failure feedback is available. Reflexion adds explicit self-critique and episodic memory at the cost of more model calls.

**Plan-then-execute architectures**: Use when the full action sequence can be planned upfront and actions are independent. Avoids the sequential bottleneck of ReAct's turn-by-turn loop, but fails on tasks where observations change the plan.
