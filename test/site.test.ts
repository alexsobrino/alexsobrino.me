import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';
import { findBrokenLinks } from './built-site.ts';

// The built site, as `npm run build` leaves it.
const buildDir = fileURLToPath(new URL('../dist/', import.meta.url));

before(() => {
  assert.ok(existsSync(buildDir), `No build at ${buildDir}: run \`npm run build\` first.`);
});

test('every internal link and asset reference points to something in the build', async () => {
  const broken = await findBrokenLinks(buildDir, config.site!);

  assert.deepEqual(
    broken,
    [],
    `Broken internal links:\n${broken.map(({ page, link }) => `  on ${page}: ${link}`).join('\n')}`,
  );
});
