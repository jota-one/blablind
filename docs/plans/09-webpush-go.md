# Plan 09 — Web Push via a custom Go PocketBase build

_Size: L. Risk: medium (new build/deploy shape). The architecture was validated in ROADMAP ("Notifications push"). The reference implementation to copy is the **lexlsf** project: `~/Sites/astro/lexlsf/pb/` (main.go, go.mod) and its deploy notes `~/Sites/astro/lexlsf/pb/README.md` — read both before starting._

## Why a Go build

Web Push needs `aes128gcm` encryption + VAPID JWT — impractical in JSVM, trivial with `github.com/SherClockHolmes/webpush-go`. The hybrid approach keeps **all existing JS hooks and migrations running unchanged**: the Go binary registers the `jsvm` plugin exactly like the stock binary does.

## Phase 1 — Go scaffolding (no push yet)

Goal: our own binary that behaves byte-for-byte like the stock one.

1. Copy the shape of `lexlsf/pb/main.go` into `pb/main.go` (module `github.com/jorinho/blablind` or the actual GitHub path): `pocketbase.New()`, `jsvm.MustRegister` (defaults — picks up `pb_hooks/` and `pb_migrations/`), `migratecmd.MustRegister` (TemplateLangJS, Automigrate), the `OnBootstrap` RunAllMigrations block, and the `apis.Static(os.DirFS("./pb_public"))` catch-all. Drop lexlsf's video/impersonate extras.
2. `go.mod`: `github.com/pocketbase/pocketbase` pinned to the version in `pb/.pbversion` (v0.39.4 — lexlsf pins an older one, don't copy its version).
3. Build & swap locally: `cd pb && go build -o pocketbase.custom . && ./pocketbase.custom serve --http=127.0.0.1:8093`. Full regression: app boots, migrations idempotent, a complete classic + autonomous game works, existing hooks fire (skip-vote endpoint, host election).
4. `.gitignore`: ignore the built binary (keep committing nothing binary; CI builds it).

Checkpoint commit: `feat(pb): custom Go PocketBase build with jsvm (behavior-identical)`.

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

Follow `lexlsf/pb/README.md` §Recommandation verbatim, adapted to this repo's `.github/workflows/deploy.yaml`:
- Add `actions/setup-go` + `GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o pocketbase .` in the `build` job (workdir `pb`) **before** `Prepare artifact`.
- Coordinate with the infra side: the "pb" bundle packaging loop must include the `pocketbase` binary (see the diff in lexlsf's README against `infra/.github/workflows/deploy-pb-db.yaml`). This part may already be done for lexlsf — check with the infra owner whether the loop change is generic or per-project.
- Keep `.pbversion` in sync with the pinned Go dependency; it doubles as the rollback lever (see lexlsf README "Plan de rollback").
- VAPID private key: add to the infra secret mechanism, exposed as env to the systemd service.

## Verification

- Phase 1: full manual regression + both e2e specs against the custom binary.
- Phase 2: two devices (one Android Chrome, one iOS installed PWA), opt in on both, start a game from a third client → both receive the push with the app closed; tapping opens the room. Expired-subscription cleanup: subscribe, unsubscribe at the browser level, trigger a push, confirm the record is deleted.
- Push failure must never break the triggering save (send asynchronously — goroutine, like lexlsf's post-commit ffmpeg hooks).

## Proposed commits

Phase-per-PR is acceptable here (phase 1 is independently shippable). ROADMAP: move the "Notifications push (Web Push)" section to History when phase 2 ships.
