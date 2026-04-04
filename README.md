# meta-kb

A living, LLM-compiled knowledge base about building LLM knowledge bases.

Sources (tweets, repos, papers, articles) are ingested into structured markdown, scored for relevance by LLM, and compiled into a wiki. The knowledge base covers five topic areas:

- **Knowledge bases** -- Karpathy pattern, markdown wikis, compiled vs curated
- **Agent memory** -- Mem0, Letta, Graphiti, episodic/semantic/working memory
- **Context engineering** -- CLAUDE.md standards, context graphs, compression
- **Agentic skills** -- Skill composition, registries, modular capabilities
- **Self-improving agents** -- Autoresearch, observe/correct/improve loops

## Status

Ingestion pipeline is live. Compilation pipeline is in progress.

**101 sources ingested:** 53 repos, 19 articles, 12 papers, 17 tweets.

## Setup

```bash
bun install
cp .env.example .env  # add your API keys
```

Required environment variables:
- `ANTHROPIC_API_KEY` -- for LLM scoring and insight generation
- `APIFY_API_TOKEN` -- for Twitter scraping
- `GITHUB_TOKEN` -- for GitHub API access

## Usage

```bash
# Ingest sources (auto-detects platform from URL)
bun run ingest <url1> [url2] ...

# Platform-specific ingestion
bun run ingest:twitter [urls...]
bun run ingest:github [urls...]
bun run ingest:arxiv [urls...]
bun run ingest:article [urls...]

# Re-score sources for relevance
bun run rescore              # unscored only
bun run rescore --force      # re-score everything

# Compile wiki (not yet implemented)
bun run compile
```

## How it works

```
config/sources.json     Curated source URLs
        |
        v
scripts/ingest*.ts      Fetch, classify, score with LLM
        |
        v
raw/{repos,articles,    Markdown + YAML frontmatter
     papers,tweets}/    (tags, key_insight, relevance_scores)
        |
        v
wiki/                   Compiled output (coming soon)
```

Each source gets:
- **Taxonomy tags** from 5 topic buckets (via Haiku)
- **4-dimension relevance score** -- topic_relevance, practitioner_value, novelty, signal_quality (via Sonnet)
- **Key insight** -- one-sentence synthesis of why this source matters

Scrapers auto-chain to related content: tweets link to repos, repos detect awesome-lists, articles extract GitHub URLs.

## License

MIT
