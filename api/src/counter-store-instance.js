import { createCosmosCounterStore } from './counter-store.js';

let counterStore;

export function getCounterStore() {
  counterStore ||= createCosmosCounterStore();
  return counterStore;
}
