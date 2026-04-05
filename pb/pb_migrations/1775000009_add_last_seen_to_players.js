/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000002')
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'date1001000024',
        name: 'last_seen',
        type: 'date',
        required: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000002')
    collection.fields.removeById('date1001000024')
    return app.save(collection)
  },
)
