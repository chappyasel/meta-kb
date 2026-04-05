# Agentic Context Engine (ACE)

> A persistent learning framework that makes AI agents improve from experience -- maintaining a queryable Skillbook of strategies that evolves with every task, doubling consistency and cutting token usage by 49%.

## What It Does

ACE adds a persistent learning loop to AI agents. It maintains a **Skillbook** -- a collection of strategies extracted from execution traces -- that gets injected into future tasks. Three specialized roles manage the loop: the Agent executes tasks enhanced with Skillbook strategies, the Reflector analyzes execution traces to extract what worked and what failed, and the SkillManager curates the Skillbook by adding, refining, and removing strategies.

The key innovation is the Recursive Reflector: instead of summarizing traces in a single pass, it writes and executes Python code in a sandboxed environment to programmatically search for patterns, isolate errors, and iterate until it finds actionable insights.

## Architecture

Built on a composable pipeline engine with `requires`/`provides` contracts:

- **Pipeline**: `AgentStep -> EvaluateStep -> ReflectStep -> UpdateStep -> ApplyStep -> DeduplicateStep`
- **Runners**: LiteLLM (batteries-included), Core (batch epochs), Trace Analyser (learn from logs), browser-use, LangChain, Claude Code
- **Skillbook**: Persistent strategy collection with deduplication, refinement, and removal. Strategies are learned from corrections (`learn_from_feedback`) or trace analysis (`learn_from_traces`)
- **Backend**: PydanticAI agents with structured output validation, routing to 100+ LLM providers through LiteLLM

## Key Numbers

- **2,112 GitHub stars**, 264 forks
- **2x consistency** (doubles pass^4 on Tau2 airline benchmark with 15 learned strategies)
- **49% token reduction** in browser automation over a 10-run learning curve
- **$1.50 learning cost** to translate 14K lines Python-to-TypeScript with zero build errors
- Python, MIT licensed, available as hosted solution at kayba.ai

## Strengths

- No fine-tuning, no training data, no vector database required -- learning happens purely through reflection on execution traces and feedback
- The Recursive Reflector's code-execution approach to trace analysis produces higher-quality insights than single-pass summarization

## Limitations

- Strategy quality depends on the reflector's ability to identify patterns -- noisy or unusual failure modes may produce poor or misleading strategies
- The Skillbook grows over time and needs periodic deduplication to avoid injecting redundant or contradictory strategies

## Alternatives

- [memento-skills.md](memento-skills.md) -- similar deployment-time learning but organized around executable skill folders rather than text strategies
- [compound-product.md](compound-product.md) -- applies the self-improving loop to product development with report-driven priorities

## Sources

- [kayba-ai-agentic-context-engine.md](../../raw/repos/kayba-ai-agentic-context-engine.md) -- "ACE adds a persistent learning loop that makes them better over time... Doubles pass^4 on Tau2 airline benchmark with 15 learned strategies, no reward signals."
