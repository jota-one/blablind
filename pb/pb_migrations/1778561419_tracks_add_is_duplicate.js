/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");

  collection.fields.add(new BoolField({
    "id": "bool_is_duplicate",
    "name": "is_duplicate",
    "required": false,
    "system": false,
    "hidden": false,
    "presentable": false,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");
  const field = collection.fields.getByName("is_duplicate");
  collection.fields.remove(field.id);
  return app.save(collection);
})
