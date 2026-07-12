# Implementation plans — index & execution protocol

_Source: [ANALYSIS-2026-07-12.md](../ANALYSIS-2026-07-12.md). These plans are written to be executed one at a time, by an engineer or model without prior context on this codebase. Each plan is self-contained._

## Execution order

| # | Plan | Depends on | Size | Risk |
|---|------|-----------|------|------|
| 01 | [Chores: dead deps, README](./01-chores.md) | — | XS | none |
| 02 | [Room.vue split](./02-room-split.md) | — | L | low (mechanical) |
| 03 | [Typed PB records](./03-record-types.md) | 02 recommended | M | low |
| 04 | [Security: write protection](./04-security-write-protection.md) | 02 (session call sites centralized) | L | medium |
| 05 | [Security: answer leak](./05-security-answer-leak.md) | 04 | M | medium |
| 06 | [Pause-aware buzz window](./06-pause-aware-window.md) | — | M | medium |
| 07 | [Misc hardening & tests](./07-hardening-misc.md) | — | S | low |

Order rationale: 02 before 04 so the security refactor lands on centralized call sites instead of a 2 100-line file. If a security incident makes 04 urgent, it CAN be done first — its client changes are localized — but expect more merge friction.

## Protocol (applies to every plan)

1. **Read the house rules** in `~/Sites/CLAUDE.md` (loaded automatically). Non-negotiables used constantly here:
   - New PocketBase migration file per schema change, never edit an existing one. Files: `pb/pb_migrations/{unix_timestamp}_{description}.js`. Never set collection/field `id`.
   - JSVM hooks: JSON fields must be read with `record.getString('field')` + `JSON.parse()`.
   - English identifiers/comments/commits; `===`; braces always; `useTemplateRef`; typed `defineProps<Props>()`.
   - Propose commit breakdown + messages, wait for approval before committing.
2. **One plan = one branch** off `develop` (`feat/…` or `refactor/…`), one PR. Inside a plan, commit at each checkpoint the plan defines.
3. **Verification gate before every commit**: `pnpm lint && pnpm build && pnpm test:unit`. For plans touching gameplay: `pnpm test:e2e` (needs PocketBase running: `pnpm db` in another terminal; see `tests/e2e/README.md`).
4. **`VERIFY:` markers** — the plan author was not 100 % sure of the marked behavior. You MUST confirm it empirically (curl, tiny experiment) before building on it, and adapt the step if reality differs. Do not skip these.
5. **Schema is inspectable directly**: `sqlite3 pb/pb_data/data.db "PRAGMA table_info(tracks);"` or
   `sqlite3 pb/pb_data/data.db "SELECT name, listRule, viewRule, createRule, updateRule, deleteRule FROM _collections;"` — always check reality before assuming.
6. **PocketBase version**: v0.39.4 (see `pb/.pbversion`). JSVM docs: https://pocketbase.io/docs/js-overview/. API rules syntax: https://pocketbase.io/docs/api-rules-and-filters/.
7. Local stack: `pnpm dev` (app, :4321) + `pnpm db` (PocketBase, :8093). `PUBLIC_PB_BASE_URI` in `.env.local` points the SPA at PB.

## Environment facts (verified 2026-07-12)

- Collections and exact fields: see the type definitions in [03-record-types.md](./03-record-types.md) — they were generated from the live schema and double as documentation.
- Current API rules: `sessions`, `tracks`, `buzzes` are fully public (list/view/create/update/delete); `players` public except delete (`secret = @request.query.secret`); `answer_votes` public read/create, locked update/delete; `players.secret` is **serialized to any reader** (fixed in plan 04).
- Realtime uses SSE via the JS SDK; `EventSource` **cannot send custom headers** — anything header-based works for CRUD calls only, never for realtime payloads.
- PB batch API is already enabled and used (`pb.createBatch()` in Room.vue). Batch sub-operations are evaluated against collection rules with the batch request's headers.
- The e2e seed helper (`tests/e2e/helpers/seed.ts`) writes through the public API — rule changes in plan 04 can break it; the plan says how to fix it.
