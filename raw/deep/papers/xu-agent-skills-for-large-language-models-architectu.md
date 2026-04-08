---
url: 'https://arxiv.org/abs/2602.12430'
type: paper
author: 'Renjun Xu, Yang Yan'
date: '2026-02-12'
tags:
  - agentic-skills
  - agent-memory
  - context-engineering
  - skill-composition
  - model-context-protocol
  - security-governance
  - skill-registry
  - autonomous-skill-discovery
  - progressive-disclosure
key_insight: >-
  The SKILL.md three-level progressive disclosure architecture (metadata ->
  instructions -> resources) is the key pattern: it minimizes context window
  consumption while providing arbitrarily deep procedural knowledge on demand.
  But the 26.1% vulnerability rate in community skills means security governance
  (four-tier trust model with verification gates) is not optional -- it is a
  prerequisite for any production skill ecosystem.
deep_research:
  method: paper-full-text
  text_length: 14000
  analyzed_at: '2026-04-04'
  original_source: papers/xu-agent-skills-for-large-language-models-architectu.md
relevance_scores:
  topic_relevance: 10
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 9.3
  reason: >-
    Directly covers SKILL.md architecture, progressive context loading, and
    security governance for agent skill ecosystems — core topics for context
    engineering and agent architecture pillars with immediately actionable
    patterns.
---

## Architecture Overview

This survey provides the first comprehensive treatment of agent skills -- composable packages of instructions, code, and resources that LLM agents load on demand to extend capabilities without retraining. The paper organizes the field along four axes:

1. **Architectural foundations:** The SKILL.md specification, progressive context loading, and MCP integration
2. **Skill acquisition:** RL with skill libraries (SAGE), autonomous discovery (SEAgent), compositional synthesis
3. **Deployment at scale:** Computer-use agent (CUA) stacks, GUI grounding, benchmark progress
4. **Security:** Vulnerability analysis of community skills, proposed governance framework

The central architectural innovation is distinguishing skills from tools. Tools are atomic function calls that return results (e.g., calling a search API). Skills reshape an agent's preparation and understanding before task execution -- they modify context and permissions rather than producing direct outputs. A skill is more like an onboarding guide for a new hire than a function signature.

Skills and MCP are complementary, not competing:
- Skills provide "what to do" (procedural knowledge, context, instructions)
- MCP provides "how to connect" (tool connectivity, server endpoints, data access)
- A skill might instruct an agent to use a particular MCP server, specify how to interpret outputs, and define fallback strategies

## Core Mechanism

### Three-Level Progressive Disclosure

The defining architectural pattern. Information is staged to minimize context window consumption:

**Level 1 -- Metadata (~dozen tokens):** Skill name and one-line description. Always loaded, always available for routing decisions. This is what the agent uses to decide whether a skill is relevant.

**Level 2 -- Instructions (full procedural guidance):** Loaded only when the skill triggers. Contains the complete "how to do it" knowledge. Injected into conversation context as hidden messages.

**Level 3 -- Resources (technical appendices, scripts, reference materials):** Loaded on-demand within the skill execution. May include executable scripts, API documentation, configuration templates.

This three-stage architecture solves the fundamental tension between having access to many skills and the finite context window. An agent can "know about" hundreds of skills at Level 1 cost (~dozen tokens each) while only paying the full context cost for the 1-2 skills actively in use.

### Skill Execution Lifecycle

1. **Matching:** User request aligns with skill descriptions (Level 1 metadata)
2. **Loading:** Skill instructions and resources inject into conversation context
3. **Context modification:** Execution context updates to activate pre-approved tools and permissions
4. **Execution:** Agent proceeds with enriched knowledge and expanded capabilities

### Tool Use Integration Advances

Three mechanisms deepen skill-tool integration:
- **Tool Search Tool:** Programmatic discovery from large registries, reducing token overhead by up to 85%
- **Programmatic Tool Calling:** Model executes tools via code rather than structured JSON, improving accuracy from 79.5% to 88.1%
- **Tool Learning:** Models study documentation and improve invocation quality over time

### Skill Acquisition Methods

**SAGE (Skill Augmented GRPO for self-Evolution):** RL-based skill learning using sequential rollout -- agents train across task chains where earlier skills become available for reuse. Results on AppWorld: 72.0% task goal completion, 60.7% scenario completion, 8.9% absolute improvement over baseline, 26% fewer interaction steps, 59% fewer generated tokens.

**SEAgent (Autonomous Discovery):** Discovers skills for previously unseen software through a world state model, curriculum generator, and specialist-to-generalist training pipeline. Results on OSWorld: 34.5% success vs 11.3% baseline (+23.2 percentage points).

**CUA-Skill (Structured Knowledge Engineering):** Human expertise encoded as parameterized execution graphs with typed parameters, preconditions, composability rules, and memory-aware failure recovery. WindowsAgentArena: 57.5% success rate (state-of-the-art).

**Compositional Skill Synthesis:** Specialized agents select and compose modular reasoning skills dynamically. On AIME 2025: a 30B parameter solver achieved 91.6%, exceeding what individual skills provide independently.

**Skill Compilation (Multi-Agent to Single-Agent):** Multi-agent systems can be compiled into single-agent skill libraries with reduced token usage and lower latency while maintaining accuracy. Critical finding: a phase transition occurs beyond a critical library size where skill selection accuracy degrades sharply.

## Design Tradeoffs

**Progressive disclosure vs. eager loading:** Progressive disclosure minimizes context usage but introduces latency when skills need to be loaded mid-conversation. The tradeoff is context efficiency vs. response speed. For most production use cases, the context savings dominate.

**Skills as context modification vs. tools as function calls:** Skills modify the agent's understanding; tools produce outputs. This distinction means skills are harder to test and audit (how do you verify that injected instructions produce correct behavior?) but more powerful for complex procedural tasks.

**Open ecosystem vs. gated curation:** The 26.1% vulnerability rate in community skills argues for heavy curation, but heavy curation reduces ecosystem velocity. The four-tier trust model attempts to resolve this by allowing rapid contribution at low trust levels while gating dangerous capabilities behind verification.

**Model-internal vs. externalizable skills:** SAGE and SEAgent produce skills learned in model weights that cannot be inspected, shared, or governed. SKILL.md files are fully inspectable and portable. Bridging this gap -- enabling agents to externalize learned skills as auditable artifacts -- would unify the two paradigms but remains unsolved.

**Skill library size vs. selection accuracy:** The phase transition finding is critical. Beyond some critical number of skills, routing accuracy collapses. This means skill ecosystems need hierarchical organization (categories, sub-categories) or meta-skill routing, not flat registries.

## Experimental Results

### Computer-Use Agent Benchmarks

The paper documents dramatic progress on GUI agent benchmarks:

| Benchmark | Best Agent | Success Rate | Human Baseline |
|-----------|-----------|--------------|----------------|
| OSWorld | CoAct-1 | 59.9% | 72.4% |
| OSWorld-Verified | Proprietary | 72.6% | 72.4% (matched!) |
| WindowsAgentArena | CUA-Skill | 57.5% | -- |
| AndroidWorld | UI-TARS-2 | 73.3% | -- |
| SWE-bench Verified | Claude Opus 4.6 | 79.2% | -- |

The OSWorld-Verified result (72.6% vs 72.4% human baseline) represents human-level performance on general computer use -- a milestone that arrived far faster than expected.

### GUI Grounding Results

- UGround: 20% absolute improvement over prior models, trained on 10M GUI elements
- Jedi Framework: Improved OSWorld from 5% to 27% through scaled grounding data
- Self-Evolutionary RL: 7B model achieved 47.3% on ScreenSpot-Pro, exceeding 72B UI-TARS by 24.2 points (trained on only 3,000 samples)
- GUI-Actor: 7B model surpassed 72B UI-TARS on ScreenSpot-Pro through coordinate-free visual grounding

### Skill Acquisition Results

- SAGE: 72.0% task completion on AppWorld, 26% fewer steps, 59% fewer tokens
- SEAgent: 34.5% on 5 novel OSWorld environments (vs 11.3% baseline)
- CUA-Skill: 57.5% on WindowsAgentArena
- Compositional synthesis: 91.6% on AIME 2025 with 30B model

### Security Analysis

- 42,447 skills analyzed from major marketplaces
- 26.1% contain at least one vulnerability
- 14 distinct vulnerability patterns across 4 categories
- Data exfiltration: 13.3%
- Privilege escalation: 11.8%
- Skills with executable scripts are 2.12x more vulnerable than instruction-only (p<0.001)
- 5.2% exhibit high-severity patterns suggesting malicious intent
- 157 confirmed malicious skills with 632 total vulnerabilities
- Single industrialized actor responsible for 54.1% of confirmed malicious cases

## Failure Modes & Limitations

**Phase transition in skill selection:** As skill library size grows past a critical threshold, the agent's ability to select the right skill degrades sharply. This is a fundamental scaling limit that no current architecture addresses well. Hierarchical routing, meta-skills, or skill embedding spaces may help but are unvalidated.

**Security is unsolved:** 26.1% vulnerability rate in community skills is alarming. The proposed four-tier governance framework is sensible but unvalidated at scale. The "trivially simple" prompt injection attacks via long SKILL.md files exploiting trust models are particularly concerning -- once a skill's instructions are loaded, they are treated as authoritative context.

**Cross-platform portability is absent:** Skills authored for Claude implicitly depend on Claude-specific capabilities. True portability requires either universal skill runtimes or cross-platform compilation, neither of which exists.

**Learned skills are opaque:** SAGE and SEAgent produce effective skills but they exist only in model weights. They cannot be inspected, audited, shared, or governed. This creates a bifurcation: human-authored skills are transparent but labor-intensive; machine-learned skills are automatic but opaque.

**Composition remains brittle:** While compositional skill synthesis shows impressive results on math benchmarks, multi-skill orchestration for real-world tasks requires principled frameworks for conflict resolution, resource sharing, and failure recovery that do not yet exist.

**Evaluation gaps:** Current benchmarks assess task completion but not skill qualities (reusability, composability, maintainability). There are no standardized testing frameworks for skills despite their rapid adoption.

## Practical Implications

**For builders of skill-based agent systems:**

1. **Adopt the three-level progressive disclosure pattern immediately.** This is the highest-leverage architectural decision for skill systems. Keep Level 1 metadata tiny (~dozen tokens), load Level 2 instructions only on trigger, and defer Level 3 resources to on-demand. This scales to hundreds of skills without context window pressure.

2. **Implement security gates before opening your skill ecosystem.** The 26.1% vulnerability rate means you cannot trust community-contributed skills by default. At minimum, implement static analysis (G1) and semantic classification (G2) before allowing any skill to load. Reserve script execution for verified skills only.

3. **Plan for the phase transition.** If you are building a skill registry, anticipate that routing accuracy will degrade past some library size. Build hierarchical organization from the start -- categories, sub-categories, meta-skills for routing -- rather than flat registries that will not scale.

4. **Skills and MCP are complementary, not alternatives.** Use skills for procedural knowledge and context shaping. Use MCP for tool connectivity. A well-designed skill instructs the agent on which MCP servers to use and how to interpret their outputs.

5. **The compilation pattern (multi-agent to single-agent) is powerful but bounded.** If you have a working multi-agent system, compiling its capabilities into a single-agent skill library can reduce token usage and latency. But watch for the phase transition -- do not assume more skills always help.

6. **Invest in externalizable skill learning.** The gap between human-authored (transparent, portable) and machine-learned (automatic, opaque) skills is the field's most important open problem. Systems that can learn skills AND externalize them as auditable SKILL.md-like artifacts will have a significant advantage.

**Gap between paper and production:** The paper documents an ecosystem that went from research concept to multi-provider adoption in months (October-December 2025). But the security governance framework is proposed, not deployed. The vulnerability analysis is descriptive, not prescriptive. Production deployments need to build their own security gates, and the phase transition in skill selection means large-scale skill ecosystems will hit fundamental scaling limits that are not yet solved.
