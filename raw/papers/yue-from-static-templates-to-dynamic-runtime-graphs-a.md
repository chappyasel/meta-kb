---
url: 'https://arxiv.org/abs/2603.22386'
type: paper
author: >-
  Ling Yue, Kushal Raj Bhandari, Ching-Yun Ko, Dhaval Patel, Shuxin Lin, Nianjun
  Zhou, Jianxi Gao, Pin-Yu Chen, Shaowu Pan
date: '2026-03-23'
tags:
  - agentic-skills
  - context-engineering
  - workflow-optimization
  - dynamic-graph-generation
  - agent-composition
  - execution-traces
  - verification-signals
key_insight: >-
  Distinguishing between static workflow templates, run-specific realized
  graphs, and execution traces enables builders to systematically optimize when
  and how LLM agent structures are determined, moving beyond fixed scaffolds to
  adaptive computation graphs that evolve during execution based on verifier
  signals or trace-derived feedback.
relevance_scores:
  topic_relevance: 8
  practitioner_value: 7
  novelty: 7
  signal_quality: 7
  composite: 7.4
  reason: >-
    This survey directly addresses agentic computation graphs, workflow
    optimization for LLM agents, and dynamic vs. static structures—highly
    relevant to agentic skills/composition and context engineering, with a
    unified framework and vocabulary useful for practitioners building adaptive
    agent systems.
---
## From Static Templates to Dynamic Runtime Graphs: A Survey of Workflow Optimization for LLM Agents

**Authors:** Ling Yue, Kushal Raj Bhandari, Ching-Yun Ko, Dhaval Patel, Shuxin Lin, Nianjun Zhou, Jianxi Gao, Pin-Yu Chen, Shaowu Pan

**Published:** 2026-03-23 | **Updated:** 2026-03-23

**Categories:** cs.AI, cs.CL

**PDF:** [https://arxiv.org/pdf/2603.22386](https://arxiv.org/pdf/2603.22386)

### Abstract

Large language model (LLM)-based systems are becoming increasingly popular for solving tasks by constructing executable workflows that interleave LLM calls, information retrieval, tool use, code execution, memory updates, and verification. This survey reviews recent methods for designing and optimizing such workflows, which we treat as agentic computation graphs (ACGs). We organize the literature based on when workflow structure is determined, where structure refers to which components or agents are present, how they depend on each other, and how information flows between them. This lens distinguishes static methods, which fix a reusable workflow scaffold before deployment, from dynamic methods, which select, generate, or revise the workflow for a particular run before or during execution. We further organize prior work along three dimensions: when structure is determined, what part of the workflow is optimized, and which evaluation signals guide optimization (e.g., task metrics, verifier signals, preferences, or trace-derived feedback). We also distinguish reusable workflow templates, run-specific realized graphs, and execution traces, separating reusable design choices from the structures actually deployed in a given run and from realized runtime behavior. Finally, we outline a structure-aware evaluation perspective that complements downstream task metrics with graph-level properties, execution cost, robustness, and structural variation across inputs. Our goal is to provide a clear vocabulary, a unified framework for positioning new methods, a more comparable view of existing body of literature, and a more reproducible evaluation standard for future work in workflow optimizations for LLM agents.
