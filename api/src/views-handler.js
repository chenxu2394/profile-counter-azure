import {
  renderBadge,
  sanitizeColor,
  sanitizeId,
  sanitizeLabel,
} from './badge.js';

const RESPONSE_HEADERS = {
  'Content-Type': 'image/svg+xml; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
  'Access-Control-Allow-Origin': '*',
  'X-Content-Type-Options': 'nosniff',
};

export function parseAllowedCounterIds(value = 'default') {
  return new Set(
    value
      .split(',')
      .map((id) => sanitizeId(id))
      .filter(Boolean),
  );
}

export function createViewsHandler({ getCounterStore, allowedCounterIds, logger = console }) {
  const allowedIds =
    allowedCounterIds instanceof Set
      ? allowedCounterIds
      : parseAllowedCounterIds(allowedCounterIds);

  return async function views(request) {
    const params = new URL(request.url).searchParams;
    const id = sanitizeId(params.get('id'));
    const label = sanitizeLabel(params.get('label'));
    const leftColor = sanitizeColor(params.get('leftColor'), '#555');
    const rightColor = sanitizeColor(params.get('rightColor'), '#4c1');
    const style = (params.get('style') || 'flat').toLowerCase();

    let count = '?';
    let counterStatus = 'ok';

    if (!allowedIds.has(id)) {
      counterStatus = 'unknown-id';
      logger.warn(`Rejected counter id: ${id}`);
    } else {
      try {
        count = await getCounterStore().increment(id);
      } catch (error) {
        counterStatus = 'storage-error';
        logger.error('Cosmos DB increment failed.', error);
      }
    }

    return {
      status: 200,
      headers: {
        ...RESPONSE_HEADERS,
        'X-Counter-Status': counterStatus,
      },
      body: renderBadge({
        label,
        value: count,
        leftColor,
        rightColor,
        style,
      }),
    };
  };
}
