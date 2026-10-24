import { CosmosClient } from '@azure/cosmos';

function isCosmosStatus(error, statusCode) {
  return error?.code === statusCode || error?.statusCode === statusCode;
}

export class CosmosCounterStore {
  constructor(container) {
    this.container = container;
  }

  async increment(id) {
    const item = this.container.item(id, id);

    try {
      return await this.#patchIncrement(item);
    } catch (error) {
      if (!isCosmosStatus(error, 404)) throw error;
    }

    try {
      const { resource } = await this.container.items.create({ id, count: 1 });
      return resource.count;
    } catch (error) {
      // Two first requests can both observe the missing item. The winner creates
      // count=1; the loser receives 409 and applies the second increment.
      if (!isCosmosStatus(error, 409)) throw error;
      return this.#patchIncrement(item);
    }
  }

  async get(id) {
    try {
      const { resource } = await this.container.item(id, id).read();
      return resource?.count ?? 0;
    } catch (error) {
      if (isCosmosStatus(error, 404)) return 0;
      throw error;
    }
  }

  async set(id, count) {
    const { resource } = await this.container.items.upsert({ id, count });
    return resource.count;
  }

  async #patchIncrement(item) {
    const { resource } = await item.patch([{ op: 'incr', path: '/count', value: 1 }]);
    if (!Number.isSafeInteger(resource?.count) || resource.count < 0) {
      throw new Error('Cosmos DB returned an invalid counter value.');
    }
    return resource.count;
  }
}

export function createCosmosCounterStore(settings = process.env) {
  const endpoint = settings.COSMOS_ENDPOINT;
  const key = settings.COSMOS_KEY;
  const databaseId = settings.COSMOS_DATABASE_ID || 'profile-counter';
  const containerId = settings.COSMOS_CONTAINER_ID || 'counters';

  if (!endpoint || !key) {
    throw new Error('COSMOS_ENDPOINT and COSMOS_KEY must be configured.');
  }

  const client = new CosmosClient({ endpoint, key });
  return new CosmosCounterStore(client.database(databaseId).container(containerId));
}
