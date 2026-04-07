---
entity_id: muon-optimizer
type: approach
bucket: self-improving
abstract: >-
  Muon is an optimizer that applies Nesterov momentum in the spectral domain via
  Newton-Schulz orthogonalization, achieving faster LLM pretraining convergence
  than AdamW on hidden layers without requiring full SVD.
sources:
  - repos/karpathy-autoresearch.md
  - deep/repos/karpathy-autoresearch.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - claude-code
  - andrej-karpathy
  - autoresearch
last_compiled: '2026-04-07T11:59:19.685Z'
---
# Muon Optimizer

## What It Is

Muon (MomentUm Orthogonalized by Newton-schulz) is a neural network optimizer that applies Nesterov momentum updates and then orthogonalizes the resulting gradient matrix using a Newton-Schulz iteration. The orthogonalization step is the core differentiator: instead of scaling gradients by their magnitude (as Adam does), Muon normalizes them so the update matrix has approximately orthonormal columns. This keeps update steps in the spectral domain rather than the elementwise domain.

The intuition: gradient updates for weight matrices in transformer layers tend to have uneven singular value distributions. Adam compensates for gradient magnitude but still applies updates that stretch and compress the weight space unevenly. Muon's orthogonalization forces each update to have equal singular values, distributing learning signal more uniformly across the weight matrix's column space.

## Core Mechanism

### Newton-Schulz Orthogonalization

Rather than computing a full SVD (which is O(n³) and impractical during training), Muon uses a degree-5 Newton-Schulz polynomial iteration to approximate the orthogonal factor of the polar decomposition. The iteration converges in roughly 5 steps for typical gradient matrices, making it computationally cheap relative to the forward/backward pass.

The update rule:
1. Compute Nesterov momentum buffer as usual
2. Run 5 steps of Newton-Schulz: `X ← (15X - 10X³ + 3X⁵) / 8` (approximately, with normalization)
3. Apply the resulting near-orthogonal matrix as the weight update, scaled by learning rate

This is applied to 2D weight matrices in hidden layers. Embedding layers, final projection layers, and 1D parameters (biases, layer norms) typically still use AdamW, making Muon a hybrid optimizer in practice.

### What Gets Optimized

In the [autoresearch](../projects/autoresearch.md) `train.py`, the default configuration uses Muon for the main transformer weight matrices (attention projections, MLP weights) and AdamW for everything else. This split matters: applying Muon to embeddings or scalar parameters makes no sense because the orthogonalization operation is defined for matrices.

## Key Numbers

The [Agentic Researcher paper](../deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md) documents Case Study A, an autonomous 20+ hour session that tested 40+ single-variable modifications to Muon. Results (self-reported, not independently validated):

- Momentum normalization modification: ~3% perplexity improvement over baseline Muon
- Weight decay modification: ~2% improvement
- Combined: ~5% over Muon, ~8% over AdamW on the same architecture
- Zero-overhead variant: ~4.8% improvement at original memory footprint

The autoresearch project itself (65,009 stars as of April 2026) ships `train.py` with Muon + AdamW as its default optimizer combination, treating it as the current competitive baseline for single-GPU LLM pretraining.

Tobi Lütke's reported 19% performance gain from an autoresearch overnight run (37 experiments) was on top of a codebase already using Muon, suggesting the optimizer provides a strong starting point that agents then improve further. These numbers are self-reported via social media, not peer-reviewed benchmarks.

## Why It Matters for Agent-Driven Research

Muon appears specifically in contexts where autonomous agents are iterating on training code. The [autoresearch README](../projects/autoresearch.md) locks Muon + AdamW into `train.py` as the optimizer the agent works with and around. The [Agentic Researcher paper](../deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md) used autonomous agent exploration of Muon modifications as a primary case study.

This pairing is not coincidental. Muon's performance advantage over AdamW gives the agent a better starting point, reducing the noise floor for improvement experiments. An agent improving from 0.85 val_bpb to 0.84 is a cleaner signal than improving from 0.92 to 0.91. The one-variable-per-experiment discipline described in the Agentic Researcher framework (Commandment VI) is how the ~3% and ~2% gains from individual Muon modifications were isolated and attributed.

## Strengths

Muon trains faster to a given loss threshold than AdamW on transformer hidden layers, particularly in the early training phase where gradient directions are informative but magnitudes are noisy. The Newton-Schulz iteration is cheap enough to run every step without meaningful overhead on modern hardware. The orthogonal update structure has a theoretical connection to Riemannian optimization on the manifold of weight matrices, giving it a principled motivation beyond empirical tuning.

The optimizer pairs well with autonomous experimentation frameworks. Because Muon's behavior depends on a small number of interpretable hyperparameters (Newton-Schulz iterations, momentum coefficient, learning rate), agents can modify these one at a time and observe clean effects.

## Critical Limitations

**One concrete failure mode:** Muon requires 2D weight matrices to orthogonalize. When applied to layers with unusual shapes (grouped query attention projections, certain MoE routing layers), the matrix structure assumptions break and you need to either reshape the parameter tensor artificially or fall back to AdamW. The reshape introduces ambiguity about which axis to orthogonalize along, and wrong choices degrade training.

**Unspoken infrastructure assumption:** Muon's Newton-Schulz iteration assumes the gradient matrix fits in GPU memory for matrix-matrix multiplication. For very large weight matrices in large models (e.g., a 4096×16384 MLP layer), the orthogonalization still runs, but at large model scales the overhead starts to accumulate. The published results are primarily from single-GPU training runs on models up to ~100M parameters. Distributed training with Muon requires careful handling of gradient synchronization before orthogonalization, and naive implementations get this wrong.

## When Not to Use It

Skip Muon when:

- You need exact reproducibility with prior AdamW-trained checkpoints or published baselines. Muon produces qualitatively different weight trajectories, making checkpoint comparisons misleading.
- Your model has primarily 1D parameters or embeddings (e.g., pure embedding models, small language models with large vocabulary fractions). The AdamW fallback for these parameters means you get hybrid complexity for minimal gain.
- You are fine-tuning rather than pretraining. Muon's advantages appear most clearly in early training where gradient directions are informative. Fine-tuning typically starts close to a good solution, and the orthogonalization may over-regularize the update direction away from the specific target distribution.
- Your team lacks experience debugging optimizer interactions. When something goes wrong, attributing the cause to Muon vs. AdamW vs. the architecture is harder than with a single optimizer.

## Unresolved Questions

The documentation and papers do not address:

- How Muon behaves at 7B+ parameter scale with multi-GPU training. The autoresearch evidence is from single-GPU ~10M parameter models. The Agentic Researcher results are also small-scale. Whether the advantages survive to production-scale training is unverified.
- The interaction between Newton-Schulz convergence quality and gradient clipping. Most training recipes clip gradients; whether this disrupts the orthogonalization is not analyzed.
- Long-run stability. The 5-minute training budget in autoresearch tests short-horizon effects. Whether Muon's spectral updates cause any long-run instabilities (loss spikes, embedding collapse) in 100B+ token training runs is not documented.
- Optimal Newton-Schulz iteration count as a function of matrix size and gradient condition number. The degree-5 polynomial is used by default, but this is not derived from first principles.

## Alternatives

| Optimizer | Choose when |
|-----------|-------------|
| AdamW | You need compatibility with existing recipes, fine-tuning, or models with unusual layer structures |
| SOAP | You want second-order-like updates with Shampoo-style preconditioning; slightly heavier memory but well-tested at scale |
| Shampoo | Large-scale distributed training where implementation exists; stronger theoretical guarantees than Muon |
| Schedule-free AdamW | You want improved convergence without changing the update direction structure; drop-in AdamW replacement |
| Lion | Memory-constrained training; update directions only (no second moment), lower memory than Adam |

## Related Concepts

Muon fits into the broader pattern of [Self-Improving Agent](../concepts/self-improving-agent.md) research infrastructure, where the choice of optimizer affects the signal quality of autonomous improvement loops. The [AutoResearch](../projects/autoresearch.md) project uses it as the baseline optimizer. The [Karpathy Loop](../concepts/karpathy-loop.md) experiments documented in that project represent the primary practical evidence base for Muon's behavior under automated experimentation. For [Reinforcement Learning](../concepts/reinforcement-learning.md) fine-tuning approaches like [GRPO](../concepts/grpo.md), Muon is rarely used since the gradient structure differs substantially from supervised pretraining.
