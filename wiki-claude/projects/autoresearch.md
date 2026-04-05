# Karpathy Autoresearch

> Canonical self-improvement loop where an AI agent autonomously experiments with LLM training code overnight -- modifying hyperparameters, training for 5 minutes, evaluating, keeping or discarding -- while humans guide strategy through a `program.md` file.

## What It Does

Autoresearch gives an AI agent a single-GPU LLM training setup and lets it run autonomous experiments. The agent modifies `train.py` (model architecture, optimizer, hyperparameters, batch size -- everything is fair game), trains for a fixed 5-minute wall-clock budget, checks if validation loss improved, keeps or discards the change, and repeats. At ~12 experiments per hour, you get ~100 experiments overnight. The human's role is editing `program.md` -- a markdown file that serves as the agent's instructions and research strategy. You program the research methodology, not the code.

## Architecture

Three files. `prepare.py` handles one-time data prep (downloads data, trains BPE tokenizer) and runtime utilities (dataloader, evaluation) -- never modified. `train.py` contains the full GPT model, Muon + AdamW optimizer, and training loop -- the agent's single editable file. `program.md` is the human-editable research strategy that guides the agent. The metric is `val_bpb` (validation bits per byte), vocabulary-size-independent so architectural changes are fairly compared. Requires a single NVIDIA GPU (tested on H100), Python 3.10+, and uv for dependency management. The agent commits results via git, creating a reviewable experiment log.

## Key Numbers

- 65,009 GitHub stars, 9,258 forks
- 630 lines of core code (single-file training setup)
- ~12 experiments per hour, ~100 experiments overnight
- Fixed 5-minute wall-clock training budget per experiment
- 20 compounding improvements discovered autonomously (per Karpathy's reports)
- MIT license

## Strengths

- The `program.md` pattern cleanly separates human strategy from agent execution, making the research methodology itself programmable and iterable
- Fixed time budget makes all experiments directly comparable regardless of what the agent changes, eliminating confounding variables
- Single-file constraint (only `train.py` is editable) keeps scope manageable and diffs reviewable
- Git-based experiment logging provides full history of what worked and what did not

## Limitations

- Requires an NVIDIA GPU; no native support for CPU, MPS, or AMD (community forks exist for Mac and AMD)
- The 5-minute training budget means experiments are only comparable within the same hardware; results are not portable across GPU types
- No built-in mechanism for the agent to learn from failed experiments beyond the implicit selection pressure of keep/discard
- The single-file constraint limits the agent's ability to explore changes that span multiple components

## Alternatives

- [Community forks](autoresearch.md) -- use miolini/autoresearch-macos for Mac, trevin-creator/autoresearch-mlx for MLX, jsegov/autoresearch-win-rtx for Windows, andyluo7/autoresearch for AMD
- [ADAS](../../raw/repos/shengranhu-adas.md) -- use when you want automated design of agentic systems rather than training loop optimization

## Sources

- [karpathy/autoresearch](../../raw/repos/karpathy-autoresearch.md) -- "The idea: give an AI agent a small but real LLM training setup and let it experiment autonomously overnight"
