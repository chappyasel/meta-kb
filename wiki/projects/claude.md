---
entity_id: claude
type: project
bucket: agent-systems
abstract: >-
  Anthropic's family of large language models powering Claude.ai, Claude Code,
  and the API; differentiates through Constitutional AI training, strong
  instruction-following, and extended context handling up to 200K tokens.
sources:
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/memodb-io-acontext.md
  - repos/aiming-lab-simplemem.md
  - repos/helloruru-claude-memory-engine.md
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/natebjones-projects-ob1.md
  - repos/anthropics-skills.md
  - repos/greyhaven-ai-autocontext.md
  - repos/caviraoss-openmemory.md
  - repos/jmilinovich-goal-md.md
  - repos/letta-ai-letta-code.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/evoagentx-evoagentx.md
  - repos/maximerobeyns-self-improving-coding-agent.md
  - repos/yusufkaraaslan-skill-seekers.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/anthropics-skills.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/othmanadi-planning-with-files.md
related:
  - Claude Code
  - Anthropic
  - OpenAI
  - Cursor
  - Model Context Protocol
  - OpenAI Codex
  - Google Gemini
  - Windsurf
  - Agent Skills
  - claude.md
  - skill.md
  - Procedural Memory
  - Retrieval-Augmented Generation
  - GPT-4
  - OpenClaw
  - AutoResearch
  - A-MEM
last_compiled: '2026-04-05T20:20:46.218Z'
---
# Claude

## What It Is

Claude is Anthropic's family of large language models. The current generation includes Claude 4 Opus, Claude 4 Sonnet, Haiku 4.5, and several numbered variants (3.5 Sonnet remains widely deployed). Models are available through Claude.ai (consumer and Teams/Pro plans), the Anthropic API, and through AWS Bedrock and Google Cloud Vertex AI.

Anthropic trains Claude using Constitutional AI (CAI), a technique where the model evaluates and revises its own outputs against a set of principles rather than relying solely on human preference labels. This produces a model that tends to refuse harmful requests while staying helpful across a wide range of tasks, though the refusal calibration has shifted noticeably across generations.

Claude's primary differentiators in practice: long context handling (200K tokens on current models), instruction-following precision, and performance on code generation and reasoning tasks. The models power [Claude Code](../projects/claude-code.md), Anthropic's agentic coding tool, and are the default backbone for most projects in this wiki.

## Model Variants and Selection

**Claude 4 Opus**: Highest capability tier. Used for complex multi-step reasoning, architecture decisions, difficult debugging. Slowest and most expensive.

**Claude 4 Sonnet / Claude 3.5 Sonnet**: The practical workhorse. Sonnet 3.5 remains widely used because 4 Sonnet's improvement for many coding tasks is marginal while the cost increase is meaningful. Most agent systems default to Sonnet.

**Haiku 4.5**: Fast, cheap. Used for high-volume operations, evaluation loops, and agent subtasks where quality per call matters less than throughput. The GEPA benchmarks show Haiku 4.5 achieving 98.3% on Bleve with GEPA-evolved skills transferred from cheaper models, demonstrating that Haiku can match Sonnet-tier quality when well-scaffolded. [Source](../raw/deep/repos/gepa-ai-gepa.md)

Model selection in agent systems typically follows a two-tier pattern: a capable model (Sonnet or Opus) for planning and complex generation, Haiku for evaluation, summarization, and parallelizable subtasks.

## How It Works in Agent Systems

Claude exposes three primary surfaces for agent integration:

**Messages API**: Stateless request/response. The caller manages conversation history. Most agent frameworks build on this.

**Tools / Function Calling**: Claude can call named tools with typed parameters. The framework executes the tool and returns results. This is the mechanism underlying [Claude Code](../projects/claude-code.md)'s file editing, bash execution, and search operations.

**Extended Thinking**: On Opus and some Sonnet variants, Claude produces a scratchpad of reasoning before its final response. The scratchpad is visible to the caller and can be used for debugging or evaluation.

**Prompt Caching**: Anthropic's API supports caching stable prompt prefixes. The Hipocampus memory system [explicitly designs around this](../raw/deep/repos/kevin-hs-sohn-hipocampus.md): ROOT.md (~3K tokens, loaded every call) achieves ~90% cache hit rates, dropping effective cost from $3/MTok (uncached) to $0.30/MTok (cached). Any agent system making repeated calls with a stable system prompt should use caching.

**Model Context Protocol (MCP)**: Anthropic's open standard for connecting Claude to external tools and data sources. Claude acts as the MCP client; external servers expose tools Claude can invoke. [See MCP](../concepts/model-context-protocol.md).

## Key Numbers

Context window: 200K tokens input, 8K output (Sonnet/Haiku), higher on Opus. These are Anthropic-reported.

In GEPA benchmarks (independently run by external teams): Claude Haiku 4.5 with GEPA-optimized skills improved from 79.3% to 98.3% on Bleve, and from 93.9% to 100% on Jinja, with execution time dropping from ~175s to ~145s. [Source](../raw/deep/repos/gepa-ai-gepa.md) These results are from the GEPA paper and external deployers, not Anthropic marketing.

Databricks reported 90x cost reduction using open-source models plus GEPA over Claude Opus 4.1 on enterprise agent tasks. This is a self-reported case study, not independently audited. [Source](../raw/deep/repos/gepa-ai-gepa.md)

Claude's standard API benchmark scores (MMLU, HumanEval, MATH) are Anthropic self-reported. Independent validation is limited. Cross-lab comparisons on real-world tasks tend to show Claude competitive with GPT-4 class models on coding and instruction-following, weaker on some math reasoning benchmarks, stronger on long-document tasks.

## Strengths

**Long context coherence**: Claude handles 100K+ token inputs better than most alternatives. Document analysis, codebase-wide refactoring, and sessions with extensive history degrade more gracefully than on comparable models.

**Instruction-following precision**: Claude reliably respects formatting constraints, output length limits, and negative constraints ("don't include X"). This matters for agent systems where downstream parsing depends on structured output.

**Agentic scaffolding compatibility**: Claude's tool use and extended context make it well-suited for multi-step workflows. The planning-with-files pattern's 90-percentage-point improvement (2/30 → 29/30 pass rate) was measured specifically on Claude. [Source](../raw/deep/repos/othmanadi-planning-with-files.md)

**Skill transfer target**: GEPA benchmarks show skills optimized on cheaper models transfer to Claude with further improvement. Claude Haiku 4.5 receiving gpt-5-mini-evolved skills still gained, suggesting Claude is a reliable deployment target for externally-optimized capabilities. [Source](../raw/deep/repos/gepa-ai-gepa.md)

## Limitations

**Concrete failure mode**: Claude exhibits "lost in the middle" degradation on long contexts. After ~50 tool calls or very long conversations, the model tends to lose track of original goals stated early in the session. The planning-with-files hook pattern works around this explicitly by re-injecting task_plan.md before every tool call. [Source](../raw/deep/repos/othmanadi-planning-with-files.md) This is not a documentation gap; Manus AI identified it as requiring active mitigation.

**Unspoken infrastructure assumption**: Most agent systems assuming Claude assume Anthropic's API uptime and rate limits. Claude does not run locally. For air-gapped environments, regulated data contexts, or applications requiring sub-100ms latency, the entire API dependency becomes a blocker. AWS Bedrock and Google Vertex provide alternative hosting, but they add their own latency and terms constraints.

**Refusal calibration drift**: Refusal behavior differs across model versions and is not formally specified. Code that worked with Claude 3 Sonnet may trigger unnecessary refusals on some Claude 4 variants, or vice versa. Agent systems that depend on Claude reliably handling sensitive-adjacent tasks (security research, medical information, legal analysis) should test each model upgrade explicitly.

## When NOT to Use It

**Low-latency inference requirements**: Claude API calls typically take 1-5 seconds for non-streaming responses. For applications requiring response times under 500ms (real-time UI, high-frequency tool calls), Claude is the wrong choice.

**High-volume commodity tasks at minimal cost**: For tasks like batch classification, simple extraction, or summarization at millions of calls per day, open-source models (Llama 3, Mistral) hosted locally or on cheaper providers will be significantly cheaper without meaningful quality loss.

**Fully offline or air-gapped environments**: Claude requires API access. No local deployment option exists outside AWS Bedrock and Vertex, which themselves require network access.

**When the task requires fine-tuning**: Anthropic does not offer fine-tuning on Claude (unlike OpenAI's fine-tuning API for GPT-4o). Domains requiring custom behavior baked into weights rather than achieved through prompting must use other models.

## Unresolved Questions

**Context window cost at scale**: The 200K token context is technically available but economically punishing without prompt caching. Anthropic's public pricing for cache writes vs. reads creates a complicated calculation for systems that mix stable and dynamic context. No published analysis exists of real-world cost curves for different agent usage patterns.

**Constitutional AI specifics**: The exact principles in Claude's constitution are not public. This matters for compliance use cases where auditors need to verify what constraints the model operates under. Anthropic publishes papers on CAI methodology but not the current production constitution.

**Version pinning guarantees**: Anthropic does not provide long-term guarantees about model behavior for pinned version identifiers. `claude-3-5-sonnet-20241022` will eventually be deprecated. Migration planning for agent systems with hard dependencies on specific model behaviors is undocumented.

**Evaluation on real agentic tasks**: Most public benchmarks test Claude on single-turn tasks. Anthropic's own SWE-bench numbers exist, but comprehensive independent benchmarking of multi-step agent workflows is sparse. The GEPA and planning-with-files results are the most credible external data points, and both used Claude as a component rather than benchmarking it directly.

## Alternatives

**[GPT-4o / OpenAI](../projects/gpt-4.md)**: Better on structured output with JSON mode, slightly faster on typical requests, more mature fine-tuning support. Use GPT-4 class models when fine-tuning is required or when OpenAI's ecosystem integrations (Assistants API, fine-tuning) reduce integration work.

**[Google Gemini](../projects/google-gemini.md)**: Larger context window (1M tokens on Gemini 1.5 Pro), strong multimodal performance, competitive pricing on Vertex. Use Gemini when context exceeds 200K tokens or when deep Google Cloud integration is already in place.

**Llama 3 / Mistral (open-source)**: Local deployment, no API dependency, fine-tuning possible, cost-effective at scale. Use when data cannot leave your infrastructure, when fine-tuning on proprietary data is needed, or when per-call economics at high volume favor hosting costs over API fees.

**[OpenAI Codex / o-series](../projects/openai-codex.md)**: OpenAI's o1/o3 models show stronger performance on competition math and certain reasoning tasks. Use for applications where mathematical reasoning quality is the primary criterion and cost is secondary.

## Related Entities

- [Claude Code](../projects/claude-code.md): Anthropic's agentic coding tool built on Claude
- [Model Context Protocol](../concepts/model-context-protocol.md): Anthropic's standard for tool integration
- [Agent Skills](../projects/agent-skills.md): Plugin system for extending Claude's capabilities
- [Procedural Memory](../concepts/procedural-memory.md): Memory pattern implemented via Claude-readable markdown
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): Common pattern for extending Claude's knowledge
