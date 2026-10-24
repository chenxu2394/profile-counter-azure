import assert from 'node:assert/strict';
import test from 'node:test';

import { CosmosCounterStore } from '../api/src/counter-store.js';

function cosmosError(statusCode) {
  return Object.assign(new Error(`Cosmos ${statusCode}`), { code: statusCode });
}

test('uses a single atomic patch for an existing counter', async () => {
  const operations = [];
  const store = new CosmosCounterStore({
    item: (id, partitionKey) => {
      assert.equal(id, 'profile');
      assert.equal(partitionKey, 'profile');
      return {
        patch: async (body) => {
          operations.push(body);
          return { resource: { id, count: 8 } };
        },
      };
    },
  });

  assert.equal(await store.increment('profile'), 8);
  assert.deepEqual(operations, [[{ op: 'incr', path: '/count', value: 1 }]]);
});

test('creates the first value when the counter does not exist', async () => {
  const store = new CosmosCounterStore({
    item: () => ({ patch: async () => { throw cosmosError(404); } }),
    items: {
      create: async (resource) => ({ resource }),
    },
  });

  assert.equal(await store.increment('new-counter'), 1);
});

test('retries the atomic patch when another request wins the create race', async () => {
  let patchCalls = 0;
  const store = new CosmosCounterStore({
    item: () => ({
      patch: async () => {
        patchCalls += 1;
        if (patchCalls === 1) throw cosmosError(404);
        return { resource: { count: 2 } };
      },
    }),
    items: {
      create: async () => { throw cosmosError(409); },
    },
  });

  assert.equal(await store.increment('racing-counter'), 2);
  assert.equal(patchCalls, 2);
});
