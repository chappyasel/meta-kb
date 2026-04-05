# Context Rot

> Performance degradation that occurs as the number of tokens in an LLM's context window increases. As agents accumulate tool outputs, conversation history, retrieved documents, and intermediate reasoning across multi-turn loops, the model's ability to accurately recall information, follow instructions, and attend to relevant signals decreases -- even when the information is technically within the context window.

## Why It Matters

Context rot is the silent killer of long-running agent systems. Teams diagnose it as "the model got worse" when the root cause is not the base model but the accumulated state polluting its attention. Every token in the context window competes for the model's attention budget. As context grows, the n-squared pairwise relationships between tokens stretch the model's attention thin, creating a performance gradient rather than a hard cliff.

This matters critically for agent builders because agentic systems generate context at every turn of their loop. A ReAct-style agent that plans, retrieves, evaluates, and decides on each iteration is continuously adding tool outputs, search results, and reasoning traces to its context. Without active management, three predictable failure modes emerge: retrieval thrash (the agent keeps searching without converging), tool storms (cascading tool calls that burn through budgets), and context bloat (the context fills with low-signal content until the model stops following its own instructions).

Stanford and Meta's "Lost in the Middle" research found performance drops of 20+ percentage points when critical information sits mid-context. In one test, accuracy on multi-document QA actually fell below closed-book performance with 20 documents included -- meaning adding retrieved context actively made the answer worse. Context is not free. It has diminishing and eventually negative marginal returns.

## How It Works

Context rot stems from architectural constraints of transformer-based LLMs. Every token attends to every other token across the entire context, creating n-squared pairwise relationships. Models develop attention patterns from training data where shorter sequences are more common, meaning they have fewer specialized parameters for long-range dependencies. Position encoding interpolation allows handling longer sequences but with some degradation in positional understanding.

The practical effect is that LLMs have an "attention budget" analogous to human working memory capacity. Every new token depletes this budget by some amount. In multi-turn agent loops, the context accumulates:

- **Tool outputs** that are pasted verbatim (raw JSON, API responses, search results)
- **Conversation history** that grows linearly with turns
- **Intermediate reasoning** traces and chain-of-thought steps
- **Retrieved documents** from RAG that may be tangentially relevant
- **Failed attempts** and error messages from previous iterations

Without intervention, this accumulation crosses a threshold where the model can no longer reliably attend to its system instructions, correctly identify the most relevant information, or maintain goal-directed behavior.

**Mitigations** fall into four categories:

1. **Compaction.** Summarize the conversation when it nears the context limit, then reinitiate with the summary. Anthropic's Claude Code uses this as the first lever for long-horizon coherence. The key challenge is maintaining high-fidelity summaries that preserve critical details.

2. **Structured Note-Taking.** Instead of keeping everything in context, agents write structured notes to external files (scratchpads, working memory files) and reference them as needed. This offloads information from the context window while keeping it accessible.

3. **Sub-Agent Architectures.** Spawn fresh sub-agents for distinct phases of work. Each sub-agent operates in a clean context window (the "smart zone"), receives only the information it needs, and returns a focused result to the orchestrator. Ars Contexta uses this pattern: each processing phase runs in its own context via sub-agent spawning.

4. **Explicit Token Budgets.** Hard caps on retrieval iterations (max 3), tool calls per task (max 10-15), and context length relative to the model's effective window. When a budget is exceeded, the agent stops and returns its best answer with explicit uncertainty rather than spiraling into more retries.

## Who Implements It

- [LLMLingua](../projects/llmlingua.md) -- prompt compression via selective token removal achieving up to 20x compression while maintaining accuracy; integrates with LangChain and LlamaIndex for RAG systems
- [SWE-Pruner](../../raw/repos/ayanami1314-swe-pruner.md) -- self-adaptive context pruning for coding agents where the agent articulates explicit goals to guide compression, achieving 23-54% token reduction while preserving task-relevant details
- [Lossless Claw](../../raw/repos/martian-engineering-lossless-claw.md) -- DAG-based hierarchical summarization that preserves lossless conversation history while respecting token limits; SQLite persistence with agent-accessible recall tools
- [MemAgent](../../raw/repos/bytedtsinghua-sia-memagent.md) -- RL-optimized agent memory architecture achieving near-lossless extrapolation to 3.5M tokens by treating long-context processing as a multi-turn workflow problem

## Open Questions

- Is context rot a fundamental limitation of transformer attention, or can architectural innovations (sparse attention, hierarchical attention, retrieval-augmented generation) eventually eliminate it? Current evidence suggests it is inherent but manageable.
- What is the optimal compaction strategy? Aggressive summarization loses detail; conservative summarization fails to prevent rot. The right balance likely depends on the task, but we lack principled guidance for choosing.
- How should token budgets be set dynamically based on task complexity? A simple Q&A needs different budget allocation than a multi-hour codebase migration, but current systems use fixed caps.
- Can models be trained to be more robust to context rot, or is it purely an inference-time problem? Some models show more gentle degradation than others, suggesting training-time interventions may help.

## Sources

- [Anthropic -- Effective Context Engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md) -- "context must be treated as a finite resource with diminishing marginal returns. Like humans, who have limited working memory capacity, LLMs have an 'attention budget' that they draw on when parsing large volumes of context"
- [Towards Data Science -- Agentic RAG Failure Modes](../../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) -- "context bloat is the downstream result. Massive tool outputs are pasted directly into the context window until the model's attention is spread too thin to follow instructions"
- [Mei et al. -- A Survey of Context Engineering](../../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) -- "context engineering is a systematic discipline encompassing retrieval, processing, and management -- the fundamental asymmetry between LLM comprehension and generation capabilities means knowledge bases must be architected to work around limited output sophistication"
