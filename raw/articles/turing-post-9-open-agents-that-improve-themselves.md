---
url: 'https://www.turingpost.com/p/agentselfimprovement'
type: article
author: Alyona Vert.
date: '2026-04-05'
tags:
  - self-improving
  - agent-memory
  - agent-systems
  - persistent-memory
  - skill-evolution
  - feedback-loops
  - multi-platform-agents
key_insight: >-
  Self-improving agents require persistent cross-session memory and automated
  feedback loops that capture skill evolution, not just conversation
  history—builders need to architect memory systems that distinguish between
  episodic interactions and learned capabilities that transfer across tasks.
relevance_scores:
  topic_relevance: 8
  practitioner_value: 7
  novelty: 6
  signal_quality: 6
  composite: 7.1
  reason: >-
    Directly covers self-improving agent architectures (topic 5) and persistent
    cross-session memory (topic 2) with a curated list of open-source frameworks
    including HyperAgents, EvoAgentX, Agent0, and Letta that developers can
    explore, though the article is a survey/list format rather than deep
    architectural documentation.
---
## 9 Open Agents That Improve Themselves

> Published on Turing Post by Alyona Vert. on 2026-04-05

[Twitter Library](https://www.turingpost.com/t/twitter-library)

Inspired by Hermes Agent

![Alyona Vert.](https://media.beehiiv.com/cdn-cgi/image/fit=scale-down,quality=80,format=auto,onerror=redirect/uploads/user/profile_picture/2ab840ec-0d97-4907-9dd7-07c12be27704/photo_2024-02-10_10-25-12_copy.jpg)

[Alyona Vert.](https://www.turingpost.com/authors/alyona-vert)

Recent weeks and the rising popularity of Hermes Agent have demonstrated an important thing – people are seeking and are increasingly interested in agents that can self-improve.

[Hermes Agent](https://www.turingpost.com/p/hermes) positions itself as “the agent that grows with you”, emphasizing persistent memory across sessions and automatic skill creation alongside a gateway for multi-platform messaging and sandboxed tool use. This is the first agent at this scale, but similar ideas and mechanisms appear in other agents.

Here are several interesting lightweight open-source agents and frameworks that support self-improvement concept:

1. **HyperAgents**
	Meta’s research system for self-referential AI, combining a task agent with a meta agent in a single editable program that can modify both itself and its improvement process, making it one of the clearest examples of explicit self-improvement architectures. [→ Explore more](https://ai.meta.com/research/publications/hyperagents/)
2. **Agent0**  
	Agent0 is a research-oriented autonomous framework built around zero-data self-evolution. Its description states that agents can improve and evolve without human-curated datasets and self-generate training data through intelligent exploration, using tool-integrated reasoning to drive continuous capability growth. [→ Explore more](https://github.com/aiming-lab/Agent0)
3. **EvoAgentX**  
	A framework for building LLM agents that generate workflows, evaluate their own performance, and iteratively rewrite prompts and structures using built-in evolution algorithms. Over time, this creates agents that continuously refine how they work (not just what they output) through feedback-driven self-optimization. [→ Explore more](https://github.com/EvoAgentX/EvoAgentX)
4. **AgentEvolver**
	Trains agents that don’t rely on static data: they generate their own tasks, explore environments, and learn from past trajectories. By assigning credit across steps and refining policies, the system forms a closed feedback loop where agents continuously evolve. [→ Explore more](https://github.com/modelscope/AgentEvolver)
5. **Agent Zero**
	An autonomous agent framework that runs in an execution environment, where agents use and create tools while refining workflows over time. With persistent memory, plugin-based skills, and iterative loops, it can self-correct and expand its capabilities, gradually evolving its behavior through continuous interaction and tool use. [→ Explore more](https://www.agent-zero.ai/)
6. **Letta Code**  
	A memory-first coding harness built on the Letta API, where a persistent agent keeps state across sessions and updates its memory over time. It can learn reusable skills and adapt from past interactions, improving continuously instead of resetting each session, while remaining portable across different LLM backends. [→ Explore more](https://github.com/letta-ai/letta-code)
7. **LettaBot**
	A multi-channel AI assistant built on the Letta Code SDK, using a single persistent agent with shared memory across apps like Telegram, Slack, Discord, WhatsApp and Signal. It stores conversations over time, executes local tools, and schedules tasks. The agent continuously updates its memory and skills, allowing it to improve behavior and responses from ongoing interactions. [→ Explore more](https://github.com/letta-ai/lettabot)
8. **LangGraph Reflection**  
	A reflection-style agent pattern that implements iterative self-critique: a critique agent evaluates the main agent’s output and, if issues are found, sends feedback for revision. This loop repeats until no further critiques remain, enabling step-by-step refinement within a single execution. [→ Explore more](https://github.com/langchain-ai/langgraph-reflection)
9. **SuperAGI**
	Autonomous agent framework that allows agents to continually improve performance across runs. It provides memory storage to retain information and adapt behavior over time, enabling incremental improvement through repeated execution and accumulated context. [→ Explore more](https://github.com/TransformerOptimus/SuperAGI)
