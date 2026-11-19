import { readContent } from './content.ts';

// Every page the content says the build should have, worked out here from src/content rather than
// through the site's code, so the built-site tests have their own expectations to check the build against.

/** A Tag as a Note page shows it: its name, linking to its Tag page. */
export type ExpectedTag = { name: string; url: string };

/** A Tag as the Tags listing shows it: its name, linking to its Tag page, and how many Notes it gathers. */
export type ExpectedTagRow = ExpectedTag & { noteCount: number };

/** The Note a Note page shows: its slug and date. */
export type ExpectedNote = { id: string; date: Date };

/** A Note as a listing of Notes shows it: its slug and date, linking to its page. */
export type ExpectedListedNote = ExpectedNote & { url: string };

/** A page the build should have: its URL, as the build names its folder, its prompt, its site language and its document title. A Note or Side Project page also has its Content language; a Note page its Note and that Note's Tags, in the Note's order; a Tag page its title; the Tags listing its rows; and the Notes listing and each Tag page the Notes they list, newest first. */
export type ExpectedPage = {
  url: string;
  prompt: string;
  siteLang: string;
  documentTitle: string;
  contentLang?: string;
  tags?: ExpectedTag[];
  note?: ExpectedNote;
  title?: string;
  tagRows?: ExpectedTagRow[];
  listedNotes?: ExpectedListedNote[];
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
  // Newest first, as every listing of Notes shows them.
  const notesNewestFirst = notes
    .map(({ id, date, tags }) => ({ note: { id, date, url: notePageUrl(id) }, tagIds: new Set(tags.map(({ id }) => id)) }))
    .sort((a, b) => b.note.date.valueOf() - a.note.date.valueOf());
  const tagRows = [...tagNamesById]
    .map(([id, name]) => ({ name, noteCount: noteCounts.get(id)!, url: tagPageUrl(id) }))
    .sort((a, b) => a.name.localeCompare(b.name, siteLang));
  const pages: ExpectedPage[] = [
    { url: '/', prompt: '~ $ whoami', siteLang, documentTitle: siteName },
    {
      url: '/notes/',
      prompt: '~/notes $ ls',
      siteLang,
      documentTitle: documentTitle('Notas'),
      listedNotes: notesNewestFirst.map(({ note }) => note),
    },
    ...notes.map(({ id, title, date, tags, lang: contentLang }) => ({
      url: notePageUrl(id),
      prompt: `~/notes $ cat ${id}`,
      siteLang,
      documentTitle: documentTitle(title),
      contentLang,
      tags: tags.map(({ id, name }) => ({ name, url: tagPageUrl(id) })),
      note: { id, date },
    })),
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls', siteLang, documentTitle: documentTitle('Etiquetas'), tagRows },
    ...[...tagNamesById].map(([id, name]) => ({
      url: tagPageUrl(id),
      prompt: `~/notes/tags/${id} $ ls`,
      siteLang,
      documentTitle: documentTitle(name),
      title: name,
      listedNotes: notesNewestFirst.filter(({ tagIds }) => tagIds.has(id)).map(({ note }) => note),
    })),
    ...sideProjects.map(({ id, name, lang: contentLang }) => ({
      url: `/side-projects/${id}/`,
      prompt: `~/side-projects $ cat ${id}`,
      siteLang,
      documentTitle: documentTitle(name),
      contentLang,
    })),
  ];
  return pages.sort((a, b) => (a.url < b.url ? -1 : 1));
}

// The site's name: the home page's whole document title, and every other page's after its own name.
const siteName = 'Alex Sobrino';

/** An inner page's document title: its name, then the site's. */
function documentTitle(name: string): string {
  return `${name} · ${siteName}`;
}

/** A Note's page, /notes/<id>/. */
function notePageUrl(id: string): string {
  return `/notes/${id}/`;
}

/** A Tag's page, /notes/tags/<id>/. */
function tagPageUrl(id: string): string {
  return `/notes/tags/${id}/`;
}
