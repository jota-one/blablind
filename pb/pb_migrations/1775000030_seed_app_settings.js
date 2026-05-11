/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('app_settings')
  const record = new Record(collection, {
    max_buzz_attempts: 5,
    rebuzz_delay: 5,
    auto_reject_delay: 8,
    continue_after_success: true,
    stop_method: 'vote_unanimous',
    force_equity: false,
  })
  return app.save(record)
}, (app) => {
  const records = app.findAllRecords('app_settings')
  for (const record of records) {
    app.delete(record)
  }
})
