/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.addAt(
      collection.fields.length,
      new RelationField({
        cascadeDelete: false,
        collectionId: '_pb_users_auth_',
        hidden: false,
        id: 'relation1001000026',
        maxSelect: 1,
        minSelect: 0,
        name: 'owner',
        presentable: false,
        required: false,
        system: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.removeById('relation1001000026')
    return app.save(collection)
  },
)
