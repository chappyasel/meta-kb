---
entity_id: progressive-disclosure
type: concept
bucket: context-engineering
sources:
  - repos/memodb-io-acontext.md
  - repos/thedotmack-claude-mem.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/michaelliv-napkin.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - deep/repos/memodb-io-acontext.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/michaelliv-napkin.md
related:
  - Claude Code
last_compiled: '2026-04-05T05:26:03.235Z'
---
# Progressive Disclosure

**Bucket:** Context Engineering | **Type:** Concept

---

## What It Is

Progressive disclosure is a context management strategy for AI agents: instead of loading all available information into the context window at once, the agent fetches information incrementally, on demand, based on what it currently needs.

The name comes from UI design, where complex interfaces reveal options only as users need them. In agent systems, the same logic applies to tokens: load the minimum required to proceed, then fetch more when a specific subtask demands it.

The core tension this addresses is straightforward. Context windows are finite. Knowledge bases, codebases, and memory stores are not. Naive approaches dump everything in and hope the model finds what it needs, or use embedding search to retrieve chunks that might be relevant. Progressive disclosure takes a third path: the agent reasons about what it needs, requests it explicitly, and incorporates only that.

---

## Why It Matters

Context window limits are the defining constraint of current LLM deployments. A 128k-token window sounds large until you're building an agent that needs to maintain conversation history, hold tool results, reference documentation, track task state, and reason across a codebase simultaneously. Every token of irrelevant context competes with tokens of relevant context for the model's attention.

Beyond raw capacity, there's an attention quality problem. Models attend less precisely to content buried in long contexts. Retrieval-augmented generation (RAG) addresses this by pulling only relevant chunks, but semantic similarity search has a fundamental flaw: it retrieves what *looks* like the answer, not necessarily what the agent *needs to reason about next*. An agent mid-task often needs procedural knowledge ("how do I do X") rather than semantically similar content.

Progressive disclosure shifts retrieval from a similarity problem to a reasoning problem. The agent decides what to fetch, not a nearest-neighbor algorithm.

---

## How It Works

### The Disclosure Hierarchy

The canonical implementation uses a layered structure where each level reveals more detail at greater token cost. [napkin](https://github.com/michaelliv/napkin) makes this explicit:

| Level | Mechanism | Token Cost | Content |
|-------|-----------|-----------|---------|
| 0 | Context note (`NAPKIN.md`) | ~200 | Project summary, orientation |
| 1 | `overview` | ~1-2k | Vault map with TF-IDF keywords |
| 2 | `search <query>` | ~2-5k | Ranked results with snippets |
| 3 | `read <file>` | ~5-20k | Full file content |

An agent starting a task reads Level 0 automatically (it's injected into the system prompt). If the task requires more, it calls `overview` to see what exists. A specific subtask triggers `search`. Only when the agent needs the full content of a specific document does it pay the full token cost of `read`.

This is distinct from RAG in a critical way: the agent controls the retrieval sequence through tool calls, not through a single embedding lookup. The agent can search, partially read, decide it needs something else, search again, and compose its understanding across multiple retrieval steps.

### Tool-Based Retrieval

The mechanism is function calling. Skills or knowledge files expose tools like `get_skill`, `list_skills`, `search`, and `read`. The agent invokes these mid-reasoning, incorporates the results, and continues. [Acontext](https://acontext.io) implements this pattern explicitly, describing it as "retrieval by tool use and reasoning, not semantic top-k."

This means the agent's reasoning trace shows its retrieval decisions. You can inspect what the agent fetched and why, which is not possible with embedding retrieval embedded in the pipeline before the agent sees anything.

### The SKILL.md Specification

[Xu and Yan (2026)](https://arxiv.org/pdf/2602.12430) formalize progressive disclosure as part of the agent skills architecture. The `SKILL.md` specification defines how skills declare themselves, what they contain, and how they interoperate with the Model Context Protocol (MCP). Progressive context loading is one of the four architectural axes they identify: skills load into context on demand rather than pre-loading, keeping the working context minimal and focused.

The paper frames skills as "composable packages of instructions, code, and resources that agents load on demand." Progressive disclosure is the loading mechanism that makes composition practical rather than theoretical.

---

## Who Implements It

**napkin** ([repo](https://github.com/michaelliv/napkin)) is the clearest reference implementation. It's a local-first, file-based knowledge system for agents built around the four-level hierarchy above. Its benchmark results on LongMemEval show 83-92% accuracy using BM25 search on markdown files, with no embeddings or preprocessing. The S-dataset result (91% vs. 86% best prior system, 64% GPT-4o full context) is the most striking: progressive disclosure outperforms dumping everything into context, even when context size isn't the bottleneck. Whether these figures hold outside the reported benchmark setup requires independent validation.

**Acontext** ([repo](https://github.com/memodb-io/acontext)) implements progressive disclosure as part of a broader skill memory layer. Skills are Markdown files. Agents use `get_skill` and `get_skill_file` tool calls to fetch what they need. Acontext adds a learning loop on top: after task completion, an LLM distillation pass extracts what worked and what didn't, then writes updated skill files. The agent can then retrieve improved skills on the next run.

**Claude Code** injects progressive disclosure into coding sessions. It reads a project's `CLAUDE.md` at session start (Level 0), then retrieves specific files, functions, or documentation as the task demands rather than loading the entire repository.

The SKILL.md paper documents the pattern across community skill ecosystems, noting that it enables "dynamic capability extension without retraining" when combined with MCP integration.

---

## Concrete Example

An agent tasked with fixing a bug in an unfamiliar codebase:

1. Reads `CLAUDE.md` or equivalent project note (~200 tokens). Learns the project uses Django, tests run with pytest, deployments go through CI.
2. Searches for "authentication middleware" (~3k tokens of snippets). Finds three relevant files.
3. Reads `auth/middleware.py` in full (~8k tokens). Identifies the bug.
4. Reads the test file for that module (~5k tokens). Writes a fix and a test.

Total context consumed by knowledge retrieval: ~16k tokens across four targeted fetches. A naive approach loading the full codebase: potentially hundreds of thousands of tokens, most irrelevant, degrading the model's attention on the specific files that matter.

---

## Failure Modes

**Retrieval dead ends.** If the agent's initial search fails to surface the right document, it may not know to look elsewhere. Embedding search fails on vocabulary mismatch; BM25 fails on semantic mismatch. An agent searching for "auth token validation" won't find documentation titled "JWT lifecycle management" without trying multiple phrasings. The agent must reason about search failure and reformulate, which current models do inconsistently.

**Over-disclosure.** Agents can issue redundant `read` calls, loading the same content multiple times under different search queries, or fetching entire files when a single section would suffice. Without explicit cost accounting per retrieval call, agents have no feedback signal to discourage wasteful fetching.

**Level 0 brittleness.** The entire strategy depends on the context note or overview being accurate and well-maintained. A `NAPKIN.md` or `CLAUDE.md` that's outdated or poorly written causes the agent to skip retrieval levels it should visit, or to fetch the wrong documents confidently.

**Skill vulnerability.** The SKILL.md survey found that 26.1% of community-contributed skills contain security vulnerabilities. An agent that loads skills progressively and trusts their content inherits those vulnerabilities. Progressive disclosure amplifies this risk because the agent fetches and executes skill content dynamically, without static analysis at load time.

---

## What the Literature Doesn't Explain

**How agents decide when to stop disclosing.** Current implementations assume the agent will request more information when needed and stop when it has enough. Neither is guaranteed. There's no principled mechanism for an agent to recognize that it's operating with insufficient context versus that it genuinely has what it needs.

**Governance for community skill ecosystems.** The SKILL.md paper proposes a four-tier permission model for skills but doesn't address who runs the governance infrastructure, how disputes about skill quality are resolved, or what happens when a widely-used skill is found to be malicious post-deployment.

**Performance at scale.** napkin's benchmarks cover 40-500 session conversational memory. Production deployments may involve millions of documents, thousands of concurrent agents, and retrieval latency requirements incompatible with sequential tool calls. The architecture's scaling properties past these benchmarks aren't documented.

**Interaction with fine-tuning.** Skills represent external, editable knowledge. If a model is fine-tuned on data generated by agents using a specific skill set, and those skills are later updated, the model's behavior may diverge from its training distribution in ways that are hard to diagnose.

---

## Practical Implications

If you're building agents that need to reference external knowledge, the design choice between RAG and progressive disclosure turns on a few questions:

- **Who controls retrieval?** RAG retrieval happens before the agent sees the context; progressive disclosure puts retrieval inside the agent's reasoning loop. If you need the agent to adapt its retrieval strategy mid-task, progressive disclosure is better.
- **How much does infrastructure matter?** RAG requires embedding models, vector databases, and indexing pipelines. Progressive disclosure on markdown files requires none of those. Acontext and napkin both demonstrate functional retrieval with BM25 on flat files.
- **How interpretable do you need the retrieval trace to be?** Tool calls are logged. Embedding similarity scores are not human-readable. If you need to audit what an agent retrieved and why, tool-based retrieval gives you that.
- **How stable is your knowledge base?** Skills as Markdown files are trivially editable and version-controllable with git. Vector stores require re-embedding on content changes.

Use progressive disclosure when the agent's task requires adaptive, multi-step retrieval and you want interpretable logs. Use standard RAG when retrieval is a single lookup, semantic similarity is the right signal, and you have the infrastructure. Use full-context loading only when the total content fits comfortably and attention degradation isn't a concern.

---

## Related Concepts and Projects

- [Acontext](../projects/acontext.md): Implements progressive disclosure as part of a skill memory layer with distillation
- [napkin](../projects/napkin.md): Reference implementation of the four-level disclosure hierarchy using BM25 on markdown
- [SKILL.md Specification](../concepts/skill-md.md): Formal definition of portable agent skills with progressive loading
- Model Context Protocol: Transport layer that skill ecosystems integrate with
- [Context Engineering](../concepts/context-engineering.md): Broader field of which progressive disclosure is one strategy
