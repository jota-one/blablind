/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000002");

  collection.fields.add(new RelationField({
    "id": "relation_auth_user",
    "name": "auth_user",
    "collectionId": "_pb_users_auth_",
    "cascadeDelete": false,
    "maxSelect": 1,
    "minSelect": 0,
    "required": false,
    "system": false,
    "hidden": false,
    "presentable": false,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000002");
  const field = collection.fields.getByName("auth_user");
  collection.fields.remove(field.id);
  return app.save(collection);
})
