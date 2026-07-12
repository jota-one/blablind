/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000003')
    collection.fields.addAt(
      collection.fields.length,
      new SelectField({
        id: 'select_track_phase',
        name: 'phase',
        maxSelect: 1,
        values: ['guessing', 'answering', 'voting'],
        required: false,
        system: false,
        hidden: false,
        presentable: false,
      }),
    )
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_1001000003')
    collection.fields.removeById('select_track_phase')
    return app.save(collection)
  },
)
