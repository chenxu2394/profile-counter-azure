import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderBadge,
  sanitizeColor,
  sanitizeId,
  sanitizeLabel,
} from '../api/src/badge.js';

test('sanitizes IDs without allowing arbitrary key syntax', () => {
  assert.equal(sanitizeId(' profile/name:42 '), 'profilename42');
  assert.equal(sanitizeId(''), 'default');
  assert.equal(sanitizeId('a'.repeat(80)), 'a'.repeat(64));
});

test('sanitizes colors and falls back for unknown names', () => {
  assert.equal(sanitizeColor('FF6B35', '#555'), '#FF6B35');
  assert.equal(sanitizeColor('blueviolet', '#555'), '#8a2be2');
  assert.equal(sanitizeColor('not-a-color', '#555'), '#555');
});

test('escapes user-controlled labels before rendering SVG', () => {
  const label = sanitizeLabel('<script>&"');
  const svg = renderBadge({
    label,
    value: 42,
    leftColor: '#555',
    rightColor: '#4c1',
    style: 'flat',
  });

  assert.match(svg, /&lt;script&gt;&amp;&quot;: 42/);
  assert.doesNotMatch(svg, /<script>/);
});

test('renders the flat-square style without the flat gradient', () => {
  const svg = renderBadge({
    label: 'Views',
    value: 7,
    leftColor: '#555',
    rightColor: '#007ec6',
    style: 'flat-square',
  });

  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.doesNotMatch(svg, /linearGradient/);
});
