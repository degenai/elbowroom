import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const customerFiles = [
  '404.html',
  'index.html',
  'services.html',
  'book.html',
  'about.html',
  'locations.html',
  'community.html',
  join('elbowroom', 'header.html'),
  join('elbowroom', 'footer.html'),
];
const customerSources = customerFiles.map((file) => [file, readFileSync(join(root, file), 'utf8')]);
const credentialFiles = ['book.html', 'about.html', 'locations.html'];

for (const [file, source] of customerSources) {
  test(`${file} does not claim AMTA membership`, () => {
    assert.doesNotMatch(source, /\bAMTA\b|American Massage Therapy Association/i);
  });
}

for (const file of credentialFiles) {
  test(`${file} identifies Alex as an ABMP member`, () => {
    const source = readFileSync(join(root, file), 'utf8');
    assert.match(source, /\bABMP member\b/i);
  });
}

test('about page expands the ABMP name accurately', () => {
  const source = readFileSync(join(root, 'about.html'), 'utf8');
  assert.match(source, /Associated Bodywork (?:&|&amp;) Massage Professionals/i);
});
