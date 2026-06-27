/// <reference path="../pb_data/types.d.ts" />
// Player score is now fully derived from tracks.solved_by (see Room.vue /
// GameOver.vue ranking). Drop the unused stored column.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000002')
    const f = collection.fields.getByName('score')
    if (f) {
      collection.fields.removeById(f.id)
    }
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000002')
    collection.fields.add(
      new NumberField({
        id: 'number1001000022',
        name: 'score',
        required: false,
        system: false,
        hidden: false,
        presentable: false,
        onlyInt: false,
        min: null,
        max: null,
      }),
    )
    return app.save(collection)
  },
)
