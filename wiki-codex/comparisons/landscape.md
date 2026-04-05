# Landscape Comparison

> This table puts the major projects in one place. The goal is not to crown a winner, but to make the design tradeoffs legible: storage model, control surface, best-fit use case, and momentum signal.

| Project | Primary bucket | Core move | Use when | Signal |
| --- | --- | --- | --- | --- |
| [Anthropic Skills](../projects/anthropic-skills.md) | agent systems | Canonical `SKILL.md` package format for modular capabilities | You want load-on-demand reusable skills with an official reference shape | 110,064 stars ([repo](../../raw/repos/anthropics-skills.md)) |
| [claude-skills](../projects/claude-skills.md) | agent systems | Community skill registry around the same modular pattern | You want breadth and examples more than strict governance | 9,216 stars ([repo](../../raw/repos/alirezarezvani-claude-skills.md)) |
| [everything-claude-code](../projects/everything-claude-code.md) | context engineering | Large harness for coding-agent context, MCPs, and workflows | You want an opinionated operating environment around Claude Code | 136,116 stars ([repo](../../raw/repos/affaan-m-everything-claude-code.md)) |
| [gstack](../projects/gstack.md) | agent systems | Skill-heavy coding-agent workflow stack with operational guardrails | You want a dense harness with many prebuilt workflows and review modes | 63,766 stars ([repo](../../raw/repos/garrytan-gstack.md)) |
| [Obsidian Skills](../projects/obsidian-skills.md) | agent systems | Skill pattern embedded in a notes-native environment | You want personal knowledge workflows to behave like modular agent capabilities | 19,325 stars ([repo](../../raw/repos/kepano-obsidian-skills.md)) |
| [AI-Research-SKILLs](../projects/ai-research-skills.md) | agent systems | Specialized research procedures packaged as skill modules | You want reusable research workflows rather than ad hoc prompts | 6,111 stars ([repo](../../raw/repos/orchestra-research-ai-research-skills.md)) |
| [Skill Seekers](../projects/skill-seekers.md) | knowledge bases | Multi-format knowledge packaging and export pipeline | You need one cleaned corpus to feed many agent ecosystems | 12,269 stars ([repo](../../raw/repos/yusufkaraaslan-skill-seekers.md)) |
| [Ars Contexta](../projects/ars-contexta.md) | knowledge bases | Domain-shaped vault architecture for agent-readable notes | You care about information architecture as part of the retrieval strategy | 2,928 stars ([repo](../../raw/repos/agenticnotetaking-arscontexta.md)) |
| [Napkin](../projects/napkin.md) | knowledge bases | Markdown vault plus BM25 and progressive reveal | You want inspectable file-based memory without vector-first complexity | 264 stars ([repo](../../raw/repos/michaelliv-napkin.md)) |
| [PageIndex](../projects/pageindex.md) | knowledge bases | Hierarchical document-tree indexing instead of flat chunk retrieval | Your corpus has strong document structure and section hierarchy | 23,899 stars ([repo](../../raw/repos/vectifyai-pageindex.md)) |
| [HippoRAG](../projects/hipporag.md) | knowledge bases | Graph-shaped associative retrieval for multi-hop questions | You need synthesis-heavy retrieval across related facts | 3,332 stars ([repo](../../raw/repos/osu-nlp-group-hipporag.md)) |
| [Cognee](../projects/cognee.md) | agent memory | Hybrid graph and vector memory with continuous maintenance | You want memory plus retrieval in one structured layer | 14,899 stars ([repo](../../raw/repos/topoteretes-cognee.md)) |
| [Graphiti](../projects/graphiti.md) | agent memory | Temporal knowledge graph with episode provenance and validity windows | Time-sensitive facts and relationship reasoning matter | 24,473 stars ([repo](../../raw/repos/getzep-graphiti.md)) |
| [Mem0](../projects/mem0.md) | agent memory | Multi-level external memory for user, session, and agent state | You want a mainstream production memory layer with clear abstractions | 51,880 stars ([repo](../../raw/repos/mem0ai-mem0.md)) |
| [Letta](../projects/letta.md) | agent memory | Stateful agents with explicit memory blocks | You want agents that persist identity and state across sessions | 21,873 stars ([repo](../../raw/repos/letta-ai-letta.md)) |
| [Memori](../projects/memori.md) | agent memory | SQL-native extracted memory with strong efficiency claims | You want structured memory with measured context savings | 13,011 stars ([repo](../../raw/repos/memorilabs-memori.md)) |
| [Claude-Mem](../projects/claude-mem.md) | agent memory | File-based memory with search, timeline, and observation layers | You want human-readable external memory for coding or operator flows | 44,950 stars ([repo](../../raw/repos/thedotmack-claude-mem.md)) |
| [planning-with-files](../projects/planning-with-files.md) | agent memory | Durable markdown planning files as external working memory | You want the lightest viable persistent memory for coding tasks | 17,968 stars ([repo](../../raw/repos/othmanadi-planning-with-files.md)) |
| [OpenViking](../projects/openviking.md) | agent memory | Hierarchical filesystem memory with L0/L1/L2 retrieval | You want native memory with strong token-efficiency claims | 20,813 stars ([repo](../../raw/repos/volcengine-openviking.md)) |
| [Hipocampus](../projects/hipocampus.md) | agent memory | Low-cost long-term memory focused on cross-domain recall | You want research-oriented memory experiments over lightweight storage | 145 stars ([repo](../../raw/repos/kevin-hs-sohn-hipocampus.md)) |
| [Nemori](../projects/nemori.md) | agent memory | Event-boundary memory instead of arbitrary chunk windows | You care about narrative/event segmentation in long histories | 187 stars ([repo](../../raw/repos/nemori-ai-nemori.md)) |
| [Mirix](../projects/mirix.md) | agent memory | Multi-type memory system spanning several memory classes | You want an explicit hybrid memory architecture from the start | 3,508 stars ([repo](../../raw/repos/mirix-ai-mirix.md)) |
| [Memento](../projects/memento.md) | agent memory | Case-based memory retrieved to guide new decisions | You want memory that improves decisions through analogous prior cases | 2,375 stars ([repo](../../raw/repos/agent-on-the-fly-memento.md)) |
| [MemoryBank](../projects/memorybank.md) | agent memory | Longitudinal memory with forgetting and contradiction handling | Human-style persistence and decay are core to the use case | 419 stars ([repo](../../raw/repos/zhongwanjun-memorybank-siliconfriend.md)) |
| [Supermemory](../projects/supermemory.md) | agent memory | Personal memory layer for recall across many interactions | You want consumer-facing cross-session memory more than graph semantics | 20,994 stars ([repo](../../raw/repos/supermemoryai-supermemory.md)) |
| [LLMLingua](../projects/llmlingua.md) | context engineering | Model-assisted prompt compression and context shrinking | Prompt cost and long-context degradation are your main pain points | 5,985 stars ([repo](../../raw/repos/microsoft-llmlingua.md)) |
| [ACE](../projects/ace.md) | context engineering | Evolving contexts and persistent Skillbook for improved runs | You want context itself to learn from prior task outcomes | 2,112 stars ([repo](../../raw/repos/kayba-ai-agentic-context-engine.md)) |
| [Autoresearch](../projects/autoresearch.md) | self-improving | Benchmark-driven overnight loop for prompt and skill iteration | You want eval-first autonomous improvement on coding tasks | 65,009 stars ([repo](../../raw/repos/karpathy-autoresearch.md)) |
| [pi-autoresearch](../projects/pi-autoresearch.md) | self-improving | Prompt optimization loop packaged for lighter use | You want a simpler improvement loop without the full Autoresearch stack | 3,393 stars ([repo](../../raw/repos/davebcn87-pi-autoresearch.md)) |
| [GEPA](../projects/gepa.md) | self-improving | Reflective evolutionary prompt optimization | Evaluation budget matters as much as final performance | 3,157 stars ([repo](../../raw/repos/gepa-ai-gepa.md)) |
| [ADAS](../projects/adas.md) | self-improving | Self-evolving workflow search over agent designs | You want to search for better agent structures, not only prompts | 1,551 stars ([repo](../../raw/repos/shengranhu-adas.md)) |
| [CORAL](../projects/coral.md) | self-improving | Agent collaboration framework with room for learned coordination | Multi-agent improvement and delegation are the main target | 120 stars ([repo](../../raw/repos/human-agent-society-coral.md)) |

## Reading The Table

Three patterns stand out from the comparison.

First, the field is not converging on one substrate. Files, graphs, SQL, compressed prompts, and skill registries all remain live options because they solve different failure modes. [Karpathy](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Rasmussen et al.](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

Second, context engineering and memory increasingly overlap. Projects like [Claude-Mem](../projects/claude-mem.md), [OpenViking](../projects/openviking.md), and [ACE](../projects/ace.md) are hard to classify cleanly because the retrieval policy is part of the memory design and vice versa. [Anthropic](../../raw/articles/effective-context-engineering-for-ai-agents.md)

Third, self-improvement is becoming a systems concern rather than a separate research lane. [Autoresearch](../projects/autoresearch.md), [GEPA](../projects/gepa.md), [ACE](../projects/ace.md), and [Memento](../projects/memento.md) all improve future performance without changing model weights, but they do it through different mutable artifacts: prompts, playbooks, workflows, or cases. [OpenAI cookbook](../../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

## Sources

- [Karpathy knowledge-base tweet](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)
- [Effective context engineering for AI agents](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- [Self-evolving agents cookbook](../../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)
- [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [Anthropic Skills repo](../../raw/repos/anthropics-skills.md)
- [claude-skills repo](../../raw/repos/alirezarezvani-claude-skills.md)
- [everything-claude-code repo](../../raw/repos/affaan-m-everything-claude-code.md)
- [gstack repo](../../raw/repos/garrytan-gstack.md)
- [Obsidian Skills repo](../../raw/repos/kepano-obsidian-skills.md)
- [AI-Research-SKILLs repo](../../raw/repos/orchestra-research-ai-research-skills.md)
- [Skill Seekers repo](../../raw/repos/yusufkaraaslan-skill-seekers.md)
- [Ars Contexta repo](../../raw/repos/agenticnotetaking-arscontexta.md)
- [Napkin repo](../../raw/repos/michaelliv-napkin.md)
- [PageIndex repo](../../raw/repos/vectifyai-pageindex.md)
- [HippoRAG repo](../../raw/repos/osu-nlp-group-hipporag.md)
- [Cognee repo](../../raw/repos/topoteretes-cognee.md)
- [Graphiti repo](../../raw/repos/getzep-graphiti.md)
- [Mem0 repo](../../raw/repos/mem0ai-mem0.md)
- [Letta repo](../../raw/repos/letta-ai-letta.md)
- [Memori repo](../../raw/repos/memorilabs-memori.md)
- [Claude-Mem repo](../../raw/repos/thedotmack-claude-mem.md)
- [planning-with-files repo](../../raw/repos/othmanadi-planning-with-files.md)
- [OpenViking repo](../../raw/repos/volcengine-openviking.md)
- [Hipocampus repo](../../raw/repos/kevin-hs-sohn-hipocampus.md)
- [Nemori repo](../../raw/repos/nemori-ai-nemori.md)
- [Mirix repo](../../raw/repos/mirix-ai-mirix.md)
- [Memento repo](../../raw/repos/agent-on-the-fly-memento.md)
- [MemoryBank repo](../../raw/repos/zhongwanjun-memorybank-siliconfriend.md)
- [Supermemory repo](../../raw/repos/supermemoryai-supermemory.md)
- [LLMLingua repo](../../raw/repos/microsoft-llmlingua.md)
- [ACE repo](../../raw/repos/kayba-ai-agentic-context-engine.md)
- [Autoresearch repo](../../raw/repos/karpathy-autoresearch.md)
- [pi-autoresearch repo](../../raw/repos/davebcn87-pi-autoresearch.md)
- [GEPA repo](../../raw/repos/gepa-ai-gepa.md)
- [ADAS repo](../../raw/repos/shengranhu-adas.md)
- [CORAL repo](../../raw/repos/human-agent-society-coral.md)
