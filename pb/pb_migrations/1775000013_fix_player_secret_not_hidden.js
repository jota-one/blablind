/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000002")
  const field = collection.fields.getByName("secret")
  field.hidden = false
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000002")
  const field = collection.fields.getByName("secret")
  field.hidden = true
  return app.save(collection)
})
