import assert from 'node:assert/strict';
import test from 'node:test';

import { createHealthHandler } from '../api/src/health-handler.js';

test('checks Cosmos DB without incrementing a counter', async () => {
  let requestedId;
  let incremented = false;
  const handler = createHealthHandler({
    getCounterStore: () => ({
      get: async (id) => {
        requestedId = id;
        return 0;
      },
      increment: async () => {
        incremented = true;
      },
    }),
  });

  const response = await handler();

  assert.equal(response.status, 204);
  assert.equal(response.headers['X-Health-Status'], 'ok');
  assert.match(response.headers['Cache-Control'], /no-store/);
  assert.equal(requestedId, '__health');
  assert.equal(incremented, false);
});

test('returns 503 when Cosmos DB is unavailable', async () => {
  const errors = [];
  const handler = createHealthHandler({
    getCounterStore: () => ({
      get: async () => {
        throw new Error('database unavailable');
      },
    }),
    logger: {
      error: (...args) => errors.push(args),
    },
  });

  const response = await handler();

  assert.equal(response.status, 503);
  assert.equal(response.headers['X-Health-Status'], 'storage-error');
  assert.equal(response.headers['Retry-After'], '30');
  assert.equal(response.body, 'Service Unavailable');
  assert.equal(errors.length, 1);
});
