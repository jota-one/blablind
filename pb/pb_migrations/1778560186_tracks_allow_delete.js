/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");
  collection.deleteRule = "";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");
  collection.deleteRule = null;
  return app.save(collection);
})
