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

const alexJaneBookingUrl = 'https://staufferchiropractic.janeapp.com/locations/stauffer-chiropractic/book#/staff_member/3';
const authoritativePriceLine = '15 min $25 &middot; 30 min $45 &middot; 60 min $85. Payment at the appointment.';

function anchorForHref(source, href) {
  return source.match(new RegExp(`<a\\b[^>]*href="${href.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"[^>]*>[\\s\\S]*?<\\/a>`, 'i'))?.[0] ?? '';
}

test('customer copy presents direct online booking rather than a phone-call reservation', () => {
  const stalePatterns = [
    /then call the clinic[^.]*reserve/i,
    /call the clinic[^.]*to reserve/i,
    /does not complete online reservations/i,
    /note an available[^.]*then call/i,
    />\s*View Availability\b/i,
    />\s*View Alex(?:&#39;|')s availability/i,
  ];

  for (const [file, source] of customerSources) {
    for (const pattern of stalePatterns) {
      assert.doesNotMatch(source, pattern, `${file} should not contain ${pattern}`);
    }
  }
});

test('booking page hands off to Alex-specific Jane self-booking', () => {
  const janeAnchor = anchorForHref(book, alexJaneBookingUrl);

  assert.ok(janeAnchor, 'booking page should use Alex’s exact practitioner URL');
  assert.match(janeAnchor, /target="_blank"/i);
  assert.match(janeAnchor, /rel="[^"]*noopener[^"]*noreferrer[^"]*"/i);
  assert.match(janeAnchor, /Book with Alex in Jane/i);
  assert.doesNotMatch(book, /janeapp\.com\/#\/massage-therapy/i);
  assert.doesNotMatch(book, /until the clinic enables client self-booking/i);
});

test('booking page explains the Jane handoff, account gate, and zero-due display honestly', () => {
  assert.match(book, /sign in or create a Jane account/i);
  assert.match(book, /\$0\.00[^<]*(?:due online|due today)/i);
  assert.match(book, /nothing is due online/i);
  assert.match(book, /If you need help[^<]*call the clinic/i);
  assert.doesNotMatch(book, /No account/i);
});

test('book and services publish one authoritative appointment price contract', () => {
  assert.ok(book.includes(authoritativePriceLine), 'book page should publish the final price line');
  assert.ok(services.includes(authoritativePriceLine), 'services page should publish the final price line');
});

test('shared navigation uses a clear Book Now CTA', () => {
  for (const file of [join('elbowroom', 'header.html'), join('elbowroom', 'footer.html')]) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.match(anchorForHref(source, '/book'), />\s*Book Now\b/i, `${file} should say Book Now`);
  }
});
