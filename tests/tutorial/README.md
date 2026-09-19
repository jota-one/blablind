# Tutorial screenshots

Regenerates every screenshot on the `/tutorial` page — 21 screens × 2 languages
× 2 viewports. Re-run it whenever the UI it shows changes; the page reads the
images straight from `public/tutorial/`, so nothing else needs touching.

## Prerequisites

- PocketBase and the app running (`pnpm db`, `pnpm dev`)
- Superuser credentials — same file as the e2e suite, `tests/e2e/.env`
  (there is no dotenv auto-load, so source it)
- `cwebp` for the conversion step: `brew install webp`

## Running

```zsh
set -a; source tests/e2e/.env; set +a
pnpm tutorial:seed    # fictional dataset: demo member, 3 sessions, playlists, favorites
pnpm tutorial:shoot   # PNGs into tests/tutorial/.shots/ (~10 min for all four passes)
pnpm tutorial:webp    # converts them into public/tutorial/
```

Narrow a re-run with env vars: `ONLY=12-buzz,13-validate LANGS=fr VPS=mobile pnpm tutorial:shoot`.

## What it creates in the dev DB

Everything is namespaced and wiped on the next `tutorial:seed`:

- a verified member `lea.demo@blablind.test` (local dev DB only — do not seed this in production)
- three sessions under the slugs `demo-lobby`, `demo-partie`, `demo-fin`
- that member's playlists and favorites (the seed clears their existing ones first)

`shoot.ts` fetches the demo member's token over the API and primes it into
`sessionStorage`, and primes the seeded players' localStorage keys to land
straight in a room — the same trick the e2e suite uses.

## Gotchas

- **Never run `pnpm build` (or `astro check`) while capturing.** It invalidates
  the dev server's Vite dep cache, and the next page load 504s on dynamically
  imported modules — `sortablejs` (the room stops hydrating entirely) and
  `qr-code-styling` (the share dialog opens without its QR code). Restart
  `pnpm dev` before capturing again. Run the type gate once, at the end.

- Seeded players read as offline after 45 s (`ONLINE_WINDOW_MS`), so the script
  re-beats their `last_seen` before every room shot.
- Screenshots come out in the light theme (`blind`), the app's default. Chromium
  reports `prefers-color-scheme: light` unless told otherwise.
- The Astro dev toolbar is hidden with an injected stylesheet on every page.
