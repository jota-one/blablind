/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('favorites')

    // Favorites double as a preparation library: a favorite now carries the
    // same timings as a track, so adding one to a blindtest brings everything.
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'number_fav_playback_duration',
        name: 'playback_duration',
        type: 'number',
        required: false,
      }),
    )
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        id: 'number_fav_reveal_seconds',
        name: 'reveal_seconds',
        type: 'number',
        required: false,
      }),
    )

    // Drop the UNIQUE (user, video) constraint so the same video can be kept
    // several times with different timings. The lookup index is kept, because
    // the game still queries favorites by video to light the star.
    collection.indexes = [
      'CREATE INDEX idx_favorites_user_video ON favorites (user, video)',
    ]

    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('favorites')
    collection.fields.removeById('number_fav_playback_duration')
    collection.fields.removeById('number_fav_reveal_seconds')
    // Rolling back fails if duplicates were created meanwhile — remove them first.
    collection.indexes = [
      'CREATE UNIQUE INDEX idx_favorites_user_video ON favorites (user, video)',
    ]
    return app.save(collection)
  },
)
