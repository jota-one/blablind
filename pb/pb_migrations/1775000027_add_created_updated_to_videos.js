/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000010')
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'autodate1001000106',
        name: 'created',
        type: 'autodate',
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
      }),
    )
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'autodate1001000107',
        name: 'updated',
        type: 'autodate',
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000010')
    collection.fields.removeById('autodate1001000106')
    collection.fields.removeById('autodate1001000107')
    return app.save(collection)
  },
)
