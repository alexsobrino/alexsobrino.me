import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakeFolder } from './fake-folder.ts';
import type { ExpectedPage } from './expected-pages.ts';
import {
  findExtraPages,
  findLanguageProblems,
  findMissingPages,
  findNoteTagProblems,
  findPromptProblems,
  findTagListProblems,
  readBuild,
} from './pages.ts';

/** A prompt line as PromptBar renders it: `~/notes $` is the sign, `ls` the command. */
function prompt(sign: string, command: string): string {
  return `<div class="intro__bar"><p class="prompt" aria-hidden="true"><span class="prompt__sign">${sign}</span> ${command}</p></div>`;
}

/** A Note page's meta line: the date, then each Tag as a link to its page. */
function meta(...tags: { name: string; href: string }[]): string {
  const links = tags.map(({ name, href }) => ` · <a href="${href}">${name}</a>`).join('');
  return `<p class="page-meta"><time datetime="2026-10-02T00:00:00.000Z">2 oct 2026</time>${links}</p>`;
}

/** The Tags listing as the page renders it: one item per Tag, its name linking to its page, then its Note count. */
function tagListing(items: { name: string; href?: string; count: number }[]): string {
  const listed = items.map(({ name, href, count }) =>
    href === undefined ? `<li>${name} · ${count}</li>` : `<li><a href="${href}">${name}</a> <span>· ${count}</span></li>`,
  );
  return `<html lang="es"><body><main><h1 class="page-title">Etiquetas</h1><ul>${listed.join('')}</ul></main></body></html>`;
}

/** The expected Tags listing, its rows in site-language order: "Ética" before "Un libro al mes", though É comes after Z in Unicode. */
const tagListingPages: ExpectedPage[] = [
  { url: '/notes/', prompt: '~/notes $ ls', siteLang: 'es' },
  {
    url: '/notes/tags/',
    prompt: '~/notes/tags $ ls',
    siteLang: 'es',
    tagRows: [
      { name: 'Ética', noteCount: 1, url: '/notes/tags/etica/' },
      { name: 'Un libro al mes', noteCount: 2, url: '/notes/tags/un-libro-al-mes/' },
      { name: 'Zen', noteCount: 1, url: '/notes/tags/zen/' },
    ],
  },
];

// The Note "reto" is in English, on a site in Spanish.
const expectedPages: ExpectedPage[] = [
  { url: '/', prompt: '~ $ whoami', siteLang: 'es' },
  { url: '/notes/', prompt: '~/notes $ ls', siteLang: 'es' },
  { url: '/notes/reto/', prompt: '~/notes $ cat reto', siteLang: 'es', contentLang: 'en' },
  { url: '/notes/tags/', prompt: '~/notes/tags $ ls', siteLang: 'es' },
  { url: '/notes/tags/un-libro-al-mes/', prompt: '~/notes/tags/un-libro-al-mes $ ls', siteLang: 'es' },
  { url: '/side-projects/sub9bar/', prompt: '~/side-projects $ cat sub9bar', siteLang: 'es', contentLang: 'es' },
];

test('accepts a build with every expected page, leaving any other pages to the extra-page check', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': '',
      '404.html': '',
      'notes/index.html': '',
      'notes/reto/index.html': '',
      'notes/tags/index.html': '',
      'notes/tags/un-libro-al-mes/index.html': '',
      'side-projects/sub9bar/index.html': '',
    }),
  );

  assert.deepEqual(findMissingPages(expectedPages, build), []);
});

test('reports each expected page that is not in the build, naming the page', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': '',
      'notes/index.html': '',
      'notes/tags/index.html': '',
      'side-projects/sub9bar/index.html': '',
    }),
  );

  assert.deepEqual(findMissingPages(expectedPages, build), [
    { page: '/notes/reto/', message: 'is not in the build' },
    { page: '/notes/tags/un-libro-al-mes/', message: 'is not in the build' },
  ]);
});

test('reports each built page that no expected page accounts for, naming the page', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': '',
      'notes/index.html': '',
      'notes/reto/index.html': '',
      'notes/otro/index.html': '',
      'notes/tags/index.html': '',
      'notes/tags/un-libro-al-mes/index.html': '',
      'notes/tags/sin-notas/index.html': '',
      'side-projects/sub9bar/index.html': '',
      'side-projects/otro/index.html': '',
    }),
  );

  assert.deepEqual(findExtraPages(expectedPages, build), [
    { page: '/notes/otro/', message: 'is in the build, but the content calls for no such page' },
    { page: '/notes/tags/sin-notas/', message: 'is in the build, but the content calls for no such page' },
    { page: '/side-projects/otro/', message: 'is in the build, but the content calls for no such page' },
  ]);
});

test('reads only pages from the build, so the RSS feed and assets are never reported as extra pages', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': '',
      'rss.xml': '<rss></rss>',
      '_astro/BaseLayout.css': 'body {}',
      '_astro/alex.webp': '',
    }),
  );

  assert.deepEqual(findExtraPages(expectedPages, build), []);
});

test('accepts expected pages whose prompt reads as expected', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': prompt('~ $', 'whoami'),
      'notes/index.html': prompt('~/notes $', 'ls'),
      'notes/reto/index.html': prompt('~/notes $', 'cat reto'),
      'notes/tags/index.html': prompt('~/notes/tags $', 'ls'),
      'notes/tags/un-libro-al-mes/index.html': prompt('~/notes/tags/un-libro-al-mes $', 'ls'),
      'side-projects/sub9bar/index.html': prompt('~/side-projects $', 'cat sub9bar'),
    }),
  );

  assert.deepEqual(findPromptProblems(expectedPages, build), []);
});

test('reports a prompt that does not read as expected, naming the page', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': prompt('~ $', 'ls'),
      'notes/reto/index.html': prompt('~/notes $', 'cat otro'),
      'notes/tags/un-libro-al-mes/index.html': prompt('~/notes $', 'ls'),
    }),
  );

  assert.deepEqual(findPromptProblems(expectedPages, build), [
    { page: '/', message: 'prompt reads "~ $ ls", expected "~ $ whoami"' },
    { page: '/notes/reto/', message: 'prompt reads "~/notes $ cat otro", expected "~/notes $ cat reto"' },
    {
      page: '/notes/tags/un-libro-al-mes/',
      message: 'prompt reads "~/notes $ ls", expected "~/notes/tags/un-libro-al-mes $ ls"',
    },
  ]);
});

test('reports an expected page with no prompt, leaving pages not in the build to the missing-page check', async () => {
  const build = await readBuild(
    await fakeFolder({
      'side-projects/sub9bar/index.html': '<h1>sub9bar</h1>',
    }),
  );

  assert.deepEqual(findPromptProblems(expectedPages, build), [
    { page: '/side-projects/sub9bar/', message: 'no prompt, expected "~/side-projects $ cat sub9bar"' },
  ]);
});

test('accepts expected pages in the site language, with each Note and Side Project in its own Content language', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': '<html lang="es"><body></body></html>',
      'notes/index.html': '<html lang="es"><body></body></html>',
      'notes/reto/index.html': '<html lang="es"><body><article lang="en"></article></body></html>',
      'notes/tags/index.html': '<html lang="es"><body></body></html>',
      'notes/tags/un-libro-al-mes/index.html': '<html lang="es"><body></body></html>',
      'side-projects/sub9bar/index.html': '<html lang="es"><body><article lang="es"></article></body></html>',
    }),
  );

  assert.deepEqual(findLanguageProblems(expectedPages, build), []);
});

test('reports an expected page whose <html lang> is missing or not the site language', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': '<html lang="en"><body></body></html>',
      'notes/index.html': '<html><body></body></html>',
      'notes/tags/index.html': '<body></body>',
    }),
  );

  assert.deepEqual(findLanguageProblems(expectedPages, build), [
    { page: '/', message: '<html> has lang "en", expected "es"' },
    { page: '/notes/', message: '<html> has no lang, expected "es"' },
    { page: '/notes/tags/', message: 'no <html>, expected one with lang "es"' },
  ]);
});

test('reports a Note or Side Project page whose <article lang> is missing or not its Content language', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/reto/index.html': '<html lang="es"><body><article></article></body></html>',
      'side-projects/sub9bar/index.html': '<html lang="es"><body><article lang="en"></article></body></html>',
    }),
  );

  assert.deepEqual(findLanguageProblems(expectedPages, build), [
    { page: '/notes/reto/', message: '<article> has no lang, expected "en"' },
    { page: '/side-projects/sub9bar/', message: '<article> has lang "en", expected "es"' },
  ]);
});

test('reports a Note or Side Project page with no <article>, leaving pages not in the build to the missing-page check', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/reto/index.html': '<html lang="es"><body></body></html>',
    }),
  );

  assert.deepEqual(findLanguageProblems(expectedPages, build), [
    { page: '/notes/reto/', message: 'no <article>, expected one with lang "en"' },
  ]);
});

const libroTag = { name: 'Un libro al mes', url: '/notes/tags/un-libro-al-mes/' };
const pragmaticTag = { name: 'The Pragmatic Programmer', url: '/notes/tags/the-pragmatic-programmer/' };

/** Expected Note pages with their Tags, and the Tag pages they link to. */
const noteTagPages: ExpectedPage[] = [
  { url: '/notes/hola/', prompt: '~/notes $ cat hola', siteLang: 'es', contentLang: 'es', tags: [] },
  { url: '/notes/libros/', prompt: '~/notes $ cat libros', siteLang: 'es', contentLang: 'es', tags: [libroTag, pragmaticTag] },
  { url: '/notes/reto/', prompt: '~/notes $ cat reto', siteLang: 'es', contentLang: 'en', tags: [libroTag] },
  {
    url: '/notes/tags/the-pragmatic-programmer/',
    prompt: '~/notes/tags/the-pragmatic-programmer $ ls',
    siteLang: 'es',
    title: 'The Pragmatic Programmer',
  },
  { url: '/notes/tags/un-libro-al-mes/', prompt: '~/notes/tags/un-libro-al-mes $ ls', siteLang: 'es', title: 'Un libro al mes' },
];

test("accepts Note pages whose meta line shows the date, then each of the Note's Tags in order, linking to its Tag page", async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/reto/index.html': meta({ name: 'Un libro al mes', href: '/notes/tags/un-libro-al-mes/' }),
      'notes/libros/index.html': meta(
        { name: 'Un libro al mes', href: '/notes/tags/un-libro-al-mes/' },
        { name: 'The Pragmatic Programmer', href: '/notes/tags/the-pragmatic-programmer/' },
      ),
      'notes/hola/index.html': meta(),
      'index.html': '<p class="page-meta">Sin Tags</p>',
    }),
  );

  assert.deepEqual(findNoteTagProblems(noteTagPages, build), []);
});

test('accepts a Tag link whose URL is encoded, as the build writes a non-ASCII slug', async () => {
  const build = await readBuild(
    await fakeFolder({ 'notes/año/index.html': meta({ name: 'Año', href: '/notes/tags/a%C3%B1o/' }) }),
  );

  const expected: ExpectedPage[] = [
    { url: '/notes/año/', prompt: '~/notes $ cat año', siteLang: 'es', contentLang: 'es', tags: [{ name: 'Año', url: '/notes/tags/año/' }] },
    { url: '/notes/tags/año/', prompt: '~/notes/tags/año $ ls', siteLang: 'es', title: 'Año' },
  ];

  assert.deepEqual(findNoteTagProblems(expected, build), []);
});

test("reports a Note page whose meta line doesn't show its Tags, or shows others, or in another order", async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/reto/index.html': meta(),
      'notes/libros/index.html': meta(
        { name: 'The Pragmatic Programmer', href: '/notes/tags/the-pragmatic-programmer/' },
        { name: 'Un libro al mes', href: '/notes/tags/un-libro-al-mes/' },
      ),
      'notes/hola/index.html': meta({ name: 'Un libro al mes', href: '/notes/tags/un-libro-al-mes/' }),
    }),
  );

  assert.deepEqual(findNoteTagProblems(noteTagPages, build), [
    {
      page: '/notes/hola/',
      message: 'meta line reads "2 oct 2026 · Un libro al mes", expected "2 oct 2026"',
    },
    {
      page: '/notes/libros/',
      message:
        'meta line reads "2 oct 2026 · The Pragmatic Programmer · Un libro al mes", expected "2 oct 2026 · Un libro al mes · The Pragmatic Programmer"',
    },
    { page: '/notes/reto/', message: 'meta line reads "2 oct 2026", expected "2 oct 2026 · Un libro al mes"' },
  ]);
});

test('reports a Tag shown without a link, or linking to no Tag page or to the page of another Tag', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/reto/index.html': '<p class="page-meta"><time>2 oct 2026</time> · Un libro al mes</p>',
      'notes/libros/index.html': meta(
        { name: 'Un libro al mes', href: '/notes/tags/the-pragmatic-programmer/' },
        { name: 'The Pragmatic Programmer', href: '/notes/the-pragmatic-programmer/' },
      ),
    }),
  );

  assert.deepEqual(findNoteTagProblems(noteTagPages, build), [
    {
      page: '/notes/libros/',
      message: 'Tag "Un libro al mes" links to /notes/tags/the-pragmatic-programmer/, the Tag page of "The Pragmatic Programmer"',
    },
    {
      page: '/notes/libros/',
      message: 'Tag "The Pragmatic Programmer" links to /notes/the-pragmatic-programmer/, which is no Tag page',
    },
    { page: '/notes/reto/', message: 'meta line links to no Tags, expected Tags "Un libro al mes"' },
  ]);
});

test('reports a Note page with no meta line, leaving pages not in the build to the missing-page check', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/reto/index.html': '<h1>Reto</h1>',
    }),
  );

  assert.deepEqual(findNoteTagProblems(noteTagPages, build), [
    { page: '/notes/reto/', message: 'no meta line, expected the date then Tags "Un libro al mes"' },
  ]);
});

test('accepts a Tags listing with every Tag that has Notes, by name, each with its Note count, linking to its page', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/tags/index.html': tagListing([
        { name: 'Ética', href: '/notes/tags/etica/', count: 1 },
        { name: 'Un libro al mes', href: '/notes/tags/un-libro-al-mes/', count: 2 },
        { name: 'Zen', href: '/notes/tags/zen/', count: 1 },
      ]),
    }),
  );

  assert.deepEqual(findTagListProblems(tagListingPages, build), []);
});

test('accepts a Tags listing link whose URL is encoded, as the build writes a non-ASCII slug', async () => {
  const build = await readBuild(
    await fakeFolder({ 'notes/tags/index.html': tagListing([{ name: 'Año', href: '/notes/tags/a%C3%B1o/', count: 1 }]) }),
  );

  const expected: ExpectedPage[] = [
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls', siteLang: 'es', tagRows: [{ name: 'Año', noteCount: 1, url: '/notes/tags/año/' }] },
  ];

  assert.deepEqual(findTagListProblems(expected, build), []);
});

test('reports a build with no Tags listing', async () => {
  const build = await readBuild(await fakeFolder({ 'notes/index.html': '' }));

  assert.deepEqual(findTagListProblems(tagListingPages, build), [{ page: '/notes/tags/', message: 'is not in the build' }]);
});

test('reports a Tags listing that leaves out a Tag, lists one with no Notes, is out of order or miscounts', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/tags/index.html': tagListing([
        { name: 'Un libro al mes', href: '/notes/tags/un-libro-al-mes/', count: 1 },
        { name: 'Ética', href: '/notes/tags/etica/', count: 1 },
        { name: 'Sin notas', href: '/notes/tags/sin-notas/', count: 0 },
      ]),
    }),
  );

  assert.deepEqual(findTagListProblems(tagListingPages, build), [
    {
      page: '/notes/tags/',
      message:
        'lists ["Un libro al mes · 1","Ética · 1","Sin notas · 0"], expected ["Ética · 1","Un libro al mes · 2","Zen · 1"]',
    },
  ]);
});

test('reports a Tag that does not link to its own Tag page', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/tags/index.html': tagListing([
        { name: 'Ética', href: '/notes/tags/zen/', count: 1 },
        { name: 'Un libro al mes', href: '/notes/tags/nada/', count: 2 },
        { name: 'Zen', count: 1 },
      ]),
    }),
  );

  assert.deepEqual(findTagListProblems(tagListingPages, build), [
    { page: '/notes/tags/', message: '"Ética" links to /notes/tags/zen/, which is not its Tag page' },
    { page: '/notes/tags/', message: '"Un libro al mes" links to /notes/tags/nada/, which is not its Tag page' },
    { page: '/notes/tags/', message: '"Zen · 1" has no link' },
  ]);
});
