import { readContent } from './content.ts';

// Every page the content says the build should have, worked out here from src/content rather than
// through the site's code, so the built-site tests have their own expectations to check the build against.

/** A page the build should have: its URL, as the build names its folder, and the prompt it shows. */
export type ExpectedPage = { url: string; prompt: string };

/** Every expected page, in URL order: the home page, the Notes and Tags listings, each Note, each Tag that has Notes, and each Side Project. */
export async function readExpectedPages(contentDir: string): Promise<ExpectedPage[]> {
  const { notes, sideProjects } = await readContent(contentDir);
  // A Tag with no Notes gets no page.
  const tagIds = new Set(notes.flatMap((note) => note.tags.map(({ id }) => id)));
  const pages: ExpectedPage[] = [
    { url: '/', prompt: '~ $ whoami' },
    { url: '/notes/', prompt: '~/notes $ ls' },
    ...notes.map(({ id }) => ({ url: `/notes/${id}/`, prompt: `~/notes $ cat ${id}` })),
    { url: '/notes/tags/', prompt: '~/notes/tags $ ls' },
    ...[...tagIds].map((id) => ({ url: `/notes/tags/${id}/`, prompt: `~/notes/tags/${id} $ ls` })),
    ...sideProjects.map(({ id }) => ({ url: `/side-projects/${id}/`, prompt: `~/side-projects $ cat ${id}` })),
  ];
  return pages.sort((a, b) => (a.url < b.url ? -1 : 1));
}
