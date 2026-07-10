/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('favorites')
    collection.updateRule = 'user = @request.auth.id'
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('favorites')
    collection.updateRule = null
    return app.save(collection)
  },
)
