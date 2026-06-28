/// <reference path="../pb_data/types.d.ts" />

// Denormalize the account avatar onto the player record so it can be shown to
// everyone in a session — including guests, who can't read the users
// collection (admin-only list rule). The copy is done server-side, where the
// users lookup bypasses collection rules, so the client never needs access.

// On join: copy the avatar of the linked account onto the new player.
onRecordCreate(e => {
  const authUserId = e.record.getString('auth_user')
  if (authUserId) {
    try {
      const user = e.app.findRecordById('users', authUserId)
      e.record.set('avatar', user.getString('avatar'))
    } catch (_) {
      // Unknown user — leave avatar empty, the UI falls back to the initial.
    }
  }
  e.next()
}, 'players')

// When an account changes its avatar, propagate it to that user's players.
onRecordAfterUpdateSuccess(e => {
  e.next()

  const avatar = e.record.getString('avatar')
  try {
    const players = e.app.findRecordsByFilter(
      'players',
      'auth_user = {:uid}',
      '',
      500,
      0,
      { uid: e.record.id },
    )
    for (const player of players) {
      if (player.getString('avatar') !== avatar) {
        player.set('avatar', avatar)
        e.app.save(player)
      }
    }
  } catch (_) {
    // Transient error — players keep their previous avatar until next join.
  }
}, 'users')
