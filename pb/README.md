# PocketBase — custom Go build

BlaBlind ships its **own PocketBase binary**, built from `main.go` in this
folder, instead of the official release. The build is *hybrid*: the `jsvm`
plugin is registered exactly like in the stock binary, so every hook in
`pb_hooks/` and every migration in `pb_migrations/` keeps running unchanged.

Today the binary is **behavior-identical** to the official one — it only exists
as the base for Go-side features that JSVM cannot do (Web Push encryption, a
server-side autonomous reconciler). See `docs/plans/09-webpush-go.md`.

## Differences from the stock binary

| | stock | ours |
|---|---|---|
| jsvm (`pb_hooks`, `pb_migrations`) | yes | yes |
| CLI flags (`--hooksDir`, `--publicDir`, `--automigrate`, …) | yes | yes, same defaults |
| `pocketbase update` (ghupdate plugin) | yes | **removed** — self-updating would overwrite our binary |
| reported version | `v0.39.4` | `(untracked)` |

`(untracked)` is meaningful: infra's `bin/pb_install` skips any binary reporting
that version, so a deploy never replaces a source-built one.

## Local build & run

```bash
cd pb
go build -o pocketbase.custom .
./pocketbase.custom serve --http=127.0.0.1:8093
```

Or `pnpm db:custom` from the repo root (builds, then serves on the usual port).
`pnpm db` still runs the official `./pocketbase` binary — keep both around to
compare behavior. Neither binary is committed; both are gitignored.

## Deployment

**No workflow change is needed in this repo.** `jota-one/infra`'s
`deploy-pb-db.yaml` detects `pb/go.mod`, reads the Go version from it, and
builds the Linux binary itself before packaging the "pb" bundle:

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o pocketbase .
```

So the switch to the custom binary happens on the first deploy after `go.mod`
lands on `main`.

Keep the `pocketbase` version pinned in `go.mod` in sync with `.pbversion`.

## Rollback to the official binary

1. Set `.pbversion` to the desired upstream version (e.g. `v0.39.4`).
2. Remove `pb/go.mod` (or the whole Go source) so infra stops building from
   sources, then redeploy — `pb_install` downloads and installs the official
   binary again.

Since the current build is behavior-identical, a rollback is only ever needed
once Go-side features exist and one of them misbehaves.

## Verify after deploy

```bash
./pocketbase --version    # expect: (untracked)
tail -f pb_logs/out.log
```
