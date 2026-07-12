/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000003')
    collection.fields.addAt(
      collection.fields.length,
      new DateField({
        id: 'date_track_started_at',
        name: 'started_at',
        required: false,
        system: false,
        hidden: false,
        presentable: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000003')
    collection.fields.removeById('date_track_started_at')
    return app.save(collection)
  },
)
