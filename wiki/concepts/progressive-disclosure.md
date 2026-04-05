---
entity_id: progressive-disclosure
type: concept
bucket: context-engineering
sources:
  - repos/michaelliv-napkin.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
related:
  - Context Engineering
  - Context Bloat
last_compiled: '2026-04-04T21:22:07.900Z'
---
# Progressive Disclosure

**Type:** Context Management Strategy
**Bucket:** [Context Engineering](../concepts/context-engineering.md)
**Related:** [Context Bloat](../concepts/context-bloat.md)

---

## What It Is

Progressive disclosure is a context management strategy where information is revealed to an agent incrementally, based on demonstrated relevance or explicit need—rather than front-loading everything that *might* be useful. The agent receives summaries or metadata first; full content loads only when actually required.

The term borrows from UX design, where complex interfaces reveal advanced options only when users need them. Applied to agents, the same principle reduces noise and token expenditure without sacrificing capability.

---

## Why It Matters

LLM context windows are finite and expensive. More importantly, larger contexts don't linearly improve performance—irrelevant content can degrade reasoning quality and increase cost. [Context bloat](../concepts/context-bloat.md) is the failure mode progressive disclosure directly counters: agents drowning in information that wasn't needed for the current task.

As agent workflows grow more complex—multi-step, multi-tool, long-running—naive approaches that dump all available knowledge into context become unsustainable. Progressive disclosure is the architectural response.

---

## How It Works

The core pattern has two stages:

1. **Metadata/summary layer:** The agent receives lightweight representations—titles, descriptions, abstracts, or BM25 search results—enough to reason about *what exists* and *whether it's relevant*.
2. **Full content on demand:** When relevance is confirmed (by the agent's reasoning, a tool call, or an explicit retrieval step), the full content loads into context.

**Concrete example — skill loading:**
An agent managing dozens of capabilities doesn't load every skill's full implementation upfront. It holds a registry of `{name, description}` pairs. When a task requires authentication, it activates the auth skill and loads its full logic. Inactive skills never consume context tokens. [Source](../../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

**Concrete example — knowledge retrieval:**
The `napkin` project implements this via BM25 search over markdown files. An agent queries `napkin search "authentication"` and receives matching document titles and snippets. Only when it calls `napkin read "Architecture"` does the full document enter context. This matches or exceeds vector RAG performance while eliminating embedding infrastructure. [Source](../../raw/repos/michaelliv-napkin.md)

---

## Relationship to RAG

Progressive disclosure and [Retrieval-Augmented Generation (RAG)](../concepts/rag.md) are related but not identical. RAG retrieves relevant chunks reactively; progressive disclosure is a broader architectural principle that includes:

- Staged skill/tool loading
- Summarization before detail
- Lazy expansion of nested structures

RAG can *implement* progressive disclosure, but progressive disclosure doesn't require embeddings or vector databases. BM25 over flat files can achieve the same staged-relevance pattern with lower infrastructure overhead.

---

## Who Implements It

- **napkin** (knowledge system for agents): BM25 search + markdown files, explicitly described as "progressively disclosed" [Source](../../raw/repos/michaelliv-napkin.md)
- **Agent Skills pattern** (described in Google Cloud community writing): skills registry loads metadata only until activation [Source](../../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)
- Common in multi-agent frameworks that support tool/skill registries (LangChain, LlamaIndex, custom orchestrators)

---

## Practical Implications

| Concern | Naive Approach | With Progressive Disclosure |
|---|---|---|
| Token usage | Load everything upfront | Pay only for what's activated |
| Context quality | Diluted with irrelevant material | Focused on task-relevant content |
| Infrastructure | Often requires vector DB | Can work with BM25/keyword search |
| Debuggability | Hard to trace what influenced outputs | Clear activation trail |

---

## Limitations and Honest Caveats

- **Retrieval errors compound.** If the metadata layer fails to surface a relevant item, the agent never sees the full content. Garbage-in at the summary level means the full detail never gets loaded.
- **Latency overhead.** Multi-stage retrieval adds round-trips. For short tasks, upfront loading may be faster and simpler.
- **Requires good metadata.** The pattern only works if summaries and descriptions are accurate and maintained. Stale or vague metadata defeats the purpose.
- **Not a silver bullet for context bloat.** If most information genuinely is relevant to a task, progressive disclosure provides little benefit and adds complexity.

---

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — the broader discipline this pattern lives within
- [Context Bloat](../concepts/context-bloat.md) — the failure mode this pattern addresses
- [RAG](../concepts/rag.md) — a retrieval approach that can implement progressive disclosure
