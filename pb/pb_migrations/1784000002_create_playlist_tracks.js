/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const playlists = app.findCollectionByNameOrId('playlists')
    const collection = new Collection({
      name: 'playlist_tracks',
      type: 'base',
      listRule: 'playlist.public = true || playlist.owner = @request.auth.id',
      viewRule: 'playlist.public = true || playlist.owner = @request.auth.id',
      createRule: '@request.auth.id != "" && playlist.owner = @request.auth.id',
      updateRule: 'playlist.owner = @request.auth.id',
      deleteRule: 'playlist.owner = @request.auth.id',
      fields: [
        {
          name: 'playlist',
          type: 'relation',
          collectionId: playlists.id,
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
        { name: 'order', type: 'number', required: false, onlyInt: true, min: 0 },
        { name: 'start_seconds', type: 'number', required: false, min: 0 },
        { name: 'playback_duration', type: 'number', required: false, min: 0 },
        { name: 'reveal_seconds', type: 'number', required: false, min: 0 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks (playlist)'],
    })
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('playlist_tracks')
    return app.delete(collection)
  },
)
