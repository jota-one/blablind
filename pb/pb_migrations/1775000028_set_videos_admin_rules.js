/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('pbc_1001000010')

  collection.updateRule = '@request.auth.roles.slug ?= "admin"'
  collection.deleteRule = '@request.auth.roles.slug ?= "admin"'

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('pbc_1001000010')

  collection.updateRule = ''
  collection.deleteRule = null

  return app.save(collection)
})
