# Lessons from Previous Compilation

Generated automatically by Pass 8 (auto-fix). Read by compile-wiki skill at next compilation.

## Source Attribution

Claims about implementation details (architecture, algorithms, data structures, specific benchmarks) are almost always in deep/ sources. When citing a specific number or mechanism, prefer `raw/deep/repos/` or `raw/deep/papers/` over the shallow source.

### Fixed this run
- claim-d7fba2934a60: deep/repos/michaelliv-napkin.md → fixed
- claim-0fab0ab83157: deep/repos/anthropics-skills.md → fixed
- claim-6ff1d1056b83: deep/repos/greyhaven-ai-autocontext.md → fixed
- claim-5d450f691c30: deep/repos/affaan-m-everything-claude-code.md → fixed
- claim-d5c2b363f52a: deep/repos/memodb-io-acontext.md → fixed
- claim-92071feb1155: deep/repos/foundationagents-metagpt.md → fixed
- claim-180676101ce2: deep/repos/maximerobeyns-self-improving-coding-agent.md → fixed

### Unfixable (flag for human review)
- claim-52a270ce5d0c (self-improving): The source does not mention any specific GPU hardware requirements (8x A100 GPUs) for running AgentEvolver.
- claim-c8bf0a21c87c (knowledge-substrate): The source describes MemEvolve's architecture and approach but does not contain the specific empirical claim of 7-17% gains across benchmarks.
- claim-4009ba63097b (multi-agent-systems): The source describes SICA's architecture and self-improvement mechanism but does not contain the specific numerical claim that accuracy improved from 
- claim-265c16b61b13 (self-improving): The source states gstack reached 'over 63,000 stars,' not the specific figure of 63,766 stars claimed, making this a numerical discrepancy for an empi
- claim-791afda714f5 (self-improving): The source states the project had '136,000+ GitHub stars' (not the specific figure of 136,116 stars claimed in the article), making this a numerical d
- claim-2832ee70f557 (self-improving): The source describes Docker containers being used for sandboxed execution but does not mention the specific parameters 'network_mode=none' or 'mem_lim
- claim-80e2af86c5e4 (knowledge-substrate): The source confirms 6,592 stars and mentions '8.2x average token reduction across 6 real repositories' (in an image alt-text) and tree-sitter/SQLite a
- claim-cd25b74b7ece (agent-memory): The source describes the observation system and instinct clustering as part of the Evolution Layer but does not mention capturing tool call observatio
- claim-3e9aef7d426c (agent-memory): The source does not contain the specific benchmark scores of 35.3% for recursive summarization or 94.8% for temporal knowledge graphs on the Deep Memo
- claim-fec4b4453994 (multi-agent-systems): The source states the comparison is 50.0 (full filesystem access) vs 34.9 (scores + summaries), but the claim says 34.9 is the compressed summaries fi

## Entity Links

Use entity ID slugs for link paths, not display names. Example: `concepts/rag.md` not `concepts/retrieval-augmented-generation.md`. Check that the target file exists before writing a link.

## Star Counts

Only read GitHub star counts from `raw/repos/` source files (the project's own repo metadata). Papers, tweets, and articles may reference other projects' star counts — using those causes data corruption across entities.

## Diagrams

The field-map.md diagram should show the 5-layer architectural stack with central problems and integration points. Do NOT generate a random project-node graph.
