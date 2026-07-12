/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      name: 'playlists',
      type: 'base',
      listRule: 'public = true || owner = @request.auth.id',
      viewRule: 'public = true || owner = @request.auth.id',
      createRule: '@request.auth.id != "" && owner = @request.auth.id',
      updateRule: 'owner = @request.auth.id',
      deleteRule: 'owner = @request.auth.id',
      fields: [
        {
          name: 'owner',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'name', type: 'text', required: true, presentable: true },
        { name: 'description', type: 'text', required: false },
        { name: 'tags', type: 'json', required: false, maxSize: 2048 },
        { name: 'public', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_playlists_owner ON playlists (owner)'],
    })
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('playlists')
    return app.delete(collection)
  },
)
