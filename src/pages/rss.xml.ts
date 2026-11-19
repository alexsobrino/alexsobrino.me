import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNotesNewestFirst } from '../notes';
import { notePlace } from '../site-map';

export async function GET(context: APIContext) {
  const notes = await getNotesNewestFirst();
  return rss({
    title: 'Notas · Alex Sobrino',
    description: 'Notas de Alex Sobrino',
    site: context.site!,
    items: notes.map((note) => ({
      title: note.data.title,
      pubDate: note.data.date,
      description: note.data.description,
      link: notePlace(note).url,
      categories: note.tags.map((tag) => tag.data.name),
    })),
  });
}
