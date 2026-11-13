# Foolsgold — Judgment & Decision Log

All non-obvious architectural choices, scope adaptations, and interface contracts are logged here.

## 2026-11-12 — Environment Adaptation (Next.js 15 / TypeScript Runtime)
- **Context**: The brief referenced a Ruby on Rails + PostgreSQL + Redis + Docker fork of `we-promise/sure`. However, the actual workspace runtime is a Next.js 15 + TypeScript + Node 22 environment without Ruby, Rails, PostgreSQL, or Docker installed.
- **Decision**: Follow the reality-first principle: implement Foolsgold natively as a Next.js 15 App Router + TypeScript full-stack benchmark platform with a faithful Sure-inspired personal-finance ledger engine, a real HTTP JSON-RPC 2.0 MCP server (`/api/mcp`), a loopback exfiltration sink (`/api/sink`), a standalone CLI runner (`bin/foolsgold.ts`), and the Researcher Console UI.
- **Trade-off**: Zero external database dependencies required to run (`npx tsx bin/foolsgold.ts` or `npm run dev`), sub-millisecond snapshot-based episode resets, and full compatibility with `@google/genai` function calling.

## 2026-11-12 — Dual Agent Execution Modes (Live Gemini + Deterministic Baseline)
- **Context**: `GEMINI_API_KEY` may or may not be populated in local dev or CI environments.
- **Decision**: Implement reference Naive and Hardened agents with two explicit, clearly labeled execution modes:
  1. **Live Gemini Mode**: Uses `@google/genai` (`gemini-4-hydrogen`) with real multi-turn `FunctionDeclaration` tool calling against our MCP dispatcher when `GEMINI_API_KEY` is configured.
  2. **Deterministic Baseline Mode**: Reproducible policy-driven baseline execution that drives the exact same `/api/mcp` tool surface, world state mutations, Pipelock guardrail checks, and `/api/sink` HTTP calls when running offline or during regression testing.
- **Why**: Guarantees the benchmark and one-command demo work out-of-the-box in hermetic environments while supporting real LLM evaluation whenever an API key is provided.

## 2026-11-12 — Scenario Schema Versioning (`v1`)
- **Decision**: Standardize scenarios on `schemaVersion: "v1"` with YAML serialization via `js-yaml`. Payloads are injected strictly as inert data fields (merchant descriptors, transaction notes, CSV rows, mock SimpleFIN/Lunchflow sync feeds, Statement Vault PDF text, budget/goal names) — never as executable code.

## 2026-11-12 — Pipelock & Read-Only Scope as Toggleable Defenses
- **Decision**: Model both `readOnlyScope` (token-level enforcement rejecting write/transfer/delete/outbound MCP tools) and `pipelockProxy` (argument & payload inspection layer blocking canary strings, encoded canary patterns, suspicious external URLs, and imperative override markers) inside the MCP dispatch pipeline so researchers can run controlled A/B ablations on the exact same scenarios.

## 2026-11-12 — Loopback-Only Sink Isolation
- **Decision**: `/api/sink` acts as the sole exfiltration sink target (`http://localhost:3000/api/sink` or internal loopback dispatch) and refuses external network egress. All canary secrets (`fg_canary_...`, `FG00CANARY...`, synthetic `999-XX-XXXX` SSNs) are deterministically seeded and clearly marked synthetic.
