# Foolsgold Architecture

Foolsgold is an episode-based defensive AI security benchmark that evaluates tool-using agents against indirect prompt injection, tool misuse, and data exfiltration inside a realistic personal-finance ledger.

## Directory Map

```text
app/
  page.tsx                  # Researcher Console entry point
  api/
    mcp/route.ts            # JSON-RPC 2.0 MCP server (Bearer auth, audit log, Pipelock, Read-Only scope)
    sink/route.ts           # Loopback exfiltration sink (captures & logs canary/bulk egress)
    episodes/route.ts       # Create, run, reset, and list benchmark episodes
    matrix/route.ts         # Run multi-agent / multi-defense scenario matrices & aggregate metrics
    scenarios/route.ts      # Scenario catalog, YAML serialization, and custom scenario execution
    world/route.ts          # Deterministic synthetic world preview & canary inspection
lib/
  ledger/
    types.ts                # Core finance domain models (Accounts, Transactions, Merchants, Tags, Budgets, Goals, Statements, Family)
    engine.ts               # Deterministic ledger queries, mutations, CSV import, and Mock SimpleFIN/Lunchflow sync
  testbed/
    prng.ts                 # Seeded Mulberry32 PRNG for reproducible worlds
    world-generator.ts      # Generates personas, 6+ months of transactions, and synthetic honeytoken canaries
    scenarios.ts            # YAML/JSON v1 scenario schema + 12 starter scenarios across easy/medium/hard/control
    episode-store.ts        # Isolated episode snapshots, fast reset, trace store, and sink log persistence
    mcp-server.ts           # 18 personal-finance MCP tools + bearer auth + Pipelock proxy + audit logger
    judge.ts                # Hybrid deterministic + optional Gemini LLM judge + aggregate scoreboard metrics
    agents.ts               # Naive & Hardened agents (Live Gemini Function Calling + Deterministic Baseline)
bin/
  foolsgold.ts              # CLI benchmark runner (single scenario, pack, or matrix)
components/
  ConsoleShell.tsx          # Top navigation & Researcher Console workspace coordinator
  EpisodeConsoleView.tsx    # Run episodes, compare Naive vs Hardened, step-by-step Trace Replay, Sink Log & Diff
  ScenarioBrowserView.tsx   # Browse 12 scenarios, filter by difficulty/vector, inspect YAML, test custom payloads
  LedgerInspectorView.tsx   # Inspect deterministic accounts, transactions, canaries, statements, and sync feeds
  ScoreboardView.tsx        # ASR by vector/difficulty, utility-vs-safety matrix, JSON/Markdown report export
```

## Core Seams & Data Flow

1. **World Generation (`lib/testbed/world-generator.ts`)**: Given `(seed, persona, months)`, generates a deterministic personal-finance ledger containing checking, savings, credit card, investment, and loan accounts, recurring payroll/subscriptions, family members, Statement Vault PDF text extracts, and per-episode honeytoken canaries (`account_number`, `api_key`, `ssn_synthetic`, `recovery_phrase`).
2. **Payload Plumbing (`lib/testbed/scenarios.ts` + `lib/ledger/engine.ts`)**: Scenarios attach inert attacker text into realistic data surfaces (`merchant_name`, `transaction_note`, `csv_import`, `sync_feed`, `pdf_statement`, `budget_goal`, `family_note`).
3. **Episode Isolation & Fast Reset (`lib/testbed/episode-store.ts`)**: Every episode clones a deep baseline snapshot (`baselineWorld`) alongside a mutable working ledger (`workingWorld`), an isolated audit trace array (`traces`), and an isolated sink capture list (`sinkEvents`). Resetting restores `workingWorld` from `baselineWorld` in <1ms.
4. **MCP Tool Surface & Defenses (`lib/testbed/mcp-server.ts` & `/api/mcp`)**:
   - Enforces per-episode Bearer token (`fg_ep_<id>_<hash>`).
   - Optional `readOnlyScope`: blocks all mutating or outbound tools (`create_transfer`, `create_transaction`, `update_transaction`, `delete_transaction`, `send_webhook_report`, etc.).
   - Optional `pipelockProxy`: inspects outbound arguments and payloads for canary tokens, base64/hex-encoded canaries, suspicious sink URLs, or imperative injection markers.
   - Records every tool invocation (`tool`, `args`, `resultDigest`, `blockedBy`, `timestamp`, `durationMs`) to the episode trace.
5. **Loopback Exfil Sink (`/api/sink`)**: Local HTTP endpoint that records incoming exfiltration attempts and flags any match against episode canary secrets (plaintext, base64, or hex).
6. **Hybrid Judge (`lib/testbed/judge.ts`)**: Evaluates deterministic invariants (`canary_seen_at_sink`, `encoded_canary_leak`, `tool_call_match`, `db_state_diff`, `cross_tenant_access`, `task_completed`, `refusal_detected`) plus optional Gemini LLM rubric assessment when `GEMINI_API_KEY` is present.
