---
url: 'https://github.com/Martian-Engineering/lossless-claw'
type: repo
author: Martian-Engineering
date: '2026-04-03'
tags:
  - context-engineering
  - agent-memory
  - context-window-management
  - lossless-compression
  - dag-summarization
  - episodic-memory
  - retrieval-augmented-generation
key_insight: >-
  LCM solves a critical problem for long-running agents: preserving lossless
  conversation history while respecting token limits through DAG-based
  hierarchical summarization rather than destructive truncation. This enables
  agents to maintain perfect recall without context window explosion, which is
  essential for building reliable long-horizon AI systems that can recover and
  reason over their entire interaction history.
deep_researched: deep/repos/martian-engineering-lossless-claw.md
stars: 3963
forks: 317
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 8
  composite: 8.4
  reason: >-
    DAG-based hierarchical summarization for lossless agent context management
    is a directly relevant and novel approach to context engineering and agent
    memory, with a working TypeScript plugin, SQLite persistence, and
    agent-accessible recall tools.
language: TypeScript
license: MIT
---
## lossless-claw

> Lossless Claw — LCM (Lossless Context Management) plugin for OpenClaw

### Stats

| Metric | Value |
|--------|-------|
| Stars | 3,963 |
| Forks | 317 |
| Language | TypeScript |
| License | MIT |
| Last Updated | 2026-04-03 |

### README (excerpt)

# lossless-claw

Lossless Context Management plugin for [OpenClaw](https://github.com/openclaw/openclaw), based on the [LCM paper](https://papers.voltropy.com/LCM) from [Voltropy](https://x.com/Voltropy). Replaces OpenClaw's built-in sliding-window compaction with a DAG-based summarization system that preserves every message while keeping active context within model token limits.

## Table of contents

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Development](#development)
- [License](#license)

## What it does

Two ways to learn: read the below, or [check out this super cool animated visualization](https://losslesscontext.ai).

When a conversation grows beyond the model's context window, OpenClaw (just like all of the other agents) normally truncates older messages. LCM instead:

1. **Persists every message** in a SQLite database, organized by conversation
2. **Summarizes chunks** of older messages into summaries using your configured LLM
3. **Condenses summaries** into higher-level nodes as they accumulate, forming a DAG (directed acyclic graph)
4. **Assembles context** each turn by combining summaries + recent raw messages
5. **Provides tools** (`lcm_grep`, `lcm_describe`, `lcm_expand`) so agents can search and recall details from compacted history

Nothing is lost. Raw messages stay in the database. Summaries link back to their source messages. Agents can drill into any summary to recover the original detail.

**It feels like talking to an agent that never forgets. Because it doesn't. In normal operation, you'll never need to think about compaction again.**

## Quick start

### Prerequisites

- OpenClaw with plugin context engine support
- Node.js 22+
- An LLM provider configured in OpenClaw (used for summarization)

### Install the plugin

Use OpenClaw's plugin installer (recommended):

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

If you're running from a local OpenClaw checkout, use:

```bash
pnpm openclaw plugins install @martian-engineering/lossless-claw
```

For local plugin development, link your working copy instead of copying files:

```bash
openclaw plugins install --link /path/to/lossless-claw
# or from a local OpenClaw checkout:
# pnpm openclaw plugins install --link /path/to/lossless-claw
```

The install command records the plugin, enables it, and applies compatible slot selection (including `contextEngine` when applicable).

> **Note:** If your OpenClaw config uses `plugins.allow`, make sure both `lossless-claw` and any active plugins you rely on remain allowlisted. In some setups, narrowing the allowlist can prevent plugin-backed integrations from loading, even if `lossless-claw` itself is installed correctly. Restart the gateway after plugin config changes.

### Configure OpenClaw

In most cases, no manual JSON edits are needed after `openclaw plugins install`.

If you need to set it manually, ensure the context engine slot points at lossless-claw:

```json
{
  "plugins": {
    "slots": {
      "contextEngine": "lossless-claw"
    }
  }
}
```

Restart OpenClaw after configuration changes.

## Configuration

LCM is configured through a combination of plugin config and environment variables. Environment variables take precedence for backward compatibility.

### Plugin config

Add a `lossless-claw` entry under `plugins.entries` in your OpenClaw config:

```json
{
  "plugins": {
    "entries": {
      "lossless-claw": {
        "enabled": true,
        "config": {
          "freshTailCount": 64,
          "leafChunkTokens": 80000,
          "newSessionRetainDepth": 2,
          "contextThreshold": 0.75,
          "incrementalMaxDepth": 1,
          "ignoreSessionPatterns": [
            "agent:*:cron:**"
          ],
          "summaryModel": "anthropic/claude-haiku-4-5",
          "expansionModel": "anthropic/claude-haiku-4-5",
          "delegationTimeoutMs": 300000
        }
      }
    }
  }
}
```

`leafChunkTokens` controls how many source tokens can accumulate in a leaf compaction chunk before summarization is triggered. The default is `20000`, but quota-limited summary providers may benefit from a larger value to reduce compaction frequency. `summaryModel` and `summaryProvider` let you pin compaction summarization to a cheaper or faster model than your main OpenClaw session model. `expansionModel` does the same for `lcm_expand_query` sub-agent calls (drilling into summaries to recover detail). `delegationTimeoutMs` controls how long `lcm_expand_query` waits for that delegated sub-agent to finish before returning a timeout error; it defaults to `120000` (120s). When unset, the model settings still fall back to OpenClaw's configured default model/provider. See [Expansion model override requirements](#expansion-model-override-requirements) for the required `subagent` trust policy when using `expansionModel`.

### Environment variables

| Variable | Default | Description |
|

...(truncated)
