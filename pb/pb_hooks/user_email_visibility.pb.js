/// <reference path="../pb_data/types.d.ts" />

// Always expose users' emails to admins, regardless of each account's
// `emailVisibility` flag. Applies to the serialized copy only (lists, single
// GETs and realtime events) — the flag itself is untouched.
onRecordEnrich(e => {
  const auth = e.requestInfo.auth
  if (auth) {
    const roleIds = auth.getStringSlice('roles')
    for (const roleId of roleIds) {
      try {
        const role = e.app.findRecordById('roles', roleId)
        if (role.getString('slug') === 'admin') {
          e.record.ignoreEmailVisibility(true)
          break
        }
      } catch (_) {}
    }
  }
  e.next()
}, 'users')
