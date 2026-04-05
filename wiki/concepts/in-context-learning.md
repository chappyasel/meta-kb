---
entity_id: in-context-learning
type: concept
bucket: context-engineering
sources:
  - repos/microsoft-llmlingua.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T05:41:10.225Z'
---
# In-Context Learning

## What It Is

In-context learning (ICL) is the ability of a language model to adapt its behavior based on examples or instructions placed in the input prompt, without any gradient updates to model weights. You show the model a few input-output pairs, and it infers the pattern and applies it to a new query.

The term was popularized by the GPT-3 paper (Brown et al., 2020), which demonstrated that a sufficiently large language model could perform tasks it was never explicitly trained for, simply by conditioning on demonstrations. This was surprising: prior machine learning intuition held that adaptation required parameter updates.

ICL sits at the core of how most practitioners actually use LLMs today. Every time you write a prompt with examples, every time a system prompt defines behavior, every time a RAG pipeline injects retrieved documents before the question, ICL is the underlying mechanism.

## Why It Matters

ICL changes the economics of adaptation. Before it, deploying a model on a new task meant collecting labeled data, running fine-tuning, managing training infrastructure, and re-deploying. With ICL, the same model can handle radically different tasks within a single inference pass. The cost of task-switching drops from days to milliseconds.

This unlocks a class of systems that would otherwise be impractical: agents that accumulate task-specific context as they work, RAG pipelines that inject domain knowledge at query time, prompt compression systems that fit more context into fewer tokens, and automated research workflows that chain together specialized behaviors.

The Voyager agent illustrates the ceiling of what ICL can accomplish. Voyager builds a persistent "skill library" of executable code, retrieves relevant skills into the context window at each decision point, and uses GPT-4's ICL capability to compose those skills into new behaviors. The result is an agent that obtains 3.3x more unique items and unlocks tech tree milestones up to 15.3x faster than prior approaches, without any fine-tuning. Every new capability is learned through context, not gradient descent.

## How It Works

### The Mechanics

When a transformer processes a prompt containing examples, the attention mechanism allows later tokens to attend to the demonstrated input-output relationships. The model effectively computes a function from the examples, then applies that function to the query. This happens entirely in the forward pass.

The key insight from interpretability research: ICL is not retrieval from memory. The model is not looking up stored examples. It is performing something closer to implicit Bayesian inference, using the examples to identify a likely hypothesis about the task, then applying that hypothesis. Evidence for this comes from studies showing that ICL works even when labels in the examples are randomized, provided the format is consistent. The format and distribution of inputs matter more than the correctness of the labels, at least for simpler tasks.

### What the Context Actually Does

Different elements of context contribute differently:

**Demonstrations** show the model the input-output format and the distribution of inputs. They anchor the model to a particular task interpretation. With zero examples (zero-shot), the model relies entirely on its pretraining distribution. With one or more examples (few-shot), it shifts toward the demonstrated pattern.

**Instructions** in natural language specify the task more directly. Modern models respond well to explicit instructions, sometimes outperforming few-shot prompting for well-specified tasks.

**Retrieved documents** inject factual grounding. This is the RAG pattern: the model cannot know what changed last Tuesday, but if you put the relevant document in the context, it can reason over it. Microsoft's LLMLingua work addresses the bottleneck that emerges here: retrieved documents can be verbose, and context windows are finite. LLMLingua compresses prompts by up to 20x using a smaller model to score token importance, then removing low-scoring tokens before passing the compressed prompt to the larger model. The compression happens before inference, so the target model never sees the removed tokens.

**Accumulated task context** is what makes agentic systems possible. Voyager's autoresearch loop maintains a `findings.md` and `research-state.yaml` that persist across sessions. At each step, relevant prior findings get injected into the context, giving the current inference step access to everything the agent has learned.

### Scaling Effects

ICL capability scales with model size in a threshold-like fashion. Small models (under roughly 7B parameters) show weak or unreliable ICL. Larger models show increasingly reliable ICL, and the largest models generalize to tasks quite far from their training distribution. This is part of why GPT-3's ICL results were surprising: the capability appeared discontinuously as scale increased.

The number of examples also matters, but with diminishing returns and sometimes with interference. More examples improve performance up to a point, after which the context window fills and performance can degrade as the model loses track of the task framing.

## How Practitioners Use It

### Few-Shot Prompting

The canonical use case: provide two to five examples of the target behavior before the query. Format matters. Consistency of format across examples matters. The examples should cover the input distribution the model will encounter.

A concrete failure mode: if your examples all come from one subdomain (say, formal English), the model's ICL will be miscalibrated for inputs from another subdomain (informal English, code-switching, domain jargon). The model infers the task from the examples you give, not the task you intended.

### Chain-of-Thought

Chain-of-thought (CoT) prompting is ICL applied to reasoning processes rather than final answers. Instead of showing input → output pairs, you show input → reasoning steps → output. The model learns to generate intermediate reasoning before committing to an answer. This improves performance on multi-step arithmetic, logical reasoning, and tasks that require planning. Zero-shot CoT (the "let's think step by step" trick) works because the model has seen enough reasoning in pretraining to generate useful steps without explicit demonstration.

### RAG and Context Injection

In retrieval-augmented generation, ICL is the mechanism by which retrieved documents become useful. The model reads the documents in context and uses them to answer the question. The quality of this depends on: how relevant the retrieved documents are, how much context the model can effectively attend to, and whether the model has learned (through pretraining or RLHF) to prefer document-grounded answers over parametric memory.

Context length is the binding constraint. Longer contexts are more expensive and, past certain lengths, models lose coherence. LLMLingua's compression approach is a direct response to this constraint.

### Agentic Loops

Voyager's architecture shows what ICL looks like inside an agent. At each decision step, the agent retrieves relevant skills from its library and constructs a prompt containing: the current state, the task objective, relevant prior skills (as executable code), and recent execution feedback. GPT-4 generates new code conditioned on all of this. If execution fails, the error gets appended to the context and the model tries again. Self-verification (asking the model to check whether the task was completed) closes the loop.

This pattern, where the context accumulates evidence across iterations, is what allows the agent to compound capabilities without fine-tuning. The skill library is not model weights; it is structured external memory that gets injected into context as needed.

### Prompt Compression

When context is expensive or limited, prompt compression reduces the token count while preserving the semantic content needed for ICL. LLMLingua uses a smaller model (e.g., GPT-2 or LLaMA-7B) to assign perplexity scores to tokens, then removes tokens with high perplexity (unexpected tokens are often important) or low perplexity (predictable tokens carry less information) according to the compression strategy. The compressed prompt gets passed to the larger model, which performs ICL on the condensed representation. LongLLMLingua adds question-aware reordering to address the "lost in the middle" phenomenon, where models attend poorly to content in the middle of long contexts.

## Failure Modes

### Context Sensitivity and Fragility

ICL is sensitive to surface features that should be irrelevant. The order of examples matters. The exact wording of instructions matters. Adding or removing a single example can flip performance on edge cases. This fragility is well-documented empirically but not well-understood mechanistically. In production, it means that prompt changes require re-evaluation, and "prompt engineering" is partly empirical search over a poorly understood optimization landscape.

### Label Randomization Robustness (and Its Limits)

Studies showing ICL works with random labels have been misread to imply that labels do not matter at all. They matter for tasks requiring precise input-output mappings. The finding is better stated as: format and input distribution dominate for simple classification tasks, but for tasks requiring the model to learn a specific function, label accuracy matters more.

### Distribution Mismatch

If the examples in the prompt come from a different distribution than the actual queries, ICL will be miscalibrated. In RAG systems, this manifests when retrieved documents are topically related but stylistically or structurally different from what the model needs to reason over. The model "learns" from the retrieved context, but it learns the wrong function.

### Long-Context Degradation

Models attend unevenly to long contexts. Content near the beginning and end of the context window receives more attention than content in the middle. For RAG systems that inject many documents, relevant information can fall into the middle and receive insufficient attention. LongLLMLingua addresses this by reordering retrieved content based on relevance to the query.

### Context Window as Bottleneck

ICL requires everything the model needs to be present in the context at inference time. Skills, facts, examples, instructions, conversation history: all of it competes for the same finite window. As systems grow more complex, context management becomes an engineering problem in its own right. Voyager handles this through selective retrieval from the skill library; LLMLingua handles it through compression; other systems handle it through summarization or hierarchical context structures.

## What ICL Cannot Do

ICL does not update model weights. The model's parametric knowledge stays fixed. If you need the model to learn a genuinely new fact or capability that is not representable through in-context demonstration, fine-tuning is required. ICL can teach a model to format outputs differently, follow a new schema, or apply a pattern it has seen in pretraining, but it cannot give the model knowledge it fundamentally lacks.

ICL also does not generalize the way fine-tuning does. A few-shot ICL adaptation exists only for the duration of that inference call. The next call starts fresh unless the system explicitly reconstructs the same context.

## Relationship to Other Concepts

ICL is often contrasted with fine-tuning, but in practice they are complementary. Fine-tuning installs durable knowledge and behavioral tendencies into weights; ICL handles task-specific adaptation at inference time. The Voyager system uses GPT-4 via API (no fine-tuning) but depends on ICL for all its adaptive behavior. LLMLingua is fine-tuned (LLMLingua-2 uses data distillation from GPT-4 to train a BERT-level encoder for token classification) specifically to improve the utility of ICL in downstream systems.

DSPy, Guidance, Instructor, and Outlines are all tools for structured ICL: they constrain or optimize the prompts and outputs that form the ICL interaction. They treat ICL as programmable rather than manually crafted.
