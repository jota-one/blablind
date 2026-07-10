/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      name: 'favorites',
      type: 'base',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: '@request.auth.id != "" && user = @request.auth.id',
      updateRule: null,
      deleteRule: 'user = @request.auth.id',
      fields: [
        {
          name: 'user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: 'video',
          type: 'relation',
          collectionId: 'pbc_1001000010',
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        // Context snapshots: sessions/players are ephemeral (reset, guests),
        // so the discovery context is copied at favoriting time.
        { name: 'discovered_from_name', type: 'text', required: false },
        {
          name: 'discovered_from_user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: false,
          cascadeDelete: false,
        },
        { name: 'session_name', type: 'text', required: false },
        { name: 'guessed_right', type: 'bool', required: false },
        { name: 'start_seconds', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_favorites_user_video ON favorites (user, video)'],
    })
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('favorites')
    return app.delete(collection)
  },
)
