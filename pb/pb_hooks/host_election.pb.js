/// <reference path="../pb_data/types.d.ts" />

// Server-side host election.
//
// Whenever a player record is updated (heartbeats refresh last_seen every
// ~15s), check whether that session's host is still online. If the host is
// offline or unset, reassign it to the earliest-created online player.
//
// This makes the server the single source of truth for the host, removing
// the client-side election that could flip-flop when clients disagreed about
// who was online.
onRecordAfterUpdateSuccess((e) => {
  e.next()

  const sessionId = e.record.get('session')
  if (!sessionId) {
    return
  }

  // Keep in sync with ONLINE_WINDOW_MS in src/game/utils.ts.
  const ONLINE_WINDOW_MS = 45 * 1000
  const thresholdIso = new Date(Date.now() - ONLINE_WINDOW_MS)
    .toISOString()
    .replace('T', ' ')

  try {
    const session = e.app.findRecordById('sessions', sessionId)
    const hostId = session.get('host')

    // The host's own heartbeat proves the host is online — no election needed.
    if (hostId && e.record.id === hostId) {
      return
    }

    // Earliest-created online players for this session.
    const online = e.app.findRecordsByFilter(
      'players',
      'session = {:session} && last_seen >= {:threshold}',
      'created',
      500,
      0,
      { session: sessionId, threshold: thresholdIso },
    )
    if (online.length === 0) {
      return
    }

    // Current host still online → nothing to do.
    if (hostId && online.some((p) => p.id === hostId)) {
      return
    }

    const elected = online[0]
    if (elected.id !== hostId) {
      session.set('host', elected.id)
      // IRL mode is the default: the host is DJ by default too, as long as
      // no DJ has been assigned/handed over yet.
      if (session.get('irl_mode') && !session.get('dj_player')) {
        session.set('dj_player', elected.id)
      }
      e.app.save(session)
    }
  } catch (_) {
    // Session missing or transient error — ignore; a later heartbeat retries.
  }
}, 'players')
