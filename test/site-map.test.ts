import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notePlace, notesListingPlace, sideProjectPlace, tagPlace, tagsListingPlace } from '../src/site-map.ts';

test('the Notes listing lists its folder, and links back to the home page', () => {
  assert.deepEqual(notesListingPlace, {
    url: '/notes/',
    prompt: { path: '/notes', command: 'ls' },
    back: { href: '/', label: 'inicio' },
  });
});

test('the Tags listing lists its folder in the Notes listing, and links back to the Notes listing', () => {
  assert.deepEqual(tagsListingPlace, {
    url: '/notes/tags/',
    prompt: { path: '/notes/tags', command: 'ls' },
    back: { href: '/notes/', label: 'notas' },
  });
});

test('a Tag is a folder in the Tags listing, but links back to the Notes listing', () => {
  assert.deepEqual(tagPlace({ id: 'un-libro-al-mes' }), {
    url: '/notes/tags/un-libro-al-mes/',
    prompt: { path: '/notes/tags/un-libro-al-mes', command: 'ls' },
    back: { href: '/notes/', label: 'notas' },
  });
});

test('a Tag keeps its slug as written in its URL and prompt', () => {
  const place = tagPlace({ id: 'año' });
  assert.equal(place.url, '/notes/tags/año/');
  assert.deepEqual(place.prompt, { path: '/notes/tags/año', command: 'ls' });
});

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

test('a Side Project is a file in the Side Projects folder, and links back to the home page', () => {
  assert.deepEqual(sideProjectPlace({ id: 'sub9bar' }), {
    url: '/side-projects/sub9bar/',
    prompt: { path: '/side-projects', command: 'cat sub9bar' },
    back: { href: '/', label: 'inicio' },
  });
});

test('a Side Project keeps its slug as written in its URL and prompt', () => {
  const place = sideProjectPlace({ id: 'año' });
  assert.equal(place.url, '/side-projects/año/');
  assert.deepEqual(place.prompt, { path: '/side-projects', command: 'cat año' });
});
