export function getVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

export function generateSlug(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// A player is considered online if their last heartbeat is within this window.
// Heartbeat interval is 15s, so this tolerates ~2 missed beats (mobile tab
// throttling). Keep in sync with ONLINE_WINDOW_MS in pb/pb_hooks/host_election.pb.js.
export const ONLINE_WINDOW_MS = 45_000

export function isOnline(player: any): boolean {
  if (!player?.last_seen) return true
  return Date.now() - new Date(player.last_seen).getTime() < ONLINE_WINDOW_MS
}

export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
