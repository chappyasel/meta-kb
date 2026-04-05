---
url: 'https://github.com/wangyu-ustc/mem-alpha'
type: repo
author: wangyu-ustc
date: '2026-04-04'
tags: [agent-memory, self-improving, knowledge-bases]
key_insight: >-
  Uses reinforcement learning (GRPO) to train a small 4B-parameter model to autonomously decide when and how to encode information into a structured memory system (core/semantic/episodic), learning memory construction as a skill rather than relying on hand-crafted heuristics -- trained on 30K token contexts but generalizing to 400K+ tokens (13x training length).
stars: 0
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - memory.py
    - functions.py
    - memory_server.py
    - memalpha/llm_agent/generation.py
    - memalpha/llm_agent/tensor_helper.py
    - memalpha/llm_agent/metrics.py
    - memalpha/utils.py
    - memalpha/__init__.py
    - config/memalpha-qwen3-4b_agent_0.05-0.1.yaml
    - config/prompts_wrt_datasource.yaml
    - verl/experimental/agent_loop/agent_loop.py
    - verl/interactions/base.py
    - verl/utils/memory_buffer.py
    - data_preprocess/extract_memoryagentbench_keywords.py
  analyzed_at: '2026-04-04'
  original_source: repos/wangyu-ustc-mem-alpha.md
---

## Architecture Overview

Mem-alpha is an academic research system (UCSD, arXiv:2509.25911) that trains a small language model to autonomously manage a structured external memory system via reinforcement learning. The key innovation is treating memory construction -- deciding what to store, where to store it, and how to organize it -- as a learnable skill rather than a fixed heuristic.

The architecture has four major components:

**1. Three-Tier Memory System** (`memory.py`)
- **Core Memory**: A single string (max 512 tokens) holding the most important persistent context, always present in the system prompt. Acts like a compressed summary of essential facts.
- **Semantic Memory**: A list of keyed entries storing general knowledge and factual information. Supports BM25 and embedding-based search.
- **Episodic Memory**: A list of keyed entries storing specific events with timestamps and context. Same search capabilities as semantic.

**2. Memory Agent** (trainable model, Qwen3-4B)
The agent receives text chunks one at a time and must decide what memory operations to perform. It has access to four tool functions:
- `new_memory_insert(memory_type, content)` -- Add new semantic or episodic memory
- `memory_update(memory_type, new_content, memory_id)` -- Update existing entry or replace core
- `memory_delete(memory_type, memory_id)` -- Remove an entry or clear core
- `search_memory(memory_type, query, search_method)` -- Search via BM25 or embedding similarity

**3. RL Training Loop** (via verl framework, `memalpha/llm_agent/generation.py`)
The `MemoryGenerationManager` orchestrates training:
- Processes text in chunks, feeding each to the memory agent
- The agent generates memory operations as structured tool calls
- After all chunks are processed, a separate QA model answers questions using only the constructed memory
- Rewards are computed based on QA accuracy (primary), memory compression (beta), and content-type correctness (gamma)
- GRPO (Group Relative Policy Optimization) updates the agent's weights

**4. Memory Server** (`memory_server.py`)
A Flask-based server that handles the QA evaluation phase. It receives constructed memories and questions, builds system prompts from the memory state, and generates answers using a large model (Qwen3-32B).

The overall training loop:

```
For each training example:
  1. Split source text into chunks
  2. For each chunk:
     a. Build prompt with current memory state + chunk content
     b. Generate memory operations (tool calls) from trainable 4B model
     c. Execute operations, updating Memory object
  3. After all chunks: evaluate with QA using constructed memory
  4. Compute reward = QA_accuracy + beta*compression + gamma*content_type
  5. Update model weights via GRPO
```

## Core Mechanism

**The Memory Class** (`memory.py`) is the heart of the system. It maintains three memory stores in RAM:

```python
class Memory:
    core: str = ""                    # Max 512 tokens, always in context
    semantic: List[Dict[str, str]]    # [{id: content}, ...], general knowledge
    episodic: List[Dict[str, str]]    # [{id: content}, ...], specific events
    semantic_embedding_matrix: np.ndarray  # (N, 1536) for batch cosine similarity
    episodic_embedding_matrix: np.ndarray  # (N, 1536) for batch cosine similarity
```

Each memory item is a dict mapping a 4-character UUID to content string. Embeddings (text-embedding-3-small, 1536 dimensions) are maintained in parallel numpy matrices for efficient batch similarity search.

**Dual search modes.** Memory search supports two methods:
1. **BM25** (keyword-based): Tokenizes query and corpus, uses rank_bm25 library for sparse retrieval. Fast, good for exact keyword matching.
2. **Text Embedding** (semantic): Computes cosine similarity between query embedding and all stored embeddings in a single batch operation. Better for paraphrase matching.

**The rendering system** produces different system prompts based on the agent's mode:

- **"memorie" mode** (during chunk processing): Full memory state shown, instructions focus on analyzing and storing information. Key instruction: "you will be queried only once, so make sure to call all the memory insertion functions in one turn."
- **"chat" mode** (during QA): Memory is shown with BM25-retrieved relevant items. Instructions include: "Be an active searcher and try to use all kinds of queries and search methods to find the results."
- **"rethink" mode** (consolidation): Instructions focus on redundancy elimination, information synthesis, and memory reorganization. The agent can delete, update, and create inferred memories.

**The RL reward function** is a weighted combination:

```
reward = QA_accuracy + beta * compression_reward + gamma * content_type_reward
```

- **QA accuracy**: Primary signal. Did the memory system contain enough information to answer evaluation questions correctly?
- **Compression reward** (beta=0.05): Penalizes excessive memory size. Encourages the agent to store information efficiently rather than dumping everything.
- **Content type reward** (gamma=0.1): Measures whether information was placed in the correct memory type (semantic vs. episodic vs. core). Validated via a separate analysis function.

The hyperparameters beta and gamma control the tradeoff between information retention and memory efficiency. The paper's ablation studies show that both components are necessary: beta=0 (no compression penalty) leads to bloated memories, while gamma=0 (no content-type reward) leads to misclassified entries.

**The training data pipeline** constructs training examples from diverse sources: SQuAD, HotpotQA, BookSum, PubMed-RCT, PerlTQA, TTL, and LME datasets. Each example contains source text (chunked to ~30K tokens) and evaluation questions with ground-truth answers. The `process_data.py` script handles dataset-specific preprocessing and merging.

**The MemoryGenerationManager** (`memalpha/llm_agent/generation.py`) handles the complex orchestration of RL training:

1. **Chunk processing**: Each chunk is formatted with the current memory state using a Qwen-specific template, then fed to the trainable model for generation.
2. **Response parsing**: The model's output is parsed for tool calls (memory_insert, memory_update, memory_delete, done). Responses are truncated at the first complete tool call boundary.
3. **Tool execution**: Parsed tool calls are executed against the Memory object, with success/failure tracking.
4. **Multi-turn generation**: If the model's thinking is incomplete (no `</think>` tag), a continuation prompt is injected: "Considering the limited time by the user, I have to give the solution based on the thinking directly now." The continuation tokens are masked from the loss computation.
5. **GPU padding**: For multi-GPU training, batch sizes are padded to be divisible by the number of GPUs.
6. **QA evaluation**: After memory construction, questions are sent to the memory server for evaluation using the large QA model.

## Design Tradeoffs

**Small trainable model + large evaluator.** The memory agent is only 4B parameters (Qwen3-4B), but the QA evaluator is 32B parameters (Qwen3-32B). This asymmetry is deliberate: the memory construction task (deciding what to store) is simpler than the QA task (reasoning with stored information), so a smaller model suffices for the former. The large evaluator ensures that QA accuracy is a reliable reward signal.

**Three-tier memory vs. flat storage.** The core/semantic/episodic split adds complexity but enables different retrieval strategies. Core memory (always in context) holds the most critical information. Semantic memory (searchable) holds factual knowledge. Episodic memory (searchable, timestamped) holds event-specific information. An alternative flat key-value store would be simpler but would lose the structured organization that helps the QA model reason.

**BM25 + embedding dual search.** Rather than choosing one search method, the system provides both and lets the agent (or the QA model) choose. BM25 is better for exact keyword queries; embeddings are better for semantic similarity. This flexibility increases token cost (search results from either method consume context) but improves recall.

**Fixed 512-token core memory limit.** Core memory is capped at 512 tokens and always present in the system prompt. This is a hard constraint that forces the agent to be highly selective about what goes in core memory. The cap prevents context bloat but may miss important information in complex scenarios.

**Chunk-level processing.** The agent processes text one chunk at a time, making memory decisions incrementally. This mimics streaming information processing but means the agent cannot see future chunks when making storage decisions. Information that seems unimportant in isolation may become crucial when combined with later context.

**RL vs. supervised learning.** The choice of RL (GRPO specifically) over supervised fine-tuning is motivated by the delayed-reward nature of memory construction: the quality of memory operations is only measurable after all chunks are processed and QA is attempted. Supervised learning would require ground-truth memory operations, which do not naturally exist.

## Failure Modes & Limitations

**Cold-start memory quality.** At the beginning of processing (few chunks seen), the memory is sparse and may not contain enough context for the agent to make good storage decisions. Early chunks may be stored too verbatim (no compression) because the agent has not yet seen enough context to know what is important.

**Embedding staleness.** Embeddings are computed at insertion time and updated at update time, but the embedding model (text-embedding-3-small) is fixed. If memory content evolves through consolidation, the embeddings may become slightly misaligned with the actual content.

**Memory consolidation timing.** The "rethink" mode for memory consolidation is available but the training loop processes chunks sequentially without explicit consolidation triggers. In practice, the memory agent must learn when to consolidate versus when to keep adding, which is a difficult credit assignment problem.

**QA model dependency.** The system's evaluation quality depends entirely on the QA model (Qwen3-32B). If the QA model has weaknesses (e.g., poor math reasoning), the reward signal will be noisy, potentially training the memory agent to optimize for the QA model's biases rather than true information quality.

**Dataset-specific prompts.** The `prompts_wrt_datasource.yaml` file contains dataset-specific prompt templates, including per-dataset flags for whether to enable core memory. This suggests the optimal memory configuration varies by domain, and the model may not generalize perfectly to out-of-distribution data despite the claimed 400K+ generalization.

**Memory server as bottleneck.** The Flask-based memory server processes QA requests synchronously. During training with large batch sizes, the QA evaluation step becomes a bottleneck. The server uses a Qwen3-32B model which requires significant GPU resources.

**No forgetting mechanism.** The memory system can only grow (insert) or manually shrink (delete). There is no automatic forgetting or decay mechanism for old, potentially irrelevant memories. Over very long sequences, the memory may accumulate stale information that dilutes search results.

## Integration Patterns

**Memory-as-a-service architecture.** The memory server (`memory_server.py`) exposes a REST API that accepts memory state and questions, making it possible to deploy memory construction and QA evaluation as separate services. This separation enables the memory agent to run on edge devices while QA evaluation runs on GPU-equipped servers.

**Tool-use protocol.** The memory agent interacts with the memory system through a standard OpenAI-style tool-calling protocol. The `functions.py` module defines tool schemas that are passed to the model as `tools` parameter. This means the memory agent can be replaced with any model that supports tool calling.

**verl RL framework integration.** The training pipeline is built on the verl framework, which provides distributed RL training infrastructure (FSDP, Megatron, Ray). The `MemoryGenerationManager` integrates with verl's `DataProto` and `actor_rollout_wg` abstractions for multi-GPU rollout generation. This is important for reproducibility -- the system requires 4+ GPUs for training.

**Dual-model evaluation.** The training loop uses two models: the trainable 4B model for memory construction, and a fixed 32B model for QA evaluation. This pattern (small policy model + large reward model) is common in RLHF but novel in the memory construction domain.

**Dataset-agnostic pipeline.** The `process_data.py` script supports 7+ datasets with a unified output format (parquet files with chunks and QA pairs). This makes it straightforward to train on custom datasets -- just implement a new dataset processor that produces the same schema.

## Deep Dive: The RL Training Pipeline

### The MemoryGenerationManager (memalpha/llm_agent/generation.py)

The `MemoryGenerationManager` is the most complex component, orchestrating the entire training loop across multiple GPUs. The `run_memory_loop()` method processes batches of training examples, each containing:

1. **chunks**: List of text segments per example
2. **questions_and_answers**: QA pairs for evaluation
3. **data_sources**: Dataset identifiers for source-specific prompting

The main loop iterates through chunks, maintaining per-example `Memory` objects that accumulate state across chunks. For each chunk:

1. The chunk text is formatted into a prompt using a dataset-specific template from `prompts_wrt_datasource.yaml`, including the current memory state rendered via `Memory.render_system_prompt(status='memorie')`.

2. The prompt is tokenized and fed to the trainable model for generation via `_generate_with_gpu_padding()`, which handles multi-GPU padding (batch sizes must be divisible by GPU count).

3. Generated responses are post-processed by `_postprocess_responses()`, which truncates at the first complete tool call boundary (`</memory_insert>`, `</memory_update>`, `</memory_delete>`, or `</done>`).

4. If thinking is enabled and the response lacks a `</think>` close tag, a continuation prompt is injected: "Considering the limited time by the user, I have to give the solution based on the thinking directly now." This forces the model to commit to an action. The injected tokens are masked from the loss computation to avoid training on artificial completions.

5. Tool calls are parsed and executed against the per-example Memory object. Each call tracks success/failure for the function_call_reward.

After all chunks are processed, the QA evaluation phase sends constructed memories and questions to the memory server, which produces answers using Qwen3-32B.

### The Evaluation Metrics (memalpha/llm_agent/metrics.py)

The evaluation system supports multiple metrics across different benchmark types:

- **Standard metrics**: Exact match, F1 score (token overlap), substring exact match, ROUGE-L (F1 and recall)
- **EventQA**: Binary recall (all answer elements must be present)
- **Choice tasks**: Substring matching with option verification
- **RULER/NIAH**: Recall across multiple answer elements
- **Recommendation systems**: Recall@1, Recall@5, Recall@10 with fuzzy movie name matching via rapidfuzz

The text normalization pipeline strips articles, punctuation, and extra whitespace before comparison. The `drqa_metric_max_over_ground_truths()` function handles multiple valid answers by taking the maximum score across all ground truths.

Text chunking for training uses sentence-level tokenization via NLTK, with configurable chunk sizes (default 4096 tokens for training data, 10000 tokens for longer contexts). Sentence boundaries are preserved to maintain coherence within chunks.

### The Tool Function Architecture (functions.py)

The tool definitions use a clean decorator pattern with `Parameter` and `ToolFunction` classes. Notably, the schema generation is dynamic -- `to_schema(memory)` filters available memory types based on the Memory instance's configuration:

- If `including_core=False`, the `core_memory` option is removed from `memory_type` enum parameters
- If a memory type is disabled via `disabled_memory_types`, it is excluded from tool schemas
- If all enum values for a parameter are filtered out, the entire tool is skipped (returns None)

This means the model sees different tool schemas depending on the memory configuration, which varies by dataset. The `MEMORY_TOOL_FUNCTIONS` list includes NewMemoryInsert, MemoryUpdate, MemoryDelete. The `SEARCH_TOOL_FUNCTIONS` list includes SearchMemory (for QA retrieval phase only).

### The verl Framework Integration

The training infrastructure uses ByteDance's verl framework (a fork/extension appears in the `verl/` directory). Key components:

- **MemoryBuffer** (`verl/utils/memory_buffer.py`): Contiguous GPU memory management with 128-bit alignment for CUDA memory efficiency. Supports building memory references that share underlying GPU tensors across model parameters.
- **DataProto**: A batch data container that combines tensor batches with metadata dictionaries. Supports device transfer and serialization.
- **Model support**: Qwen2, LLaMA, and Qwen2.5-VL architectures via both HuggingFace Transformers and Megatron backends.
- **Distributed training**: FSDP and Megatron model parallelism with checkpoint management for training state preservation.

The `_generate_with_gpu_padding()` wrapper handles a common distributed training pitfall: when batch sizes are not evenly divisible by the GPU count, padding sequences (copies of the first batch element) are added, and results are trimmed after generation. This avoids distributed all-reduce failures from uneven batch sizes.

## Benchmarks & Performance

**Generalization from 30K to 400K+ tokens (13x).** The most striking result is that the model, trained on 30K-token contexts, generalizes to sequences of 400K+ tokens. This suggests that the memory construction skill is transferable across context lengths -- the agent learns general principles of what to store and when, not length-specific heuristics.

**State-of-the-art on MemoryAgentBench.** The paper reports significant improvements over existing memory-augmented agents including MemAgent-14B, MEM1, and long-context baselines (Qwen3-32B full context, GPT-4o-mini). The improvements are particularly large on tasks requiring accurate retrieval and long-range understanding.

**Ablation results (from README):**
- Beta=0.05, Gamma=0.1 (main config): Best overall performance
- Beta=0.0, Gamma=0.1 (no compression): Memory bloat, similar accuracy but worse efficiency
- Beta=0.05, Gamma=0.0 (no content-type): Misclassified memories, reduced accuracy
- Beta=0.2/0.4, Gamma=0.1 (high compression): Too aggressive compression, accuracy drops

**Training efficiency.** The 4B model is significantly cheaper to train and deploy than the 32B evaluation model. At inference time, only the 4B model is needed for memory construction; the QA model can be any capable LLM.

**Comparison to heuristic approaches.** The RL-trained approach outperforms rule-based memory systems (like Mem0, Letta/MemGPT) that use fixed heuristics for memory encoding. The key advantage is that the RL agent learns task-dependent encoding strategies -- for fact-heavy text it stores more semantic memories, for narrative text it stores more episodic memories, and it learns to use core memory for the most critical invariants.

The most significant contribution of Mem-alpha is demonstrating that memory management itself can be learned end-to-end through RL, rather than being hand-designed. This opens a new research direction: instead of designing better memory architectures, train the agent to use whatever memory architecture is available. The 13x generalization result suggests that memory construction is a general capability that transfers across context lengths and domains, similar to how reading comprehension transfers across document types. The practical implication for knowledge base systems is that the encoding strategy (what to store, where, in what form) may matter more than the storage mechanism itself, and that this strategy can be optimized through experience rather than engineering.
