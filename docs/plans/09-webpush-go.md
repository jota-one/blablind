# Plan 09 — Web Push via a custom Go PocketBase build

_Size: L. Risk: medium (new build/deploy shape). The architecture was validated in ROADMAP ("Notifications push"). The reference implementation to copy is the **lexlsf** project: `~/Sites/astro/lexlsf/pb/` (main.go, go.mod) and its deploy notes `~/Sites/astro/lexlsf/pb/README.md` — read both before starting._

## Why a Go build

Web Push needs `aes128gcm` encryption + VAPID JWT — impractical in JSVM, trivial with `github.com/SherClockHolmes/webpush-go`. The hybrid approach keeps **all existing JS hooks and migrations running unchanged**: the Go binary registers the `jsvm` plugin exactly like the stock binary does.

## Phase 1 — Go scaffolding (no push yet) — ✅ **shipped 2026-08-24**

Goal: our own binary that behaves byte-for-byte like the stock one. Done — see `pb/main.go` and `pb/README.md`. Two notes for whoever continues:

- The reference used was **PocketBase's own `examples/base/main.go`** (in the module cache for the pinned version), not lexlsf's simplified `main.go`. lexlsf's version drops `indexFallback`, uses a different `hooksPool` default and adds a redundant `OnBootstrap`/`RunAllMigrations` block — `apis/serve.go` already runs migrations on serve. Copying it would have silently changed static-serving behavior.
- The `ghupdate` plugin is deliberately **not** registered: `pocketbase update` would overwrite our custom binary with the official one.

What landed: `pb/main.go` (module `github.com/jota-one/blablind`), `pb/go.mod` pinned to `v0.39.4` to match `.pbversion`, `pb/go.sum`, `pb/README.md`, and a `pnpm db:custom` script. The binary is gitignored (`pb/pocketbase.custom` was already listed).

Verified: all 51 app migrations apply on a fresh DB (13 collections created); re-running against a copy of the dev DB applies nothing new; JS hooks load (`/api/skip-vote` answers with its own validation error); realtime `PB_CONNECT` works; `serve --help` is flag-for-flag identical to the official binary.

Also verified end-to-end (2026-08-24): a two-browser classic IRL game against the custom binary — session creation, server-side host election and re-election, realtime propagation both ways, unrevealed-title masking via `onRecordEnrich`, YouTube search through the SSR proxy, game start and buzz write. Playwright suite green, 3/3 (autonomous flow, buzz-advance, password-reset with Mailpit).

## Phase 2 — push plumbing

1. **VAPID keys**: generate once (`npx web-push generate-vapid-keys` or Go). Public key → `PUBLIC_VAPID_KEY` env for the client; private key → server-only env/secret (`VAPID_PRIVATE_KEY`, plus `VAPID_SUBJECT=mailto:…`). Never commit the private key; document in `.env.example` and the infra secret store.
2. **Migration**: `push_subscriptions` collection — `player` (relation, cascade), `user` (relation users, optional, cascade), `endpoint` (text, required), `p256dh` (text), `auth` (text), unique index on `endpoint`. Rules: create public-with-secret (same pattern as plan 04's `answer_votes.createRule`), list/view `null` (server-only reads), delete by owner (same identity rule as `players.updateRule` in plan 04).
3. **Service worker** (`public/sw.js`, currently a stub): add `push` handler (`self.registration.showNotification(data.title, {...})`) and `notificationclick` (focus/open `data.url`). Keep it dependency-free.
4. **Client opt-in**: button in the room menu drawer (and member area later): `Notification.requestPermission()` → `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <public key> })` → POST the subscription JSON to `push_subscriptions`. iOS requires the installed PWA (manifest already in place) — show a hint when `Notification` is undefined.
5. **Go sender** (`pb/push.go`): helper `sendPush(app, playerIds, payload)` — look up subscriptions, `webpush.SendNotification` with the VAPID options, delete subscriptions on 404/410 (expired).
6. **Triggers** (Go `OnRecordAfterUpdateSuccess` hooks — reuse the conditions, don't re-derive):
   - session `status` → `playing`: notify all session players except the actor: "La partie commence !" (url = `/{slug}`).
   - classic mode, track `status` → `playing`: notify the track's `added_by` ("C'est ton morceau — tu valides les réponses") when offline (`last_seen` stale).
   - Keep the trigger list minimal in v1; invitations come later (no invite feature yet).

## Phase 3 — CI/deploy

**No workflow change is needed in this repo** — this plan's original instructions here were stale. Verified against `jota-one/infra@c72f808` (2026-08-24): `deploy-pb-db.yaml` checks for `<pb-path>/go.mod`, reads the Go version from it, runs `actions/setup-go`, builds `GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o pocketbase .` and includes the binary in the "pb" bundle. `bin/pb_install` then skips it because a source-built binary reports version `(untracked)`.

Consequence: **the switch to the custom binary happens on the first deploy after `pb/go.mod` reaches `main`** — no opt-in step.
- Keep `.pbversion` in sync with the pinned Go dependency; it doubles as the rollback lever (see lexlsf README "Plan de rollback").
- VAPID private key: add to the infra secret mechanism, exposed as env to the systemd service.

## Verification

- Phase 1: done — server-side checks, the two-browser manual smoke and the full Playwright suite (3/3) all passed against the custom binary on 2026-08-24.
- Phase 2: two devices (one Android Chrome, one iOS installed PWA), opt in on both, start a game from a third client → both receive the push with the app closed; tapping opens the room. Expired-subscription cleanup: subscribe, unsubscribe at the browser level, trigger a push, confirm the record is deleted.
- Push failure must never break the triggering save (send asynchronously — goroutine, like lexlsf's post-commit ffmpeg hooks).

## Proposed commits

Phase-per-PR is acceptable here (phase 1 is independently shippable). ROADMAP: move the "Notifications push (Web Push)" section to History when phase 2 ships.
