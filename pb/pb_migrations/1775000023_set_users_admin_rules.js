/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Allow admins to list/view/update/delete users
  collection.listRule = '@request.auth.roles.slug ?= "admin"'
  collection.viewRule = '@request.auth.roles.slug ?= "admin"'
  collection.updateRule = '@request.auth.roles.slug ?= "admin"'
  collection.deleteRule = '@request.auth.roles.slug ?= "admin"'
  // Anyone can create (register)
  collection.createRule = ""

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  collection.listRule = null
  collection.viewRule = null
  collection.updateRule = null
  collection.deleteRule = null
  collection.createRule = null

  app.save(collection)
})
