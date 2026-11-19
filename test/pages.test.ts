import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readBuild } from './built-site.ts';
import { fakeFolder } from './fake-folder.ts';
import type { ExpectedPage } from './expected-pages.ts';
import {
  findDocumentTitleProblems,
  findExtraPages,
  findLanguageProblems,
  findMissingPages,
  findNoteListProblems,
  findNoteTagProblems,
  findPromptProblems,
  findTagHeadingProblems,
  findTagListProblems,
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

/** The Notes listing, which has no Tag rows to check, and the Tags listing, its rows in site-language order: "Ética" before "Un libro al mes", though É comes after Z in Unicode. */
const tagListingPages: ExpectedPage[] = [
  { url: '/notes/', prompt: '~/notes $ ls', siteLang: 'es', documentTitle: 'Notas · Alex Sobrino' },
  {
    url: '/notes/tags/',
    prompt: '~/notes/tags $ ls',
    siteLang: 'es',
    documentTitle: 'Etiquetas · Alex Sobrino',
    tagRows: [
      { name: 'Ética', noteCount: 1, url: '/notes/tags/etica/' },
      { name: 'Un libro al mes', noteCount: 2, url: '/notes/tags/un-libro-al-mes/' },
      { name: 'Zen', noteCount: 1, url: '/notes/tags/zen/' },
    ],
  },
];

// The Note "reto" is in English, on a site in Spanish.
const expectedPages: ExpectedPage[] = [
  { url: '/', prompt: '~ $ whoami', siteLang: 'es', documentTitle: 'Alex Sobrino' },
  { url: '/notes/', prompt: '~/notes $ ls', siteLang: 'es', documentTitle: 'Notas · Alex Sobrino' },
  { url: '/notes/reto/', prompt: '~/notes $ cat reto', siteLang: 'es', documentTitle: 'Reto · Alex Sobrino', contentLang: 'en' },
  { url: '/notes/tags/', prompt: '~/notes/tags $ ls', siteLang: 'es', documentTitle: 'Etiquetas · Alex Sobrino' },
  { url: '/notes/tags/un-libro-al-mes/', prompt: '~/notes/tags/un-libro-al-mes $ ls', siteLang: 'es', documentTitle: 'Un libro al mes · Alex Sobrino' },
  { url: '/side-projects/sub9bar/', prompt: '~/side-projects $ cat sub9bar', siteLang: 'es', documentTitle: 'Sub9bar · Alex Sobrino', contentLang: 'es' },
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
  { url: '/notes/hola/', prompt: '~/notes $ cat hola', siteLang: 'es', documentTitle: 'Hola · Alex Sobrino', contentLang: 'es', tags: [] },
  { url: '/notes/libros/', prompt: '~/notes $ cat libros', siteLang: 'es', documentTitle: 'Libros · Alex Sobrino', contentLang: 'es', tags: [libroTag, pragmaticTag] },
  { url: '/notes/reto/', prompt: '~/notes $ cat reto', siteLang: 'es', documentTitle: 'Reto · Alex Sobrino', contentLang: 'en', tags: [libroTag] },
  {
    url: '/notes/tags/the-pragmatic-programmer/',
    prompt: '~/notes/tags/the-pragmatic-programmer $ ls',
    siteLang: 'es',
    documentTitle: 'The Pragmatic Programmer · Alex Sobrino',
    heading: 'The Pragmatic Programmer',
  },
  { url: '/notes/tags/un-libro-al-mes/', prompt: '~/notes/tags/un-libro-al-mes $ ls', siteLang: 'es', documentTitle: 'Un libro al mes · Alex Sobrino', heading: 'Un libro al mes' },
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
    { url: '/notes/año/', prompt: '~/notes $ cat año', siteLang: 'es', documentTitle: 'Año · Alex Sobrino', contentLang: 'es', tags: [{ name: 'Año', url: '/notes/tags/año/' }] },
    { url: '/notes/tags/año/', prompt: '~/notes/tags/año $ ls', siteLang: 'es', documentTitle: 'Año · Alex Sobrino', heading: 'Año' },
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
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls', siteLang: 'es', documentTitle: 'Etiquetas · Alex Sobrino', tagRows: [{ name: 'Año', noteCount: 1, url: '/notes/tags/año/' }] },
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

/** A Tag page as it renders its heading, the Tag's name. */
function tagPage(heading: string): string {
  return `<html lang="es"><body><main><h1 class="page-title">${heading}</h1><ul></ul></main></body></html>`;
}

/** Two Tag pages, one with a non-ASCII slug, and the Tags listing, whose heading is no Tag's name. */
const tagHeadingPages: ExpectedPage[] = [
  { url: '/notes/tags/', prompt: '~/notes/tags $ ls', siteLang: 'es', documentTitle: 'Etiquetas · Alex Sobrino', tagRows: [] },
  { url: '/notes/tags/año/', prompt: '~/notes/tags/año $ ls', siteLang: 'es', documentTitle: 'Año · Alex Sobrino', heading: 'Año' },
  {
    url: '/notes/tags/un-libro-al-mes/',
    prompt: '~/notes/tags/un-libro-al-mes $ ls',
    siteLang: 'es',
    documentTitle: 'Un libro al mes · Alex Sobrino',
    heading: 'Un libro al mes',
  },
];

test("accepts Tag pages headed with their Tag's name, however the heading's whitespace runs, leaving other pages' headings alone", async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/tags/index.html': tagPage('Etiquetas'),
      'notes/tags/año/index.html': tagPage('Año'),
      'notes/tags/un-libro-al-mes/index.html': tagPage('Un  libro\n al mes'),
    }),
  );

  assert.deepEqual(findTagHeadingProblems(tagHeadingPages, build), []);
});

test("reports a Tag page whose heading isn't its Tag's name, naming the page", async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/tags/año/index.html': tagPage('Un libro al mes'),
      'notes/tags/un-libro-al-mes/index.html': tagPage('Año'),
    }),
  );

  assert.deepEqual(findTagHeadingProblems(tagHeadingPages, build), [
    { page: '/notes/tags/año/', message: 'heading reads "Un libro al mes", expected "Año"' },
    { page: '/notes/tags/un-libro-al-mes/', message: 'heading reads "Año", expected "Un libro al mes"' },
  ]);
});

test('reports a Tag page with no heading, leaving pages not in the build to the missing-page check', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/tags/año/index.html': '<html lang="es"><body><main><ul></ul></main></body></html>',
    }),
  );

  assert.deepEqual(findTagHeadingProblems(tagHeadingPages, build), [
    { page: '/notes/tags/año/', message: 'no heading, expected "Año"' },
  ]);
});

/** A page with this document title; with none, a page whose head has no title. */
function titledPage(documentTitle?: string): string {
  const title = documentTitle === undefined ? '' : `<title>${documentTitle}</title>`;
  return `<html lang="es"><head><meta charset="utf-8">${title}</head><body><main></main></body></html>`;
}

/** The home page, titled with the site's name alone, a Note page and a Side Project page. */
const documentTitlePages: ExpectedPage[] = [
  { url: '/', prompt: '~ $ whoami', siteLang: 'es', documentTitle: 'Alex Sobrino' },
  { url: '/notes/reto/', prompt: '~/notes $ cat reto', siteLang: 'es', documentTitle: 'Reto: un libro al mes · Alex Sobrino', contentLang: 'es' },
  { url: '/side-projects/sub9bar/', prompt: '~/side-projects $ cat sub9bar', siteLang: 'es', documentTitle: 'Sub9bar · Alex Sobrino', contentLang: 'es' },
];

test('accepts pages whose document title reads as expected, however its whitespace runs', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': titledPage('Alex Sobrino'),
      'notes/reto/index.html': titledPage('Reto: un libro al mes · Alex Sobrino'),
      'side-projects/sub9bar/index.html': titledPage('\n  Sub9bar ·  Alex Sobrino\n'),
    }),
  );

  assert.deepEqual(findDocumentTitleProblems(documentTitlePages, build), []);
});

test('reports a page whose document title reads otherwise, naming the page', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': titledPage('Alex Sobrino'),
      'notes/reto/index.html': titledPage('Sub9bar · Alex Sobrino'),
      'side-projects/sub9bar/index.html': titledPage('Sub9bar'),
    }),
  );

  assert.deepEqual(findDocumentTitleProblems(documentTitlePages, build), [
    { page: '/notes/reto/', message: 'document title reads "Sub9bar · Alex Sobrino", expected "Reto: un libro al mes · Alex Sobrino"' },
    { page: '/side-projects/sub9bar/', message: 'document title reads "Sub9bar", expected "Sub9bar · Alex Sobrino"' },
  ]);
});

test('reports a page with no document title, even with a title elsewhere on it, leaving pages not in the build to the missing-page check', async () => {
  const build = await readBuild(
    await fakeFolder({
      'index.html': titledPage(),
      'notes/reto/index.html': titledPage().replace('<main></main>', '<main><svg><title>Reto: un libro al mes · Alex Sobrino</title></svg></main>'),
    }),
  );

  assert.deepEqual(findDocumentTitleProblems(documentTitlePages, build), [
    { page: '/', message: 'no document title, expected "Alex Sobrino"' },
    { page: '/notes/reto/', message: 'no document title, expected "Reto: un libro al mes · Alex Sobrino"' },
  ]);
});

/** A listing of Notes as NoteList renders it: one item per Note, its date, then its title linking to its page. With no link, an item shows its title alone. */
function noteListing(heading: string, notes: { title: string; href?: string }[]): string {
  const items = notes.map(({ title, href }) => {
    const name = href === undefined ? title : `<a href="${href}">${title}</a>`;
    return `<li class="note" lang="es"><time class="note__date" datetime="2026-10-02T00:00:00.000Z">2 oct 2026</time>${name}</li>`;
  });
  return `<html lang="es"><body><main><h1 class="page-title">${heading}</h1><ul class="notes prose">${items.join('')}</ul></main></body></html>`;
}

const etica = { id: 'etica', date: new Date('2026-11-01'), url: '/notes/etica/' };
const reto = { id: 'reto', date: new Date('2026-10-02'), url: '/notes/reto/' };
const hola = { id: 'hola', date: new Date('2026-08-01'), url: '/notes/hola/' };

/** The Notes listing with three Notes, newest first, a Tag page with two of them, and a Tag page with a non-ASCII slug listing a Note with one. */
const noteListPages: ExpectedPage[] = [
  { url: '/notes/', prompt: '~/notes $ ls', siteLang: 'es', documentTitle: 'Notas · Alex Sobrino', listedNotes: [etica, reto, hola] },
  {
    url: '/notes/tags/año/',
    prompt: '~/notes/tags/año $ ls',
    siteLang: 'es',
    documentTitle: 'Año · Alex Sobrino',
    heading: 'Año',
    listedNotes: [{ id: 'año', date: new Date('2026-12-01'), url: '/notes/año/' }],
  },
  {
    url: '/notes/tags/un-libro-al-mes/',
    prompt: '~/notes/tags/un-libro-al-mes $ ls',
    siteLang: 'es',
    documentTitle: 'Un libro al mes · Alex Sobrino',
    heading: 'Un libro al mes',
    listedNotes: [etica, reto],
  },
];

test('accepts listings that list their Notes newest first, each linking to its page, however its URL is encoded', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/index.html': noteListing('Notas', [
        { title: 'Ética', href: '/notes/etica/' },
        { title: 'Reto', href: '/notes/reto/' },
        { title: 'Hola', href: '/notes/hola/' },
      ]),
      'notes/tags/año/index.html': noteListing('Año', [{ title: 'Año', href: '/notes/a%C3%B1o/' }]),
      'notes/tags/un-libro-al-mes/index.html': noteListing('Un libro al mes', [
        { title: 'Ética', href: '/notes/etica/' },
        { title: 'Reto', href: '/notes/reto/' },
      ]),
    }),
  );

  assert.deepEqual(findNoteListProblems(noteListPages, build), []);
});

test('reports a Note a listing leaves out, naming the page and the Note', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/index.html': noteListing('Notas', [
        { title: 'Ética', href: '/notes/etica/' },
        { title: 'Hola', href: '/notes/hola/' },
      ]),
      'notes/tags/año/index.html': noteListing('Año', []),
      'notes/tags/un-libro-al-mes/index.html': noteListing('Un libro al mes', [{ title: 'Reto', href: '/notes/reto/' }]),
    }),
  );

  assert.deepEqual(findNoteListProblems(noteListPages, build), [
    { page: '/notes/', message: 'does not list Note "reto"' },
    { page: '/notes/tags/año/', message: 'does not list Note "año"' },
    { page: '/notes/tags/un-libro-al-mes/', message: 'does not list Note "etica"' },
  ]);
});

test('reports a Note a listing lists though it should not, or lists twice, and an item that links to no Note or to nothing', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/index.html': noteListing('Notas', [
        { title: 'Ética', href: '/notes/etica/' },
        { title: 'Reto', href: '/notes/reto/' },
        { title: 'Otra', href: '/notes/otra/' },
        { title: 'Hola', href: '/notes/hola/' },
        { title: 'Etiquetas', href: '/notes/tags/' },
      ]),
      'notes/tags/año/index.html': noteListing('Año', [{ title: 'Año', href: '/notes/a%C3%B1o/' }, { title: 'Hola' }]),
      'notes/tags/un-libro-al-mes/index.html': noteListing('Un libro al mes', [
        { title: 'Ética', href: '/notes/etica/' },
        { title: 'Reto', href: '/notes/reto/' },
        { title: 'Hola', href: '/notes/hola/' },
        { title: 'Reto', href: '/notes/reto/' },
      ]),
    }),
  );
  // Hola's page, so a listing that shouldn't list it can name it.
  const holaPage: ExpectedPage = { url: '/notes/hola/', prompt: '~/notes $ cat hola', siteLang: 'es', documentTitle: 'Hola · Alex Sobrino', contentLang: 'es', note: { id: 'hola', date: hola.date } };

  assert.deepEqual(findNoteListProblems([...noteListPages, holaPage], build), [
    { page: '/notes/', message: 'lists "Otra", linking to /notes/otra/, which is no Note page' },
    { page: '/notes/', message: 'lists "Etiquetas", linking to /notes/tags/, which is no Note page' },
    { page: '/notes/tags/año/', message: 'lists item 2 with no link' },
    { page: '/notes/tags/un-libro-al-mes/', message: 'lists Note "hola", which it should not' },
    { page: '/notes/tags/un-libro-al-mes/', message: 'lists Note "reto" twice' },
  ]);
});

test('reports a Note a listing lists before a newer one, naming the page and both Notes', async () => {
  const build = await readBuild(
    await fakeFolder({
      'notes/index.html': noteListing('Notas', [
        { title: 'Reto', href: '/notes/reto/' },
        { title: 'Ética', href: '/notes/etica/' },
        { title: 'Hola', href: '/notes/hola/' },
      ]),
      'notes/tags/año/index.html': noteListing('Año', [{ title: 'Año', href: '/notes/a%C3%B1o/' }]),
      'notes/tags/un-libro-al-mes/index.html': noteListing('Un libro al mes', [
        { title: 'Reto', href: '/notes/reto/' },
        { title: 'Ética', href: '/notes/etica/' },
      ]),
    }),
  );

  assert.deepEqual(findNoteListProblems(noteListPages, build), [
    { page: '/notes/', message: 'lists Note "etica" (2026-11-01) after Note "reto" (2026-10-02), expected newest first' },
    { page: '/notes/tags/un-libro-al-mes/', message: 'lists Note "etica" (2026-11-01) after Note "reto" (2026-10-02), expected newest first' },
  ]);
});

test('accepts Notes of the same date in either order', async () => {
  const otra = { id: 'otra', date: reto.date, url: '/notes/otra/' };
  const expected: ExpectedPage[] = [
    { url: '/notes/', prompt: '~/notes $ ls', siteLang: 'es', documentTitle: 'Notas · Alex Sobrino', listedNotes: [reto, otra] },
  ];
  const build = await readBuild(
    await fakeFolder({
      'notes/index.html': noteListing('Notas', [
        { title: 'Otra', href: '/notes/otra/' },
        { title: 'Reto', href: '/notes/reto/' },
      ]),
    }),
  );

  assert.deepEqual(findNoteListProblems(expected, build), []);
});

test('leaves a listing not in the build to the missing-page check', async () => {
  const build = await readBuild(await fakeFolder({ 'index.html': '' }));

  assert.deepEqual(findNoteListProblems(noteListPages, build), []);
});
