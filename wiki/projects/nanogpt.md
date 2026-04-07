---
entity_id: nanogpt
type: project
bucket: agent-systems
abstract: >-
  nanoGPT is Andrej Karpathy's ~300-line single-file GPT implementation for
  education and rapid experimentation, now serving as the base for autonomous
  hyperparameter optimization via agent-driven training loops.
sources:
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - repos/orchestra-research-ai-research-skills.md
related:
  - autoresearch
  - andrej-karpathy
last_compiled: '2026-04-07T11:48:36.935Z'
---
# nanoGPT

## What It Does

nanoGPT is [Andrej Karpathy](../concepts/andrej-karpathy.md)'s minimal GPT implementation, written to be readable rather than production-ready. The core training script fits in roughly 300 lines of Python. It reproduces GPT-2 training from scratch, supports character-level and BPE tokenization, and runs on a single GPU or scales to multiple via PyTorch DDP.

Its secondary life matters as much as the original: nanoGPT became the substrate for Karpathy's [AutoResearch](../projects/autoresearch.md) experiments, where an AI agent ran ~700 autonomous training experiments over two days and found an 11% speedup in "time to GPT-2" on the leaderboard — dropping it from 2.02 hours to 1.80 hours. That result validated a broader pattern: any metric with efficient proxy evaluation can be optimized by an agent swarm without human involvement.

## Architecture and Core Mechanism

The repo centers on two files: `train.py` (the training loop) and `model.py` (the transformer). `model.py` implements a standard decoder-only transformer with:

- Multi-head causal self-attention
- MLP blocks with GELU activation
- Pre-norm layer normalization
- Weight tying between token embedding and the final projection

`train.py` handles data loading, gradient accumulation, learning rate scheduling with cosine decay and warmup, gradient clipping, and optional mixed-precision via `torch.amp`. A `@torch.compile` decorator wraps the forward pass for kernel fusion on compatible hardware.

The `nanochat` variant referenced in Karpathy's AutoResearch work is a stripped-down single-GPU, single-file version (~630 lines), forked from this core for agent experimentation. The agent loop operates on a git feature branch, committing changes to the training script as it finds lower validation loss. Each training run takes exactly 5 minutes, giving the agent a fast evaluation signal.

Key findings from the AutoResearch round 1 session:
- QKNorm was missing a learnable scalar multiplier, causing diffuse attention
- Value embeddings lacked regularization
- Banded attention bandwidth was too conservative
- AdamW beta values were misconfigured
- Weight decay schedule and network initialization were suboptimal

All 20 changes transferred from the depth=12 probe model to the depth=24 production model, confirming the small-to-large validation cascade works.

## Key Numbers

| Metric | Value | Source |
|---|---|---|
| GitHub Stars | ~40,000+ | Public (self-reported via GitHub counter) |
| AutoResearch speedup | ~11% (2.02h → 1.80h) | Self-reported by Karpathy |
| Agent experiments run | ~700 | Self-reported |
| nanochat line count | ~630 | Self-reported |
| nanoGPT model.py | ~300 lines | Independently verifiable |

The 11% speedup figure is self-reported by Karpathy and not independently benchmarked, though the methodology (leaderboard time-to-GPT-2) is reproducible. The leaderboard itself is public.

## Strengths

**Readability as a feature.** The codebase teaches transformer mechanics without abstraction layers. Every component maps directly to the GPT-2 paper. Students and researchers can modify any part without navigating a framework.

**Agent-friendly structure.** A single training file with clearly named hyperparameters makes it easy for an LLM agent to propose, implement, and evaluate changes. The flat structure removes the search space a human or agent needs to navigate.

**Fast iteration cycle.** The 5-minute training run design (in nanochat) creates a tight feedback loop. Cascading from small to large model before committing changes filters noise cheaply.

**Transfer validity.** The AutoResearch results showed that improvements on depth=12 models were additive and transferred to depth=24 models. This is not guaranteed in general but held empirically here.

## Critical Limitations

**Concrete failure mode:** nanoGPT accumulates technical debt fast under agent modification. After 700 commits from an autonomous agent, the training script becomes a palimpsest of hyperparameter changes with no semantic organization. Reproducing or understanding any single commit's rationale requires reading the full git log. The agent doesn't document why changes work, only that they do.

**Unspoken infrastructure assumption:** The AutoResearch loop assumes cheap, reliable single-GPU compute with consistent wall-clock timing. The leaderboard metric ("time to GPT-2") is sensitive to hardware variance, background processes, and GPU thermal throttling. An 11% improvement measured on one machine may not reproduce cleanly on different hardware.

## When NOT to Use It

Skip nanoGPT if you need production reliability, multi-modal support, or anything beyond dense decoder-only transformers. It has no built-in support for:

- Distributed training beyond basic DDP
- Mixture-of-experts architectures
- Retrieval augmentation
- Structured output generation

For teams that need a clean research codebase with broader architecture coverage, LitGPT (Lightning AI) offers similar readability with 20+ model implementations and production training recipes. For agent-driven optimization of more complex pipelines, nanoGPT's flat structure stops scaling once you need multi-node coordination or heterogeneous workloads.

## Unresolved Questions

**Parallelism across agents.** Karpathy mentioned he was "looking at how multiple agents can collaborate to unlock parallelism" after round 1. The single-agent sequential loop is a bottleneck. How conflicts between concurrent agents on the same training script are resolved — merge commits, separate branches, a coordinator agent — is not documented.

**Prompt engineering vs. architecture.** The AutoResearch loop treats the agent's prompt (`.md` file) as the human-iterable variable. How sensitive the discovered improvements are to prompt wording, and whether different prompt authors would find different improvements, is not characterized.

**Round 2 results.** The tweet announcing round 2 was not followed by a public results post in the available sources.

**Governance of the leaderboard.** The "time to GPT-2" leaderboard is community-run. No documentation exists on hardware standardization, submission verification, or how agent-discovered improvements are attributed.

## Alternatives

| Tool | Use when |
|---|---|
| LitGPT | You need clean code for 20+ architectures beyond GPT-2 with production recipes |
| [LangChain](../projects/langchain.md) | You're building agent pipelines around LLMs rather than training them |
| [vLLM](../projects/vllm.md) | You need serving infrastructure, not training research |
| [DSPy](../projects/dspy.md) | You want agent-driven optimization of prompts rather than training code |
| [AutoResearch](../projects/autoresearch.md) | You want the full autonomous research scaffolding built on top of nanoGPT |

## Relationship to Broader Agent Systems

nanoGPT's role in this space is less about the model architecture it implements and more about what it demonstrated: a simple, evaluable codebase is sufficient substrate for an agent to conduct real optimization research. The [Karpathy Loop](../concepts/karpathy-loop.md) pattern — human iterates on prompt, agent iterates on code, metric provides ground truth — generalizes beyond GPT training to any system with a fast evaluation signal. That generalization is the finding worth carrying forward.

---

*Sources: [Karpathy AutoResearch tweet (three days ago)](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md), [Karpathy AutoResearch packaging tweet](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md), [AI-Research-SKILLs repo](../raw/repos/orchestra-research-ai-research-skills.md)*


## Related

- [AutoResearch](../projects/autoresearch.md) — part_of (0.5)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — created_by (0.8)
