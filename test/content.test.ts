import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readContent } from './content.ts';
import { fakeFolder } from './fake-folder.ts';

test('reads each Note by slug with its date, Tags in its own order and Content language', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': "---\ntitle: 'Reto'\ndate: 2026-10-02\ntags: [libros, retos]\nlang: en\n---\n\nTexto.",
    'notes/hola.md': '---\ntitle: Hola\ndate: 2026-09-01\n---\n\nTexto.',
    'tags.yml': '# Tags\nretos:\n  name: Retos\nlibros:\n  name: Un libro al mes\n',
  });

  const { notes } = await readContent(dir);

  assert.deepEqual(
    notes.sort((a, b) => a.id.localeCompare(b.id)),
    [
      { id: 'hola', date: new Date('2026-09-01T00:00:00Z'), tags: [], lang: 'es' },
      { id: 'reto', date: new Date('2026-10-02T00:00:00Z'), tags: ['Un libro al mes', 'Retos'], lang: 'en' },
    ],
  );
});

test('reads each Side Project by slug with its Content language, Spanish unless it says otherwise', async () => {
  const dir = await fakeFolder({
    'side-projects/sub9bar.md': '---\nname: Sub9bar\nimage: ./sub9bar.png\n---\n\nTexto.',
    'side-projects/other.md': '---\nname: Other\nlang: en\n---\n\nText.',
    'side-projects/sub9bar.png': '',
    'tags.yml': '',
  });

  const { sideProjects } = await readContent(dir);

  assert.deepEqual(
    sideProjects.sort((a, b) => a.id.localeCompare(b.id)),
    [
      { id: 'other', lang: 'en' },
      { id: 'sub9bar', lang: 'es' },
    ],
  );
});

test('reads a Note date and time with no offset as UTC, like Astro', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02T10:00:00\n---\n',
    'tags.yml': '',
  });

  const { notes } = await readContent(dir);

  assert.deepEqual(notes[0].date, new Date('2026-10-02T10:00:00Z'));
});

test('fails on a Note with a date that is not a date, naming the Note', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: someday\n---\n',
    'tags.yml': '',
  });

  await assert.rejects(readContent(dir), /"reto".*"someday"/);
});

test('fails on a Note listing an undeclared Tag, naming the Note and the Tag', async () => {
  const dir = await fakeFolder({
    'notes/reto.md': '---\ntitle: Reto\ndate: 2026-10-02\ntags: [missing]\n---\n',
    'tags.yml': 'libros:\n  name: Un libro al mes\n',
  });

  await assert.rejects(readContent(dir), /"reto".*"missing"/);
});
