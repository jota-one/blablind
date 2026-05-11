/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('sessions')
  collection.fields.addAt(
    collection.fields.length,
    new Field({
      type: 'json',
      name: 'settings',
      id: 'json1005000001',
      required: false,
      maxSize: 2048,
    })
  )
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('sessions')
  collection.fields.removeById('json1005000001')
  return app.save(collection)
})
