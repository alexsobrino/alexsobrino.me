import { readContent } from './content.ts';

// Every page the content says the build should have, worked out here from src/content rather than
// through the site's code, so the built-site tests have their own expectations to check the build against.

/** A Tag as a Note page shows it: its name, linking to its Tag page. */
export type ExpectedTag = { name: string; url: string };

/** A Tag as the Tags listing shows it: its name, linking to its Tag page, and how many Notes it gathers. */
export type ExpectedTagRow = ExpectedTag & { noteCount: number };

/** The Note a Note page shows: its slug and date. */
export type ExpectedNote = { id: string; date: Date };

/** A page the build should have: its URL, as the build names its folder, its prompt and its site language; a Note or Side Project page also its Content language, a Note page its Tags, in the Note's order, and its Note, a Tag page its title, and the Tags listing its rows. */
export type ExpectedPage = {
  url: string;
  prompt: string;
  siteLang: string;
  contentLang?: string;
  tags?: ExpectedTag[];
  note?: ExpectedNote;
  title?: string;
  tagRows?: ExpectedTagRow[];
};

/** Every expected page, in URL order: the home page, the Notes and Tags listings, each Note, each Tag that has Notes, and each Side Project. */
export async function readExpectedPages(contentDir: string, siteLang: string): Promise<ExpectedPage[]> {
  const { notes, sideProjects } = await readContent(contentDir);
  // A Tag with no Notes gets no page.
  const tagNamesById = new Map(notes.flatMap((note) => note.tags.map(({ id, name }) => [id, name])));
  // A Note counts once for each Tag it lists, so every Tag in tagNamesById has a count.
  const noteCounts = new Map<string, number>();
  for (const note of notes) {
    for (const id of new Set(note.tags.map(({ id }) => id))) noteCounts.set(id, (noteCounts.get(id) ?? 0) + 1);
  }
  const tagRows = [...tagNamesById]
    .map(([id, name]) => ({ name, noteCount: noteCounts.get(id)!, url: tagPageUrl(id) }))
    .sort((a, b) => a.name.localeCompare(b.name, siteLang));
  const pages: ExpectedPage[] = [
    { url: '/', prompt: '~ $ whoami', siteLang },
    { url: '/notes/', prompt: '~/notes $ ls', siteLang },
    ...notes.map(({ id, date, tags, lang: contentLang }) => ({
      url: `/notes/${id}/`,
      prompt: `~/notes $ cat ${id}`,
      siteLang,
      contentLang,
      tags: tags.map(({ id, name }) => ({ name, url: tagPageUrl(id) })),
      note: { id, date },
    })),
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls', siteLang, tagRows },
    ...[...tagNamesById].map(([id, name]) => ({ url: tagPageUrl(id), prompt: `~/notes/tags/${id} $ ls`, siteLang, title: name })),
    ...sideProjects.map(({ id, lang: contentLang }) => ({
      url: `/side-projects/${id}/`,
      prompt: `~/side-projects $ cat ${id}`,
      siteLang,
      contentLang,
    })),
  ];
  return pages.sort((a, b) => (a.url < b.url ? -1 : 1));
}

/** A Tag's page, /notes/tags/<id>/. */
function tagPageUrl(id: string): string {
  return `/notes/tags/${id}/`;
}
