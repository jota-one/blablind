/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    id: 'pbc_1001000005',
    name: 'feedback',
    type: 'base',
    createRule: '',
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    updateRule: null,
    deleteRule: null,
    fields: [
      { id: 'text1001000050', name: 'name', type: 'text', required: false },
      { id: 'text1001000051', name: 'message', type: 'text', required: true, max: 2000 },
    ],
  })
  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('feedback')
  app.delete(collection)
})
