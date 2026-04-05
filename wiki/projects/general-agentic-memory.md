# GAM (General Agentic Memory)

> A highly modular agentic file system framework that provides structured hierarchical memory for LLMs through intelligent semantic chunking, incremental memory generation, and deep-research-powered organization -- supporting text, video, and long-horizon agent trajectories.

## What It Does

GAM addresses the challenge of managing long-context agent operations by combining LLM-based semantic chunking with hierarchical memory organization. For each input (document, video, or agent trajectory), GAM segments it into semantically coherent chunks, generates structured memory summaries (Memory + TLDR) for each chunk, and automatically organizes these into a hierarchical directory structure (taxonomy). New content can be incrementally appended without rebuilding the entire memory. The system supports three modalities: long text (document QA), long video (detection, segmentation, description), and long-horizon agent trajectories (compression and organization of complex reasoning steps and tool invocation logs).

## Architecture

- **Intelligent Chunking**: LLM-based text segmentation identifying semantic boundaries (not arbitrary token windows)
- **Memory Generation**: Structured summaries with Memory + TLDR for each chunk
- **Hierarchical Organization**: Automatic taxonomy-based directory structure
- **Incremental Addition**: Append new content without rebuilding
- **Dual-agent research mode**: Memorizer (builds the GAM) + Researcher (queries it)
- **Four access levels**: Python SDK (Workflow API), CLI (`gam-add`/`gam-request`), REST API (FastAPI + Uvicorn), and Web Platform (Flask)
- **Multi-environment**: Local filesystem and Docker container workspaces
- **Flexible backends**: Compatible with OpenAI, SGLang, and other inference engines

## Key Numbers

- 838 GitHub stars, 85 forks
- Python, MIT license
- Supports text, video, and long-horizon agent trajectory modalities
- Benchmarked on LoCoMo, HotpotQA, RULER, NarrativeQA
- Paper: arxiv 2511.18423

## Strengths

- The modular approach to incremental memory generation means agents can accumulate knowledge over time without rebuilding memory systems, which is critical for long-running agents that need to stay within practical context windows
- Four access levels (SDK, CLI, REST API, Web) make it unusually versatile for both development experimentation and production deployment

## Limitations

- The video memory component adds significant complexity and dependencies that may be unnecessary for text-only agent workflows
- LLM-based chunking and memory generation adds inference cost at ingestion time, which can be significant for large document collections

## Alternatives

- [hipocampus.md](hipocampus.md) -- use when you want zero-infrastructure file-based memory with automatic compaction rather than a full SDK/API framework
- [nemori.md](nemori.md) -- use when you need episodic memory with predict-calibrate learning specifically for conversational agents
- [sia-memagent.md](sia-memagent.md) -- use when you need RL-optimized long-context processing rather than memory organization

## Sources

- [vectorspacelab-general-agentic-memory.md](../../raw/repos/vectorspacelab-general-agentic-memory.md) -- "A highly modular agentic file system framework that provides structured memory and operating environments for Large Language Models... supports both text and video modalities, offering four access levels"
