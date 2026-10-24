#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderFlatBadge, renderFlatSquareBadge } from '../api/src/badge.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const outputDirectory = resolve(projectRoot, 'docs', 'preview');

const variants = [
  {
    file: 'flat-default.svg',
    renderer: renderFlatBadge,
    options: { label: 'Profile views', value: '624', leftColor: '#555', rightColor: '#4c1' },
  },
  {
    file: 'flat-blueviolet.svg',
    renderer: renderFlatBadge,
    options: { label: 'Profile views', value: '1337', leftColor: '#555', rightColor: '#8a2be2' },
  },
  {
    file: 'flat-blue.svg',
    renderer: renderFlatBadge,
    options: { label: 'Visitors', value: '9999', leftColor: '#555', rightColor: '#007ec6' },
  },
  {
    file: 'flat-orange.svg',
    renderer: renderFlatBadge,
    options: { label: 'Page views', value: '420', leftColor: '#1F2937', rightColor: '#FF6B35' },
  },
  {
    file: 'flat-square-blue.svg',
    renderer: renderFlatSquareBadge,
    options: { label: 'Profile views', value: '624', leftColor: '#555', rightColor: '#007ec6' },
  },
  {
    file: 'flat-square-orange.svg',
    renderer: renderFlatSquareBadge,
    options: { label: 'Visitors', value: '888', leftColor: '#1F2937', rightColor: '#FF6B35' },
  },
];

mkdirSync(outputDirectory, { recursive: true });
for (const variant of variants) {
  writeFileSync(resolve(outputDirectory, variant.file), variant.renderer(variant.options));
}

process.stdout.write(`Wrote ${variants.length} badge previews to docs/preview.\n`);
