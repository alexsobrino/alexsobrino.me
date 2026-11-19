import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readExpectedPages } from './expected-pages.ts';
import { fakeFolder } from './fake-folder.ts';

test('lists the home page, the Notes and Tags listings, each Note with its Tags, each Tag with Notes with its title, and each Side Project, with their prompts and languages', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02\ntags: [un-libro-al-mes]\n---\n',
    'notes/hola.md': '---\ntitle: Hola\ndate: 2026-09-01\n---\n',
    'side-projects/sub9bar.md': '---\nname: Sub9bar\n---\n',
    'tags.yml': 'un-libro-al-mes:\n  name: Un libro al mes\n',
  });

  assert.deepEqual(await readExpectedPages(dir, 'es'), [
    { url: '/', prompt: '~ $ whoami', lang: 'es' },
    { url: '/notes/', prompt: '~/notes $ ls', lang: 'es' },
    { url: '/notes/hola/', prompt: '~/notes $ cat hola', lang: 'es', contentLang: 'es', tags: [] },
    {
      url: '/notes/reto/',
      prompt: '~/notes $ cat reto',
      lang: 'es',
      contentLang: 'es',
      tags: [{ name: 'Un libro al mes', url: '/notes/tags/un-libro-al-mes/' }],
    },
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls', lang: 'es' },
    { url: '/notes/tags/un-libro-al-mes/', prompt: '~/notes/tags/un-libro-al-mes $ ls', lang: 'es', title: 'Un libro al mes' },
    { url: '/side-projects/sub9bar/', prompt: '~/side-projects $ cat sub9bar', lang: 'es', contentLang: 'es' },
  ]);
});

test('gives every page the site language, and a Note or Side Project page also its own Content language', async () => {
  const dir = await fakeFolder({
    'notes/hello.md': '---\ntitle: Hello\ndate: 2026-10-02\nlang: en\n---\n',
    'notes/hola.md': '---\ntitle: Hola\ndate: 2026-09-01\n---\n',
    'side-projects/tool.md': '---\nname: Tool\nlang: en\n---\n',
    'tags.yml': '',
  });

  const languages = (await readExpectedPages(dir, 'es')).map(({ url, lang, contentLang }) => ({ url, lang, contentLang }));

  assert.deepEqual(languages, [
    { url: '/', lang: 'es', contentLang: undefined },
    { url: '/notes/', lang: 'es', contentLang: undefined },
    { url: '/notes/hello/', lang: 'es', contentLang: 'en' },
    { url: '/notes/hola/', lang: 'es', contentLang: 'es' },
    { url: '/notes/tags/', lang: 'es', contentLang: undefined },
    { url: '/side-projects/tool/', lang: 'es', contentLang: 'en' },
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

test('gives a Tag with no Notes no page, and a Tag with several Notes one page', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02\ntags: [libros]\n---\n',
    'notes/otro.md': '---\ntitle: Otro\ndate: 2026-10-03\ntags: [libros]\n---\n',
    'tags.yml': 'libros:\n  name: Un libro al mes\nsin-notas:\n  name: Sin notas\n',
  });

  const tagPages = (await readExpectedPages(dir, 'es')).filter(({ url }) => url.startsWith('/notes/tags/'));

  assert.deepEqual(tagPages, [
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls', lang: 'es' },
    { url: '/notes/tags/libros/', prompt: '~/notes/tags/libros $ ls', lang: 'es', title: 'Un libro al mes' },
  ]);
});

test('lists a non-ASCII slug as the build names its folder', async () => {
  const dir = await fakeFolder({
    'notes/año.md': '---\ntitle: Año\ndate: 2026-10-02\ntags: [año]\n---\n',
    'tags.yml': 'año:\n  name: Año\n',
  });

  const pages = (await readExpectedPages(dir, 'es')).filter(({ url }) => url.includes('año'));

  assert.deepEqual(pages, [
    { url: '/notes/año/', prompt: '~/notes $ cat año', lang: 'es', contentLang: 'es', tags: [{ name: 'Año', url: '/notes/tags/año/' }] },
    { url: '/notes/tags/año/', prompt: '~/notes/tags/año $ ls', lang: 'es', title: 'Año' },
  ]);
});
