# Memento

> Memory-based continual learning framework that improves LLM agents from experience without updating model weights, using case-based reasoning over stored trajectories as a learned policy. Key differentiator: inverts the fine-tuning paradigm -- stores successful and failed trajectories in a Case Bank and retrieves by value to steer planning and execution.

## What It Does

Memento logs agent trajectories (successful and failed) into a Case Bank as final-step tuples (state, action, reward). A CBR-driven Planner decomposes new tasks and retrieves relevant cases to inform planning. An Executor runs each subtask as an MCP client, orchestrating tools and writing outcomes back to memory. A neural case-selection policy guides which cases are retrieved, enabling the system to improve over time through experience replay. The system supports both non-parametric CBR (retrieval-based) and parametric CBR (learned policy) modes. It achieves continual learning and out-of-distribution generalization without any model fine-tuning.

## Architecture

Python framework with a Planner-Executor architecture. The Meta-Planner (GPT-4.1) breaks high-level queries into executable subtasks. The Executor (o3 or other models) runs subtasks via MCP tools. Case Memory stores final-step tuples for experience replay. The MCP tool layer provides a unified interface to web search (SearxNG), document processing (PDF, Office, images, audio, video), sandboxed code execution, data analysis, and media analysis. Parametric CBR uses PyTorch with CUDA for training the case-selection policy. Installation via uv (recommended) or pip. Requires Python 3.11+, SearxNG for web search, FFmpeg for video, and PyTorch 2.0+ with CUDA for parametric memory.

## Key Numbers

- 2,375 GitHub stars, 276 forks
- Benchmarked on GAIA, DeepResearcher, SimpleQA, and HLE
- Two modes: non-parametric CBR and parametric CBR
- Tool ecosystem: web search, document processing, code execution, media analysis
- MIT license
- Uses GPT-4.1 (planner) and o3 (executor)

## Strengths

- Case-based reasoning enables continual improvement from experience without the cost and instability of LLM fine-tuning
- The Planner-Executor separation cleanly divides strategic reasoning from tool-level execution
- Both parametric and non-parametric CBR modes allow trading off between simplicity and learning sophistication

## Limitations

- Requires CUDA-capable GPU for parametric memory training; not practical on CPU-only machines or Apple Silicon
- Depends on GPT-4.1 and o3 specifically; switching to other models requires re-validation of the planner-executor dynamics
- Case Bank grows without bounds; no built-in mechanism for pruning outdated or superseded cases

## Alternatives

- [acontext.md](acontext.md) — use when you want human-readable skill files as the memory format rather than trajectory tuples
- [autocontext.md](autocontext.md) — use when you want multi-agent analysis with playbook distillation rather than case-based retrieval
- [mirix.md](mirix.md) — use when you want multi-type memory (episodic, semantic, procedural) with screen observation

## Sources

- [../../raw/repos/agent-on-the-fly-memento.md](../../raw/repos/agent-on-the-fly-memento.md) — "logs successful & failed trajectories into a Case Bank and retrieves by value to steer planning and execution—enabling low-cost, transferable, and online continual learning"
