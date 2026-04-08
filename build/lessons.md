# Lessons from Previous Compilation

Generated automatically by Pass 8 (auto-fix). Read by compile-wiki skill at next compilation.

## Source Attribution

Claims about implementation details (architecture, algorithms, data structures, specific benchmarks) are almost always in deep/ sources. When citing a specific number or mechanism, prefer `raw/deep/repos/` or `raw/deep/papers/` over the shallow source.

### Fixed this run
- claim-4ae5819caba6: deep/repos/garrytan-gstack.md → fixed
- claim-e6c0a9205630: deep/repos/modelscope-agentevolver.md → fixed
- claim-073f754af931: deep/repos/davebcn87-pi-autoresearch.md → fixed

### Unfixable (flag for human review)
- claim-8b343c1bc3ce (self-improving): The source does not mention 8x A100 80GB GPUs or Alibaba DashScope API access requirements anywhere in its content.
- claim-b062235a77be (knowledge-substrate): The source mentions that Volt outperforms Claude Code on the OOLONG benchmark but does not provide the specific numerical scores (74.8 vs 70.3) or the
- claim-af834cdadfa3 (self-improving): The source does not contain any information about the number of GitHub stars for pi-autoresearch.
- claim-1c27797ca2f0 (agent-architecture): The source describes SICA's general architecture and self-improvement loop but contains no specific evidence about an AST-based symbol locator being i
- claim-17c728ae6025 (knowledge-substrate): The source does not mention hiding search scores from the agent to prevent anchoring bias; it describes the composite ranking formula and search resul
- claim-e911de74c739 (multi-agent-systems): The source does not mention deterministic PreToolUse/PostToolUse hooks for capturing tool calls, atomic instincts with confidence scores ranging from 
- claim-7810208163b4 (self-improving): The source shows scores-only at 34.6 and scores+summaries at 34.9 (a +0.3 difference) and full access at 50.0 (a +15.4 difference over raw scores), wh
- claim-c74a149cc63b (agent-architecture): The source describes messages carrying 'cause_by' metadata and roles using typed subscriptions, but does not mention Pydantic 'instruct_content' paylo
- claim-82e5b22312dc (self-improving): The source does not contain any information about confidence scores increasing when patterns repeat, decaying at 0.05 per observation gap, or three or
- claim-3ffe17c3bcb4 (self-improving): The source does not mention deterministic PreToolUse and PostToolUse hooks capturing every tool call with 100% reliability; it only references hooks g
- claim-0cb63525ffc9 (knowledge-substrate): The source does not contain any comparison between per-round notes (~2.5K chars) and session-level notes (~15K chars) for BM25 retrieval; it only stat

## Entity Links

Use entity ID slugs for link paths, not display names. Example: `concepts/rag.md` not `concepts/retrieval-augmented-generation.md`. Check that the target file exists before writing a link.

## Star Counts

Only read GitHub star counts from `raw/repos/` source files (the project's own repo metadata). Papers, tweets, and articles may reference other projects' star counts — using those causes data corruption across entities.

## Diagrams

The field-map.md diagram should show the 5-layer architectural stack with central problems and integration points. Do NOT generate a random project-node graph.
