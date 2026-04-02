/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000003')
    collection.fields.addAt(
      collection.fields.length,
      new Field({ id: 'json1001000039', name: 'skip_votes', type: 'json', required: false }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000003')
    collection.fields.removeById('json1001000039')
    return app.save(collection)
  },
)
