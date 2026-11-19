import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readExpectedPages } from './expected-pages.ts';
import { fakeFolder } from './fake-folder.ts';

test('lists the home page, the Notes and Tags listings, each Note with its Tags, each Tag with Notes with its title, and each Side Project, with their prompts, languages, document titles and listed Notes', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02\ntags: [un-libro-al-mes]\n---\n',
    'notes/hola.md': '---\ntitle: Hola\ndate: 2026-09-01\n---\n',
    'side-projects/sub9bar.md': '---\nname: Sub9bar\n---\n',
    'tags.yml': 'un-libro-al-mes:\n  name: Un libro al mes\n',
  });

  assert.deepEqual(await readExpectedPages(dir, 'es'), [
    { url: '/', prompt: '~ $ whoami', siteLang: 'es', documentTitle: 'Alex Sobrino' },
    {
      url: '/notes/',
      prompt: '~/notes $ ls',
      siteLang: 'es',
      documentTitle: 'Notas · Alex Sobrino',
      listedNotes: [
        { id: 'reto', date: new Date('2026-10-02'), url: '/notes/reto/' },
        { id: 'hola', date: new Date('2026-09-01'), url: '/notes/hola/' },
      ],
    },
    {
      url: '/notes/hola/',
      prompt: '~/notes $ cat hola',
      siteLang: 'es',
      documentTitle: 'Hola · Alex Sobrino',
      contentLang: 'es',
      tags: [],
      note: { id: 'hola', date: new Date('2026-09-01') },
    },
    {
      url: '/notes/reto/',
      prompt: '~/notes $ cat reto',
      siteLang: 'es',
      documentTitle: 'Reto · Alex Sobrino',
      contentLang: 'es',
      tags: [{ name: 'Un libro al mes', url: '/notes/tags/un-libro-al-mes/' }],
      note: { id: 'reto', date: new Date('2026-10-02') },
    },
    {
      url: '/notes/tags/',
      prompt: '~/notes/tags $ ls',
      siteLang: 'es',
      documentTitle: 'Etiquetas · Alex Sobrino',
      tagRows: [{ name: 'Un libro al mes', noteCount: 1, url: '/notes/tags/un-libro-al-mes/' }],
    },
    {
      url: '/notes/tags/un-libro-al-mes/',
      prompt: '~/notes/tags/un-libro-al-mes $ ls',
      siteLang: 'es',
      documentTitle: 'Un libro al mes · Alex Sobrino',
      title: 'Un libro al mes',
      listedNotes: [{ id: 'reto', date: new Date('2026-10-02'), url: '/notes/reto/' }],
    },
    {
      url: '/side-projects/sub9bar/',
      prompt: '~/side-projects $ cat sub9bar',
      siteLang: 'es',
      documentTitle: 'Sub9bar · Alex Sobrino',
      contentLang: 'es',
    },
  ]);
});

test('gives every page the site language, and a Note or Side Project page also its own Content language', async () => {
  const dir = await fakeFolder({
    'notes/hello.md': '---\ntitle: Hello\ndate: 2026-10-02\nlang: en\n---\n',
    'notes/hola.md': '---\ntitle: Hola\ndate: 2026-09-01\n---\n',
    'side-projects/tool.md': '---\nname: Tool\nlang: en\n---\n',
    'tags.yml': '',
  });

  const languages = (await readExpectedPages(dir, 'es')).map(({ url, siteLang, contentLang }) => ({ url, siteLang, contentLang }));

  assert.deepEqual(languages, [
    { url: '/', siteLang: 'es', contentLang: undefined },
    { url: '/notes/', siteLang: 'es', contentLang: undefined },
    { url: '/notes/hello/', siteLang: 'es', contentLang: 'en' },
    { url: '/notes/hola/', siteLang: 'es', contentLang: 'es' },
    { url: '/notes/tags/', siteLang: 'es', contentLang: undefined },
    { url: '/side-projects/tool/', siteLang: 'es', contentLang: 'en' },
  ]);
});

test("gives a Note page its Tags in the Note's order, not the order of tags.yml", async () => {
  const dir = await fakeFolder({
    'notes/libros.md': '---\ntitle: Libros\ndate: 2026-11-02\ntags: [pragmatic, libro]\n---\n',
    'tags.yml': 'libro:\n  name: Un libro al mes\npragmatic:\n  name: The Pragmatic Programmer\n',
  });

  const note = (await readExpectedPages(dir, 'es')).find(({ url }) => url === '/notes/libros/');

  assert.deepEqual(note?.tags, [
    { name: 'The Pragmatic Programmer', url: '/notes/tags/pragmatic/' },
    { name: 'Un libro al mes', url: '/notes/tags/libro/' },
  ]);
});

test("gives each Note page its Note's slug and date, and no other page a Note", async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02T09:30:00+02:00\ntags: [libro]\n---\n',
    'side-projects/sub9bar.md': '---\nname: Sub9bar\n---\n',
    'tags.yml': 'libro:\n  name: Un libro al mes\n',
  });

  const notes = (await readExpectedPages(dir, 'es')).map(({ url, note }) => ({ url, note }));

  assert.deepEqual(notes, [
    { url: '/', note: undefined },
    { url: '/notes/', note: undefined },
    { url: '/notes/reto/', note: { id: 'reto', date: new Date('2026-10-02T07:30:00Z') } },
    { url: '/notes/tags/', note: undefined },
    { url: '/notes/tags/libro/', note: undefined },
    { url: '/side-projects/sub9bar/', note: undefined },
  ]);
});

test('gives a Tag with no Notes no page, and a Tag with several Notes one page', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02\ntags: [libros]\n---\n',
    'notes/otro.md': '---\ntitle: Otro\ndate: 2026-10-03\ntags: [libros]\n---\n',
    'tags.yml': 'libros:\n  name: Un libro al mes\nsin-notas:\n  name: Sin notas\n',
  });

  const tagPages = (await readExpectedPages(dir, 'es')).filter(({ url }) => url.startsWith('/notes/tags/'));

  assert.deepEqual(tagPages, [
    {
      url: '/notes/tags/',
      prompt: '~/notes/tags $ ls',
      siteLang: 'es',
      documentTitle: 'Etiquetas · Alex Sobrino',
      tagRows: [{ name: 'Un libro al mes', noteCount: 2, url: '/notes/tags/libros/' }],
    },
    {
      url: '/notes/tags/libros/',
      prompt: '~/notes/tags/libros $ ls',
      siteLang: 'es',
      documentTitle: 'Un libro al mes · Alex Sobrino',
      title: 'Un libro al mes',
      listedNotes: [
        { id: 'otro', date: new Date('2026-10-03'), url: '/notes/otro/' },
        { id: 'reto', date: new Date('2026-10-02'), url: '/notes/reto/' },
      ],
    },
  ]);
});

test('lists a non-ASCII slug as the build names its folder', async () => {
  const dir = await fakeFolder({
    'notes/año.md': '---\ntitle: Año\ndate: 2026-10-02\ntags: [año]\n---\n',
    'tags.yml': 'año:\n  name: Año\n',
  });

  const pages = (await readExpectedPages(dir, 'es')).filter(({ url }) => url.includes('año'));

  assert.deepEqual(pages, [
    {
      url: '/notes/año/',
      prompt: '~/notes $ cat año',
      siteLang: 'es',
      documentTitle: 'Año · Alex Sobrino',
      contentLang: 'es',
      tags: [{ name: 'Año', url: '/notes/tags/año/' }],
      note: { id: 'año', date: new Date('2026-10-02') },
    },
    {
      url: '/notes/tags/año/',
      prompt: '~/notes/tags/año $ ls',
      siteLang: 'es',
      documentTitle: 'Año · Alex Sobrino',
      title: 'Año',
      listedNotes: [{ id: 'año', date: new Date('2026-10-02'), url: '/notes/año/' }],
    },
  ]);
});

test('gives the Tags listing a row per Tag with Notes, in site-language order, counting a Note once per Tag it lists', async () => {
  // "Ética" sorts before "Un libro al mes" in Spanish, though É comes after Z in Unicode.
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02\ntags: [libro]\n---\n',
    'notes/etica.md': '---\ntitle: Ética\ndate: 2026-09-01\ntags: [zen, etica, libro, libro]\n---\n',
    'notes/hola.md': '---\ntitle: Hola\ndate: 2026-08-01\n---\n',
    'tags.yml': 'libro:\n  name: Un libro al mes\netica:\n  name: Ética\nzen:\n  name: Zen\nsin-notas:\n  name: Sin notas\n',
  });

  const listing = (await readExpectedPages(dir, 'es')).find(({ url }) => url === '/notes/tags/');

  assert.deepEqual(listing?.tagRows, [
    { name: 'Ética', noteCount: 1, url: '/notes/tags/etica/' },
    { name: 'Un libro al mes', noteCount: 2, url: '/notes/tags/libro/' },
    { name: 'Zen', noteCount: 1, url: '/notes/tags/zen/' },
  ]);
});

test('gives the Tags listing no rows when no Note has Tags', async () => {
  const dir = await fakeFolder({
    'notes/hola.md': '---\ntitle: Hola\ndate: 2026-08-01\n---\n',
    'tags.yml': 'sin-notas:\n  name: Sin notas\n',
  });

  const listing = (await readExpectedPages(dir, 'es')).find(({ url }) => url === '/notes/tags/');

  assert.deepEqual(listing?.tagRows, []);
});

test("gives every page its document title: the Note's title, the Side Project's name, the Tag's name or the listing's, after the site's name, and the home page the site's name alone", async () => {
  const dir = await fakeFolder({
    'notes/reto.md': "---\ntitle: 'Reto: un libro al mes'\ndate: 2026-10-02\ntags: [libro]\n---\n",
    'side-projects/sub9bar.md': '---\nname: Sub9bar\n---\n',
    'tags.yml': 'libro:\n  name: Un libro al mes\n',
  });

  const titles = (await readExpectedPages(dir, 'es')).map(({ url, documentTitle }) => ({ url, documentTitle }));

  assert.deepEqual(titles, [
    { url: '/', documentTitle: 'Alex Sobrino' },
    { url: '/notes/', documentTitle: 'Notas · Alex Sobrino' },
    { url: '/notes/reto/', documentTitle: 'Reto: un libro al mes · Alex Sobrino' },
    { url: '/notes/tags/', documentTitle: 'Etiquetas · Alex Sobrino' },
    { url: '/notes/tags/libro/', documentTitle: 'Un libro al mes · Alex Sobrino' },
    { url: '/side-projects/sub9bar/', documentTitle: 'Sub9bar · Alex Sobrino' },
  ]);
});

test('gives the Notes listing every Note and each Tag page its Notes, newest first, each with its page URL', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02\ntags: [libro, libro]\n---\n',
    'notes/hola.md': '---\ntitle: Hola\ndate: 2026-08-01\n---\n',
    'notes/etica.md': '---\ntitle: Ética\ndate: 2026-11-01\ntags: [zen, libro]\n---\n',
    'tags.yml': 'libro:\n  name: Un libro al mes\nzen:\n  name: Zen\nsin-notas:\n  name: Sin notas\n',
  });

  const listings = (await readExpectedPages(dir, 'es')).map(({ url, listedNotes }) => ({ url, listedNotes }));

  assert.deepEqual(listings, [
    { url: '/', listedNotes: undefined },
    {
      url: '/notes/',
      listedNotes: [
        { id: 'etica', date: new Date('2026-11-01'), url: '/notes/etica/' },
        { id: 'reto', date: new Date('2026-10-02'), url: '/notes/reto/' },
        { id: 'hola', date: new Date('2026-08-01'), url: '/notes/hola/' },
      ],
    },
    { url: '/notes/etica/', listedNotes: undefined },
    { url: '/notes/hola/', listedNotes: undefined },
    { url: '/notes/reto/', listedNotes: undefined },
    { url: '/notes/tags/', listedNotes: undefined },
    {
      url: '/notes/tags/libro/',
      listedNotes: [
        { id: 'etica', date: new Date('2026-11-01'), url: '/notes/etica/' },
        { id: 'reto', date: new Date('2026-10-02'), url: '/notes/reto/' },
      ],
    },
    { url: '/notes/tags/zen/', listedNotes: [{ id: 'etica', date: new Date('2026-11-01'), url: '/notes/etica/' }] },
  ]);
});
