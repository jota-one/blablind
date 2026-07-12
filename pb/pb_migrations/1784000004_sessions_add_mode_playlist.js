/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const playlists = app.findCollectionByNameOrId('playlists')
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.addAt(
      collection.fields.length,
      new SelectField({
        id: 'select_session_mode',
        name: 'mode',
        maxSelect: 1,
        values: ['classic', 'autonomous'],
        required: false,
        system: false,
        hidden: false,
        presentable: false,
      }),
    )
    collection.fields.addAt(
      collection.fields.length,
      new RelationField({
        id: 'relation_session_playlist',
        name: 'playlist',
        collectionId: playlists.id,
        maxSelect: 1,
        minSelect: 0,
        cascadeDelete: false,
        required: false,
        system: false,
        hidden: false,
        presentable: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000001')
    collection.fields.removeById('select_session_mode')
    collection.fields.removeById('relation_session_playlist')
    return app.save(collection)
  },
)
