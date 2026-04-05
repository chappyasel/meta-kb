# SimpleMem

> Lifelong memory library for LLM agents using semantic lossless compression, with native support for text, image, audio, and video in a unified framework. Key differentiator: multimodal memory with compression that prevents token bloat across sessions without losing information.

## What It Does

SimpleMem stores, compresses, and retrieves long-term memories using semantic lossless compression. Memories are compressed semantically (preserving meaning while reducing token count) and retrieved via search across sessions. The system handles text, images, audio, and video as semantically comparable entities within a unified compression framework. Cross-session memory enables agents to maintain continuity across separate conversations. Available as both a Python library (`pip install simplemem`) and an MCP server for integration with Claude Desktop, Cursor, LM Studio, Cherry Studio, and any MCP-compatible client. Also supports Claude Skills integration.

## Architecture

Python library with MCP server. Core operations: store (add memories with optional modality metadata), compress (semantic lossless compression that reduces token count while preserving retrievable meaning), and retrieve (search across the compressed memory store). Knowledge graph support for structured relationships between memories. The MCP server at `mcp.simplemem.cloud` provides a hosted option. Docker deployment available for self-hosting. Cross-session memory is handled through persistent storage that survives session boundaries. The library provides a clean Python API for programmatic integration alongside the MCP tool interface.

## Key Numbers

- 3,156 GitHub stars, 303 forks
- Supports text, image, audio, and video modalities
- Available on PyPI and as MCP server
- Works with Claude Desktop, Cursor, LM Studio, Cherry Studio
- arXiv paper: 2601.02553
- MIT license
- Translated into 12 languages

## Strengths

- Unified multimodal compression treats different media types as semantically comparable, avoiding separate memory systems per modality
- Semantic lossless compression directly addresses the exponential token bloat problem of naive memory append strategies
- MCP integration means drop-in compatibility with the growing MCP ecosystem without custom integration work

## Limitations

- "Semantic lossless" compression is a strong claim; some information loss is inevitable when compressing, and the degree depends on the compression LLM's capability
- The multimodal pipeline adds complexity and latency compared to text-only memory systems
- Relatively young project; the compression quality and retrieval accuracy under heavy long-term use are not well documented

## Alternatives

- [lossless-claw.md](lossless-claw.md) — use when the focus is conversation history compression with DAG-based summarization rather than multimodal memory
- [mirix.md](mirix.md) — use when you want cognitive-type memory separation (episodic, semantic, procedural) with screen capture
- [napkin.md](napkin.md) — use when you want simple file-based memory with BM25 search and zero compression infrastructure

## Sources

- [../../raw/repos/aiming-lab-simplemem.md](../../raw/repos/aiming-lab-simplemem.md) — "store, compress, and retrieve long-term memories with semantic lossless compression. Now with multimodal support for text, image, audio & video"
