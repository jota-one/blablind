/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000002")
  collection.deleteRule = "secret = @request.query.secret"
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1001000025",
    "max": 0,
    "min": 0,
    "name": "secret",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000002")
  collection.deleteRule = null
  collection.fields.removeById("text1001000025")
  return app.save(collection)
})
