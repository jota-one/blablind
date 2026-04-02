/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000003')
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'relation1001000038',
        name: 'solved_by',
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
    const collection = app.findCollectionByNameOrId('pbc_1001000003')
    collection.fields.removeById('relation1001000038')
    return app.save(collection)
  },
)
