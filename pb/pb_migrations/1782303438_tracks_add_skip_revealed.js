/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");
  collection.fields.add(new BoolField({
    "id": "bool_skip_revealed",
    "name": "skip_revealed",
    "required": false,
    "system": false,
    "hidden": false,
    "presentable": false,
  }));
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");
  const f = collection.fields.getByName("skip_revealed");
  if (f) collection.fields.remove(f.id);
  return app.save(collection);
})
