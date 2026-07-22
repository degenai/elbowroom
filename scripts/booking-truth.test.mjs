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
const book = readFileSync(join(root, 'book.html'), 'utf8');
const services = readFileSync(join(root, 'services.html'), 'utf8');

const authoritativePriceLine = '15 min $25 &middot; 30 min $45 &middot; 60 min $85. Payment at the appointment.';

test('customer copy does not promise self-service booking while Jane is contact-only', () => {
  const misleadingPatterns = [
    /online booking/i,
    /takes about a minute/i,
    /book your slot in Jane/i,
    /preview pricing/i,
    /subject to change/i,
  ];

  for (const [file, source] of customerSources) {
    for (const pattern of misleadingPatterns) {
      assert.doesNotMatch(source, pattern, `${file} should not contain ${pattern}`);
    }
    assert.doesNotMatch(source, />\s*Book (?:a|your first) session/i, `${file} should use an availability CTA`);
  }
});

test('booking page sends visitors to Alex massage availability and then the clinic', () => {
  assert.ok(
    book.includes('https://staufferchiropractic.janeapp.com/#/massage-therapy'),
    'booking CTA should skip the clinic-wide Jane landing page',
  );
  assert.match(book, /view availability[^<]*then call the clinic[^<]*reserve/i);
  assert.match(book, /View Alex(?:&#39;|')s availability in Jane/i);
});

test('book and services publish one authoritative appointment price contract', () => {
  assert.ok(book.includes(authoritativePriceLine), 'book page should publish the final price line');
  assert.ok(services.includes(authoritativePriceLine), 'services page should publish the final price line');
});
