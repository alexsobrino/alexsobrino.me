import { getCollection, type CollectionEntry } from 'astro:content';
import { getNotesNewestFirst, type Note } from './notes';

// Everything the site knows about presenting a Tag: which Notes it gathers and which Tags get a page.

export type Tag = CollectionEntry<'tags'>;

// A Note's Tags, in the order it lists them. Astro only logs a slug with no declared Tag,
// so this throws to fail the build instead.
export async function getNoteTags(note: Note) {
  const tags = await getCollection('tags');
  return note.data.tags.map(({ id }) => {
    const tag = tags.find((t) => t.id === id);
    if (!tag) throw new Error(`Note "${note.id}" has Tag "${id}", which is not declared in src/content/tags.yml`);
    return tag;
  });
}

// Static paths for the Tag pages at /notes/tags/<slug>/. A Tag with no Notes gets no page.
export async function getTagPaths() {
  const [tags, notes] = await Promise.all([getCollection('tags'), getNotesNewestFirst()]);
  // Resolving every Note's Tags is what fails the build on an undeclared slug.
  await Promise.all(notes.map(getNoteTags));
  return tags
    .map((tag) => ({ tag, notes: notes.filter((note) => note.data.tags.some(({ id }) => id === tag.id)) }))
    .filter(({ notes }) => notes.length > 0)
    .map(({ tag, notes }) => ({ params: { id: tag.id }, props: { tag, notes } }));
}
