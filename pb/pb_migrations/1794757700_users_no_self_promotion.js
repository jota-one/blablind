/// <reference path="../pb_data/types.d.ts" />

// Closes a privilege escalation on the users collection. Sign-up is public on
// purpose (players), but the client chose the role it signed up with — anyone
// could send the admin role id, which the roles collection exposes. The role
// is now assigned server-side (pb_hooks/user_signup_role.pb.js) and the body
// may no longer carry roles or verified, at sign-up or on your own record.

const ADMIN = '@request.auth.roles.slug ?= "admin"'

migrate(
  app => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = `${ADMIN} || (@request.body.roles:isset = false && @request.body.verified:isset = false)`
    users.updateRule = `(id = @request.auth.id && @request.body.roles:isset = false && @request.body.verified:isset = false) || ${ADMIN}`
    users.manageRule = ADMIN
    app.save(users)
  },
  app => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    users.updateRule = `id = @request.auth.id || ${ADMIN}`
    users.manageRule = null
    app.save(users)
  },
)
