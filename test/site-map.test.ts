import assert from 'node:assert/strict';
import { test } from 'node:test';
import { innerPagePrompt, notePlace } from '../src/site-map.ts';

test('a Note is a file in the Notes listing, and links back to it', () => {
  assert.deepEqual(notePlace({ id: 'reto-1-libro-al-mes' }), {
    url: '/notes/reto-1-libro-al-mes/',
    prompt: { path: '/notes', command: 'cat reto-1-libro-al-mes' },
    back: { href: '/notes/', label: 'notas' },
  });
});

test('a Note keeps its slug as written in its URL and prompt', () => {
  const place = notePlace({ id: 'año' });
  assert.equal(place.url, '/notes/año/');
  assert.deepEqual(place.prompt, { path: '/notes', command: 'cat año' });
  assert.deepEqual(notePlace({ id: '100%-real' }).prompt, { path: '/notes', command: 'cat 100%-real' });
});

test('ls lists the folder the page is at', () => {
  assert.deepEqual(innerPagePrompt('/notes/', 'ls'), { path: '/notes', command: 'ls' });
  assert.deepEqual(innerPagePrompt('/notes/tags/un-libro-al-mes/', 'ls'), {
    path: '/notes/tags/un-libro-al-mes',
    command: 'ls',
  });
});

test('cat shows the page as a file in the folder above it', () => {
  assert.deepEqual(innerPagePrompt('/notes/reto-1-libro-al-mes/', 'cat'), {
    path: '/notes',
    command: 'cat reto-1-libro-al-mes',
  });
  assert.deepEqual(innerPagePrompt('/side-projects/sub9bar/', 'cat'), { path: '/side-projects', command: 'cat sub9bar' });
});

test('reads the URL without its trailing slash or encoding', () => {
  assert.deepEqual(innerPagePrompt('/notes/a%C3%B1o', 'cat'), { path: '/notes', command: 'cat año' });
  assert.deepEqual(innerPagePrompt('/notes/tags/a%C3%B1o', 'ls'), { path: '/notes/tags/año', command: 'ls' });
});
