# MemoryBank

> A memory mechanism for LLMs inspired by the Ebbinghaus Forgetting Curve that selectively forgets or reinforces memories based on significance and time passage -- enabling natural memory evolution for long-term AI companionship.

## What It Does

MemoryBank gives LLMs a human-like memory system where memories are not static records but dynamic entities that strengthen or decay over time. The system stores conversation history, summarizes key facts, and applies a forgetting curve mechanism that determines which memories persist and which fade. This enables the AI to maintain coherent personality models and conversation continuity across long-horizon interactions without unbounded context growth.

SiliconFriend, built on MemoryBank, is a bilingual (Chinese/English) LLM chatbot designed for long-term AI companionship. It demonstrates empathic responses, relevant memory recall, and user personality understanding across extended interaction periods.

## Architecture

Three core mechanisms:

- **Memory Storage**: Conversation history is stored and periodically summarized by the LLM into structured facts, similar to how humans consolidate episodic memories into semantic knowledge
- **Ebbinghaus Forgetting Curve**: Each memory has a strength value that decays with time and strengthens with recall. Memories that are frequently accessed persist; memories that are never recalled gradually fade. Significance weighting ensures important memories decay more slowly
- **Memory Retrieval**: At query time, the system retrieves relevant memories weighted by both semantic similarity and memory strength, naturally prioritizing memories that are both relevant and well-reinforced

The system integrates with both closed-source (ChatGPT) and open-source models (ChatGLM, BELLE). SiliconFriend uses LoRA fine-tuning on 38K Chinese psychological dialog data for enhanced empathy.

## Key Numbers

- **419 GitHub stars**, 60 forks
- Written in Python, MIT licensed
- 100 manually crafted probing questions for memory evaluation
- Bilingual evaluation data (Chinese and English)
- LoRA checkpoints available for ChatGLM and BELLE
- Requires Tesla A100 80GB GPU for full operation

## Strengths

- The Ebbinghaus forgetting curve provides a principled mechanism for memory management that avoids both unbounded growth (keeping everything) and arbitrary pruning (fixed TTL)
- The approach mimics human memory behavior, creating more natural interactions in companionship scenarios where users expect the AI to remember important details and forget trivial ones

## Limitations

- The forgetting curve parameters need tuning for different use cases -- companionship, customer support, and knowledge work have different memory persistence requirements
- Relies on LLM calls for memory summarization (via OpenAI API), adding latency and cost
- GPU requirements (A100 80GB) limit accessibility for individual developers

## Alternatives

- [a-mem.md](a-mem.md) -- dynamic memory evolution through Zettelkasten-inspired interconnected networks rather than forgetting curves
- [memevolve.md](memevolve.md) -- meta-evolution of the memory architecture itself, going beyond content-level forgetting
- [mem0.md](mem0.md) -- multi-level memory without temporal decay, focusing on extraction and retrieval rather than selective forgetting

## Sources

- [zhongwanjun-memorybank-siliconfriend.md](../../raw/repos/zhongwanjun-memorybank-siliconfriend.md) -- "Inspired by the Ebbinghaus Forgetting Curve theory, MemoryBank incorporates a unique memory updating mechanism that mimics human-like memory behavior. This enables the AI to selectively forget or reinforce memories based on their significance and the passage of time."
