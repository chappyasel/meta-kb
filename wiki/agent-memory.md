# The State of Agent Memory

> Agent memory has moved from “store the chat log somewhere” to explicit memory architecture. The frontier systems separate working, episodic, semantic, procedural, and temporal layers, then optimize how those layers are written, compressed, retrieved, and revised over time. [Elasticsearch](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) [Fabricio Q](../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md) [Rasmussen et al.](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

The practical reason is simple: bigger context windows did not solve continuity. Production agents still forget, over-retrieve, poison themselves with stale context, or fail to connect relevant experiences. The current generation of systems therefore treats memory as a controllable substrate rather than as appended history. That substrate might be a vector layer, a temporal knowledge graph, a SQL schema, a markdown vault, or a case bank. But the best systems are converging on the same principle: memory is active infrastructure, not passive storage. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Mem0](projects/mem0.md) [Graphiti](projects/graphiti.md)

## Approach Categories

### Structured Memory Layers

The most mainstream pattern is layered memory: working memory in context, episodic records for what happened, semantic memory for distilled facts, and procedural memory for how the agent should behave. The articles from Elastic and Fabricio Q are useful not because they are novel, but because they make the architectural split explicit. Production systems do not want one giant undifferentiated memory blob. They want different stores for different retrieval contracts. [Elasticsearch](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) [Fabricio Q](../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md)

[Mem0](projects/mem0.md) is the clearest “memory as product layer” expression of this camp. Its multi-level user/session/agent abstraction and reported +26% accuracy, 91% faster responses, and 90% fewer tokens versus full-context prompting explain why it has become a default reference point. Letta pushes a similar stateful-agent thesis through memory blocks. Memori takes a more structured route, extracting memory from agent actions into SQL-native state and posting 81.95% on LoCoMo with only 1,294 tokens per query, or 4.97% of full-context footprint. [Mem0](../raw/repos/mem0ai-mem0.md) [Letta](../raw/repos/letta-ai-letta.md) [Memori](../raw/repos/memorilabs-memori.md)

This camp wins when you want operational clarity. You can inspect what is being stored, control isolation boundaries, add role- or user-level filters, and reason about prompt cost. It loses when memory needs richer relational or temporal semantics than key-value or vector-backed schemas can comfortably express. [Elasticsearch](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) [Memori](../raw/repos/memorilabs-memori.md)

### Graph-First And Temporal Memory

The graph camp argues that memory is not mainly a retrieval problem. It is a relationship problem. [Graphiti](projects/graphiti.md) and the underlying Zep paper treat memory as a temporally aware knowledge graph where facts have provenance, episodes, and validity over time. This matters because real agents do not just need to know facts; they need to know when those facts were true and how one observation relates to another. [Rasmussen et al.](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) [Graphiti](../raw/repos/getzep-graphiti.md)

[A-MEM](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md) pushes the idea further with Zettelkasten-style evolution: new memories do not only get appended; they revise the contextual representation of old ones. [HippoRAG](projects/hipporag.md) and Cognee make a related claim from the retrieval side: richer relationship structure improves multi-hop sensemaking and long-term associativity. The shared belief is that flat stores throw away too much structure too early. [A-MEM](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md) [HippoRAG](../raw/repos/osu-nlp-group-hipporag.md) [Cognee](../raw/repos/topoteretes-cognee.md)

Graph memory looks increasingly justified in enterprise and long-horizon settings. Zep reports 94.8% on DMR versus MemGPT’s 93.4%, plus up to 18.5% gains on LongMemEval-style tasks and 90% lower latency in the stronger enterprise evaluation. Those are not just academic margins; they point to a real product advantage when cross-session synthesis and time-sensitive reasoning matter. [Rasmussen et al.](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

### File-First And Agent-Managed External Memory

The most builder-friendly memory systems still use files. Anthropic’s context-engineering guide explicitly endorses structured note-taking outside the context window. Claude-Mem, planning-with-files, OpenViking, and Hipocampus all build on the same premise: the agent should maintain compact, recoverable artifacts on disk and only pull detailed context when it has earned the right to do so. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Claude-Mem](../raw/repos/thedotmack-claude-mem.md) [planning-with-files](../raw/repos/othmanadi-planning-with-files.md) [OpenViking](../raw/repos/volcengine-openviking.md) [Hipocampus](../raw/repos/kevin-hs-sohn-hipocampus.md)

These systems differ on sophistication. planning-with-files is deliberately simple: structured markdown planning files as durable working memory plus session recovery. Claude-Mem layers search, timeline, and full-observation retrieval into a 3-layer workflow that claims roughly 10x token savings by filtering before expansion. OpenViking adds a more explicit L0/L1/L2 filesystem hierarchy and reports 43% improvement over OpenClaw with 91% lower input token cost in one setting. [planning-with-files](../raw/repos/othmanadi-planning-with-files.md) [Claude-Mem](../raw/repos/thedotmack-claude-mem.md) [OpenViking](../raw/repos/volcengine-openviking.md)

File-first memory is strongest when human legibility matters as much as model performance. It is weak when the agent needs heavy relational inference, but it is still the most practical answer for many coding and operator workflows because it keeps the memory surface inspectable and editable. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [OpenViking](../raw/repos/volcengine-openviking.md)

### Learning-Driven Memory Managers

The most ambitious memory systems stop hand-designing write/read policies and try to learn them. [MemAgent](../raw/repos/bytedtsinghua-sia-memagent.md) treats long-context processing as a multi-turn memory workflow and reports extrapolation to 3.5M tokens. [Mem-alpha](../raw/repos/wangyu-ustc-mem-alpha.md) learns when to encode information into different memory types. [SimpleMem](../raw/repos/aiming-lab-simplemem.md) focuses on semantic lossless compression. Nemori argues that event boundaries matter more than arbitrary chunk windows. This is still less operationally mature than file-first or structured-layer systems, but it is where memory architecture starts to become adaptive rather than fixed. [MemAgent](../raw/repos/bytedtsinghua-sia-memagent.md) [Mem-alpha](../raw/repos/wangyu-ustc-mem-alpha.md) [SimpleMem](../raw/repos/aiming-lab-simplemem.md) [Nemori](../raw/repos/nemori-ai-nemori.md)

## Memory Is Becoming Policy

One of the most important shifts in this bucket is that memory is no longer mainly a storage decision. It is a policy decision. Systems need admission rules, retrieval rules, conflict rules, and forgetting rules. Should a one-off user message become long-term preference memory? Should a failed action become a reusable lesson or stay in a local trace? Should the agent trust the newest observation or the most frequently repeated one? The underlying storage engine matters, but these policy questions are increasingly where systems win or fail. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Fabricio Q](../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md)

This is why the corpus keeps drifting toward multi-layer designs. A single store cannot cleanly serve every policy. Working memory needs freshness. Semantic memory needs stability. Episodic memory needs chronology. Procedural memory needs reusability. Once builders recognize that, “agent memory” stops looking like a database feature and starts looking like application architecture. [Elasticsearch](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) [Mirix](../raw/repos/mirix-ai-mirix.md)

## Failure Modes That Matter In Production

The first major failure mode is memory poisoning. If the agent over-promotes noisy observations, it can make future decisions with great confidence and poor grounding. The file-first systems often reduce this risk by staying inspectable, but they can still accumulate bad state when summaries become overly confident. The more automated systems reduce manual burden, but they need stronger write gates. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Claude-Mem](../raw/repos/thedotmack-claude-mem.md) [A-MEM](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)

The second failure mode is stale certainty. This is where temporal graph systems earn their keep. A preference, ticket state, meeting decision, or repository fact that used to be true can remain retrievable long after it should stop influencing behavior. Flat memory stores often have no principled way to represent “this was true then but not now.” Graphiti and the Zep paper make this one of the clearest product arguments for temporal memory. [Rasmussen et al.](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) [Graphiti](../raw/repos/getzep-graphiti.md)

The third failure mode is retention without forgetting. [MemoryBank](projects/memorybank.md) and [Supermemory](projects/supermemory.md) are useful not because they solve forgetting perfectly, but because they force the issue. Any real memory system needs some theory of decay, contradiction, and deletion. Otherwise the system eventually becomes a landfill of half-relevant traces. This is still one of the most under-resolved operational questions in the whole bucket. [MemoryBank](../raw/repos/zhongwanjun-memorybank-siliconfriend.md) [Supermemory](../raw/repos/supermemoryai-supermemory.md)

## Practical Selection Guide

The corpus suggests a rough selection rule.

- Choose file-first memory when human operators need to inspect and edit the state directly. [planning-with-files](../raw/repos/othmanadi-planning-with-files.md) [Claude-Mem](../raw/repos/thedotmack-claude-mem.md)
- Choose structured-layer memory when product integration and predictable schemas matter most. [Mem0](../raw/repos/mem0ai-mem0.md) [Memori](../raw/repos/memorilabs-memori.md)
- Choose graph memory when time, provenance, and relationship reasoning are part of the task itself. [Graphiti](../raw/repos/getzep-graphiti.md) [HippoRAG](../raw/repos/osu-nlp-group-hipporag.md)
- Choose adaptive or learned memory managers when memory admission itself is the research frontier. [MemAgent](../raw/repos/bytedtsinghua-sia-memagent.md) [Mem-alpha](../raw/repos/wangyu-ustc-mem-alpha.md)

The biggest mistake is asking one memory substrate to do all four jobs at once. The strongest systems in the corpus win by being clear about what kind of remembering they are optimizing. [Fabricio Q](../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md)

## The Convergence

The clearest convergence is hybridization. Nobody serious believes in pure episodic logs anymore. The field is moving toward blends of episodic, semantic, procedural, and working memory, with some systems adding temporal or relational structure on top. Even papers and repos that disagree on substrate agree on the decomposition. [Fabricio Q](../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md) [Elasticsearch](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) Mirix

The second convergence is that memory must be writable by the agent itself. Reflexion stores verbal lessons in episodic memory; Anthropic recommends structured note-taking; A-MEM updates prior memory nodes; ACE evolves context playbooks; [Memento](projects/memento.md) retrieves prior cases to steer current decisions. Memory is increasingly viewed as part of the control loop, not a passive attachment to it. [Reflexion](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [A-MEM](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md) [Memento](../raw/repos/agent-on-the-fly-memento.md)

## The Divergence

The core divergence is whether memory should look like a database, a graph, or a filesystem. Database-style systems optimize for predictable schemas and product integration. Graph systems optimize for relation-heavy reasoning and temporal provenance. File systems optimize for inspectability, portability, and low-friction human collaboration. Those are different bets, and right now all three are still alive because agents need different memory contracts in different domains. [Mem0](../raw/repos/mem0ai-mem0.md) [Graphiti](../raw/repos/getzep-graphiti.md) [Claude-Mem](../raw/repos/thedotmack-claude-mem.md)

There is also a philosophical split on forgetting. [MemoryBank](projects/memorybank.md) and [Supermemory](projects/supermemory.md) treat forgetting and contradiction handling as first-class requirements. Simpler file systems often treat compression and pruning as manual or lightly automated. The field has not settled whether “remember less but better” should be a native algorithmic feature or an operational habit around the memory system. [MemoryBank](../raw/repos/zhongwanjun-memorybank-siliconfriend.md) [Supermemory](../raw/repos/supermemoryai-supermemory.md)

## What's Hot Now

The hottest memory products by adoption are [Mem0](projects/mem0.md) at 51,880 stars, Claude-Mem at 44,950, [Graphiti](projects/graphiti.md) at 24,473, Letta at 21,873, [Supermemory](projects/supermemory.md) at 20,994, and Memori at 13,011. That star distribution matters because it spans every major memory philosophy: vector-backed abstraction, file-based continuity, temporal graphs, stateful agents, and structured SQL memory. [Mem0](../raw/repos/mem0ai-mem0.md) [Claude-Mem](../raw/repos/thedotmack-claude-mem.md) [Graphiti](../raw/repos/getzep-graphiti.md) [Letta](../raw/repos/letta-ai-letta.md) [Supermemory](../raw/repos/supermemoryai-supermemory.md) [Memori](../raw/repos/memorilabs-memori.md)

The benchmark signals are also getting sharper. Mem0 advertises +26% accuracy and 90% fewer tokens versus full context. Memori posts 81.95% accuracy on LoCoMo at 4.97% of full-context footprint. OpenViking reports 91% lower token cost in one comparison. Hipocampus reports 21x better performance on cross-domain recall. These are no longer vague “better memory” claims; they are cost-and-quality claims that can compete for production budgets. [Mem0](../raw/repos/mem0ai-mem0.md) [Memori](../raw/repos/memorilabs-memori.md) [OpenViking](../raw/repos/volcengine-openviking.md) [Hipocampus](../raw/repos/kevin-hs-sohn-hipocampus.md)

## Why Bigger Windows Did Not Solve It

One useful negative lesson from this corpus is that memory became important because bigger windows failed to replace it. More window size helps with temporary continuity, but it does not solve promotion, abstraction, identity, forgetting, or provenance. In some cases it makes those problems easier to ignore until the agent is already doing the wrong thing expensively. [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [Elasticsearch](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md)

That is why the strongest memory projects are not simply “more context” products. They are systems for deciding what deserves to survive beyond the current window and in what form. The winning architectures are about selection and representation, not just storage capacity. [Mem0](../raw/repos/mem0ai-mem0.md) [Graphiti](../raw/repos/getzep-graphiti.md)

## Where It's Going

The near-term future is memory as adaptive middleware. Expect more systems that can decide what deserves promotion from working memory to long-term memory, how it should be represented, and when it should be revised or forgotten. The winning systems will not just store more; they will make better decisions about memory shape. [A-MEM](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md) [Mem-alpha](../raw/repos/wangyu-ustc-mem-alpha.md) [ACE](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

The bigger long-term direction is that memory and self-improvement are merging. Once memory stores traces, reflections, corrections, and learned strategies rather than just user facts, the agent can improve without weight updates. That is the connective tissue between Reflexion, ACE, Memento, and the newer context-evolution systems. [Reflexion](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) [ACE](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md) [Memento](../raw/repos/agent-on-the-fly-memento.md)

## Open Questions

- What should be promoted to long-term memory versus left in local execution traces? [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md) [LangChain trace article](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)
- When is graph structure worth the operational complexity over file-first memory? [Rasmussen et al.](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) [Claude-Mem](../raw/repos/thedotmack-claude-mem.md)
- How much forgetting should be algorithmic versus human-supervised? [MemoryBank](../raw/repos/zhongwanjun-memorybank-siliconfriend.md) [Supermemory](../raw/repos/supermemoryai-supermemory.md)

## Sources

### Articles

- [Effective context engineering for AI agents](../raw/articles/effective-context-engineering-for-ai-agents.md)
- [AI agent memory with Elasticsearch](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md)
- [Memory in agents: episodic vs semantic](../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md)
- [The agent improvement loop starts with a trace](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

### Papers

- [Zep: A Temporal Knowledge Graph Architecture for Agent Memory](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [A-MEM](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)
- [Reflexion](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)
- [Agentic Context Engineering](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

### Repos

- [Mem0](../raw/repos/mem0ai-mem0.md)
- [Letta](../raw/repos/letta-ai-letta.md)
- [Memori](../raw/repos/memorilabs-memori.md)
- [Graphiti](../raw/repos/getzep-graphiti.md)
- [Memento](../raw/repos/agent-on-the-fly-memento.md)
- [Mirix](../raw/repos/mirix-ai-mirix.md)
- [HippoRAG](../raw/repos/osu-nlp-group-hipporag.md)
- [Cognee](../raw/repos/topoteretes-cognee.md)
- [Claude-Mem](../raw/repos/thedotmack-claude-mem.md)
- [planning-with-files](../raw/repos/othmanadi-planning-with-files.md)
- [OpenViking](../raw/repos/volcengine-openviking.md)
- [Hipocampus](../raw/repos/kevin-hs-sohn-hipocampus.md)
- [SimpleMem](../raw/repos/aiming-lab-simplemem.md)
- [MemAgent](../raw/repos/bytedtsinghua-sia-memagent.md)
- [Mem-alpha](../raw/repos/wangyu-ustc-mem-alpha.md)
- [Nemori](../raw/repos/nemori-ai-nemori.md)
- [MemoryBank](../raw/repos/zhongwanjun-memorybank-siliconfriend.md)
- [Supermemory](../raw/repos/supermemoryai-supermemory.md)
