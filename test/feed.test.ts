import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ExpectedPage, ExpectedTag } from './expected-pages.ts';
import { readBuild, type Build } from './built-site.ts';
import { fakeFolder } from './fake-folder.ts';
import { findFeedProblems } from './feed.ts';

const site = 'https://alexsobrino.me';

/** An expected Note page at this URL, showing the Note with this slug and date and these Tags. */
function notePage(url: string, id: string, date: string, tags: ExpectedTag[] = []): ExpectedPage {
  return { url, prompt: `~/notes $ cat ${id}`, siteLang: 'es', contentLang: 'es', tags, note: { id, date: new Date(date) } };
}

const reto = notePage('/notes/reto/', 'reto', '2026-10-02', [
  { name: 'Un libro al mes', url: '/notes/tags/un-libro-al-mes/' },
  { name: 'Retos & más', url: '/notes/tags/retos/' },
]);
const hola = notePage('/notes/hola/', 'hola', '2026-09-01');
const home: ExpectedPage = { url: '/', prompt: '~ $ whoami', siteLang: 'es' };

/** A fake build with the home page, both Note pages and an RSS feed carrying these items, in this order. */
async function buildWithFeed(items: { link: string; categories?: string[] }[]): Promise<Build> {
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
  return readBuild(
    await fakeFolder({
      'rss.xml': `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Notas</title>${xml}</channel></rss>`,
      'index.html': '',
      'notes/reto/index.html': '',
      'notes/hola/index.html': '',
    }),
  );
}

test('accepts a feed with one item per Note, newest first, carrying its Tags', async () => {
  const build = await buildWithFeed([
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
    { link: 'https://alexsobrino.me/notes/hola/' },
  ]);

  assert.deepEqual(findFeedProblems(build, site, [hola, reto]), []);
});

test('reports a build with no feed, or a feed that is not RSS', async () => {
  const noFeed = await readBuild(await fakeFolder({}));
  const notRss = await readBuild(await fakeFolder({ 'rss.xml': '<html><body></body></html>' }));

  assert.deepEqual(findFeedProblems(noFeed, site, [reto]), [{ item: 'feed', message: 'rss.xml is not in the build' }]);
  assert.deepEqual(findFeedProblems(notRss, site, [reto]), [
    { item: 'feed', message: 'rss.xml is not RSS: it has no <rss><channel>' },
  ]);
});

test('reports a Note with no item, an item for no Note and a Note with two items', async () => {
  const build = await buildWithFeed([
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
    { link: 'https://alexsobrino.me/notes/hola/' },
    { link: 'https://alexsobrino.me/' },
  ]);

  assert.deepEqual(findFeedProblems(build, site, [home, reto]), [
    { item: 'item 2 (https://alexsobrino.me/notes/reto/)', message: 'is a second item for Note "reto", after item 1' },
    { item: 'item 3 (https://alexsobrino.me/notes/hola/)', message: 'links to /notes/hola/, which is no Note' },
    { item: 'item 4 (https://alexsobrino.me/)', message: 'links to /, which is no Note' },
  ]);
  assert.deepEqual(
    findFeedProblems(await buildWithFeed([{ link: 'https://alexsobrino.me/notes/hola/' }]), site, [reto, hola]),
    [{ item: 'feed', message: 'has no item for Note "reto"' }],
  );
});

test("finds an item's Note by its expected page URL, whatever shape that URL has", async () => {
  const writing = notePage('/writing/reto/', 'reto', '2026-10-02');
  const build = await readBuild(
    await fakeFolder({
      'rss.xml':
        '<rss version="2.0"><channel>' +
        '<item><link>https://alexsobrino.me/writing/reto/</link></item>' +
        '<item><link>https://alexsobrino.me/notes/reto/</link></item>' +
        '</channel></rss>',
      'writing/reto/index.html': '',
      'notes/reto/index.html': '',
    }),
  );

  assert.deepEqual(findFeedProblems(build, site, [writing]), [
    { item: 'item 2 (https://alexsobrino.me/notes/reto/)', message: 'links to /notes/reto/, which is no Note' },
  ]);
});

test('reports an item older than the one after it', async () => {
  const build = await buildWithFeed([
    { link: 'https://alexsobrino.me/notes/hola/' },
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
  ]);

  assert.deepEqual(findFeedProblems(build, site, [reto, hola]), [
    {
      item: 'item 2 (https://alexsobrino.me/notes/reto/)',
      message: 'is newer (2026-10-02) than item 1 (2026-09-01), expected newest first',
    },
  ]);
});

test('reports a relative link, an off-site link and a link to a page that is not built', async () => {
  const build = await buildWithFeed([
    { link: '/notes/reto/', categories: ['Un libro al mes', 'Retos & más'] },
    { link: 'https://example.com/notes/hola/' },
  ]);
  const gone = notePage('/notes/gone/', 'gone', '2026-08-01');
  const unbuilt = await buildWithFeed([{ link: 'https://alexsobrino.me/notes/gone/' }]);

  assert.deepEqual(findFeedProblems(build, site, [reto, hola]), [
    { item: 'item 1 (/notes/reto/)', message: 'link is relative, expected an absolute URL on https://alexsobrino.me' },
    { item: 'item 2 (https://example.com/notes/hola/)', message: 'link is not on https://alexsobrino.me' },
  ]);
  assert.deepEqual(findFeedProblems(unbuilt, site, [gone]), [
    { item: 'item 1 (https://alexsobrino.me/notes/gone/)', message: 'links to /notes/gone/, which is not built' },
  ]);
});

test("reports categories that are not the Note's Tags in the Note's order", async () => {
  const build = await buildWithFeed([
    { link: 'https://alexsobrino.me/notes/reto/', categories: ['Retos & más', 'Un libro al mes'] },
    { link: 'https://alexsobrino.me/notes/hola/', categories: ['Retos & más'] },
  ]);
  const missing = await buildWithFeed([{ link: 'https://alexsobrino.me/notes/reto/' }]);

  assert.deepEqual(findFeedProblems(build, site, [reto, hola]), [
    {
      item: 'item 1 (https://alexsobrino.me/notes/reto/)',
      message: 'categories are ["Retos & más","Un libro al mes"], expected ["Un libro al mes","Retos & más"]',
    },
    { item: 'item 2 (https://alexsobrino.me/notes/hola/)', message: 'categories are ["Retos & más"], expected []' },
  ]);
  assert.deepEqual(findFeedProblems(missing, site, [reto]), [
    {
      item: 'item 1 (https://alexsobrino.me/notes/reto/)',
      message: 'categories are [], expected ["Un libro al mes","Retos & más"]',
    },
  ]);
});
