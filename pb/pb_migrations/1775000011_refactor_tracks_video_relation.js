/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");

  // Add video relation (at index 1, after session)
  collection.fields.addAt(1, new RelationField({
    "cascadeDelete": true,
    "collectionId": "pbc_1001000010",
    "hidden": false,
    "id": "relation1001000105",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "video",
    "presentable": false,
    "required": false,
    "system": false,
  }));

  // Remove youtube_url, title, artist (moved to videos)
  collection.fields.removeById("text1001000031");
  collection.fields.removeById("text1001000033");
  collection.fields.removeById("text1001000034");

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");

  collection.fields.removeById("relation1001000105");

  collection.fields.addAt(1, new TextField({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1001000031",
    "max": 0,
    "min": 0,
    "name": "youtube_url",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
  }));

  collection.fields.addAt(3, new TextField({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1001000033",
    "max": 0,
    "min": 0,
    "name": "title",
    "pattern": "",
    "presentable": true,
    "primaryKey": false,
    "required": false,
    "system": false,
  }));

  collection.fields.addAt(4, new TextField({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1001000034",
    "max": 0,
    "min": 0,
    "name": "artist",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
  }));

  return app.save(collection);
})
