/// <reference path="../pb_data/types.d.ts" />

// Merge two user accounts: repoint all activity (sessions, players, favorites,
// playlists) from the source account to the target account inside a single
// transaction, then delete the now-empty source account. Admin-only.
routerAdd(
  'POST',
  '/api/admin/users/merge',
  e => {
    const authRecord = e.requestInfo().auth
    if (!authRecord) {
      return e.json(401, { message: 'Unauthorized' })
    }

    const roleIds = authRecord.getStringSlice('roles')
    let isAdmin = false
    for (const roleId of roleIds) {
      try {
        const role = e.app.findRecordById('roles', roleId)
        if (role.getString('slug') === 'admin') {
          isAdmin = true
          break
        }
      } catch (_) {}
    }

    if (!isAdmin) {
      return e.json(403, { message: 'Forbidden' })
    }

    const body = e.requestInfo().body
    const sourceId = body.sourceId
    const targetId = body.targetId

    if (!sourceId || !targetId) {
      return e.json(400, { message: 'sourceId and targetId are required' })
    }
    if (sourceId === targetId) {
      return e.json(400, { message: 'Cannot merge an account into itself' })
    }
    if (sourceId === authRecord.id) {
      return e.json(400, { message: 'Cannot merge your own account' })
    }

    try {
      e.app.runInTransaction(txApp => {
        const source = txApp.findRecordById('users', sourceId)
        const target = txApp.findRecordById('users', targetId)

        const repoint = (collection, field) => {
          const records = txApp.findRecordsByFilter(
            collection,
            `${field} = {:id}`,
            '',
            0,
            0,
            { id: sourceId },
          )
          for (const record of records) {
            record.set(field, targetId)
            txApp.save(record)
          }
        }

        repoint('sessions', 'owner')
        repoint('playlists', 'owner')
        repoint('favorites', 'discovered_from_user')

        // Players keep their session history; refresh the denormalized avatar
        // so past sessions show the surviving account's avatar.
        const players = txApp.findRecordsByFilter(
          'players',
          'auth_user = {:id}',
          '',
          0,
          0,
          { id: sourceId },
        )
        for (const player of players) {
          player.set('auth_user', targetId)
          player.set('avatar', target.getString('avatar'))
          txApp.save(player)
        }

        // Favorites are unique per (user, video): move them unless the target
        // already favorited the same video, in which case drop the duplicate.
        const favorites = txApp.findRecordsByFilter(
          'favorites',
          'user = {:id}',
          '',
          0,
          0,
          { id: sourceId },
        )
        for (const favorite of favorites) {
          const duplicates = txApp.findRecordsByFilter(
            'favorites',
            'user = {:target} && video = {:video}',
            '',
            1,
            0,
            { target: targetId, video: favorite.getString('video') },
          )
          if (duplicates.length > 0) {
            txApp.delete(favorite)
          } else {
            favorite.set('user', targetId)
            txApp.save(favorite)
          }
        }

        txApp.delete(source)
      })

      return e.json(200, { merged: true })
    } catch (err) {
      return e.json(500, { message: String(err) })
    }
  },
  $apis.requireAuth(),
)
