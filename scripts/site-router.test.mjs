import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const routerPath = join(root, 'workers', 'site-router.mjs');

test('www permanently redirects to apex while preserving path and query', async () => {
  assert.ok(existsSync(routerPath), 'site router should exist');
  const { default: router } = await import(pathToFileURL(routerPath));
  const response = await router.fetch(
    new Request('https://www.elbowroommassage.com/book?src=cron&slot=saturday'),
    { ASSETS: { fetch: () => { throw new Error('assets should not run for www'); } } },
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get('location'),
    'https://elbowroommassage.com/book?src=cron&slot=saturday',
  );
});

test('apex requests continue to the static asset binding unchanged', async () => {
  assert.ok(existsSync(routerPath), 'site router should exist');
  const { default: router } = await import(pathToFileURL(routerPath));
  let forwarded;
  const request = new Request('https://elbowroommassage.com/services?from=test');
  const expected = new Response('asset-ok', { status: 200 });
  const response = await router.fetch(request, {
    ASSETS: {
      fetch(received) {
        forwarded = received;
        return expected;
      },
    },
  });

  assert.equal(forwarded, request);
  assert.equal(response, expected);
});
