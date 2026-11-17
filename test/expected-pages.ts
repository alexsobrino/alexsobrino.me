import { readContent } from './content.ts';

// Every page the content says the build should have, worked out here from src/content rather than
// through the site's code, so the built-site tests have their own expectations to check the build against.

/** A Tag as a Note page shows it: its name, linking to its Tag page. */
export type ExpectedTag = { name: string; url: string };

/** A page the build should have: its URL, as the build names its folder, and the prompt it shows; a Note page also its Tags, in the Note's order, and a Tag page its title. */
export type ExpectedPage = { url: string; prompt: string; tags?: ExpectedTag[]; title?: string };

/** Every expected page, in URL order: the home page, the Notes and Tags listings, each Note, each Tag that has Notes, and each Side Project. */
export async function readExpectedPages(contentDir: string): Promise<ExpectedPage[]> {
  const { notes, sideProjects } = await readContent(contentDir);
  // A Tag with no Notes gets no page.
  const tagNamesById = new Map(notes.flatMap((note) => note.tags.map(({ id, name }) => [id, name])));
  const pages: ExpectedPage[] = [
    { url: '/', prompt: '~ $ whoami' },
    { url: '/notes/', prompt: '~/notes $ ls' },
    ...notes.map(({ id, tags }) => ({
      url: `/notes/${id}/`,
      prompt: `~/notes $ cat ${id}`,
      tags: tags.map(({ id, name }) => ({ name, url: tagPageUrl(id) })),
    })),
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls' },
    ...[...tagNamesById].map(([id, name]) => ({ url: tagPageUrl(id), prompt: `~/notes/tags/${id} $ ls`, title: name })),
    ...sideProjects.map(({ id }) => ({ url: `/side-projects/${id}/`, prompt: `~/side-projects $ cat ${id}` })),
  ];
  return pages.sort((a, b) => (a.url < b.url ? -1 : 1));
}

/** A Tag's page, /notes/tags/<id>/. */
function tagPageUrl(id: string): string {
  return `/notes/tags/${id}/`;
}
