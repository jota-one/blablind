/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000002')
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'bool1001000023',
        name: 'ready',
        type: 'bool',
        required: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000002')
    collection.fields.removeById('bool1001000023')
    return app.save(collection)
  },
)
