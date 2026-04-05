# Landscape Comparison Table

All significant projects across the five taxonomy buckets, with key metrics and positioning.

## Agent Memory

| Project | Stars | Primary Approach | Key Benchmark | Token Efficiency | Use When |
|---------|-------|-----------------|---------------|-----------------|----------|
| [Mem0](../projects/mem0.md) | 51,880 | Multi-level memory layer | +26% vs OpenAI Memory (LOCOMO) | 90% reduction | You need LLM-agnostic, production-ready memory with multi-level abstraction |
| [claude-mem](../projects/claude-mem.md) | 44,950 | Session persistence + compression | — | Progressive disclosure | You use Claude Code and need drop-in session memory |
| [Graphiti](../projects/graphiti.md) | 24,473 | Temporal knowledge graph | +18.5% vs MemGPT (DMR) | 90% latency reduction | You need temporal reasoning over evolving facts |
| [Letta](../projects/letta.md) | 21,873 | Agent-managed memory blocks | Outperforms stateless on long-horizon | — | You want agents to manage their own memory directly |
| [Supermemory](../projects/supermemory.md) | 20,994 | Fact extraction + temporal reasoning | #1 on LongMemEval, LoCoMo, ConvoMem | — | You need benchmark-leading memory with contradiction handling |
| [Cognee](../projects/cognee.md) | 14,899 | Vector + graph + continuous learning | — | — | You need dynamic relationship evolution with minimal setup |
| [Memori](../projects/memori.md) | 13,011 | SQL-native structured extraction | 81.95% accuracy at 4.97% tokens (LoCoMo) | 20x cost reduction | You need cost-efficient structured memory with SQL access |
| [MIRIX](../../raw/repos/mirix-ai-mirix.md) | 3,508 | 6-agent specialized memory routing | — | — | You need multi-type memory with screen-capture grounding |
| [SimpleMem](../../raw/repos/aiming-lab-simplemem.md) | 3,156 | Semantic compression + MCP | — | Lossless compression | You need multimodal lifelong memory with MCP integration |
| [HippoRAG](../projects/hipporag.md) | 3,332 | Knowledge graph + PageRank | NeurIPS'24 | Cost-efficient vs GraphRAG | You need multi-hop associative retrieval |
| [Memento](../../raw/repos/agent-on-the-fly-memento.md) | 2,375 | Case-based reasoning over trajectories | Competitive on GAIA | — | You want improvement without weight updates via trajectory replay |
| [MemAgent](../../raw/repos/bytedtsinghua-sia-memagent.md) | 975 | RL-optimized multi-turn memory | 3.5M token extrapolation | <5.5% degradation | You need extreme context length without retraining |
| [Nemori](../../raw/repos/nemori-ai-nemori.md) | 187 | Event segmentation (cognitive-inspired) | Competitive vs complex systems | — | You want human-like episodic memory boundaries |
| [Hipocampus](../../raw/repos/kevin-hs-sohn-hipocampus.md) | 145 | Compaction tree + ROOT.md index | 21x recall vs vector search | 3K token topic index | You need discoverable context without explicit search queries |

## Knowledge Bases & Retrieval

| Project | Stars | Primary Approach | Key Benchmark | Use When |
|---------|-------|-----------------|---------------|----------|
| [PageIndex](../projects/pageindex.md) | 23,899 | Reasoning-based tree indexing (no vectors) | 98.7% on FinanceBench | You need high-accuracy retrieval on structured documents |
| [Obsidian Skills](../projects/obsidian-skills.md) | 19,325 | Agent skills for Obsidian KB operations | — | You want agents to author/maintain Obsidian knowledge bases |
| [Ars Contexta](../../raw/repos/agenticnotetaking-arscontexta.md) | 2,928 | Derived cognitive architectures | — | You want individualized KB structures from research principles |
| [code-review-graph](../../raw/repos/tirth8205-code-review-graph.md) | 4,176 | Tree-sitter code graphs + blast radius | 6.8-49x token reduction | You need code-specific context with dependency awareness |
| [napkin](../../raw/repos/michaelliv-napkin.md) | 264 | BM25 on markdown (no vectors) | 91% on LongMemEval | You want simple, local-first KB without infrastructure |

## Context Engineering

| Project | Stars | Primary Approach | Compression Ratio | Use When |
|---------|-------|-----------------|-------------------|----------|
| [OpenViking](../projects/openviking.md) | 20,813 | Filesystem-paradigm context DB | L0/L1/L2 tiering | You need unified memory/resources/skills management |
| [Planning-with-Files](../../raw/repos/othmanadi-planning-with-files.md) | 17,968 | Persistent markdown state files | — | You need session continuity across context resets |
| [LLMLingua](../projects/llmlingua.md) | 5,985 | Selective token removal | Up to 20x | You need prompt compression for RAG or long-context |
| [Lossless Claw](../../raw/repos/martian-engineering-lossless-claw.md) | 3,963 | DAG-based hierarchical summarization | Lossless | You need full conversation recall without truncation |
| [Acontext](../../raw/repos/memodb-io-acontext.md) | 3,264 | Skill files as memory (SKILL.md distillation) | — | You want human-readable, portable agent learning |
| [SWE-Pruner](../../raw/repos/ayanami1314-swe-pruner.md) | 252 | Task-aware code pruning | 23-54% reduction | You need code-specific context compression |

## Agent Systems & Skills

| Project | Stars | Skill Count | Cross-Platform | Use When |
|---------|-------|------------|----------------|----------|
| [Everything Claude Code](../projects/everything-claude-code.md) | 136,116 | 156 skills, 38 agents | Multi-language | You want a comprehensive Claude agent harness |
| [Anthropic Skills](../projects/anthropic-skills.md) | 110,064 | Reference implementations | Claude-native | You want the canonical SKILL.md standard and examples |
| [gstack](../projects/gstack.md) | 63,766 | 23 specialist skills | Claude Code | You want role-based sprint workflow composition |
| [Skill Seekers](../../raw/repos/yusufkaraaslan-skill-seekers.md) | 12,269 | 17 input formats | Claude, LangChain, LlamaIndex | You need to convert docs to skills across platforms |
| [Claude Skills](../../raw/repos/alirezarezvani-claude-skills.md) | 9,216 | 248 skills, 9 domains | 11 platforms | You want cross-platform production-ready skills |
| [Orchestra Research](../../raw/repos/orchestra-research-ai-research-skills.md) | 6,111 | 87 research skills | Claude Code, Codex, Gemini | You need autonomous research workflow skills |
| [Memento-Skills](../../raw/repos/memento-teams-memento-skills.md) | 916 | 10 built-in + evolving | Multi-provider | You want deployment-time skill self-evolution |

## Self-Improving Systems

| Project | Stars | Improvement Method | Key Result | Use When |
|---------|-------|-------------------|------------|----------|
| [Autoresearch](../projects/autoresearch.md) | 65,009 | Autonomous experiment loops | 20 compounding improvements overnight | You want ML hyperparameter optimization via agent |
| [Pi-autoresearch](../../raw/repos/davebcn87-pi-autoresearch.md) | 3,393 | TypeScript autoresearch extension | Live dashboard, confidence scoring | You want productionized autoresearch with tooling |
| [GEPA](../projects/gepa.md) | 3,157 | Genetic-Pareto optimization | 35x faster than RL, 55%→82% on coding | You need multi-objective prompt/code optimization |
| [Uditgoenka Autoresearch](../../raw/repos/uditgoenka-autoresearch.md) | 3,142 | Claude Code skill pattern | Git as episodic memory | You want autoresearch as a reusable skill |
| [Kayba ACE](../../raw/repos/kayba-ai-agentic-context-engine.md) | 2,112 | Persistent Skillbook from traces | 2x consistency improvement | You want agents to learn from execution traces |
| [ADAS](../../raw/repos/shengranhu-adas.md) | 1,551 | Meta Agent Search (architecture evolution) | ICLR 2025 | You want automated agent architecture discovery |
| [Awesome Autoresearch](../../raw/repos/alvinreal-awesome-autoresearch.md) | 1,169 | Curated index of 40+ systems | — | You want to survey the autoresearch ecosystem |
| [Autocontext](../../raw/repos/greyhaven-ai-autocontext.md) | 695 | Multi-agent loop + playbook distillation | Frontier-to-local distillation | You want to distill agent strategies into cheaper models |
| [Self-Improving Coding Agent](../../raw/repos/maximerobeyns-self-improving-coding-agent.md) | 299 | Benchmark-driven self-modification | ICLR workshop | You want agents that modify their own codebase |
| [GOAL.md](../../raw/repos/jmilinovich-goal-md.md) | 112 | Constructed metrics for any domain | 47→83 routing confidence | You need autoresearch for domains without natural metrics |
| [CORAL](../../raw/repos/human-agent-society-coral.md) | 120 | Multi-agent shared KB + leaderboard | Zero-sync overhead | You want multi-agent collaborative self-improvement |
| [Darwin Godel Machine](../projects/darwin-godel-machine.md) | — | Self-modifying agent code | SWE-bench 20%→50% | You want open-ended agent architecture evolution |
