# Markdown-Compiled Wikis

> A markdown-compiled wiki is a knowledge system where raw documents are transformed into linked `.md` pages that an agent can read, update, lint, and extend over time instead of querying the raw corpus directly every time.

## Why It Matters

This concept matters because it changes the unit of work. In a conventional RAG system, the main artifact is an embedding index plus retrieved chunks. In a markdown-compiled wiki, the main artifact is a maintained knowledge layer. That gives builders something they can inspect with normal tools, diff in git, repair by hand, and feed back into future runs. [Karpathy](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [DataChaz](../../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)

The approach is especially attractive for small and medium corpora where human legibility matters as much as retrieval quality. A file tree with indexes, summary pages, and project cards is often easier to maintain than a heavier retrieval stack built too early. That is why the pattern spread so quickly after Karpathy’s tweet: it feels like a practical default for builders who want compounding knowledge without first standing up a full data platform. [Karpathy](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Himanshu](../../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)

## How It Works

The pattern usually has four stages.

1. Collect raw sources in a stable format, often markdown with metadata frontmatter.
2. Compile those sources into higher-level pages: syntheses, indexes, timelines, project cards, and concept explainers.
3. Query and navigate the compiled layer first, only falling back to raw sources when detail or verification is needed.
4. Feed useful outputs back into the wiki so the system’s future answers start from a better artifact layer.

This matters because the compilation step is not just summarization. It is a structural transform. The agent turns a pile of documents into a navigable information architecture with explicit links, scopes, and abstractions. That makes later reasoning cheaper and more stable. [Karpathy](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Mei et al.](../../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

The best versions also add maintenance loops. Karpathy describes health checks and wiki linting. Jumperz adds a blind review gate between generation and persistence, which is important because once the wiki becomes durable, bad edits can compound too. The pattern gets stronger when write access is paired with validation. [Karpathy](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Jumperz](../../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

## Who Implements It

- [Napkin](../projects/napkin.md) uses markdown as the live memory substrate and relies on BM25 plus progressive reveal instead of vector-first retrieval. [Napkin](../../raw/repos/michaelliv-napkin.md)
- [Ars Contexta](../projects/ars-contexta.md) treats the structure of the notes vault as part of the knowledge design problem, not a generic wrapper around arbitrary content. [Ars Contexta](../../raw/repos/agenticnotetaking-arscontexta.md)
- [planning-with-files](../projects/planning-with-files.md) applies the same file-first logic to durable working memory for coding agents. [planning-with-files](../../raw/repos/othmanadi-planning-with-files.md)
- [Skill Seekers](../projects/skill-seekers.md) extends the idea into packaging: one cleaned corpus can be exported into multiple agent-facing output formats. [Skill Seekers](../../raw/repos/yusufkaraaslan-skill-seekers.md)

## Open Questions

- Where is the break point where markdown compilation stops being simpler than graph-backed or database-backed retrieval? [Karpathy](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Han et al.](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- How much of the wiki structure should be authored by humans versus inferred automatically by agents? [Ars Contexta](../../raw/repos/agenticnotetaking-arscontexta.md)
- What is the right review policy before an agent can persist new knowledge into a long-lived wiki? [Jumperz](../../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

## Sources

- [Karpathy knowledge-base tweet](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)
- [DataChaz response](../../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)
- [Himanshu architecture thread](../../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)
- [Jumperz review-gated variant](../../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)
- [Napkin repo](../../raw/repos/michaelliv-napkin.md)
- [Ars Contexta repo](../../raw/repos/agenticnotetaking-arscontexta.md)
- [planning-with-files repo](../../raw/repos/othmanadi-planning-with-files.md)
- [Skill Seekers repo](../../raw/repos/yusufkaraaslan-skill-seekers.md)
- [Context engineering survey](../../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)
