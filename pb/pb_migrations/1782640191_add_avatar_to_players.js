/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000002')
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'text1002000001',
        name: 'avatar',
        type: 'text',
        required: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000002')
    collection.fields.removeById('text1002000001')
    return app.save(collection)
  },
)
