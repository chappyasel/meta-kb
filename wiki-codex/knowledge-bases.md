# The State of LLM Knowledge Bases

> The center of gravity has shifted from “retrieve better chunks” to “maintain better artifacts.” The most interesting systems in 2026 do not just fetch context; they compile, compress, graph, relink, and continuously repair a knowledge substrate that agents can inspect and extend. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Mei et al.](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

The field now splits into three practical camps. One camp treats the knowledge base as a compiled markdown wiki that an LLM can read, rewrite, lint, and extend. Another treats it as a retrieval system, but with heavier structure than “embed chunks and hope”: graphs, trees, rerankers, and compression layers. The third treats the knowledge base as a packaging layer that turns messy documentation into portable assets for agents, skills, and downstream runtimes. The common move is away from opaque context stuffing and toward inspectable intermediate artifacts. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Edge et al.](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md) [Skill Seekers](projects/skill-seekers.md)

## Approach Categories

### Compiled Markdown Wikis

The most important idea in this bucket is the Karpathy pattern: collect raw source documents, compile them into a linked markdown wiki, ask questions against the compiled layer, then file outputs back into the wiki so future work compounds. The attractive part is not just cost. It is inspectability. Builders can see what the system “knows,” fix the structure directly, run health checks, and let the agent maintain indexes and summaries instead of standing up a heavyweight retrieval stack too early. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [DataChaz](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md) [Himanshu](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)

This local-first, file-first direction shows up in smaller but sharper projects too. [Napkin](projects/napkin.md) uses BM25 over markdown plus progressive disclosure instead of embeddings, explicitly betting that well-structured files beat vector approximation for many long-memory tasks. [Ars Contexta](projects/ars-contexta.md) pushes in the same direction from the authoring side: derive the vault structure, notes, and hooks from the domain rather than dropping a generic template into every project. Both systems make a strong claim: the shape of the filesystem is part of the retrieval algorithm. [Napkin](../raw/repos/michaelliv-napkin.md) [Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md)

The tradeoff is scale discipline. Markdown wikis are strongest when the corpus is still small enough for agents to navigate with summaries, indexes, and deliberate search. They get weaker when builders expect them to replace every form of retrieval, entity normalization, or temporal reasoning. Karpathy explicitly frames the pattern as good at small-to-medium scales, not as a universal replacement for every knowledge problem. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

### Retrieval Engines With More Structure

Classic RAG is no longer the interesting baseline. The interesting question is which extra structure you add. [GraphRAG](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md) adds entity graphs and community summaries so systems can answer global “what are the themes here?” questions that flat chunk retrieval handles badly. [HippoRAG](projects/hipporag.md) makes a similar move toward associative, multi-hop recall, while [Cognee](projects/cognee.md) combines vector retrieval with graph structure and continuous learning. These systems exist because many knowledge tasks are not lookup tasks; they are synthesis tasks. [Edge et al.](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md) [HippoRAG](../raw/repos/osu-nlp-group-hipporag.md) [Cognee](../raw/repos/topoteretes-cognee.md)

At the same time, the field has become more skeptical of default vector search. [PageIndex](projects/pageindex.md) argues for reasoning over hierarchical document trees instead of embedding similarity. [Napkin](projects/napkin.md) argues that BM25 plus layered reveal is often enough. [Han et al.](../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) make the key benchmarking point: flat RAG still wins many direct lookup tasks, while graph-shaped systems start paying off when queries demand multi-hop synthesis or corpus-level summarization. There is no universal winner; query structure determines architecture. [PageIndex](../raw/repos/vectifyai-pageindex.md) [Napkin](../raw/repos/michaelliv-napkin.md) [Han et al.](../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

Compression has become part of the retrieval story too. [LLMLingua](projects/llmlingua.md) and follow-on compression work treat the prompt itself as something to optimize, not just the retriever. That matters because even a good retrieval layer fails if the final context assembly is bloated. Microsoft reports up to 20x prompt compression with minimal loss, while LongLLMLingua is aimed directly at RAG cost and “lost in the middle” degradation. [LLMLingua](../raw/repos/microsoft-llmlingua.md)

### Knowledge Packaging And Export Layers

The third approach does not start from retrieval. It starts from operationalization. [Skill Seekers](projects/skill-seekers.md) turns docs, repos, PDFs, notebooks, and other source types into portable outputs for Claude skills, Cursor rules, LangChain docs, LlamaIndex nodes, MCP servers, and plain markdown. The insight is boring but powerful: many “knowledge base” projects are really preprocessing problems. If the same cleaned corpus can feed multiple agent surfaces, the highest-leverage move is a universal preparation layer. [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)

[AI-Research-SKILLs](projects/ai-research-skills.md) applies that same logic to research workflows: package expertise into a registry instead of repeatedly rediscovering it in prompts. [Obsidian Skills](projects/obsidian-skills.md) does it inside a personal knowledge environment. These are not replacements for retrieval engines, but they do solve a separate pain point: getting knowledge into a portable, composable, agent-usable form in the first place. [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md) [Obsidian Skills](../raw/repos/kepano-obsidian-skills.md)

## Failure Modes That Keep Recurring

The most common failure in this bucket is confusing ingestion with understanding. A system can ingest thousands of files, produce embeddings, and still fail at the actual questions people ask because those questions are often synthesis questions. The GraphRAG literature is useful precisely because it makes that gap visible: direct retrieval can look strong on lookup tasks while still failing on “what are the main themes?” or “how do these ideas connect?” queries. This is also why so many builders are moving toward compiled summaries, graph structure, or hierarchy-aware indexes. [Edge et al.](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md) [Han et al.](../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

The second failure mode is wiki rot. Markdown-first systems only stay good if the compiled layer remains curated. Karpathy’s original pattern assumes health checks, linting, and repair. Jumperz’s follow-on architecture makes the hidden requirement explicit by inserting a review gate between generation and persistence. Without that gate, compiled wikis can become pleasant-looking misinformation layers that accumulate stale assumptions faster than anyone notices. The ease of editing is the strength of the pattern and also its main risk. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Jumperz](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

The third failure mode is export sprawl. Packaging layers like [Skill Seekers](projects/skill-seekers.md) are high leverage because one cleaned corpus can feed multiple runtimes. But that only works if there is still a clear source of truth. Once a team starts generating MCP docs, skill packs, markdown notes, agent rules, and vector indexes from the same corpus, it needs a disciplined build graph or the outputs drift. Knowledge packaging is becoming a software supply chain problem, not just a scraping problem. [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md) [Agent Skills overview](../raw/articles/agent-skills-overview.md)

## Practical Build Order

One useful synthesis from the corpus is that teams should not start with the most complex retrieval system they can imagine. A better sequence is usually:

1. Start with a compiled markdown or note-based layer that exposes the corpus in an inspectable form. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md)
2. Add hierarchy, search discipline, and summary indexes before adding more infrastructure. [Napkin](../raw/repos/michaelliv-napkin.md) [PageIndex](../raw/repos/vectifyai-pageindex.md)
3. Add graph structure only when your questions genuinely require temporal or multi-hop synthesis. [Graphiti](../raw/repos/getzep-graphiti.md) [HippoRAG](../raw/repos/osu-nlp-group-hipporag.md)
4. Add packaging and export layers once the corpus is stable enough to serve multiple agent surfaces. [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)

That is not a law, but it is the build order most consistent with the corpus. The field is quietly learning that premature retrieval sophistication creates just as much debt as premature distributed systems. A smaller, cleaner artifact layer often wins longer than people expect. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md)

## The Convergence

The big convergence is toward inspectable structure. Files, graphs, indexes, summaries, workflow manifests, and skill packages are all attempts to give agents artifacts they can reason over and update. Even projects that disagree on storage still agree on one thing: raw source text should not be the only interface. Knowledge bases now look more like build systems than document dumps. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Graphiti](projects/graphiti.md) [Skill Seekers](projects/skill-seekers.md)

The second convergence is toward progressive disclosure. Systems are increasingly designed so the agent sees a compact index first and full detail only after narrowing the search. That shows up in markdown-first systems like [Napkin](projects/napkin.md), filesystem hierarchies like [OpenViking](projects/openviking.md), and compression layers like [LLMLingua](projects/llmlingua.md). The field is learning the same lesson from different angles: better context usually means less context, but better chosen. [Napkin](../raw/repos/michaelliv-napkin.md) [OpenViking](../raw/repos/volcengine-openviking.md) [LLMLingua](../raw/repos/microsoft-llmlingua.md)

## The Divergence

The sharpest disagreement is between systems that optimize for human legibility and systems that optimize for machine retrieval geometry. Markdown-wiki builders want artifacts humans can edit and audit. Graph-heavy systems want entities, relations, and temporal edges that answer harder questions. Packaging systems want transformed assets that travel across platforms. These are not cosmetic differences. They reflect three different beliefs about where knowledge system failures actually come from: bad curation, bad retrieval structure, or bad ingestion pipelines. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Edge et al.](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md) [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)

There is also a meaningful split on whether vector search is still the default. [PageIndex](projects/pageindex.md), [Napkin](projects/napkin.md), and the Karpathy-style wiki camp are all effectively anti-default-vector-search. By contrast, systems like [Cognee](projects/cognee.md) and [Graphiti](projects/graphiti.md) still use embeddings or hybrid retrieval, but with much more structural help than first-generation RAG stacks. [PageIndex](../raw/repos/vectifyai-pageindex.md) [Napkin](../raw/repos/michaelliv-napkin.md) [Cognee](../raw/repos/topoteretes-cognee.md) [Graphiti](../raw/repos/getzep-graphiti.md)

## What's Hot Now

The strongest momentum signal is still the Karpathy wiki pattern. The canonical tweet reached 38,638 likes, 4,249 retweets, and 9.95M views, and spawned rapid follow-on architecture diagrams, summaries, and swarm variants. That is not normal engagement for a storage pattern. It signals that builders see markdown-compiled knowledge as a real alternative to premature retrieval complexity. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Himanshu](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md) [Jumperz](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

On the project side, [Graphiti](projects/graphiti.md) has 24,473 stars, [PageIndex](projects/pageindex.md) 23,899, [Supermemory](projects/supermemory.md) 20,994, [OpenViking](projects/openviking.md) 20,813, [HippoRAG](projects/hipporag.md) 3,332, and [Cognee](projects/cognee.md) 14,899. The mix matters. The field is not converging on one storage model; it is rewarding multiple structured alternatives at once. [Graphiti](../raw/repos/getzep-graphiti.md) [PageIndex](../raw/repos/vectifyai-pageindex.md) [Supermemory](../raw/repos/supermemoryai-supermemory.md) [OpenViking](../raw/repos/volcengine-openviking.md) [HippoRAG](../raw/repos/osu-nlp-group-hipporag.md) [Cognee](../raw/repos/topoteretes-cognee.md)

The quieter but important trend is universal packaging. [Skill Seekers](projects/skill-seekers.md) has over 12k stars and pushes the idea that one cleaned corpus should export everywhere. That is a strong sign that builders are exhausted by rewriting the same knowledge into each agent framework separately. [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)

## Why This Is Happening Now

Two forces are colliding. The first is that context windows got large enough to make sloppy storage feel temporarily acceptable, then failed to remove the need for structure. The second is that agents became useful enough that teams now care about what knowledge persists between runs. Those two pressures make the old “just vectorize it” answer feel incomplete. Builders want knowledge systems that can be read, repaired, and repurposed, not just queried. [Mei et al.](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

That is why this bucket increasingly overlaps with memory, context engineering, and skills. A good knowledge base is no longer just a corpus store. It is the durable substrate that feeds the rest of the stack. The more agents become operational systems, the more knowledge infrastructure starts to look like software infrastructure. [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md) [Anthropic](../raw/articles/effective-context-engineering-for-ai-agents.md)

The systems getting the most attention are the ones that make this substrate visible. They let builders see the intermediate artifact, not just trust that retrieval found something plausible. That preference for inspectable intermediate state is one of the clearest macro-patterns in the entire corpus. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## Where It's Going

The near-term future is hybrid. Expect more systems that keep human-readable markdown or notes as the editable source of truth while also deriving graph, index, or routing artifacts for harder retrieval. That is the most plausible synthesis of the current camps: inspectable authoring plus machine-friendly structure. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Edge et al.](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md) [Graphiti](../raw/repos/getzep-graphiti.md)

The more ambitious direction is self-healing knowledge infrastructure. Karpathy’s linting loop, [Jumperz](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)’s blind review gate, and packaging layers like [Skill Seekers](projects/skill-seekers.md) all point the same way: compiled knowledge bases will not be static repositories. They will be continuously graded, repaired, merged, and republished by agents. The real moat will be the maintenance loop, not the initial ingestion pipeline. [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Jumperz](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)

## Open Questions

- When does a markdown-compiled wiki stop being cheaper and simpler than a graph-backed retrieval system? [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Han et al.](../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- How much structure should be derived automatically versus authored explicitly by humans? [Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md) [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)
- Can self-healing maintenance loops stay trustworthy once the knowledge base becomes large enough that review itself must be delegated? [Jumperz](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

## Sources

### Tweets

- [Karpathy](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)
- [DataChaz](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)
- [Himanshu](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)
- [Jumperz](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

### Papers

- [From Local to Global: A Graph RAG Approach to Query-Focused Summarization](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)
- [RAG vs. GraphRAG: A Systematic Evaluation and Key Insights](../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- [A Survey of Context Engineering for Large Language Models](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

### Repos and Articles

- [Napkin](../raw/repos/michaelliv-napkin.md)
- [PageIndex](../raw/repos/vectifyai-pageindex.md)
- [Cognee](../raw/repos/topoteretes-cognee.md)
- [Graphiti](../raw/repos/getzep-graphiti.md)
- [HippoRAG](../raw/repos/osu-nlp-group-hipporag.md)
- [OpenViking](../raw/repos/volcengine-openviking.md)
- [LLMLingua](../raw/repos/microsoft-llmlingua.md)
- [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)
- [Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md)
- [AI agent skills overview](../raw/articles/agent-skills-overview.md)
