---
entity_id: marp
type: project
bucket: knowledge-substrate
abstract: >-
  MARP (Markdown Presentation Ecosystem) converts Markdown files to slide decks
  via a directive-based syntax; its key differentiator is native integration
  with Obsidian and LLM-driven knowledge workflows as a structured output
  format.
sources:
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
related:
  - andrej-karpathy
  - obsidian
  - synthetic-data-generation
  - zettelkasten
  - markdown-wiki
last_compiled: '2026-04-08T23:22:08.843Z'
---
# MARP: Markdown Presentation Ecosystem

## What It Does

MARP converts Markdown files into presentation slides. You write standard Markdown with MARP-specific directives (slide separators, themes, layout hints) and the tool outputs HTML, PDF, or PPTX. The core value proposition: presentations live as plain text files, version-controllable alongside the knowledge they summarize.

In LLM-driven knowledge workflows, MARP serves a specific role as an output rendering format rather than an authoring tool. An LLM generates `.md` files in MARP format; [Obsidian](../projects/obsidian.md) renders them via the Marp for VS Code or equivalent plugin. The human never opens a slide editor.

## Core Mechanism

MARP uses a spec called Marpit. A horizontal rule (`---`) separates slides. Front matter controls global settings:

```markdown
---
marp: true
theme: default
paginate: true
---

# Slide One

Content here

---

# Slide Two
```

Directives inside slides control local behavior: `<!-- _class: lead -->` for styling, `<!-- backgroundColor: #fff -->` for per-slide overrides. The CLI (`@marp-team/marp-cli`) wraps Marpit and handles export. The VS Code extension (`marp-vscode`) provides live preview.

Key files in the ecosystem:
- `@marp-team/marpit` — the core framework (slide splitting, theming engine)
- `@marp-team/marp-core` — extends Marpit with built-in themes and math support
- `@marp-team/marp-cli` — CLI wrapper supporting Puppeteer-based PDF/PPTX export

Theme customization happens via CSS with Marpit's scoped selector system. Custom themes load via `--theme` flag or VS Code settings pointing to a `.css` file.

## Role in LLM Knowledge Workflows

[Andrej Karpathy](../concepts/andrej-karpathy.md) describes MARP as one output format in a pipeline where an LLM maintains a [Markdown Wiki](../concepts/markdown-wiki.md). The workflow: raw sources go into `raw/`, an LLM compiles them into wiki `.md` files in [Obsidian](../projects/obsidian.md), and when a query warrants a visual summary, the LLM renders results as a MARP slide deck rather than a terminal response. Those slide files get filed back into the wiki, compounding over time. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

The structural reason MARP fits here: LLMs produce syntactically valid MARP on first attempt without special prompting. The format is close enough to plain Markdown that hallucinating invalid syntax is rare. A linting loop (checking for unclosed directives, missing separators) can validate output automatically. This contrasts with PowerPoint XML or Jupyter notebooks, which require format-specific generation logic.

MARP slides as a knowledge output format also work with [Zettelkasten](../concepts/zettelkasten.md)-style filing: each deck becomes a node in the wiki, linked from concept articles as a "visual summary" backlink. [Source](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)

## Key Numbers

- GitHub: `marp-team/marp` has ~16K stars (as of mid-2025), `marp-team/marp-cli` ~6K stars — independently verifiable from GitHub
- `marp-vscode` extension: ~1.5M installs on VS Code Marketplace — self-reported by marketplace metrics
- No published benchmarks for rendering speed or LLM output validity rates; performance claims are anecdotal

## Strengths

**LLM output compatibility.** MARP's syntax is a strict superset of Markdown. LLMs trained on Markdown naturally produce valid MARP with minimal prompting. No schema enforcement or output parsers needed.

**Plain-text portability.** Slide decks live as `.md` files in git repositories, making them diffable, searchable, and indexable by the same LLM agents that maintain the surrounding wiki.

**Obsidian integration.** The MARP for VS Code extension principle extends to Obsidian via community plugins, letting the same IDE used for wiki editing render slides without switching tools.

**Zero vendor lock-in.** Export targets (HTML, PDF, PPTX) cover most distribution needs. The source file stays readable Markdown regardless.

## Critical Limitations

**Concrete failure mode — complex layouts.** MARP's layout system handles two-column slides, image positioning, and background control through CSS directives. When an LLM generates MARP for complex layouts (side-by-side comparisons, overlapping elements), it frequently produces visually broken output because the Marpit CSS scoping rules are non-obvious. The LLM knows Markdown well; it does not know Marpit CSS well. Human review is required for any deck beyond bullet-point slides.

**Unspoken infrastructure assumption.** PDF and PPTX export require Puppeteer (headless Chrome). In containerized or server-side agent environments, Puppeteer dependencies (Chrome binaries, font packages) frequently fail silently or require explicit `--allow-local-files` flags and non-default Chromium paths. HTML export works without Puppeteer; PDF does not. Pipelines that assume PDF output will break in restricted environments without explicit dependency management.

## When NOT to Use It

Skip MARP when the output requires rich interactivity (animations, embedded video, live data), when your audience expects PowerPoint-native features (presenter view with notes across corporate environments varies), or when your knowledge base exceeds the scale where human review of LLM-generated slides becomes a bottleneck. At ~400K words and 100 articles, Karpathy's cited scale, MARP output is spot-checked not verified. For regulated or client-facing contexts where slide accuracy matters, the lack of validation beyond syntax checking is a real risk.

MARP is also wrong for teams without Markdown-native workflows. The format's advantages dissolve when collaborators expect Google Slides or PowerPoint for editing.

## Unresolved Questions

**Conflict resolution in wiki filing.** When an LLM generates a MARP deck and files it back into the wiki, and a later query generates a conflicting deck on the same topic, there is no documented resolution strategy. The Karpathy workflow describes filing outputs back "to enhance" the wiki but does not specify whether old decks get overwritten, versioned, or merged.

**Scale ceiling for the no-RAG approach.** Karpathy notes the LLM handles Q&A well at ~100 articles and ~400K words without [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md). The point at which this breaks and RAG becomes necessary is not characterized. MARP as an output format is unaffected by this, but the surrounding workflow it depends on has an undefined scale limit.

**Governance of LLM-written content.** Slides generated from LLM wiki synthesis inherit any errors in the wiki. The linting loops described catch structural inconsistencies, not factual errors. No audit trail connects a slide claim to its source documents.

## Alternatives

**Reveal.js** — richer animation and interactive features, but requires HTML/JS knowledge for customization; LLMs produce less consistently valid output than for MARP. Use when presentations need embedded interactivity.

**Quarto** — handles slides (via Reveal.js backend), documents, and notebooks from a single `.qmd` source. Better for scientific workflows where the same content renders as paper and presentation. More complex syntax reduces LLM reliability.

**Slidev** — Vue-based, developer-focused, supports live coding demos. Substantially harder for LLMs to generate correctly. Use when the audience is technical and expects interactive code examples.

**Jupyter Notebooks with RISE** — appropriate when the knowledge base is already notebook-centric and slides need to execute code. Poor fit for the Obsidian/Markdown-wiki pattern.

For LLM-driven knowledge workflows specifically, MARP has no close competitor: the syntax simplicity and Obsidian rendering integration are the combination that makes it work. For standalone presentation authoring by humans, Quarto or Slidev are more capable.

## Related Concepts

- [Markdown Wiki](../concepts/markdown-wiki.md) — the surrounding knowledge structure MARP serves as output format for
- [Obsidian](../projects/obsidian.md) — the IDE frontend that renders MARP slides alongside wiki content
- [Zettelkasten](../concepts/zettelkasten.md) — the filing methodology MARP decks integrate with when stored as wiki nodes
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — downstream step Karpathy identifies for incorporating wiki knowledge into model weights
- [Context Engineering](../concepts/context-engineering.md) — MARP as a structured output format is one instance of shaping what an agent produces and how it gets stored
