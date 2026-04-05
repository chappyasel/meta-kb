# GEPA

> Genetic-Pareto optimization framework that evolves any textual parameter (prompts, code, agent architectures) using LLM-based reflection on full execution traces -- 35x faster than RL methods and used in production at Shopify, Databricks, and Dropbox.

## What It Does

GEPA optimizes any system with textual parameters against any evaluation metric. Unlike RL or gradient-based methods that collapse execution results into a single scalar reward, GEPA uses LLMs to read full execution traces (error messages, profiling data, reasoning logs) to diagnose why a candidate failed and propose targeted fixes. Through iterative reflection, mutation, and Pareto-aware selection, it evolves high-performing variants with minimal evaluations. The `optimize_anything` API generalizes beyond prompts to any text artifact -- code, agent architectures, scheduling policies.

## Architecture

Python library (`pip install gepa`). The optimization loop has five steps: (1) select a candidate from the Pareto frontier, (2) execute on a minibatch capturing full traces, (3) reflect via LLM on those traces to diagnose failures, (4) mutate to generate an improved candidate informed by lessons from all ancestors, (5) accept into the pool if improved and update the Pareto front. Supports system-aware merge of Pareto-optimal candidates excelling on different tasks. Built-in adapters for DSPy programs, generic RAG pipelines (ChromaDB/Weaviate/Qdrant/Pinecone), MCP tool descriptions, and terminal agents. The key concept is Actionable Side Information (ASI) -- diagnostic feedback serving as the text-optimization analogue of a gradient.

## Key Numbers

- 3,157 GitHub stars, 269 forks
- 90x cost improvement: open-source models + GEPA beat Claude Opus 4.1 (Databricks case study)
- 35x fewer evaluations than RL methods (100-500 vs. 5,000-25,000+)
- 32% to 89% on ARC-AGI via architecture discovery
- 55% to 82% coding agent resolve rate via auto-learned skills
- 50+ production deployments across Shopify, Databricks, Dropbox, OpenAI
- Integrated into DSPy, MLflow, Comet ML, Pydantic, Google ADK, OpenAI Cookbook
- MIT license

## Strengths

- Reflection on full execution traces (not just pass/fail) produces dramatically more targeted mutations -- this is the core innovation over standard evolutionary search
- Pareto-aware selection maintains diverse candidates that excel on different task subsets rather than converging on a single solution
- Framework-agnostic adapters mean it plugs into existing RAG pipelines, DSPy programs, and MCP tools without rewriting
- Battle-tested at scale in production systems (Shopify CEO publicly endorsed it)

## Limitations

- Requires an LLM for the reflection/mutation loop, so optimization cost scales with the reflection model's API price
- Effectiveness depends on evaluator quality -- poorly designed metrics or evaluators produce poorly optimized outputs
- The optimize_anything API requires careful prompt engineering of the objective description
- Designed for offline improvement loops, not real-time optimization

## Alternatives

- [darwin-godel-machine.md](darwin-godel-machine.md) -- use when you want fully autonomous self-improving agents that modify their own code architecture
- [llmlingua.md](llmlingua.md) -- use when the problem is prompt size rather than prompt quality
- [obsidian-skills.md](obsidian-skills.md) -- use when you need modular skill composition rather than optimization of existing skills

## Sources

- [Source](../../raw/repos/gepa-ai-gepa.md) -- "Optimize prompts, code, and more with AI-powered Reflective Text Evolution"
