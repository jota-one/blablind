/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('_pb_users_auth_')
  collection.fields.addAt(
    collection.fields.length,
    new Field({
      type: 'json',
      name: 'user_settings',
      id: 'json1003000001',
      required: false,
      maxSize: 2048,
    })
  )
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('_pb_users_auth_')
  collection.fields.removeById('json1003000001')
  return app.save(collection)
})
