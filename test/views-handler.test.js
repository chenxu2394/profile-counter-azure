import assert from 'node:assert/strict';
import test from 'node:test';

import { createViewsHandler } from '../api/src/views-handler.js';

test('increments an allowed counter and returns an uncached SVG', async () => {
  let calls = 0;
  const handler = createViewsHandler({
    allowedCounterIds: 'profile',
    getCounterStore: () => ({
      increment: async (id) => {
        calls += 1;
        assert.equal(id, 'profile');
        return 12;
      },
    }),
  });

  const response = await handler({
    url: 'https://example.test/api/views?id=profile&rightColor=blue',
  });

  assert.equal(calls, 1);
  assert.equal(response.status, 200);
  assert.equal(response.headers['X-Counter-Status'], 'ok');
  assert.match(response.headers['Cache-Control'], /no-store/);
  assert.match(response.body, /Profile views: 12/);
  assert.match(response.body, /#007ec6/);
});

test('rejects an unknown counter without accessing Cosmos DB', async () => {
  let accessedStore = false;
  const warnings = [];
  const handler = createViewsHandler({
    allowedCounterIds: 'profile',
    getCounterStore: () => {
      accessedStore = true;
      throw new Error('must not be called');
    },
    logger: {
      warn: (message) => warnings.push(message),
      error: () => {},
    },
  });

  const response = await handler({
    url: 'https://example.test/api/views?id=random-bot-id',
  });

  assert.equal(accessedStore, false);
  assert.equal(response.headers['X-Counter-Status'], 'unknown-id');
  assert.match(response.body, /Profile views: \?/);
  assert.equal(warnings.length, 1);
});

test('keeps the badge renderable when Cosmos DB is unavailable', async () => {
  const errors = [];
  const handler = createViewsHandler({
    allowedCounterIds: 'default',
    getCounterStore: () => ({
      increment: async () => {
        throw new Error('database unavailable');
      },
    }),
    logger: {
      warn: () => {},
      error: (...args) => errors.push(args),
    },
  });

  const response = await handler({ url: 'https://example.test/api/views' });

  assert.equal(response.status, 200);
  assert.equal(response.headers['X-Counter-Status'], 'storage-error');
  assert.match(response.body, /Profile views: \?/);
  assert.equal(errors.length, 1);
});
