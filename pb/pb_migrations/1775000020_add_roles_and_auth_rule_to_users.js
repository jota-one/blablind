/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // add roles field
  collection.fields.addAt(8, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1775000019",
    "hidden": false,
    "id": "relation3057528519",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "roles",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add authRule to require verified = true
  collection.authRule = "verified = true"

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // remove roles field
  collection.fields.removeById("relation3057528519")

  // remove authRule
  collection.authRule = null

  return app.save(collection)
})
