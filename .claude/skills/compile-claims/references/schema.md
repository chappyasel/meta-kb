# Claims + Eval Report Schemas

## claims.json

```json
{
  "version": 2,
  "compiled_at": "2026-04-07T00:00:00.000Z",
  "total": 219,
  "claims": [
    {
      "id": "claim-a1b2c3d4e5f6",
      "content": "Mem0 selective retrieval beats full-context by 26% on LOCOMO",
      "content_hash": "a1b2c3d4e5f6",
      "type": "empirical",
      "confidence": "reported",
      "source_refs": ["repos/mem0ai-mem0.md"],
      "article_ref": "agent-memory",
      "entity_refs": ["mem0"],
      "temporal_scope": null,
      "created_at": "2026-04-06T03:07:10.166Z",
      "updated_at": "2026-04-07T00:04:03.656Z",
      "status": "active"
    }
  ]
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Content-hash based: `claim-{sha256(content + "\|" + article_ref).slice(0,12)}` |
| `content` | string | yes | One atomic verifiable statement. No hedging. |
| `content_hash` | string | yes | First 12 hex chars of SHA-256(content + "\|" + article_ref). Stable across runs. |
| `type` | enum | yes | `empirical`, `architectural`, `comparative`, `directional` |
| `confidence` | enum | yes | `verified`, `reported`, `inferred` |
| `source_refs` | string[] | yes | Paths relative to `raw/`. Empty array if unknown. |
| `article_ref` | string | yes | Bucket name of the synthesis article this came from. |
| `entity_refs` | string[] | yes | Entity slugs mentioned in the claim. |
| `temporal_scope` | string\|null | yes | `"as of YYYY-MM"` for time-sensitive data, `null` otherwise. |
| `created_at` | string | yes | ISO timestamp of first extraction. Preserved across runs for matching content. |
| `updated_at` | string | yes | ISO timestamp of last extraction. Refreshed each run. |
| `status` | enum | yes | `active`, `stale` (deleted source), or `superseded`. |

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
    "knowledge-substrate": { "sampled": 5, "passed": 4 },
    "agent-memory": { "sampled": 6, "passed": 5 },
    "context-engineering": { "sampled": 5, "passed": 4 },
    "agent-architecture": { "sampled": 5, "passed": 4 },
    "multi-agent-systems": { "sampled": 5, "passed": 4 },
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
