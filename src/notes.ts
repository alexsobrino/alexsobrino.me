import { getCollection, type CollectionEntry } from 'astro:content';
import { siteLanguage } from './site-language';

// Everything the site knows about presenting a Note: where it lives, its order and its date.

export type Note = CollectionEntry<'notes'>;

export function noteUrl(note: Note) {
  return `/notes/${note.id}/`;
}

// Static paths for the Note pages; they must produce the URLs noteUrl() links to.
export async function getNotePaths() {
  const notes = await getCollection('notes');
  return notes.map((note) => ({ params: { id: note.id }, props: { note } }));
}

export async function getNotesNewestFirst() {
  const notes = await getCollection('notes');
  return notes.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatDate(date: Date) {
  return date.toLocaleDateString(siteLanguage, { day: 'numeric', month: 'short', year: 'numeric' });
}
