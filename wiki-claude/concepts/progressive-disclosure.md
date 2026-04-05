# Progressive Disclosure for Agent Context

> A context management strategy where agents load only lightweight metadata initially and drill into full content on demand. Instead of stuffing everything into context at once, information is organized into tiers -- from abstract summaries (~100 tokens) through overviews (~2K tokens) to full detail (~20K tokens) -- with the agent deciding when to go deeper based on relevance to the current task.

## Why It Matters

Context windows are finite and attention degrades with length. Every token loaded into context competes for the model's attention budget. The naive approach -- dump everything into the prompt -- fails in three predictable ways: token costs explode, latency increases, and the model loses the ability to focus on what matters. Studies show that models pay less attention to information buried in the middle of long contexts, with accuracy dropping 20+ percentage points when critical information sits mid-context.

Progressive disclosure solves this by making context loading proportional to need. An agent working on authentication does not need to load the full database schema, deployment runbook, and API reference into context simultaneously. It needs to know they exist (metadata), understand their relevance (overview), and load specific sections (detail) only when the task requires them. This keeps the context window lean and focused while maintaining access to deep information.

The pattern applies at multiple levels: skill loading (read SKILL.md frontmatter before the body), memory retrieval (scan a topic index before drilling into specific entries), document navigation (read a table of contents before loading chapters), and knowledge base queries (check an abstract before fetching the full article).

## How It Works

The canonical implementation uses a tiered structure, typically three levels:

**Level 0 -- Abstract (~100 tokens).** A one-sentence summary of what this resource is and when it is relevant. Enough for the agent to decide whether to investigate further. In OpenViking, this is the `.abstract` file in each directory. In napkin, this is `NAPKIN.md`. In Hipocampus, this is `ROOT.md`.

**Level 1 -- Overview (~1-2K tokens).** Core information and usage scenarios. Enough for planning-phase decision-making. OpenViking stores this as `.overview` files. napkin generates this via `napkin overview` which includes a vault map with TF-IDF keywords. Hipocampus surfaces this through its Topics Index with type and age metadata.

**Level 2 -- Full Detail (~5-20K tokens).** The complete content, loaded only when the agent needs to act on it. This is the actual file content, retrieved via `napkin read`, `ov find`, or tree traversal.

The loading decision is typically autonomous. The agent reads the L0 abstract, decides if it is relevant, loads the L1 overview to understand structure, and only loads L2 when it needs to execute. This mirrors how experienced developers navigate codebases: they scan directory names, read READMEs, and only open specific files when they need to edit them.

For agent skills specifically, progressive disclosure means loading only the YAML frontmatter (name and description) until the skill is activated. The agent knows what skills are available from metadata alone and loads the full instruction body only when it decides to use a skill. This prevents context-window bloat from unused skill definitions.

## Who Implements It

- [Anthropic Skills](../projects/anthropic-skills.md) -- SKILL.md files with YAML frontmatter (name, description) loaded as metadata; full skill body loaded only on activation. The canonical implementation of skill-level progressive disclosure.
- [Hipocampus](../../raw/repos/kevin-hs-sohn-hipocampus.md) -- ROOT.md as a ~3K token topic index that compresses entire conversation history into a scannable overview; 3-step selective recall (ROOT.md triage, manifest-based LLM selection, hybrid search). Achieves 21x better performance than no memory on implicit context questions.
- [OpenViking](../projects/openviking.md) -- L0/L1/L2 three-tier context loading through a filesystem paradigm; each directory gets `.abstract` and `.overview` files auto-generated on write. Directory recursive retrieval locks high-score directory first, then refines content.
- [napkin](../../raw/repos/michaelliv-napkin.md) -- four-level progressive disclosure from NAPKIN.md (~200 tokens) through overview (~1-2K) through search results (~2-5K) to full file content (~5-20K). BM25 search on markdown files matches RAG systems without embeddings.

## Open Questions

- What is the optimal number of tiers? Most implementations use 3 (abstract/overview/detail), but some tasks might benefit from more granular levels (e.g., section-level summaries between overview and full content).
- How should the abstraction quality be maintained as the underlying content changes? If the L2 detail is updated, the L0 and L1 summaries may become stale. OpenViking auto-generates tiers on write, but edit-in-place workflows need a different approach.
- Can the agent learn to predict which resources it will need before the task begins, pre-loading the right L1 overviews? Current implementations are reactive (load on demand), but proactive loading could reduce latency.
- How does progressive disclosure interact with multi-agent architectures? If a sub-agent needs deep context that the orchestrator only loaded at L0, how is the handoff managed without redundant loading?

## Sources

- [Google Cloud Community -- Skills Discovery Agent](../../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md) -- "Agent Skills use progressive disclosure, where the agent only reads into memory the skills metadata (name and description) until it actually needs to activate the logic"
- [Hipocampus](../../raw/repos/kevin-hs-sohn-hipocampus.md) -- "ROOT.md has four sections: Active Context, Recent Patterns, Historical Summary, Topics Index. Each topic carries a type and age -- so the agent knows not just what it knows, but what kind of information it is and how fresh it is"
- [OpenViking](../../raw/repos/volcengine-openviking.md) -- "L0 (Abstract): a one-sentence summary for quick retrieval. L1 (Overview): contains core information for Agent decision-making. L2 (Details): the full original data, for deep reading when absolutely necessary"
