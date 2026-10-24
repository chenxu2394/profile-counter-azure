const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'X-Content-Type-Options': 'nosniff',
};

export function createHealthHandler({ getCounterStore, logger = console }) {
  return async function health() {
    try {
      // A point read for a deliberately absent document verifies Cosmos DB
      // connectivity and establishes the SDK connection without changing data.
      await getCounterStore().get('__health');

      return {
        status: 204,
        headers: {
          ...RESPONSE_HEADERS,
          'X-Health-Status': 'ok',
        },
      };
    } catch (error) {
      logger.error('Cosmos DB health check failed.', error);

      return {
        status: 503,
        headers: {
          ...RESPONSE_HEADERS,
          'Retry-After': '30',
          'X-Health-Status': 'storage-error',
        },
        body: 'Service Unavailable',
      };
    }
  };
}
