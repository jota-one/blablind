/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: 'app_settings',
    type: 'base',
    listRule: '',
    viewRule: '',
    createRule: null,
    updateRule: '@request.auth.roles.slug ?= "admin"',
    deleteRule: null,
    fields: [
      {
        type: 'number',
        name: 'max_buzz_attempts',
        id: 'number1002000001',
        min: 1,
        onlyInt: true,
        required: true,
      },
      {
        type: 'number',
        name: 'rebuzz_delay',
        id: 'number1002000002',
        min: 0,
        onlyInt: true,
        required: true,
      },
      {
        type: 'number',
        name: 'auto_reject_delay',
        id: 'number1002000003',
        min: 0,
        onlyInt: true,
        required: true,
      },
      {
        type: 'bool',
        name: 'continue_after_success',
        id: 'bool1002000004',
      },
      {
        type: 'select',
        name: 'stop_method',
        id: 'select1002000005',
        maxSelect: 1,
        values: ['vote_unanimous', 'host_choice'],
        required: true,
      },
      {
        type: 'bool',
        name: 'force_equity',
        id: 'bool1002000006',
      },
    ],
  })
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('app_settings')
  return app.delete(collection)
})
