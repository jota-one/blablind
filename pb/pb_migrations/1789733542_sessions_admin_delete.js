/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('pbc_1001000001')

  // Admins can delete a session from the admin area. The relations cascade:
  // players, tracks, then buzzes and answer_votes go with it.
  collection.deleteRule = '@request.auth.roles.slug ?= "admin"'

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('pbc_1001000001')

  collection.deleteRule = null

  return app.save(collection)
})
