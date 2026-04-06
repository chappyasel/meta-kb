---
type: root
version: 1
compiled_at: '2026-04-06T04:00:00.000Z'
token_estimate: 620
entities_total: 176
sources_total: 172
---
# meta-kb ROOT

## Topics
knowledge-bases [synthesis, 61 sources]: compiled wikis, RAG, graph retrieval, vectorless approaches -> knowledge-bases.md
agent-memory [synthesis, 156 sources]: persistent memory, temporal KGs, episodic/semantic split -> agent-memory.md
context-engineering [synthesis, 119 sources]: CLAUDE.md, progressive disclosure, compression, context graphs -> context-engineering.md
agent-systems [synthesis, 156 sources]: SKILL.md, skill registries, harnesses, multi-agent orchestration -> agent-systems.md
self-improving [synthesis, 101 sources]: autoresearch, Karpathy loop, reflexion, skill accumulation -> self-improving.md

## Top Projects
everything-claude-code [agent-systems, 136116★]: 156 skills + instinct-based continuous learning -> projects/everything-claude-code.md
anthropic-skills [agent-systems, 110064★]: canonical SKILL.md standard with three-tier progressive disclosure -> projects/anthropic-skills.md
ragflow [knowledge-bases, 77126★]: document understanding engine with OCR, layout, table parsing -> projects/ragflow.md
autoresearch [self-improving, 65009★]: Karpathy loop for autonomous ML experimentation -> projects/autoresearch.md
gstack [agent-systems, 63766★]: 23 specialist roles in a Think-Plan-Build-Review-Test-Ship pipeline -> projects/gstack.md
mem0 [agent-memory, 51880★]: persistent memory layer with vector+graph+SQL -> projects/mem0.md
graphiti [agent-memory, 24473★]: temporal knowledge graphs with bi-temporal validity windows -> projects/graphiti.md
pageindex [knowledge-bases, 23899★]: reasoning-based tree navigation, 98.7% on FinanceBench -> projects/pageindex.md
letta [agent-memory, 21873★]: memory blocks always in system prompt, O(1) core fact access -> projects/letta.md
openviking [context-engineering, 20813★]: filesystem-paradigm context database with L0/L1/L2 tiered loading -> projects/openviking.md
cognee [knowledge-bases, 14899★]: knowledge engine combining vector + graph + continuous learning -> projects/cognee.md
napkin [knowledge-bases, 264★]: BM25 on markdown with progressive disclosure, no embeddings -> projects/napkin.md

## Key Concepts
rag [knowledge-bases]: retrieve external knowledge before generation -> concepts/rag.md
progressive-disclosure [context-engineering]: load minimum context at lowest resolution -> concepts/progressive-disclosure.md
knowledge-graph [knowledge-bases]: entities + edges for structured retrieval -> concepts/knowledge-graph.md
context-engineering [context-engineering]: runtime assembly of context window contents -> concepts/context-engineering.md
mcp [context-engineering]: Model Context Protocol for tool/resource integration -> concepts/mcp.md
agent-memory [agent-memory]: how agents store, retrieve, update knowledge across sessions -> concepts/agent-memory.md
temporal-reasoning [agent-memory]: facts have time bounds, queries require "as of" logic -> concepts/temporal-reasoning.md
eval-driven-development [self-improving]: binary assertions as the fitness function -> concepts/eval-driven-development.md
context-graphs [context-engineering]: decision-trace representations of organizational knowledge -> concepts/context-graphs.md
zettelkasten [knowledge-bases]: interconnected atomic notes as a memory architecture -> concepts/zettelkasten.md

## Meta
Field map: field-map.md | Graph: graph.html | Landscape: comparisons/landscape.md
Last compiled: 2026-04-06 | Sources: 172 | Entities: 176
