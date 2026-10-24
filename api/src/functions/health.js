import { app } from '@azure/functions';
import { getCounterStore } from '../counter-store-instance.js';
import { createHealthHandler } from '../health-handler.js';

export const health = createHealthHandler({ getCounterStore });

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});
