import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ContentNote } from './content.ts';
import { fakeFolder } from './fake-folder.ts';
import { findFeedProblems } from './feed.ts';

const site = 'https://alexsobrino.me';

const reto: ContentNote = { id: 'reto', date: new Date('2026-10-02'), tags: ['Un libro al mes', 'Retos & más'], lang: 'es' };
const hola: ContentNote = { id: 'hola', date: new Date('2026-09-01'), tags: [], lang: 'es' };

/** A fake build with both Note pages and an RSS feed carrying these items, in this order. */
function buildWithFeed(items: { link: string; categories?: string[] }[]): Promise<string> {
  const xml = items
    .map(({ link, categories = [] }) =>
      [
        '<item><title>Reto: &lt;uno&gt; &amp; más</title>',
        `<link>${link}</link>`,
        ...categories.map((category) => `<category>${category.replaceAll('&', '&amp;')}</category>`),
        '</item>',
      ].join(''),
    )
    .join('');
  return fakeFolder({
    'rss.xml': `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Notas</title>${xml}</channel></rss>`,
    'notes/reto/index.html': '',
    'notes/hola/index.html': '',
  });
}

test('accepts a feed with one item per Note, newest first, carrying its Tags', async () => {
  const dir = await buildWithFeed([
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
    { link: 'https://alexsobrino.me/notes/hola/' },
  ]);

  assert.deepEqual(await findFeedProblems(dir, site, [hola, reto]), []);
});

test('reports a build with no feed, or a feed that is not RSS', async () => {
  assert.deepEqual(await findFeedProblems(await fakeFolder({}), site, [reto]), [
    { item: 'feed', message: 'rss.xml is not in the build' },
  ]);
  assert.deepEqual(await findFeedProblems(await fakeFolder({ 'rss.xml': '<html><body></body></html>' }), site, [reto]), [
    { item: 'feed', message: 'rss.xml is not RSS: it has no <rss><channel>' },
  ]);
});

test('reports a Note with no item, an item for no Note and a Note with two items', async () => {
  const dir = await buildWithFeed([
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
    { link: 'https://alexsobrino.me/notes/hola/' },
  ]);

  assert.deepEqual(await findFeedProblems(dir, site, [reto]), [
    { item: 'item 2 (https://alexsobrino.me/notes/reto/)', message: 'is a second item for Note "reto", after item 1' },
    { item: 'item 3 (https://alexsobrino.me/notes/hola/)', message: 'links to /notes/hola/, which is no Note' },
  ]);
  assert.deepEqual(
    await findFeedProblems(await buildWithFeed([{ link: 'https://alexsobrino.me/notes/hola/' }]), site, [reto, hola]),
    [{ item: 'feed', message: 'has no item for Note "reto"' }],
  );
});

test('reports an item older than the one after it', async () => {
  const dir = await buildWithFeed([
    { link: 'https://alexsobrino.me/notes/hola/' },
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
  ]);

  assert.deepEqual(await findFeedProblems(dir, site, [reto, hola]), [
    {
      item: 'item 2 (https://alexsobrino.me/notes/reto/)',
      message: 'is newer (2026-10-02) than item 1 (2026-09-01), expected newest first',
    },
  ]);
});

test('reports a relative link, an off-site link and a link to a page that is not built', async () => {
  const dir = await buildWithFeed([
    { link: '/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
    { link: 'https://example.com/notes/hola/' },
  ]);
  const gone: ContentNote = { id: 'gone', date: new Date('2026-08-01'), tags: [], lang: 'es' };
  const unbuilt = await buildWithFeed([{ link: 'https://alexsobrino.me/notes/gone/' }]);

  assert.deepEqual(await findFeedProblems(dir, site, [reto, hola]), [
    { item: 'item 1 (/notes/reto/)', message: 'link is relative, expected an absolute URL on https://alexsobrino.me' },
    { item: 'item 2 (https://example.com/notes/hola/)', message: 'link is not on https://alexsobrino.me' },
  ]);
  assert.deepEqual(await findFeedProblems(unbuilt, site, [gone]), [
    { item: 'item 1 (https://alexsobrino.me/notes/gone/)', message: 'links to /notes/gone/, which is not built' },
  ]);
});

test("reports categories that are not the Note's Tags in the Note's order", async () => {
  const dir = await buildWithFeed([
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Retos & más', 'Un libro al mes'] },
    { link: 'https://alexsobrino.me/notes/hola/', categories: ['Retos & más'] },
  ]);
  const missing = await buildWithFeed([{ link: 'https://alexsobrino.me/notes/reto/' }]);

  assert.deepEqual(await findFeedProblems(dir, site, [reto, hola]), [
    {
      item: 'item 1 (https://alexsobrino.me/notes/reto/)',
      message: 'categories are ["Retos & más","Un libro al mes"], expected ["Un libro al mes","Retos & más"]',
    },
    { item: 'item 2 (https://alexsobrino.me/notes/hola/)', message: 'categories are ["Retos & más"], expected []' },
  ]);
  assert.deepEqual(await findFeedProblems(missing, site, [reto]), [
    {
      item: 'item 1 (https://alexsobrino.me/notes/reto/)',
      message: 'categories are [], expected ["Un libro al mes","Retos & más"]',
    },
  ]);
});
