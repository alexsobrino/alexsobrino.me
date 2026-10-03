import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { findBrokenLinks } from './built-site.ts';

const site = 'https://alexsobrino.me';

/** Writes a fake build: each key is a path inside the build folder. */
async function fakeBuild(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'built-site-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  return dir;
}

test('reports a link to a page that is not built, naming the page and the link', async () => {
  const dir = await fakeBuild({
    'index.html': '<a href="/notes/missing/">Missing</a>',
  });

  assert.deepEqual(await findBrokenLinks(dir, site), [
    { page: '/', link: '/notes/missing/' },
  ]);
});

test('accepts links to built pages and files', async () => {
  const dir = await fakeBuild({
    'index.html': '<a href="/notes/">Notes</a><a href="/rss.xml">RSS</a><link rel="stylesheet" href="/_astro/site.css">',
    'notes/index.html': '<a href="/">Home</a>',
    'rss.xml': '<rss></rss>',
    '_astro/site.css': 'body {}',
  });

  assert.deepEqual(await findBrokenLinks(dir, site), []);
});

test('skips external links but checks absolute links to the site itself', async () => {
  const dir = await fakeBuild({
    'index.html': [
      '<a href="https://github.com/alexsobrino">GitHub</a>',
      '<a href="//cdn.example.com/lib.js">CDN</a>',
      '<a href="mailto:hola@alexsobrino.me">Email</a>',
      '<link rel="canonical" href="https://alexsobrino.me/">',
      '<link rel="canonical" href="https://alexsobrino.me/gone/">',
    ].join(''),
  });

  assert.deepEqual(await findBrokenLinks(dir, site), [
    { page: '/', link: 'https://alexsobrino.me/gone/' },
  ]);
});

test('checks asset references in src and srcset', async () => {
  const dir = await fakeBuild({
    'index.html': [
      '<img src="/_astro/photo.webp" srcset="/_astro/photo.webp 1x, /_astro/photo@2x.webp 2x">',
      '<script type="module" src="/_astro/gone.js"></script>',
      '<picture><source srcset="/_astro/small.avif 208w,/_astro/large.avif 416w"></picture>',
    ].join(''),
    '_astro/photo.webp': '',
    '_astro/small.avif': '',
  });

  assert.deepEqual(await findBrokenLinks(dir, site), [
    { page: '/', link: '/_astro/photo@2x.webp' },
    { page: '/', link: '/_astro/gone.js' },
    { page: '/', link: '/_astro/large.avif' },
  ]);
});

test('resolves relative links, fragments, queries and non-ASCII slugs like a browser', async () => {
  const dir = await fakeBuild({
    'notes/index.html': [
      '<a href="#top">Top</a>',
      '<a href="reto/">Reto</a>',
      '<a href="../rss.xml?v=2">RSS</a>',
      '<a href="/notes/año/#intro">Año</a>',
      '<a href="/notes/ca%C3%B1a/">Caña</a>',
      '<a href="otro/">Otro</a>',
    ].join(''),
    'notes/reto/index.html': '',
    'notes/año/index.html': '',
    'notes/caña/index.html': '',
    'rss.xml': '',
  });

  assert.deepEqual(await findBrokenLinks(dir, site), [
    { page: '/notes/', link: 'otro/' },
  ]);
});
