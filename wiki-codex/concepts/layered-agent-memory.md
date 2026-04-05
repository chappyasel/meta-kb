# Layered Agent Memory

> Layered agent memory is the design pattern where different kinds of memory are stored and retrieved through different layers, typically separating working, episodic, semantic, procedural, and sometimes temporal memory.

## Why It Matters

The concept matters because most agent failures are not pure forgetting failures. They are representation failures. A model may remember a user preference, but not the source of that preference, when it changed, or whether it belongs in global memory versus a local task state. Layered memory exists to stop every fact, event, and rule from being shoved into one undifferentiated store. [Elasticsearch](../../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) [Fabricio Q](../../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md)

This separation is also what makes memory operational. Once the layers are explicit, builders can decide different write thresholds, retention rules, and retrieval strategies for each one. That is much easier to govern than “append all history and search it later.” [Anthropic](../../raw/articles/effective-context-engineering-for-ai-agents.md)

## How It Works

The common split looks like this:

- working memory: active task state inside the current context window,
- episodic memory: what happened in prior runs or interactions,
- semantic memory: stable facts distilled from repeated experience,
- procedural memory: reusable instructions, playbooks, or strategies,
- temporal memory: facts or events indexed by when they were true.

Different projects use different names, but the shape keeps recurring. The memory system decides what deserves promotion from a short-lived trace to a more durable layer, and it chooses a retrieval path based on what kind of question the agent is asking. “What happened last session?” and “what is the standing preference?” should not hit the same store in the same way. [Fabricio Q](../../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md) [Mem0](../../raw/repos/mem0ai-mem0.md) [Mirix](../../raw/repos/mirix-ai-mirix.md)

The main challenge is that promotion policies are hard. Over-promote and the system poisons itself with stale or noisy memories. Under-promote and the agent repeats mistakes. That is why many of the more credible systems now pair layered memory with compression, review, or trace analysis. [LangSmith trace article](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) [Reflexion](../../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

## Who Implements It

- [Mem0](../projects/mem0.md) exposes user, session, and agent levels as a practical layered abstraction for production memory. [Mem0](../../raw/repos/mem0ai-mem0.md)
- [Letta](../projects/letta.md) uses explicit memory blocks to support stateful agents that outlive a single chat. [Letta](../../raw/repos/letta-ai-letta.md)
- [Memori](../projects/memori.md) separates memory extraction from runtime context and stores durable state in a structured SQL-native form. [Memori](../../raw/repos/memorilabs-memori.md)
- [Mirix](../projects/mirix.md) explicitly frames memory as a multi-type architecture across semantic, episodic, and other layers. [Mirix](../../raw/repos/mirix-ai-mirix.md)
- [MemoryBank](../projects/memorybank.md) emphasizes forgetting and longitudinal relationship management, which is what layered memory becomes once retention policy matters. [MemoryBank](../../raw/repos/zhongwanjun-memorybank-siliconfriend.md)

## Open Questions

- What should be promoted automatically versus left in ephemeral traces? [LangSmith trace article](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)
- Should procedural memory live in the same system as user memory, or in separate skill/playbook stores? [Anthropic](../../raw/articles/effective-context-engineering-for-ai-agents.md) [ACE paper](../../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)
- How should forgetting work across layers when the same fact appears in multiple forms? [MemoryBank](../../raw/repos/zhongwanjun-memorybank-siliconfriend.md) [Supermemory](../../raw/repos/supermemoryai-supermemory.md)

## Sources

- [AI agent memory with Elasticsearch](../../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md)
- [Memory in agents: episodic vs semantic](../../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md)
- [Effective context engineering for AI agents](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- [Mem0 repo](../../raw/repos/mem0ai-mem0.md)
- [Letta repo](../../raw/repos/letta-ai-letta.md)
- [Memori repo](../../raw/repos/memorilabs-memori.md)
- [Mirix repo](../../raw/repos/mirix-ai-mirix.md)
- [MemoryBank repo](../../raw/repos/zhongwanjun-memorybank-siliconfriend.md)
- [Supermemory repo](../../raw/repos/supermemoryai-supermemory.md)
- [Reflexion paper](../../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)
- [ACE paper](../../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)
- [LangSmith trace article](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)
