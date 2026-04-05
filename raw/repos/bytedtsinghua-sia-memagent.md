---
url: 'https://github.com/BytedTsinghua-SIA/MemAgent'
type: repo
author: BytedTsinghua-SIA
date: '2026-04-03'
tags:
  - agent-memory
  - agentic-skills
  - self-improving
  - context-engineering
  - reinforcement-learning
  - multi-turn-reasoning
  - memory-architecture
  - long-context-extrapolation
  - verifiable-rewards
key_insight: >-
  MemAgent demonstrates a RL-optimized agent memory architecture that achieves
  near-lossless extrapolation to 3.5M tokens—3.5x the typical context window—by
  treating long-context processing as a multi-turn workflow problem rather than
  a static model architecture change, enabling builders to retrofit existing
  LLMs with memory-augmented reasoning without retraining the base model
  weights.
stars: 975
forks: 68
relevance_scores:
  topic_relevance: 8
  practitioner_value: 7
  novelty: 8
  signal_quality: 8
  composite: 7.7
  reason: >-
    MemAgent directly addresses agent memory architecture with RL-optimized
    long-context processing—highly relevant to agent memory and context
    engineering pillars, with released model weights, training framework, and
    detailed benchmarks making it practically actionable.
language: Python
license: Apache-2.0
---
## MemAgent

> A MemAgent framework that can be extrapolated to 3.5M, along with a training framework for RL training of any agent workflow.

### Stats

| Metric | Value |
|--------|-------|
| Stars | 975 |
| Forks | 68 |
| Language | Python |
| License | Apache-2.0 |
| Last Updated | 2026-04-03 |

### README (excerpt)

<div style="display: flex; justify-content: space-between;">
    <img src="figs/seed_logo.png" width="35%">
    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E" width="26%">
    <img src="figs/gensi.png" width="35%">
</div>
<br>
<div align="center">

<h1 style="display: flex; justify-content: center; align-items: center; gap: 10px; margin: 0;">
  MemAgent: Reshaping Long-Context LLM with Multi-Conv RL based Memory Agent
</h1>

[![Paper](https://img.shields.io/badge/paper-5f16a8?style=for-the-badge&logo=arxiv&logoColor=white)](https://arxiv.org/abs/2507.02259)
[![Blog](https://img.shields.io/badge/Blog-3858bf?style=for-the-badge&logo=homepage&logoColor=white)](https://memagent-sialab.github.io/)
[![Dataset](https://img.shields.io/badge/Datasets-4d8cd8?style=for-the-badge&logo=huggingface&logoColor=white)](https://huggingface.co/datasets/BytedTsinghua-SIA/hotpotqa)
[![Weights](https://img.shields.io/badge/Model%20Weights-63cad3?style=for-the-badge&logo=huggingface&logoColor=white)](https://huggingface.co/BytedTsinghua-SIA/RL-MemoryAgent-14B)
</div>

---

> [!IMPORTANT]
> **🔥 News!!!**
> - **[2025/07]** We provide a **quickstart** script that makes using **MemAgent** super easy, see the **Quickstart** section below.
> - **[2025/06]** We release **RL-MemAgent-14B** and **RL-MemAgent-7B** models achieving nearly lossless performance on 3.5M token contexts task.

---
## 📖Introduction

We propose a novel long-context processing framework — **MemAgent**, which directly optimizes long-context tasks through end-to-end Reinforcement Learning without altering the underlying model architecture. MemAgent has demonstrated superb long-context capabilities, being able to extrapolate from an 8K context trained on 32K text to a 3.5M QA task with performance loss < 5% and achieves 95%+ accuracy in 512K RULER test.

<div align="center">
  <img src="figs/method_00.png" alt="overview" style="width: 66%; height: auto;">
</div>

### Highlights:
- **🚀 Novel memory mechanism** Introduces MemAgent architecture enabling arbitrarily long input processing within fixed context windows, overcoming traditional context window length limitations.
- **⚡ Linear time Complexity** Breaks through computational bottlenecks in long-text processing, achieving linear scaling of resources with text length.
- **🎯 RL-driven extrapolation** Through RL training with MemAgent architecture, enables models to extrapolate to vastly longer texts with minimal performance degradation.
<div align="center">
  <img src="figs/main_result_00.png" alt="overview" style="width: 66%; height: auto;">
</div>

### Multi-conv RL Framework
We use Reinforcement Learning from Verifiable Rewards (RLVR) to train MemAgent, extending the DAPO algorithm to support end-to-end optimization of Agent Workflows with multi-turn context-independent conversations.

<img src="figs/algo_00.png" width="49%" style="display:inline-block"> <img src="figs/template.png" width="49%" style="display:inline-block">

### Results

**RL-MemAgent** demonstrates exceptional stability in ultra-long context processing：
- **14B model:** Performance degradation <5.5% on 3.5M token tasks, achieving truly lossless extrapolation.
- **7B model:** Only 11% performance decline in longest contexts, significantly outperforming existing long-context models

![Performance Comparison](figs/main_result.png)

## Quickstart

`quickstart.py` offers a straightforward way to begin using MemAgent, supporting both local deployment and integration with online model services.


### vLLM Local Deployment


1.  **Start the `vllm` server:**

    ```bash
    vllm serve BytedTsinghua-SIA/RL-MemoryAgent-14B --tensor_parallel_size 2
    ```

2.  **Run `quickstart.py`:**

    ```bash
    python quickstart.py --model BytedTsinghua-SIA/RL-MemoryAgent-14B
    ```

### Online LLM Service

For online LLM services, you'll need to configure your model endpoint and API key as environment variables.


e.g.  `gpt-4o-2024-11-20`:
- **Normal online services**: Simply use `https://{endpoint}`.
- **Azure OpenAI**: Use the format `https://{endpoint}/openai/deployments/gpt-4o-2024-11-20`.

```bash
export URL=
export API_KEY=
python quickstart.py --model gpt-4o-2024-11-20
```

## Reproducibility

### Performance

In reproduction, you may find that the validation score during training is not equal to the final score (about 50% vs 80%). 
This behavior is expected because during training we actually used a stricter version of the verifier to prevent reward hacking, while during testing we used a more lenient verifier. Specifically

- In the [training verifier](https://github.com/BytedTsinghua-SIA/MemAgent/blob/main/verl/utils/reward_score/hotpotqa.py), the model’s answer must be placed inside `\boxed{}` with exact case matching and no additional characters.

- In the [testing verifier](https://github.com/BytedTsinghua-SIA/MemAgent/blob/main/taskutils/memory_eval/utils/__init__.py), articles like “a/the” are i

...(truncated)
