const NAMED_COLORS = {
  brightgreen: '#4c1',
  green: '#97ca00',
  yellowgreen: '#a4a61d',
  yellow: '#dfb317',
  orange: '#fe7d37',
  red: '#e05d44',
  blue: '#007ec6',
  lightgrey: '#9f9f9f',
  grey: '#555',
  gray: '#555',
  blueviolet: '#8a2be2',
  purple: '#8b5cf6',
  pink: '#ff69b4',
  cyan: '#00ffff',
  teal: '#008080',
  white: '#fff',
  black: '#000',
};

export function sanitizeColor(input, fallback) {
  if (!input || typeof input !== 'string') return fallback;

  const trimmed = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) return `#${trimmed}`;
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed}`;
  if (/^[a-zA-Z]+$/.test(trimmed) && trimmed.length <= 16) {
    return NAMED_COLORS[trimmed.toLowerCase()] || fallback;
  }

  return fallback;
}

export function sanitizeId(input) {
  if (!input || typeof input !== 'string') return 'default';
  const cleaned = input.trim().slice(0, 64).replace(/[^a-zA-Z0-9._-]/g, '');
  return cleaned || 'default';
}

export function sanitizeLabel(input, fallback = 'Profile views') {
  if (!input || typeof input !== 'string') return fallback;
  return xmlEscape(input.trim().slice(0, 40)) || fallback;
}

export function xmlEscape(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function approxTextWidth(text, fontSize = 11) {
  return Math.ceil(text.length * fontSize * 0.58);
}

export function renderFlatBadge({ label, value, leftColor, rightColor }) {
  const padding = 12;
  const height = 20;
  const labelWidth = approxTextWidth(label) + padding;
  const valueWidth = approxTextWidth(value) + padding;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="${height}" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="${height}" fill="${leftColor}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${rightColor}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="13">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="13">${value}</text>
  </g>
</svg>`;
}

export function renderFlatSquareBadge({ label, value, leftColor, rightColor }) {
  const padding = 12;
  const height = 20;
  const labelWidth = approxTextWidth(label) + padding;
  const valueWidth = approxTextWidth(value) + padding;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <g shape-rendering="crispEdges">
    <rect width="${labelWidth}" height="${height}" fill="${leftColor}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="${rightColor}"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}

export function renderBadge({ label, value, leftColor, rightColor, style }) {
  const renderer = style === 'flat-square' ? renderFlatSquareBadge : renderFlatBadge;
  return renderer({ label, value: String(value), leftColor, rightColor });
}
