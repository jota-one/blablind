/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'text1001000017',
        name: 'host_candidate',
        type: 'text',
        required: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.removeById('text1001000017')
    return app.save(collection)
  },
)
