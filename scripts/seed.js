#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sanitizeId } from '../api/src/badge.js';
import { createCosmosCounterStore } from '../api/src/counter-store.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');

function loadDotEnv() {
  const envPath = resolve(projectRoot, '.env');
  if (!existsSync(envPath)) return;

  for (const rawLine of readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ||= value;
  }
}

function parseArgs(argv) {
  const result = { id: 'default', mode: 'set', value: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--get' || argument === '-g') {
      result.mode = 'get';
    } else if (argument === '--help' || argument === '-h') {
      result.mode = 'help';
    } else if (argument.startsWith('--id=')) {
      result.id = argument.slice('--id='.length);
    } else if (argument === '--id') {
      result.id = argv[index + 1];
      index += 1;
    } else if (result.value === undefined) {
      result.value = argument;
    }
  }

  result.id = sanitizeId(result.id);
  return result;
}

function printHelp() {
  process.stdout.write(`
profile-counter — set or inspect a Cosmos DB counter

Usage:
  npm run seed -- [--id=<id>] <value>
  npm run seed -- [--id=<id>] --get

Examples:
  npm run seed -- 100
  npm run seed -- --get
  npm run seed -- --id=another-counter 100

The command reads COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DATABASE_ID and
COSMOS_CONTAINER_ID from the environment or a project-root .env file.
`);
}

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));

  if (args.mode === 'help') {
    printHelp();
    return;
  }

  const store = createCosmosCounterStore();

  if (args.mode === 'get') {
    process.stdout.write(`${await store.get(args.id)}\n`);
    return;
  }

  const value = Number(args.value);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('The counter value must be a non-negative safe integer.');
  }

  const savedValue = await store.set(args.id, value);
  process.stdout.write(`Seeded "${args.id}" to ${savedValue}.\n`);
}

main().catch((error) => {
  console.error(`Unable to update the counter: ${error.message || error}`);
  process.exitCode = 1;
});
