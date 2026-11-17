import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readExpectedPages } from './expected-pages.ts';
import { fakeFolder } from './fake-folder.ts';

test('lists the home page, the Notes and Tags listings, each Note, each Tag with Notes and each Side Project, with their prompts', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02\ntags: [un-libro-al-mes]\n---\n',
    'notes/hola.md': '---\ntitle: Hola\ndate: 2026-09-01\n---\n',
    'side-projects/sub9bar.md': '---\nname: Sub9bar\n---\n',
    'tags.yml': 'un-libro-al-mes:\n  name: Un libro al mes\n',
  });

  assert.deepEqual(await readExpectedPages(dir), [
    { url: '/', prompt: '~ $ whoami' },
    { url: '/notes/', prompt: '~/notes $ ls' },
    { url: '/notes/hola/', prompt: '~/notes $ cat hola' },
    { url: '/notes/reto/', prompt: '~/notes $ cat reto' },
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls' },
    { url: '/notes/tags/un-libro-al-mes/', prompt: '~/notes/tags/un-libro-al-mes $ ls' },
    { url: '/side-projects/sub9bar/', prompt: '~/side-projects $ cat sub9bar' },
  ]);
});

test('gives a Tag with no Notes no page, and a Tag with several Notes one page', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02\ntags: [libros]\n---\n',
    'notes/otro.md': '---\ntitle: Otro\ndate: 2026-10-03\ntags: [libros]\n---\n',
    'tags.yml': 'libros:\n  name: Un libro al mes\nsin-notas:\n  name: Sin notas\n',
  });

  const tagPages = (await readExpectedPages(dir)).filter(({ url }) => url.startsWith('/notes/tags/'));

  assert.deepEqual(tagPages, [
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls' },
    { url: '/notes/tags/libros/', prompt: '~/notes/tags/libros $ ls' },
  ]);
});

test('lists a non-ASCII slug as the build names its folder', async () => {
  const dir = await fakeFolder({
    'notes/año.md': '---\ntitle: Año\ndate: 2026-10-02\ntags: [año]\n---\n',
    'tags.yml': 'año:\n  name: Año\n',
  });

  const pages = (await readExpectedPages(dir)).filter(({ url }) => url.includes('año'));

  assert.deepEqual(pages, [
    { url: '/notes/año/', prompt: '~/notes $ cat año' },
    { url: '/notes/tags/año/', prompt: '~/notes/tags/año $ ls' },
  ]);
});
