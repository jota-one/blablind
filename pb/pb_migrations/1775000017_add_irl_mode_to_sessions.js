/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'bool1001000014',
        name: 'irl_mode',
        type: 'bool',
        required: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.removeById('bool1001000014')
    return app.save(collection)
  },
)
