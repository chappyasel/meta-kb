# What's Missing

Gaps in this knowledge base — topics, projects, and questions that aren't adequately covered by the current 101 sources.

## Under-Represented Topics

### Multi-Agent Knowledge Sharing
Most sources focus on single-agent memory and context. The challenge of merging, synchronizing, and deduplicating knowledge across multiple agents working on the same project is barely addressed. [CORAL](../../raw/repos/human-agent-society-coral.md) and [Open Brain](../../raw/repos/natebjones-projects-ob1.md) are exceptions, but neither covers conflict resolution, consistency guarantees, or memory merging at scale.

### Enterprise Integration
Nearly all projects are developer tools or research prototypes. Integration with enterprise knowledge management systems (Confluence, SharePoint, Notion, Google Drive), compliance frameworks (SOC2, HIPAA, GDPR data handling for agent memory), and existing CI/CD pipelines is missing. The Google Cloud article on [skills discovery](../../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md) is the closest, but it's a proof-of-concept.

### Evaluation Standardization
Memory systems have LoCoMo, LongMemEval, and ConvoMem. Coding has SWE-bench. But there are no standard benchmarks for:
- Knowledge base compilation quality (accuracy, completeness, coherence)
- Context engineering effectiveness (optimal context utilization ratio)
- Skill composition robustness (multi-skill interaction bugs)
- Self-improvement safety (reward hacking detection rate)

### Multi-Modal Knowledge Bases
Most sources focus on text. Multi-modal knowledge bases that integrate images, diagrams, video, and audio are barely covered. [SimpleMem](../../raw/repos/aiming-lab-simplemem.md) mentions multimodal support, and [MIRIX](../../raw/repos/mirix-ai-mirix.md) does screen capture, but comprehensive multi-modal KB architecture is absent.

### Cost Engineering
Token costs, infrastructure costs, and the economics of different memory/retrieval approaches are rarely compared apples-to-apples. [Memori](../../raw/repos/memorilabs-memori.md) claims 20x cost reduction. [Cameron Westland](../../raw/articles/cameron-westland-autoresearch-is-reward-function-design.md) reports $24 for 49 experiments. But systematic cost comparisons across approaches are missing.

## Under-Represented Projects

### Memory Systems
- **LangMem** — LangChain's memory module (mentioned in taxonomy, no dedicated source)
- **MemWalker** — Memory navigation for long-context (academic, not covered)
- **ReadAgent** — Google's gist-based long-context reader (academic, not covered)

### Knowledge Bases
- **NotebookLM** — Google's notebook-based knowledge system (mentioned in taxonomy, no source)
- **Obsidian community plugins** for agent integration beyond kepano's official skills
- **Cursor/Windsurf context management** — how competing coding agents handle context

### Self-Improving
- **AlphaEvolve** — Google's program evolution system (mentioned in mem-agent article, no dedicated source)
- **DynaSaur** — Dynamic program library evolution (mentioned, not covered)
- **Sakana AI's AI Scientist** — Autonomous research paper writing

### Agent Frameworks
- **CrewAI, AutoGen, LangGraph** — Major agent frameworks with memory/skill features
- **OpenAI Agents SDK** — Competing agent standard
- **Google ADK** — Agent Development Kit (briefly mentioned)

## Open Research Questions Not Addressed

1. **Optimal forgetting policies** — When should memory be pruned vs. archived vs. compressed? No source addresses this systematically.
2. **Memory adversarial robustness** — Can users inject false memories to manipulate agent behavior? No source covers adversarial memory attacks.
3. **Cross-model skill portability** — How much do skills degrade when the underlying model changes? The 26.1% vulnerability finding hints at this but doesn't measure it.
4. **Long-term self-improvement stability** — Do autoresearch loops converge to local optima? How do you inject diversity? The [reward hacking](../../raw/articles/lil-log-reward-hacking-in-reinforcement-learning.md) article frames the concern but no source offers solutions specific to LLM self-improvement.
5. **Organizational context encoding** — How do you capture institutional knowledge, decision traces, and organizational judgment in machine-readable form? [akoratana's tweet](../../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md) frames the vision but no source demonstrates implementation.
