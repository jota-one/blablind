/// <reference path="../pb_data/types.d.ts" />

// Public sign-up gets the `user` role from the server, never from the client.
// An admin creating an account from the back office keeps the roles they chose.
// Everything lives inside the handler: hook handlers cannot see the file's scope.
onRecordCreateRequest(e => {
  const auth = e.auth
  let isAdmin = e.hasSuperuserAuth()

  if (auth && !isAdmin) {
    for (const roleId of auth.getStringSlice('roles')) {
      try {
        if (e.app.findRecordById('roles', roleId).getString('slug') === 'admin') {
          isAdmin = true
          break
        }
      } catch (_) {}
    }
  }

  if (!isAdmin) {
    const userRole = e.app.findFirstRecordByFilter('roles', "slug = 'user'")
    e.record.set('roles', [userRole.id])
    e.record.set('verified', false)
  }

  e.next()
}, 'users')
