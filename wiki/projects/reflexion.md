# Reflexion

> A framework that reinforces language agents not by updating weights but through verbal reflection -- agents reflect on task feedback, maintain reflective text in an episodic memory buffer, and use it to make better decisions on subsequent trials.

## What It Does

Reflexion enables LLM agents to learn from trial-and-error without expensive fine-tuning. After each task attempt, the agent generates a verbal self-reflection analyzing what went wrong and what could be improved. These reflections are stored in an episodic memory buffer and injected into subsequent attempts as additional context. The agent gets better at the same task over multiple trials, achieving sub-linear sample efficiency.

## Architecture

Reflexion has three components working in a loop:

- **Actor**: The LLM agent that attempts tasks (sequential decision-making, coding, language reasoning)
- **Evaluator**: Provides feedback signals -- either scalar values (pass/fail, score) or free-form language (error messages, test output). Feedback sources can be external (compilers, APIs, environments) or internally simulated
- **Self-Reflection**: The agent generates natural language analysis of its failure, stored in an episodic memory buffer. On the next trial, reflections are included in the prompt to guide better decision-making

The key insight is that linguistic feedback is cheaper and more informative than gradient updates. Instead of backpropagating through model weights, the agent writes down what it learned and reads it back later.

## Key Numbers

- **91% pass@1 on HumanEval** coding benchmark, surpassing GPT-4's 80% at the time of publication
- Published March 2023, 7 authors (Princeton, Northeastern)
- Demonstrated on three task types: sequential decision-making, coding, language reasoning
- No model fine-tuning required -- improvement comes entirely from context

## Strengths

- The verbal reinforcement pattern is immediately transferable to any LLM agent system -- store reflections, inject them on retry, iterate
- Works with various feedback signal types (scalar, language) and sources (external, simulated), making it adaptable across domains

## Limitations

- Requires multiple trials on the same task, which may not be available in single-shot production scenarios
- The episodic memory buffer grows with each trial; without pruning, it eventually hits context window limits
- Self-reflection quality depends on the model's ability to accurately diagnose its own failures

## Alternatives

- [voyager.md](voyager.md) -- skill library approach that accumulates capabilities across tasks rather than improving on a single task through reflection
- [memento-skills.md](memento-skills.md) -- deployment-time skill evolution that combines reflection with a persistent skill registry

## Sources

- [shinn-reflexion-language-agents-with-verbal-reinforceme.md](../../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) -- "Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision-making in subsequent trials."
