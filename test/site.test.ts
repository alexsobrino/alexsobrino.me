import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';
import { findBrokenLinks } from './built-site.ts';
import { readContent, type Content } from './content.ts';

// The built site, as `npm run build` leaves it, and the content it was built from.
const buildDir = fileURLToPath(new URL('../dist/', import.meta.url));
const contentDir = fileURLToPath(new URL('../src/content/', import.meta.url));
let content: Content;

before(async () => {
  assert.ok(existsSync(buildDir), `No build at ${buildDir}: run \`npm run build\` first.`);
  content = await readContent(contentDir);
});

test('every internal link and asset reference points to something in the build', async () => {
  const broken = await findBrokenLinks(buildDir, config.site!);

  assert.deepEqual(
    broken,
    [],
    `Broken internal links:\n${broken.map(({ page, link }) => `  on ${page}: ${link}`).join('\n')}`,
  );
});
