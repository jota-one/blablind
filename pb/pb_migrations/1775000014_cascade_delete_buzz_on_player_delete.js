/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000004")
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_1001000002",
    "hidden": false,
    "id": "relation1001000041",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "player",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000004")
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1001000002",
    "hidden": false,
    "id": "relation1001000041",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "player",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))
  return app.save(collection)
})
