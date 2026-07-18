/// <reference path="../pb_data/types.d.ts" />

// Lets an admin obtain an auth token for any user ("sign in as"). The token is
// built directly instead of going through $apis.recordAuthResponse so no auth
// event fires — otherwise the impersonated user could receive auth alert
// emails.
routerAdd(
  'POST',
  '/api/admin/users/{id}/impersonate',
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

    try {
      const user = e.app.findRecordById('users', e.request.pathValue('id'))
      user.ignoreEmailVisibility(true)
      return e.json(200, { token: user.newAuthToken(), record: user })
    } catch (err) {
      return e.json(500, { message: String(err) })
    }
  },
  $apis.requireAuth(),
)
