import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(
  readFileSync(join(root, '.assetsignore'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')),
);

test('the production asset bundle excludes source, tooling, and dependencies', () => {
  const required = [
    '.git',
    '.github',
    '.gitignore',
    '.assetsignore',
    '.wrangler',
    'node_modules',
    'README.md',
    'scripts',
    'workers',
    'wrangler.jsonc',
  ];

  for (const path of required) {
    assert.ok(ignored.has(path), `.assetsignore should exclude ${path}`);
  }
});
