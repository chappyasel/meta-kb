# Claims + Eval Report Schemas

## claims.json

```json
{
  "version": 1,
  "compiled_at": "2026-04-05T00:00:00.000Z",
  "total": 224,
  "by_type": {
    "empirical": 89,
    "architectural": 67,
    "comparative": 34,
    "directional": 34
  },
  "by_confidence": {
    "verified": 45,
    "reported": 142,
    "inferred": 37
  },
  "claims": [
    {
      "id": "claim-001",
      "content": "Mem0 selective retrieval beats full-context by 26% on LOCOMO",
      "type": "empirical",
      "confidence": "reported",
      "source_refs": ["repos/mem0ai-mem0.md"],
      "article_ref": "agent-memory",
      "entity_refs": ["mem0"],
      "temporal_scope": null
    },
    {
      "id": "claim-002",
      "content": "Graphiti stores temporal validity as edge properties in Neo4j",
      "type": "architectural",
      "confidence": "verified",
      "source_refs": ["repos/getzep-graphiti.md", "deep/repos/getzep-graphiti.md"],
      "article_ref": "knowledge-bases",
      "entity_refs": ["graphiti", "neo4j"],
      "temporal_scope": null
    },
    {
      "id": "claim-003",
      "content": "Graph-based retrieval outperforms vector-only by 15-30% on multi-hop questions",
      "type": "comparative",
      "confidence": "reported",
      "source_refs": ["papers/2501-13956.md"],
      "article_ref": "knowledge-bases",
      "entity_refs": ["graphiti", "mem0"],
      "temporal_scope": "as of 2025-06"
    },
    {
      "id": "claim-004",
      "content": "The field shifted from monolithic context windows to progressive disclosure in 2025",
      "type": "directional",
      "confidence": "inferred",
      "source_refs": [],
      "article_ref": "context-engineering",
      "entity_refs": ["progressive-disclosure"],
      "temporal_scope": "as of 2025-12"
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Sequential: `claim-001`, `claim-002`, ... |
| `content` | string | yes | One atomic verifiable statement. No hedging. |
| `type` | enum | yes | `empirical`, `architectural`, `comparative`, `directional` |
| `confidence` | enum | yes | `verified`, `reported`, `inferred` |
| `source_refs` | string[] | yes | Paths relative to `raw/`. Empty array if unknown. |
| `article_ref` | string | yes | Bucket name of the synthesis article this came from. |
| `entity_refs` | string[] | yes | Entity slugs mentioned in the claim. |
| `temporal_scope` | string\|null | yes | `"as of YYYY-MM"` for time-sensitive data, `null` otherwise. |

## eval-report.json

```json
{
  "version": 1,
  "compiled_at": "2026-04-05T00:00:00.000Z",
  "total_claims": 224,
  "sample_size": 30,
  "accuracy": 0.80,
  "results": [
    {
      "claim_id": "claim-001",
      "verdict": "PASS",
      "reason": "raw/repos/mem0ai-mem0.md states '26% improvement over full-context on LOCOMO benchmark' in key_insight"
    },
    {
      "claim_id": "claim-015",
      "verdict": "FAIL",
      "reason": "Source mentions LOCOMO benchmark but does not include the specific percentage claimed"
    }
  ],
  "failures": [
    {
      "claim_id": "claim-015",
      "claim": "Zep achieves 94% retrieval accuracy on temporal queries",
      "article_ref": "agent-memory",
      "source_ref": "repos/getzep-zep.md",
      "reason": "Source mentions LOCOMO benchmark but does not include the specific percentage claimed"
    }
  ],
  "by_type": {
    "empirical": { "sampled": 12, "passed": 10 },
    "architectural": { "sampled": 9, "passed": 8 },
    "comparative": { "sampled": 5, "passed": 3 },
    "directional": { "sampled": 4, "passed": 3 }
  },
  "by_bucket": {
    "knowledge-bases": { "sampled": 6, "passed": 5 },
    "agent-memory": { "sampled": 8, "passed": 6 },
    "context-engineering": { "sampled": 7, "passed": 6 },
    "agent-systems": { "sampled": 5, "passed": 4 },
    "self-improving": { "sampled": 4, "passed": 3 }
  }
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `total_claims` | number | Total claims in claims.json |
| `sample_size` | number | Number of claims sampled for verification |
| `accuracy` | number | Pass rate as decimal (0.0-1.0) |
| `results` | array | Every sampled claim with verdict and reason |
| `results[].verdict` | enum | `PASS` or `FAIL` |
| `results[].reason` | string | What evidence was found (PASS) or what was missing (FAIL) |
| `failures` | array | Expanded details for FAIL verdicts only |
| `by_type` | object | Breakdown by claim type: sampled count and passed count |
| `by_bucket` | object | Breakdown by taxonomy bucket: sampled count and passed count |
