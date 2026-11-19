import { readContent } from './content.ts';

// Every page the content says the build should have, worked out here from src/content rather than
// through the site's code, so the built-site tests have their own expectations to check the build against.

/** A Tag as a Note page shows it: its name, linking to its Tag page. */
export type ExpectedTag = { name: string; url: string };

/** A page the build should have: its URL, as the build names its folder, the prompt it shows and its <html lang>, the site language; a Note or Side Project page also its <article lang>, that piece's Content language, a Note page its Tags, in the Note's order, and a Tag page its title. */
export type ExpectedPage = { url: string; prompt: string; lang: string; contentLang?: string; tags?: ExpectedTag[]; title?: string };

/** Every expected page, in URL order: the home page, the Notes and Tags listings, each Note, each Tag that has Notes, and each Side Project. */
export async function readExpectedPages(contentDir: string, siteLanguage: string): Promise<ExpectedPage[]> {
  const { notes, sideProjects } = await readContent(contentDir);
  // A Tag with no Notes gets no page.
  const tagNamesById = new Map(notes.flatMap((note) => note.tags.map(({ id, name }) => [id, name])));
  const lang = siteLanguage;
  const pages: ExpectedPage[] = [
    { url: '/', prompt: '~ $ whoami', lang },
    { url: '/notes/', prompt: '~/notes $ ls', lang },
    ...notes.map(({ id, tags, lang: contentLang }) => ({
      url: `/notes/${id}/`,
      prompt: `~/notes $ cat ${id}`,
      lang,
      contentLang,
      tags: tags.map(({ id, name }) => ({ name, url: tagPageUrl(id) })),
    })),
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls', lang },
    ...[...tagNamesById].map(([id, name]) => ({ url: tagPageUrl(id), prompt: `~/notes/tags/${id} $ ls`, lang, title: name })),
    ...sideProjects.map(({ id, lang: contentLang }) => ({
      url: `/side-projects/${id}/`,
      prompt: `~/side-projects $ cat ${id}`,
      lang,
      contentLang,
    })),
  ];
  return pages.sort((a, b) => (a.url < b.url ? -1 : 1));
}

/** A Tag's page, /notes/tags/<id>/. */
function tagPageUrl(id: string): string {
  return `/notes/tags/${id}/`;
}
