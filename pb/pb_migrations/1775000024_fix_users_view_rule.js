/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // Users can view their own record; admins can view any record
  collection.viewRule = 'id = @request.auth.id || @request.auth.roles.slug ?= "admin"'

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  collection.viewRule = '@request.auth.roles.slug ?= "admin"'

  app.save(collection)
})
