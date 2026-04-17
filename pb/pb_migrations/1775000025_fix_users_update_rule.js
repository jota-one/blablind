/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Users can update their own record; admins can update any record
  collection.updateRule = 'id = @request.auth.id || @request.auth.roles.slug ?= "admin"'

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  collection.updateRule = '@request.auth.roles.slug ?= "admin"'

  app.save(collection)
})
