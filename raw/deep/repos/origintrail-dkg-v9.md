---
url: 'https://github.com/OriginTrail/dkg-v9'
type: repo
author: OriginTrail
date: '2026-04-05'
tags:
  - knowledge-substrate
  - multi-agent-systems
  - agent-memory
  - decentralized-graph
  - verifiable-knowledge
  - multi-agent-collaboration
  - context-graphs
key_insight: >-
  DKG v9 is the only production-path implementation of a cryptographically
  verifiable shared knowledge graph for multi-agent systems, combining RDF
  triple stores with Merkle-proof anchoring on EVM chains. Its workspace graph
  mechanism enables real-time collaborative writes among agents (with CAS
  concurrency control) before on-chain finalization, and benchmarks show DKG
  collaboration reduced coding swarm wall time by 47% and improved completion
  reliability from 7/8 to 8/8 versus no-collaboration baselines.
stars: 15
forks: 2
language: TypeScript
license: Apache-2.0
deep_research:
  method: source-code-analysis
  files_analyzed:
    - packages/core/src/node.ts
    - packages/core/src/types.ts
    - packages/core/src/protocol-router.ts
    - packages/core/src/crypto/merkle.ts
    - packages/core/src/crypto/hashing.ts
    - packages/core/src/gossipsub-manager.ts
    - packages/agent/src/dkg-agent.ts
    - packages/agent/src/messaging.ts
    - packages/agent/src/discovery.ts
    - packages/agent/src/encryption.ts
    - packages/agent/src/finalization-handler.ts
    - packages/agent/src/gossip-publish-handler.ts
    - packages/agent/src/workspace-consistency.ts
    - packages/publisher/src/publisher.ts
    - packages/publisher/src/workspace-handler.ts
    - packages/publisher/src/metadata.ts
    - packages/query/src/query-engine.ts
    - packages/storage/src/triple-store.ts
    - packages/chain/src/chain-adapter.ts
    - packages/evm-module/contracts/ContextGraphs.sol
    - packages/adapter-openclaw/src/DkgMemoryPlugin.ts
    - demo/agent-a.mjs
    - demo/agent-b.mjs
    - docs/SPEC_TRUST_LAYER.md
    - docs/SPEC_ATTESTED_KNOWLEDGE_ASSETS.md
    - docs/experiments/openclaw-benchmark/RESULTS.md
  external_docs:
    - docs/SPEC_TRUST_LAYER.md
    - docs/SPEC_ATTESTED_KNOWLEDGE_ASSETS.md
    - docs/experiments/openclaw-benchmark/RESULTS.md
  analyzed_at: '2026-04-07'
  original_source: repos/origintrail-dkg-v9.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 9
  signal_quality: 8
  composite: 8.7
  reason: >-
    Directly implements decentralized shared knowledge infrastructure for
    multi-agent systems with cryptographic provenance, workspace collaboration,
    and SPARQL-queryable knowledge graphs. Novel architecture combining RDF
    triple stores with blockchain finality. Benchmark data quantifies
    collaboration benefits. Beta maturity limits immediate production use.
---

## Architecture Overview

DKG v9 is a pnpm + Turborepo monorepo with 17 packages implementing a complete decentralized knowledge graph for multi-agent AI systems. The architecture splits into five layers: networking (libp2p P2P), storage (pluggable RDF triple stores), chain (EVM smart contracts for finality), publishing (Merkle-proofed knowledge lifecycle), and agent (high-level facade tying everything together).

### Package Dependency Graph

The monorepo follows a strict dependency hierarchy:

```
@origintrail-official/dkg-core         ← P2P networking, crypto, protocol definitions
  └─ @origintrail-official/dkg-storage ← Triple store abstraction (Oxigraph, Blazegraph, SPARQL HTTP)
     ├─ @origintrail-official/dkg-chain     ← EVM chain adapter (identity, publishing, staking)
     ├─ @origintrail-official/dkg-publisher ← Publish/update lifecycle, Merkle proofs, workspace
     ├─ @origintrail-official/dkg-query     ← SPARQL query execution, cross-agent query
     └─ @origintrail-official/dkg-agent     ← High-level facade: DKGAgent class
        ├─ @origintrail-official/dkg-adapter-openclaw  ← OpenClaw framework integration
        ├─ @origintrail-official/dkg-adapter-elizaos   ← ElizaOS framework integration
        └─ @origintrail-official/dkg-adapter-autoresearch ← Auto-research integration
```

### Node Architecture

The `DKGNode` class in `packages/core/src/node.ts` wraps libp2p with Ed25519 identity, TCP + WebSocket transports, Noise encryption, Yamux stream multiplexing, Kademlia DHT, GossipSub pubsub, and circuit relay for NAT traversal. Two node roles exist: **core** nodes (cloud-deployed with public IPs, act as relay servers and GossipSub backbone) and **edge** nodes (personal agents behind NATs, connect through relays). The relay watchdog in `DKGNode` uses exponential backoff (10s base, 5min max) to maintain relay connections through network outages.

The `DKGAgent` class in `packages/agent/src/dkg-agent.ts` (~1400 lines) is the primary integration surface. It ties together wallet management, P2P networking, triple store, publisher, query engine, discovery, messaging, chain adapter, and gossip handlers into a single facade. Agent creation is async via `DKGAgent.create()`, which generates or loads an Ed25519 keypair, initializes the triple store (defaulting to Oxigraph worker thread with on-disk persistence), sets up the EVM chain adapter, and loads genesis knowledge.

### Protocol Definitions

The `packages/core/src/proto/` directory defines protobuf message schemas for all protocol operations: `publish.ts` (PublishRequest with N-Quads, manifest, UAL, on-chain proof), `query.ts` (remote SPARQL query forwarding), `workspace.ts` (workspace writes with CAS conditions), `finalization.ts` (lightweight enshrinement notifications), `message.ts` (encrypted agent-to-agent messages with signature and nonce), `discover.ts` (agent profile exchange), and `access.ts` (access control for private triples). Protocol IDs follow the pattern `/dkg/{function}/{version}` — e.g., `PROTOCOL_PUBLISH`, `PROTOCOL_SYNC`, `PROTOCOL_QUERY_REMOTE`, `PROTOCOL_MESSAGE`, `PROTOCOL_ACCESS`.

The `ProtocolRouter` in `packages/core/src/protocol-router.ts` handles stream-level request/response over libp2p. Inbound streams are read into a buffer (capped at 10 MB by `DEFAULT_MAX_READ_BYTES`), dispatched to the registered handler, and the response is sent back. Outbound sends use `dialProtocol` with a 20-second default timeout and 3-attempt retry with 500ms backoff. The `isRecoverableSendError()` function defines which errors trigger retries: closed streams, ECONNRESET, ETIMEDOUT, protocol negotiation failures — the kinds of transient failures common on relay connections.

### Data Model

All knowledge is represented as RDF quads (subject, predicate, object, graph). The `TripleStore` interface in `packages/storage/src/triple-store.ts` defines a pure SPARQL 1.1 interface with no vendor lock-in: `insert()`, `delete()`, `query()` (SELECT/CONSTRUCT/ASK), `hasGraph()`, `createGraph()`, `dropGraph()`. The adapter registry pattern (`registerTripleStoreAdapter`) supports pluggable backends including Oxigraph (in-memory and persistent), Blazegraph, and any SPARQL HTTP endpoint.

Each paranet maintains four named graphs:
- **Data graph** (`did:dkg:paranet:{id}`) — finalized, verified knowledge
- **Meta graph** (`did:dkg:paranet:{id}/_meta`) — KC/KA metadata, Merkle roots, provenance
- **Workspace graph** (`did:dkg:paranet:{id}/_workspace`) — in-progress collaborative writes
- **Workspace meta graph** (`did:dkg:paranet:{id}/_workspace_meta`) — operation tracking, TTL, ownership

## Core Mechanism

### Knowledge Asset Lifecycle

The publish flow has four phases, orchestrated by `DKGPublisher` and the `DKGAgent.publish()` method:

1. **Prepare**: RDF quads are auto-partitioned by root entity (`autoPartition()`). Each entity's triples get a KA root hash. Public and private sub-roots combine via `MerkleTree.computeKARoot()` in `packages/core/src/crypto/merkle.ts`. All KA roots are sorted and hashed into a KC Merkle root via `MerkleTree.computeKCRoot()`. The Merkle tree uses SHA-256 with sorted leaves and standard sibling-pair hashing.

2. **Store locally**: Public quads are inserted into the paranet's data graph. Metadata (KC type, Merkle root, KA count, publisher peer ID, access policy, provenance) is written to the meta graph as RDF triples.

3. **Finalize on-chain**: The chain adapter calls `publishKnowledgeAssets()` on the EVM contracts, which batch-mints KAs from a pre-reserved UAL range. V9 UALs are publisher-namespaced: `did:dkg:{chainId}/{publisherAddress}/{localKAId}`, eliminating ID collisions. The on-chain transaction records the KC Merkle root, KA count, publisher address, and token payment.

4. **Broadcast via GossipSub**: The publisher encodes the N-Quads and manifest into a protobuf `PublishRequest` and publishes to the paranet's GossipSub topic. Receiving nodes decode, validate structure (checking root entities are new, not replayed), store as tentative, then optionally verify on-chain. The `GossipPublishHandler` in `packages/agent/src/gossip-publish-handler.ts` performs targeted on-chain verification: it constrains the event scan to the exact block number from the gossip message and validates txHash, Merkle root, publisher address, and KA ID range all match.

### Workspace Collaboration (The Critical Innovation)

The workspace graph is the mechanism that makes real-time multi-agent collaboration possible without per-write on-chain transactions. This is the core architectural innovation for multi-agent knowledge sharing.

**Write flow**: `DKGAgent.writeToWorkspace()` stores quads in the workspace graph with operation metadata (timestamp, root entity, publisher peer ID) in the workspace meta graph. Unless `localOnly` is set, the write is broadcast via GossipSub on the paranet's workspace topic. The `WorkspaceHandler` in `packages/publisher/src/workspace-handler.ts` validates incoming workspace writes: sender peer ID must match the payload's `publisherPeerId`, quads must be structurally valid, and CAS conditions (if any) must pass.

**Ownership tracking**: The `workspaceOwnedEntities` map (shared between publisher and workspace handler) tracks which peer ID first created each root entity. This prevents one agent from overwriting another agent's workspace data. During workspace sync, only entities from validated workspace operations (those with both `rdf:type WorkspaceOperation` and `publishedAt` triples) are accepted, preventing injection of fake ownership records.

**Compare-and-swap (CAS)**: `DKGAgent.writeConditionalToWorkspace()` takes an array of `CASCondition` objects, each specifying a subject, predicate, and expected value (or `expectAbsent`). The workspace handler enforces these atomically inside per-entity write locks (`withWriteLocks()` acquires locks in sorted order to prevent deadlocks). This enables safe concurrent writes from multiple agents to overlapping graph regions.

**Versioned writes**: The `workspace-consistency.ts` module provides `versionedWrite()` — a convenience wrapper that auto-increments an `xsd:integer` version counter with a CAS condition. This is the building block for optimistic concurrency control in multi-agent workflows.

**Monotonic transitions**: The `monotonicTransition()` function validates that stage transitions (e.g., `recruiting` -> `traveling` -> `finished`) only move forward, preventing race conditions where agents try to revert state.

**Enshrinement**: When agents agree on workspace state, `DKGAgent.enshrineFromWorkspace()` reads selected root entities from the workspace graph, publishes them with full on-chain finality to the data graph, then broadcasts a lightweight `FinalizationMessage` via GossipSub. Receiving nodes that already have matching workspace data can promote it to canonical without re-downloading, by verifying the Merkle root matches. The `FinalizationHandler` in `packages/agent/src/finalization-handler.ts` performs this workspace-to-canonical promotion after verifying on-chain event data.

**TTL and cleanup**: Workspace data has a configurable TTL (default 30 days). Every 15 minutes, `cleanupExpiredWorkspace()` queries for operations older than the cutoff, deletes their data and metadata, and removes ownership entries. This prevents unbounded workspace growth.

### Context Graphs (M-of-N Governance)

Context graphs add governance to collaborative writes. The `ContextGraphs.sol` smart contract (`packages/evm-module/contracts/ContextGraphs.sol`) implements:

- **createContextGraph()**: Takes an array of participant identity IDs, an M-of-N `requiredSignatures` threshold, and optional metadata batch ID. Participant IDs must be sorted and unique. Returns a `contextGraphId`.

- **addBatchToContextGraph()**: Requires M-of-N ECDSA signatures from participants over `keccak256(abi.encodePacked(contextGraphId, merkleRoot))`. The contract verifies each signer is a registered participant, checks the signature count meets the threshold, and validates the Merkle root matches the on-chain batch.

This enables structured multi-party collaboration: a group of research agents co-author findings where no single agent can unilaterally alter the record. The on-chain contract enforces that a minimum number of participants cryptographically agree before data is finalized.

### Cryptographic Provenance

Every agent-to-agent message uses end-to-end encryption. The `MessageHandler` in `packages/agent/src/messaging.ts` derives shared secrets via X25519 Diffie-Hellman (Ed25519 keys converted to X25519 via the birational Edwards-Montgomery map in `encryption.ts`), then encrypts with XChaCha20-Poly1305. Messages carry Ed25519 signatures for authentication. The nonce is deterministically derived from conversation ID + sequence number to prevent replay attacks. The conversation state tracks a `highWaterMark` — any message with a sequence number at or below it is rejected as a replay.

Knowledge asset integrity uses a two-level Merkle tree. Individual triple hashes (SHA-256 of canonicalized N-Quad strings) are leaves of per-KA Merkle trees. Public and private sub-roots combine into a per-KA root. All KA roots then form leaves of the KC Merkle tree whose root goes on-chain. This enables selective disclosure: prove one entity's data without revealing others.

### Paranet Lifecycle

Paranets are created via `DKGAgent.createParanet()`, which calls the chain adapter's `createParanet()` method. V9 uses the `ParanetV9Registry` contract where the on-chain paranet ID is `keccak256(bytes(name))` — only the hash goes on-chain. The cleartext name can optionally be revealed later via `revealParanetMetadata()`. Two system paranets are hardcoded: `SYSTEM_PARANETS.AGENTS` (the agent registry where profiles are published) and `SYSTEM_PARANETS.ONTOLOGY` (where paranet definitions and schema triples live). When a new agent connects, it syncs both system paranets to discover other agents and available paranets.

New paranets are auto-discovered through two mechanisms: the `ChainEventPoller` watches for `ParanetCreated` events, and the `GossipPublishHandler` auto-subscribes when it receives ontology broadcasts containing paranet definition triples for unknown paranets. The `discoverParanetsFromStore()` method queries the local ontology graph for paranet definitions and subscribes to any it hasn't seen yet.

### Agent Discovery and Skill Marketplace

The `DiscoveryClient` in `packages/agent/src/discovery.ts` queries the local Agent Registry paranet via SPARQL to find agents and skill offerings. Agent profiles are published as RDF with schema.org and DKG ontology predicates: name, peer ID, framework, node role, relay address, and skill offerings (type, price, currency, success rate). The `findSkillOfferings()` method supports filtering by skill type, max price, minimum success rate, and framework.

Skill invocation goes through the encrypted messaging layer: `DKGAgent.invokeSkill()` sends a `skill_request` message type to the target peer, which routes to the registered `SkillHandler` and returns the response. The messaging protocol supports three callback modes: `inline` (synchronous response), `publish_ka` (results published as a knowledge asset), and `stream`.

## Design Tradeoffs

### RDF/SPARQL vs. Embeddings

DKG v9 chose RDF triple stores with SPARQL 1.1 over vector embeddings. The rationale from the README: "A knowledge graph stores facts as structured relationships (subject, predicate, object), which means agents can reason over connections, not just retrieve similar text." The practical tradeoff: SPARQL queries are precise (you can ask "all acquisitions by Company X on March 5") but require structured data authoring. The `DkgMemoryPlugin` for OpenClaw uses `FILTER(CONTAINS)` for text search — functional but far less capable than vector similarity. The README acknowledges this is a deliberate bet: structured relationships over fuzzy retrieval.

### Workspace-First Publishing

The workspace-then-enshrine pattern trades immediate finality for collaboration speed. Workspace writes have zero on-chain cost and propagate in milliseconds via GossipSub. The tradeoff: workspace data is not cryptographically verified until enshrinement. Any peer can write to the workspace graph (within ownership rules), so workspace state is trusted only within the paranet's social contract. The CAS mechanism provides consistency, but not Byzantine fault tolerance.

### Tentative-Then-Confirmed

Gossip-received publishes are always stored as tentative first, never trusting self-reported on-chain status. This is an explicit security decision in `GossipPublishHandler`: "Always store gossip-received data as tentative first — never trust self-reported on-chain status from gossip messages." Promotion to confirmed requires independent on-chain verification. The tradeoff is latency: a publish may sit as tentative for seconds to minutes until the chain event poller catches up.

### Pluggable Triple Store

The adapter registry pattern (`registerTripleStoreAdapter`) allows swapping Oxigraph for Blazegraph, Neptune, GraphDB, or any SPARQL HTTP endpoint without changing application code. The default Oxigraph-worker backend runs the store in a Node.js worker thread to avoid blocking the event loop. The tradeoff: Oxigraph is embedded and lightweight but lacks the scalability of dedicated graph databases. For production deployments with millions of triples, the SPARQL HTTP adapter to an external Blazegraph or Neptune instance would be necessary.

### Core/Edge Node Split

Core nodes (cloud, public IP) act as relay servers and GossipSub backbone. Edge nodes (personal agents behind NATs) connect through relays via libp2p circuit relay v2 with DCUtR hole-punching. The core/edge split means the network's availability depends on core node operators — a centralization pressure at the infrastructure layer despite the protocol being decentralized.

## Failure Modes & Limitations

### Beta Maturity

The README explicitly warns: "This project is in active development, currently in beta and running on the testnet. Expect rapid iteration and breaking changes. Please avoid using in production environments." The npm package exists but the protocol is not battle-tested at scale.

### Workspace Consistency Under Partition

If the GossipSub mesh partitions, workspace writes may diverge between groups of agents. The CAS mechanism prevents conflicting writes on the same node, but two partitioned groups could independently write to the same root entity. When the partition heals and workspace sync runs, the last-write-wins merge could produce inconsistent state. The enshrinement mechanism (M-of-N context graph signatures) is the intended resolution — but only if agents explicitly use context graphs.

### SPARQL Text Search Limitations

The `DkgMemoryPlugin` memory search uses `FILTER(CONTAINS(LCASE(?text), ...))` — a brute-force substring match across all triples. This degrades linearly with graph size and provides no semantic similarity. The code itself acknowledges this: "Uses FILTER(CONTAINS) for now — Spike B will assess whether this is sufficient or if a hybrid embedding approach is needed." For large knowledge bases, this is a significant limitation compared to vector-based retrieval.

### On-Chain Cost

Every finalized publish requires an EVM transaction (Base Sepolia testnet in current deployment). Gas costs for `publishKnowledgeAssets()` scale with the number of KAs in a batch. The TRAC token payment adds another cost dimension. For high-frequency agent collaboration, the workspace-then-enshrine pattern mitigates this, but any workflow requiring per-write finality faces economic friction.

### Relay Dependency for Edge Nodes

Edge nodes behind NATs depend on core relay nodes for connectivity. If all configured relays go offline, the agent becomes unreachable. The relay watchdog uses exponential backoff (up to 5 minutes between retries), which means reconnection after a relay outage can take minutes. The DCUtR hole-punching can upgrade relayed connections to direct, but only when both peers support it.

### No Built-in Conflict Resolution

The workspace graph provides CAS for consistency but no semantic conflict resolution. If Agent A publishes `Company X revenue = $1B` and Agent B publishes `Company X revenue = $1.2B` (different root entities), both coexist in the graph without any mechanism to reconcile them. The context graph governance (M-of-N signatures) is the closest thing to conflict resolution, but it requires explicit human or agent coordination to invoke.

## Integration Patterns

### Framework Adapters

Three adapter packages demonstrate the integration surface:

**OpenClaw** (`packages/adapter-openclaw`): The deepest integration. `DkgNodePlugin` manages the DKG daemon lifecycle. `DkgMemoryPlugin` provides `dkg_memory_search` and `dkg_memory_import` tools that query/write the agent-memory paranet. `DkgChannelPlugin` registers DKG messaging as a communication channel. The `write-capture.ts` module watches for file writes and auto-imports them into the knowledge graph with LLM entity extraction.

**ElizaOS** (`packages/adapter-elizaos`): Registers as an ElizaOS plugin with actions (`dkg_publish`, `dkg_query`) and a provider that injects DKG context into the agent's reasoning loop. The `DkgService` wraps the HTTP API client.

**Custom frameworks**: Any agent that speaks HTTP or shell commands can use the node's REST API at `http://127.0.0.1:9200/api/*` with bearer token authentication. The MCP server (`packages/mcp-server`) exposes `dkg_query`, `dkg_publish`, and other tools via the Model Context Protocol.

### Sync Protocol

On peer connect, agents automatically sync system paranets (agent registry, ontology). The sync protocol (`PROTOCOL_SYNC`) uses paginated SPARQL queries (500 triples per page) with Merkle verification: received data is verified against KC metadata before insertion. Workspace sync is separate and does not verify Merkle roots (workspace data has no chain finality). Both sync paths have per-page retries (3 attempts, 1s base delay), per-page timeout (30s), and a total sync timeout (120s).

### Event-Driven Architecture

The `TypedEventBus` propagates events across the stack: `GOSSIP_MESSAGE`, `MESSAGE_RECEIVED`, `PUBLISH_COMPLETE`, etc. The `ChainEventPoller` watches for on-chain events (`KnowledgeBatchCreated`, `ParanetCreated`, `ContextGraphExpanded`) and triggers local state updates — promoting tentative publishes to confirmed, discovering new paranets, and registering context graph expansions.

## Benchmarks & Performance

The repository includes a thorough multi-arm benchmark (`docs/experiments/openclaw-benchmark/RESULTS.md`) comparing agent collaboration approaches across 8 coding tasks with OpenClaw agents.

### Key Results

| Configuration | Completion | Total Cost | Wall Time | Time vs Control |
|---|---:|---:|---:|---:|
| Control (1 agent, no DKG) | 7/8 | $11.58 | 38m | baseline |
| Exp-A (1 agent, SPARQL DKG) | 8/8 | $11.31 | 38m | +0% |
| Exp-B2 (4 agents, semantic wrappers) | 8/8 | $20.26 | 21m | -46% |
| Exp-C2 (4 agents, full DKG publish/query) | 8/8 | $21.45 | 20m | -47% |

**Single-agent DKG (Exp-A)** achieved the lowest per-feature cost ($1.41 vs $1.65 control) with perfect completion, driven by SPARQL-based pattern reuse. Session archiving cost dropped 77% ($2.88 to $0.67) because the agent could query prior implementations instead of re-exploring.

**Multi-agent DKG collaboration (Exp-C2)** reduced wall time by 47% (20 min vs 38 min) and achieved 8/8 completion vs 7/8 for control. The collaboration produced 14 published DKG entities that served as shared context.

### Same-Task Swarm (Experiment D)

When 4 agents worked on one interdependent task (API + core + UI + tests), DKG collaboration (D2) beat shared-markdown coordination (D1):

| Metric | D1 (Shared MD) | D2 (DKG) |
|---|---:|---:|
| Completion | 3/4 streams | 4/4 streams |
| Total cost | $13.92 | $10.15 (-27%) |
| Wall time | 15m 28s | 11m 46s (-24%) |
| Cache-read tokens | 12M | 9.6M (-20%) |

The benchmark's conclusion: "DKG collaboration appears to reduce duplicate context loading and improve routing to shared state, even when the swarm is operating on one overlapping objective."

These results are from testnet with beta software. The benchmark methodology is transparent (all raw result JSON files are committed), but the task suite is limited to 8 OpenClaw coding features and sample sizes are small (N=1-2 per arm). The 47% speed improvement and 27% cost reduction for multi-agent DKG collaboration are directionally significant but need larger-scale replication.

### Network Performance Characteristics

The sync protocol uses 500-triple pages with a 30-second per-page timeout and 120-second total deadline. At this page size, syncing a paranet with 5,000 triples requires 10 round trips. Over relay connections (where latency can be 200-500ms per round trip), this means roughly 5-10 seconds for initial sync of a moderately-sized paranet. The `withRetry` utility provides 3-attempt retries with jittered exponential backoff (base 500ms for messaging, 1000ms for sync) to handle transient relay disconnections.

GossipSub is configured with flood publish enabled (`floodPublish: true`) and `D=4, Dlo=2, Dhi=8` mesh parameters, optimized for small networks where every message should reach all participants rather than probabilistically routing through a sparse mesh. The `allowPublishToZeroTopicPeers: true` setting ensures publishes don't fail when the publisher is the first node on a topic.

## Trust Layer Economics

The trust layer specification (`docs/SPEC_TRUST_LAYER.md`) describes the full economic model that underlies the DKG. While the v9 testnet currently uses Base Sepolia, the design targets production EVM chains.

### Token Flow

TRAC flows in a cycle: publishers spend TRAC to commit knowledge on-chain and pay for storage; tokens flow to per-paranet reward pools distributed across 30-day epochs; storage nodes earn by reliably storing data, passing proof challenges, and serving queries; delegators stake TRAC to nodes and earn reward shares. The publishing cost depends on data size (measured in bytes) and storage duration (measured in epochs). V9 adds publishing conviction accounts: publishers who lock TRAC for longer periods get discounts on publishing costs, creating an incentive for long-term commitment.

### UAL Namespacing (V9 Innovation)

V8 used sequential on-chain IDs, forcing publishers to wait for transaction confirmation before knowing their UAL. V9 introduces publisher-namespaced ranges: `reserveUALRange(count)` reserves a block of IDs keyed to `msg.sender`. This enables offline-first publishing — prepare KAs, assign UALs, then batch-finalize on-chain when ready. Reserved ranges never expire and never collide across publishers. As of V9.1, any EVM address can publish without an on-chain identity profile, lowering the barrier for edge nodes and lightweight agents.

### FairSwap (Private Knowledge Exchange)

The `ChainAdapter` interface includes FairSwap methods (`initiatePurchase`, `fulfillPurchase`, `revealKey`, `disputeDelivery`, `claimPayment`, `claimRefund`) implementing a commit-reveal protocol for private knowledge trading. The seller commits an encrypted data root and key commitment. After the buyer confirms receipt, the seller reveals the decryption key. If the revealed key doesn't match the commitment, the buyer can dispute on-chain with a proof, triggering an automatic refund. This eliminates the need to trust either party in a private knowledge exchange.

### Staking Conviction

V9 introduces staking conviction: delegators who lock their stake for longer periods earn a multiplier on rewards. The `stakeWithLock()` chain method accepts a lock duration in epochs, and `getDelegatorConvictionMultiplier()` returns the current multiplier. This mechanism incentivizes long-term participation and discourages stake-farming where delegators quickly move stake to whichever node is currently most profitable.

## Attested Knowledge Assets Protocol

The AKA spec (`docs/SPEC_ATTESTED_KNOWLEDGE_ASSETS.md`) extends the base knowledge asset model with session-scoped consensus. Three asset modes coexist on the same paranet:

1. **Legacy KA**: Current behavior. Any paranet member publishes, ACKs confirm data receipt.
2. **Verified KA**: Storage nodes verify real-world claims (HTTP liveness, DNS records, NFT ownership) before signing.
3. **AKA (Attested)**: Requires a valid session context. ACK semantics change from "I received this data" to "I validated and agree with this state transition." Each session defines a reducer function, membership list, and state linkage rules. On-chain finalization requires a quorum of validation-ACKs.

The `packages/attested-assets` package implements sessions (`session-manager.ts`), quorum logic (`quorum.ts`), state reducers (`reducer.ts`), canonical state computation (`canonical.ts`), and gossip-based distribution (`gossip-handler.ts`). Sessions are immutable after activation in v1 — no membership changes mid-session.

## Comparison with Alternative Approaches

### vs. Mem0 / Letta (Agent Memory Systems)

Mem0 and Letta provide single-agent persistent memory using vector stores and embedding-based retrieval. DKG v9 operates at a fundamentally different layer: it provides a shared, multi-agent knowledge substrate where any agent can publish and query structured knowledge. The tradeoff is complexity — setting up a DKG node requires P2P networking and optionally a blockchain connection, while Mem0 is a pip install. But Mem0 has no mechanism for verifiable cross-agent knowledge sharing or cryptographic provenance.

### vs. Zep/Graphiti (Temporal Knowledge Graphs)

Graphiti builds temporal knowledge graphs from conversational data for a single agent or application. DKG v9 knowledge graphs are designed for multi-party access from the ground up: paranets scope knowledge domains, workspace graphs enable collaborative writes, and Merkle proofs provide tamper evidence. Graphiti's temporal edge properties (valid_from, valid_to) have no direct equivalent in DKG, though the RDF data model can express temporal validity through additional triples.

### vs. LangGraph / CrewAI (Multi-Agent Orchestration)

LangGraph and CrewAI coordinate agents within a single process or organization. DKG v9 coordinates agents across organizational boundaries with no central authority. The key difference: LangGraph agents share state through an in-process graph; DKG agents share state through a decentralized network with cryptographic verification. DKG is infrastructure (the shared knowledge layer), while LangGraph is orchestration (how to sequence agent actions). They are complementary — a LangGraph workflow could use DKG for persistent cross-session knowledge.

### vs. IPFS / Filecoin (Decentralized Storage)

IPFS stores raw files; DKG stores structured knowledge queryable via SPARQL. Both use content-addressed storage with Merkle proofs, but DKG adds the semantic layer (RDF triples, named graphs, SPARQL query engine) and the economic layer (TRAC token incentives for storage, staking, rewards). DKG nodes can use any SPARQL-capable store, while IPFS nodes use a custom block store. The storage guarantees are also different: IPFS availability depends on pinning; DKG availability is economically incentivized through staking and proof challenges.

