/// <reference path="../pb_data/types.d.ts" />

// Atomic skip-vote toggle.
//
// Clients used to read `skip_votes`, append/remove their id, then write the
// whole array back. Two players voting at the same time both read the same
// array and the last write wins, silently dropping a vote — so the voter had
// to click again. Here the read-modify-write runs inside a transaction, which
// SQLite serializes, so concurrent votes can no longer clobber each other.
routerAdd('POST', '/api/skip-vote', e => {
  const body = e.requestInfo().body
  const trackId = body.trackId
  const playerId = body.playerId
  const action = body.action === 'remove' ? 'remove' : 'add'

  if (!trackId || !playerId) {
    return e.json(400, { message: 'trackId and playerId are required' })
  }

  try {
    let votes = []
    e.app.runInTransaction(txApp => {
      const track = txApp.findRecordById('tracks', trackId)
      const raw = track.getString('skip_votes')
      try {
        votes = raw ? JSON.parse(raw) : []
      } catch (_) {
        votes = []
      }
      if (!Array.isArray(votes)) {
        votes = []
      }

      const has = votes.indexOf(playerId) !== -1
      if (action === 'remove') {
        if (!has) {
          return
        }
        votes = votes.filter(id => id !== playerId)
      } else {
        if (has) {
          return
        }
        votes.push(playerId)
      }

      track.set('skip_votes', votes)
      txApp.save(track)
    })

    return e.json(200, { skip_votes: votes })
  } catch (err) {
    return e.json(500, { message: String(err) })
  }
})
