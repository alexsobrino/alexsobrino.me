import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { parse } from 'yaml';

// What src/content says the built site should show, read straight from the files rather than
// through Astro, so the built-site tests have their own expectations to check the build against.

export type ContentNote = { id: string; date: Date; tags: string[]; lang: string };
export type ContentSideProject = { id: string; lang: string };
export type Content = { notes: ContentNote[]; sideProjects: ContentSideProject[] };

// The Content language a piece has when its frontmatter doesn't say, as in src/content.config.ts.
const defaultLang = 'es';

/** Every Note, with its Tags as names in the order it lists them, and every Side Project. */
export async function readContent(contentDir: string): Promise<Content> {
  const tagNames = new Map(
    Object.entries((parse(await readFile(join(contentDir, 'tags.yml'), 'utf8')) ?? {}) as Record<string, { name: string }>).map(
      ([id, tag]) => [id, tag.name],
    ),
  );
  const notes = (await markdownFiles(join(contentDir, 'notes'))).map(({ id, data }) => ({
    id,
    date: noteDate(id, data.date),
    tags: ((data.tags ?? []) as string[]).map((tag) => {
      const name = tagNames.get(tag);
      if (name === undefined) throw new Error(`Note "${id}" has Tag "${tag}", which is not declared in tags.yml`);
      return name;
    }),
    lang: (data.lang as string | undefined) ?? defaultLang,
  }));
  const sideProjects = (await markdownFiles(join(contentDir, 'side-projects'))).map(({ id, data }) => ({
    id,
    lang: (data.lang as string | undefined) ?? defaultLang,
  }));
  return { notes, sideProjects };
}

/** A Note's date, as Astro reads it; a date that is not one fails rather than passing every check. */
function noteDate(id: string, value: unknown): Date {
  const date = new Date(value as string | Date);
  if (Number.isNaN(date.valueOf())) throw new Error(`Note "${id}" has date "${value}", which is not a date`);
  return date;
}

/** The Markdown files in a collection folder, each with its slug and frontmatter. */
async function markdownFiles(dir: string): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  return Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map(async (entry) => {
        const file = join(entry.parentPath, entry.name);
        const frontmatter = (await readFile(file, 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
        // Astro's glob loader names an entry after its path: `notes/reto.md` is the Note `reto`.
        const id = relative(dir, file).split(sep).join('/').replace(/\.md$/, '');
        // YAML timestamps as dates, so one with no offset is UTC, as Astro reads it.
        return { id, data: (parse(frontmatter, { customTags: ['timestamp'] }) ?? {}) as Record<string, unknown> };
      }),
  );
}
