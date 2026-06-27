/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');

    const collection = new Collection({
      type: 'base',
      name: 'progress',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: 'user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
        {
          name: 'data',
          type: 'json',
          required: true,
        },
      ],
    });

    app.save(collection);

    const settings = app.settings();
    settings.meta.appName = 'Fasted Calendar';
    settings.meta.appURL = 'https://api.example.com';
    settings.allowedOrigins = [
      'https://app.example.com',
      'http://localhost:5173',
    ];
    app.save(settings);
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('progress');
      app.delete(collection);
    } catch (_) {
      /* already removed */
    }
  },
);
