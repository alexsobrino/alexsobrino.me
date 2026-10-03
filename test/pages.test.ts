import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import type { Content } from './content.ts';
import { findLanguageProblems, findPromptProblems } from './pages.ts';

/** Writes a fake build: each key is a path inside the build folder. */
async function fakeBuild(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pages-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  return dir;
}

/** A prompt line as PromptBar renders it: `~/notes $` is the sign, `ls` the command. */
function prompt(sign: string, command: string): string {
  return `<div class="intro__bar"><p class="prompt" aria-hidden="true"><span class="prompt__sign">${sign}</span> ${command}</p></div>`;
}

const siteLanguage = 'es';
const content: Content = {
  notes: [{ id: 'reto', date: new Date('2026-10-02'), tags: ['Un libro al mes'], lang: 'en' }],
  sideProjects: [{ id: 'sub9bar', lang: 'es' }],
};

test('accepts inner pages whose prompt reads as their URL says, and skips other pages', async () => {
  const dir = await fakeBuild({
    'index.html': prompt('~ $', 'whoami'),
    '404.html': '<h1>No encontrado</h1>',
    'notes/index.html': prompt('~/notes $', 'ls'),
    'notes/reto/index.html': prompt('~/notes $', 'cat reto'),
    'notes/tags/un-libro-al-mes/index.html': prompt('~/notes/tags/un-libro-al-mes $', 'ls'),
    'side-projects/sub9bar/index.html': prompt('~/side-projects $', 'cat sub9bar'),
  });

  assert.deepEqual(await findPromptProblems(dir), []);
});

test('reports a prompt that does not read as its URL says, naming the page', async () => {
  const dir = await fakeBuild({
    'notes/reto/index.html': prompt('~/notes $', 'cat otro'),
    'notes/tags/un-libro-al-mes/index.html': prompt('~/notes $', 'ls'),
  });

  assert.deepEqual(await findPromptProblems(dir), [
    { page: '/notes/reto/', message: 'prompt reads "~/notes $ cat otro", expected "~/notes $ cat reto"' },
    {
      page: '/notes/tags/un-libro-al-mes/',
      message: 'prompt reads "~/notes $ ls", expected "~/notes/tags/un-libro-al-mes $ ls"',
    },
  ]);
});

test('reports an inner page with no prompt', async () => {
  const dir = await fakeBuild({
    'side-projects/sub9bar/index.html': '<h1>sub9bar</h1>',
  });

  assert.deepEqual(await findPromptProblems(dir), [
    { page: '/side-projects/sub9bar/', message: 'no prompt, expected "~/side-projects $ cat sub9bar"' },
  ]);
});

test('accepts pages in the site language, with each Note and Side Project in its own Content language', async () => {
  const dir = await fakeBuild({
    'index.html': '<html lang="es"><body></body></html>',
    'notes/index.html': '<html lang="es"><body></body></html>',
    'notes/reto/index.html': '<html lang="es"><body><article lang="en"></article></body></html>',
    'notes/tags/un-libro-al-mes/index.html': '<html lang="es"><body></body></html>',
    'side-projects/sub9bar/index.html': '<html lang="es"><body><article lang="es"></article></body></html>',
  });

  assert.deepEqual(await findLanguageProblems(dir, siteLanguage, content), []);
});

test('reports a page whose <html lang> is missing or not the site language', async () => {
  const dir = await fakeBuild({
    'index.html': '<html lang="en"><body></body></html>',
    'notes/index.html': '<html><body></body></html>',
  });

  assert.deepEqual(await findLanguageProblems(dir, siteLanguage, content), [
    { page: '/', message: '<html> has lang "en", expected "es"' },
    { page: '/notes/', message: '<html> has no lang, expected "es"' },
  ]);
});

test('reports a Note or Side Project whose <article lang> is missing or not its Content language', async () => {
  const dir = await fakeBuild({
    'notes/reto/index.html': '<html lang="es"><body><article></article></body></html>',
    'side-projects/sub9bar/index.html': '<html lang="es"><body><article lang="en"></article></body></html>',
  });

  assert.deepEqual(await findLanguageProblems(dir, siteLanguage, content), [
    { page: '/notes/reto/', message: '<article> has no lang, expected "en"' },
    { page: '/side-projects/sub9bar/', message: '<article> has lang "en", expected "es"' },
  ]);
});

test('reports a Note or Side Project page with no <article>, or with no such piece in the content', async () => {
  const dir = await fakeBuild({
    'notes/reto/index.html': '<html lang="es"><body></body></html>',
    'notes/otro/index.html': '<html lang="es"><body><article lang="es"></article></body></html>',
    'side-projects/otro/index.html': '<html lang="es"><body><article lang="es"></article></body></html>',
  });

  assert.deepEqual(await findLanguageProblems(dir, siteLanguage, content), [
    { page: '/notes/otro/', message: 'no Note "otro" in the content' },
    { page: '/notes/reto/', message: 'no <article>, expected one with lang "en"' },
    { page: '/side-projects/otro/', message: 'no Side Project "otro" in the content' },
  ]);
});
