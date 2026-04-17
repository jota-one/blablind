/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1775000019")
  collection.listRule = ""
  collection.viewRule = ""
  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1775000019")
  collection.listRule = null
  collection.viewRule = null
  app.save(collection)
})
