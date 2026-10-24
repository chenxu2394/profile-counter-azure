import { app } from '@azure/functions';
import { getCounterStore } from '../counter-store-instance.js';
import { createViewsHandler, parseAllowedCounterIds } from '../views-handler.js';

export const views = createViewsHandler({
  getCounterStore,
  allowedCounterIds: parseAllowedCounterIds(process.env.COUNTER_IDS),
});

app.http('views', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'views',
  handler: views,
});
