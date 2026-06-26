/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");

  collection.fields.add(new NumberField({
    "id": "number_playback_duration",
    "name": "playback_duration",
    "required": false,
    "system": false,
    "hidden": false,
    "presentable": false,
    "min": null,
    "max": null,
  }));

  collection.fields.add(new NumberField({
    "id": "number_reveal_seconds",
    "name": "reveal_seconds",
    "required": false,
    "system": false,
    "hidden": false,
    "presentable": false,
    "min": null,
    "max": null,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1001000003");
  const f1 = collection.fields.getByName("playback_duration");
  const f2 = collection.fields.getByName("reveal_seconds");
  if (f1) collection.fields.remove(f1.id);
  if (f2) collection.fields.remove(f2.id);
  return app.save(collection);
})
