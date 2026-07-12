/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      name: 'answer_votes',
      type: 'base',
      // Guest-playable like buzzes; votes are final (no update/delete) so the
      // host reconciler's resolution stays monotonic.
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'buzz',
          type: 'relation',
          collectionId: 'pbc_1001000004',
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: 'voter',
          type: 'relation',
          collectionId: 'pbc_1001000002',
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        // Denormalized so clients can subscribe/load per track like buzzes.
        {
          name: 'track',
          type: 'relation',
          collectionId: 'pbc_1001000003',
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: 'value', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_answer_votes_buzz_voter ON answer_votes (buzz, voter)'],
    })
    return app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('answer_votes')
    return app.delete(collection)
  },
)
