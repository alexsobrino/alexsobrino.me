import assert from 'node:assert/strict';
import { test } from 'node:test';
import { innerPagePrompt } from '../src/inner-page.ts';

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
