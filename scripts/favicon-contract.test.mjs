import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sitePages = [
  '404.html',
  'index.html',
  'services.html',
  'book.html',
  'about.html',
  'locations.html',
  'community.html',
  'brand-kit.html',
  'intake.html',
];

for (const page of sitePages) {
  test(`${page} publishes browser, SVG, and Apple favicon fallbacks`, () => {
    const source = readFileSync(join(root, page), 'utf8');
    const iconLinks = source.match(/<link\b[^>]*\brel="icon"[^>]*>/gi) ?? [];
    const appleLinks = source.match(/<link\b[^>]*\brel="apple-touch-icon"[^>]*>/gi) ?? [];
    const icons = iconLinks.join('\n');

    assert.match(icons, /href="\/favicon\.ico"/i);
    assert.match(icons, /href="\/favicon\.svg"/i);
    assert.match(icons, /type="image\/svg\+xml"/i);
    assert.match(icons, /href="\/images\/elbowroom\/favicon-32\.png"/i);
    assert.match(icons, /sizes="32x32"/i);
    assert.match(appleLinks.join('\n'), /href="\/images\/elbowroom\/favicon-180\.png"/i);
    assert.match(appleLinks.join('\n'), /sizes="180x180"/i);
  });
}

function readPngSize(path) {
  const png = readFileSync(path);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('the browser PNG fallback is an exact 32px square', () => {
  const size = readPngSize(join(root, 'images', 'elbowroom', 'favicon-32.png'));
  assert.deepEqual(size, { width: 32, height: 32 });
});

test('the search favicon is a square PNG larger than Google’s 48px recommendation', () => {
  const { width, height } = readPngSize(join(root, 'images', 'elbowroom', 'favicon-512.png'));
  assert.equal(width, height);
  assert.ok(width > 48, `expected favicon width above 48px, got ${width}px`);
});

test('the SVG favicon is a simple branded monogram with an opaque field', () => {
  const svgPath = join(root, 'favicon.svg');
  assert.ok(existsSync(svgPath), 'favicon.svg should exist at the site root');
  const svg = readFileSync(svgPath, 'utf8');
  assert.match(svg, /viewBox="0 0 64 64"/);
  assert.match(svg, /#1b2c4d/i);
  assert.match(svg, /#c49a48/i);
  assert.match(svg, /Elbow Room E monogram/i);
  assert.match(svg, /<path\b[^>]*fill="#f6f3ec"/i);
});

test('the conventional ICO fallback contains 16, 32, and 48px images', () => {
  const path = join(root, 'favicon.ico');
  assert.ok(existsSync(path), 'favicon.ico should exist at the site root');

  const ico = readFileSync(path);
  assert.deepEqual([...ico.subarray(0, 4)], [0, 0, 1, 0]);
  const count = ico.readUInt16LE(4);
  assert.ok(count >= 3, 'favicon.ico should contain at least three sizes');

  const sizes = new Set();
  for (let i = 0; i < count; i += 1) {
    const offset = 6 + (i * 16);
    const width = ico[offset] || 256;
    const height = ico[offset + 1] || 256;
    if (width === height) sizes.add(width);
  }

  for (const required of [16, 32, 48]) {
    assert.ok(sizes.has(required), `favicon.ico should contain ${required}x${required}`);
  }
});
