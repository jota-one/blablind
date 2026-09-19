import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(HERE, '../..')

/** Handover file between `seed.ts` and `shoot.ts` (gitignored). */
export const SEED_FILE = path.join(HERE, '.seed.json')
/** Raw PNGs, before the WebP pass (gitignored). */
export const SHOTS_DIR = path.join(HERE, '.shots')
/** Where the tutorial page reads its images from. */
export const PUBLIC_DIR = path.join(ROOT, 'public/tutorial')

/** Throwaway member the member-area shots are taken as. Local dev DB only. */
export const DEMO_EMAIL = 'lea.demo@blablind.test'
export const DEMO_PASSWORD = 'BlaBlindDemo!2026'

export type SeededPlayer = { id: string; secret: string }

export type Seed = {
  user: string
  email: string
  lobbySlug: string
  gameSlug: string
  overSlug: string
  playingTrackId: string
  sessionIds: { lobby: string; game: string; over: string }
  players: Record<string, Record<string, SeededPlayer>>
}
