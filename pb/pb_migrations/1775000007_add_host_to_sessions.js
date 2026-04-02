/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'relation1001000013',
        name: 'host',
        type: 'relation',
        collectionId: 'pbc_1001000002',
        maxSelect: 1,
        required: false,
        cascadeDelete: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.removeById('relation1001000013')
    return app.save(collection)
  },
)
