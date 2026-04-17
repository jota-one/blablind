routerAdd(
  'PATCH',
  '/api/admin/users/{id}/verify',
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

    const userId = e.request.pathValue('id')
    const body = e.requestInfo().body

    try {
      const user = e.app.findRecordById('users', userId)
      user.set('verified', body.verified === true || body.verified === 'true')
      e.app.save(user)
      return e.json(200, { verified: user.getBool('verified') })
    } catch (err) {
      return e.json(500, { message: String(err) })
    }
  },
  $apis.requireAuth(),
)
