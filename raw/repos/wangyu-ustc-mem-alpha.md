---
url: 'https://github.com/wangyu-ustc/Mem-alpha'
type: repo
author: wangyu-ustc
date: '2026-04-02'
tags:
  - agent-memory
  - reinforcement-learning
  - episodic-semantic-memory
  - memory-architecture
  - context-window-management
  - agentic-skills
  - self-improving
key_insight: >-
  Mem-α demonstrates that LLM agents can learn optimal memory construction
  strategies through RL rather than using fixed memory patterns—this enables
  agents to dynamically decide when to encode information into episodic,
  semantic, or core memory based on task feedback, fundamentally changing how
  knowledge bases should be built for agentic systems versus static retrieval.
stars: 193
forks: 17
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 9
  signal_quality: 8
  composite: 8.5
  reason: >-
    Mem-α directly addresses agent memory construction using RL to dynamically
    choose episodic/semantic/core memory strategies—a genuinely novel approach
    to a core topic with released model weights, training code, and benchmarks.
language: Python
---
## Mem-alpha

> The official implementation of the paper "Mem-α: Learning Memory Construction via Reinforcement Learning"

### Stats

| Metric | Value |
|--------|-------|
| Stars | 193 |
| Forks | 17 |
| Language | Python |
| Last Updated | 2026-04-02 |

### README (excerpt)

# Mem-α: Learning Memory Construction via Reinforcement Learning

[![arXiv](https://img.shields.io/badge/arXiv-2509.25911-b31b1b.svg)](https://arxiv.org/abs/2509.25911)
[![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Memalpha--4B-yellow)](https://huggingface.co/YuWangX/Memalpha-4B)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Official implementation of **"Mem-α: Learning Memory Construction via Reinforcement Learning"**. 

## Table of Contents

- [Mem-α: Learning Memory Construction via Reinforcement Learning](#mem-α-learning-memory-construction-via-reinforcement-learning)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Installation](#installation)
  - [Dataset Preparation](#dataset-preparation)
    - [Prerequisites: Install Git LFS](#prerequisites-install-git-lfs)
    - [Download Datasets](#download-datasets)
  - [Training](#training)
    - [Main Model](#main-model)
    - [Ablation Studies](#ablation-studies)
  - [Evaluation](#evaluation)
    - [Running the Memory Server](#running-the-memory-server)
    - [Evaluating Trained Models](#evaluating-trained-models)
    - [Baseline Evaluations](#baseline-evaluations)
      - [Long-Context, RAG Baselines and MemAgent](#long-context-rag-baselines-and-memagent)
      - [MEM1 Baseline](#mem1-baseline)
  - [Dataset Processing](#dataset-processing)
    - [Memalpha Dataset](#memalpha-dataset)
    - [MemoryAgentBench Dataset](#memoryagentbench-dataset)
  - [Citation](#citation)
  - [License](#license)

## Overview

Large language model (LLM) agents are constrained by limited context windows, necessitating external memory systems for long-term information understanding. Mem-α is a reinforcement learning framework that trains agents to effectively manage complex memory systems through interaction and feedback.

**Key Features:**
- 🧠 **Advanced Memory Architecture**: Core, episodic, and semantic memory components
- 🎯 **Reinforcement Learning Framework**: Direct optimization for memory construction
- 📈 **Strong Generalization**: Trained on 30k tokens, generalizes to 400k+ tokens (13x training length)
- 🚀 **State-of-the-art Performance**: Significant improvements over existing memory-augmented agents

**Resources:**
- 📄 [Paper](https://arxiv.org/abs/2509.25911)
- 🤗 [Model (Memalpha-4B)](https://huggingface.co/YuWangX/Memalpha-4B)
- 📊 [Training Dataset](https://huggingface.co/datasets/YuWangX/Memalpha)
- 📊 [Evaluation Dataset - Processed Version](https://huggingface.co/datasets/YuWangX/Memalpha-Memoryagentbench)
- 📊 [MemoryAgentBench - Original](https://huggingface.co/datasets/ai-hyz/MemoryAgentBench)

## Installation

```bash
# Clone the repository
git clone git@github.com:wangyu-ustc/Mem-alpha.git
cd Mem-alpha

# Install dependencies
pip install -r requirements.txt
```

## Dataset Preparation

### Prerequisites: Install Git LFS

The datasets are stored using Git Large File Storage (LFS). Before downloading, you need to install Git LFS:

```bash
# macOS
brew install git-lfs

# Ubuntu/Debian
sudo apt-get install git-lfs

# Install for your user account
git lfs install
```

### Download Datasets

Create a `data` folder in the project root and download the datasets:

```bash
# Download Memalpha training/test dataset
git clone https://huggingface.co/datasets/YuWangX/Memalpha ./data/memalpha
cd ./data/memalpha
git lfs pull  # Pull the actual dataset files (not just LFS pointers)
cd ../..

# Download MemoryAgentBench evaluation dataset (processed version for this project)
git clone https://huggingface.co/datasets/YuWangX/Memalpha-Memoryagentbench ./data/memoryagentbench
cd ./data/memoryagentbench
git lfs pull  # Pull the actual dataset files
cd ../..
```

> **⚠️ Important:** Without Git LFS installed, you'll only download small pointer files (~133 bytes) instead of the actual datasets (~62 MB for memalpha). Make sure to run `git lfs pull` after cloning to download the real data files.

> **Note:** We use a processed version of the [original MemoryAgentBench](https://huggingface.co/datasets/ai-hyz/MemoryAgentBench) dataset. See [Dataset Processing](#dataset-processing) for details.

**Expected directory structure:**
```
data/
├── memalpha/
│   ├── train.parquet
│   └── test.parquet
└── memoryagentbench/
    ├── train.parquet
    └── test.parquet
```

> **Note:** If you prefer to process the datasets from scratch, see [Dataset Processing](#dataset-processing).

## Training

### Main Model

To train the Memalpha-4B model with optimal hyperparameters (β=0.05, γ=0.1):

```bash
bash scripts/train_memory_grpo_qwen3-4b-4node-compression0.05-content0.1.sh
```

### Ablation Studies

The following scripts reproduce the ablation study results from the paper:

```bash
# β=0.05, γ=0.0 (No content reward)
bash scripts/train_memory_grpo_qwen3-4b-4node-compression0.05-content0.0.sh

# β=0.0, γ=0.1 (No compression reward)
bash scripts/train_memory_grpo_qwen3-4b-4node-compression0.0-content0.1.sh

#

...(truncated)
