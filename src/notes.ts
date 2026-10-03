import { getCollection, type CollectionEntry } from 'astro:content';
import { siteLanguage } from './site-language';

// Everything the site knows about presenting a Note and its Tags: where each lives, a Note's order
// and date, and which Notes a Tag gathers.

export type Tag = CollectionEntry<'tags'>;

// A Note as the site hands it out: with its Tags resolved, in the order it lists them.
// Use `tags`, not `data.tags`, which only refers to them by slug.
export type Note = CollectionEntry<'notes'> & { tags: Tag[] };

export function noteUrl(note: Note) {
  return `/notes/${note.id}/`;
}

export function tagUrl(tag: Tag) {
  return `/notes/tags/${tag.id}/`;
}

// Every Note with its Tags. Astro only logs a slug with no declared Tag, so this throws to fail
// the build instead, whichever page asks for the Notes.
async function getNotes(): Promise<Note[]> {
  const [notes, tags] = await Promise.all([getCollection('notes'), getCollection('tags')]);
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  return notes.map((note) => ({
    ...note,
    tags: note.data.tags.map(({ id }) => {
      const tag = tagsById.get(id);
      if (!tag) throw new Error(`Note "${note.id}" has Tag "${id}", which is not declared in src/content/tags.yml`);
      return tag;
    }),
  }));
}

// Static paths for the Note pages; they must produce the URLs noteUrl() links to.
export async function getNotePaths() {
  const notes = await getNotes();
  return notes.map((note) => ({ params: { id: note.id }, props: { note } }));
}

export async function getNotesNewestFirst() {
  const notes = await getNotes();
  return notes.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// Static paths for the Tag pages; they must produce the URLs tagUrl() links to.
// Each lists its Notes newest first, and a Tag with no Notes gets no page.
export async function getTagPaths() {
  const notes = await getNotesNewestFirst();
  // Notes share one object per Tag, so a Set gathers each Tag once.
  const tags = new Set(notes.flatMap((note) => note.tags));
  return [...tags].map((tag) => ({
    params: { id: tag.id },
    props: { tag, notes: notes.filter((note) => note.tags.includes(tag)) },
  }));
}

export function formatDate(date: Date) {
  return date.toLocaleDateString(siteLanguage, { day: 'numeric', month: 'short', year: 'numeric' });
}
