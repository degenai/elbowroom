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
  test(`${page} publishes the stable branded favicon set`, () => {
    const source = readFileSync(join(root, page), 'utf8');
    const iconLinks = source.match(/<link\b[^>]*\brel="icon"[^>]*>/gi) ?? [];
    const appleLinks = source.match(/<link\b[^>]*\brel="apple-touch-icon"[^>]*>/gi) ?? [];

    assert.match(iconLinks.join('\n'), /href="\/favicon\.ico"/i);
    assert.match(iconLinks.join('\n'), /href="\/images\/elbowroom\/favicon-512\.png"/i);
    assert.match(iconLinks.join('\n'), /sizes="512x512"/i);
    assert.match(appleLinks.join('\n'), /href="\/images\/elbowroom\/favicon-180\.png"/i);
    assert.match(appleLinks.join('\n'), /sizes="180x180"/i);
  });
}

test('the search favicon is a square PNG larger than Google’s 48px recommendation', () => {
  const png = readFileSync(join(root, 'images', 'elbowroom', 'favicon-512.png'));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(width, height);
  assert.ok(width > 48, `expected favicon width above 48px, got ${width}px`);
});

test('the conventional root favicon fallback exists and contains an icon image', () => {
  const path = join(root, 'favicon.ico');
  assert.ok(existsSync(path), 'favicon.ico should exist at the site root');

  const ico = readFileSync(path);
  assert.deepEqual([...ico.subarray(0, 4)], [0, 0, 1, 0]);
  assert.ok(ico.readUInt16LE(4) >= 1, 'favicon.ico should contain at least one image');
});
