import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const homepage = readFileSync(join(root, 'index.html'), 'utf8');
const locations = readFileSync(join(root, 'locations.html'), 'utf8');
const footer = readFileSync(join(root, 'elbowroom', 'footer.html'), 'utf8');

const phoneHref = 'tel:+14707023474';
const phoneDisplay = '(470) 702-3474';

function homepageGraph() {
  const match = homepage.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'homepage JSON-LD block should exist');
  return JSON.parse(match[1])['@graph'];
}

test('the temporary clinic phone is visible and callable', () => {
  for (const [name, source] of [['homepage', homepage], ['shared footer', footer]]) {
    assert.ok(source.includes(`href="${phoneHref}"`), `${name} should link the clinic phone`);
    assert.ok(source.includes(phoneDisplay), `${name} should display the clinic phone`);
  }
  assert.ok(
    homepage.includes('<span class="clinic-line-label">clinic line</span>'),
    'homepage should render the clinic-line qualifier as a compact inline label',
  );
});

test('LocalBusiness schema uses the same phone and weekend availability', () => {
  const business = homepageGraph().find((item) => item['@id'] === 'https://elbowroommassage.com/#business');
  assert.ok(business, 'LocalBusiness entity should exist');
  assert.equal(business.telephone, '+1-470-702-3474');

  const hours = business.openingHoursSpecification;
  assert.equal(hours['@type'], 'OpeningHoursSpecification');
  assert.deepEqual(hours.dayOfWeek, [
    'https://schema.org/Saturday',
    'https://schema.org/Sunday',
  ]);
  assert.match(hours.description, /appointment/i);
});

test('visible availability consistently names Saturdays and Sundays', () => {
  assert.match(homepage, /Appointments available Saturdays and Sundays/i);
  assert.match(locations, /Saturdays &amp; Sundays[^<]*by appointment/i);
  assert.match(footer, /Saturday &amp; Sunday[^<]*by appointment/i);
});
