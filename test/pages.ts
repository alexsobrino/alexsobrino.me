import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parse, type HTMLElement } from 'node-html-parser';
import { htmlFiles, pageUrl } from './built-site.ts';
import type { Content, ContentNote } from './content.ts';

export type PageProblem = { page: string; message: string };

/** An inner page, as its URL says it should be: its prompt, and the Note or Side Project it shows. */
type InnerPage = { prompt: string; piece?: { kind: 'Note' | 'Side Project'; id: string } };

/** A Tag page's URL, /notes/tags/<id>/. */
const tagPageUrl = /^\/notes\/tags\/([^/]+)\/$/;

/** Every inner page whose prompt is missing or doesn't read as its URL says it should. */
export async function findPromptProblems(buildDir: string): Promise<PageProblem[]> {
  const problems: PageProblem[] = [];
  for (const { page, html } of await builtPages(buildDir)) {
    const expected = innerPage(page)?.prompt;
    if (expected === undefined) continue;
    const prompt = html.querySelector('.prompt');
    if (prompt === null) {
      problems.push({ page, message: `no prompt, expected "${expected}"` });
      continue;
    }
    const actual = textOf(prompt);
    if (actual !== expected) {
      problems.push({ page, message: `prompt reads "${actual}", expected "${expected}"` });
    }
  }
  return problems;
}

/** Every page whose <html lang> isn't the site language, and every Note or Side Project page whose <article lang> isn't that piece's Content language. */
export async function findLanguageProblems(buildDir: string, siteLanguage: string, content: Content): Promise<PageProblem[]> {
  const problems: PageProblem[] = [];
  for (const { page, html } of await builtPages(buildDir)) {
    const htmlProblem = langProblem('<html>', html.querySelector('html'), siteLanguage);
    if (htmlProblem !== undefined) problems.push({ page, message: htmlProblem });

    const piece = innerPage(page)?.piece;
    if (piece === undefined) continue;
    const pieces = piece.kind === 'Note' ? content.notes : content.sideProjects;
    const expected = pieces.find(({ id }) => id === piece.id)?.lang;
    if (expected === undefined) {
      problems.push({ page, message: `no ${piece.kind} "${piece.id}" in the content` });
      continue;
    }
    const articleProblem = langProblem('<article>', html.querySelector('article'), expected);
    if (articleProblem !== undefined) problems.push({ page, message: articleProblem });
  }
  return problems;
}

/** Every Note page whose meta line doesn't show the date then the Note's Tags in its order, each linking to its Tag page. */
export async function findNoteTagProblems(buildDir: string, notes: ContentNote[]): Promise<PageProblem[]> {
  const problems: PageProblem[] = [];
  const pages = await builtPages(buildDir);
  const tagPages = tagPageTitles(pages);
  for (const { page, html } of pages) {
    const piece = innerPage(page)?.piece;
    if (piece?.kind !== 'Note') continue;
    const note = notes.find(({ id }) => id === piece.id);
    if (note === undefined) {
      problems.push({ page, message: `no Note "${piece.id}" in the content` });
      continue;
    }
    const meta = html.querySelector('.page-meta');
    if (meta === null) {
      problems.push({ page, message: `no meta line, expected the date then ${describeTags(note.tags)}` });
      continue;
    }
    const actual = textOf(meta);
    const expected = [textOf(meta.querySelector('time')), ...note.tags].join(' · ');
    if (actual !== expected) {
      problems.push({ page, message: `meta line reads "${actual}", expected "${expected}"` });
      continue;
    }
    const links = meta.querySelectorAll('a');
    const linked = links.map(textOf);
    if (!isDeepStrictEqual(linked, note.tags)) {
      problems.push({ page, message: `meta line links to ${describeTags(linked)}, expected ${describeTags(note.tags)}` });
      continue;
    }
    for (const link of links) {
      const name = textOf(link);
      const href = decodeURIComponent(link.getAttribute('href') ?? '');
      const title = tagPages.get(href);
      if (title === undefined) problems.push({ page, message: `Tag "${name}" links to ${href}, which is no Tag page` });
      else if (title !== name) problems.push({ page, message: `Tag "${name}" links to ${href}, the Tag page of "${title}"` });
    }
  }
  return problems;
}

/** Everything wrong with the Tags listing, checked against the Notes: it should list every Tag that has Notes, by name, each with its Note count and linking to its Tag page. */
export async function findTagListProblems(buildDir: string, siteLanguage: string, notes: ContentNote[]): Promise<PageProblem[]> {
  const page = '/notes/tags/';
  const pages = await builtPages(buildDir);
  const html = pages.find((built) => built.page === page)?.html;
  if (html === undefined) return [{ page, message: 'is not in the build' }];

  // A Note counts once for each Tag it lists.
  const counts = new Map<string, number>();
  for (const name of notes.flatMap((note) => [...new Set(note.tags)])) counts.set(name, (counts.get(name) ?? 0) + 1);
  const expected = [...counts]
    .sort(([a], [b]) => a.localeCompare(b, siteLanguage))
    .map(([name, count]) => `${name} · ${count}`);

  const problems: PageProblem[] = [];
  const tagPages = tagPageTitles(pages);
  const items = html.querySelectorAll('main li');
  const listed = items.map(textOf);
  if (!isDeepStrictEqual(listed, expected)) {
    problems.push({ page, message: `lists ${JSON.stringify(listed)}, expected ${JSON.stringify(expected)}` });
  }
  for (const item of items) {
    const link = item.querySelector('a');
    if (link === null) {
      problems.push({ page, message: `"${textOf(item)}" has no link` });
      continue;
    }
    const name = textOf(link);
    const href = decodeURIComponent(link.getAttribute('href') ?? '');
    if (tagPages.get(href) !== name) {
      problems.push({ page, message: `"${name}" links to ${href}, which is not its Tag page` });
    }
  }
  return problems;
}

/** Each Tag page's title by its URL, to check a Tag links to its own page. */
function tagPageTitles(pages: { page: string; html: HTMLElement }[]): Map<string, string> {
  return new Map(
    pages.filter(({ page }) => tagPageUrl.test(page)).map(({ page, html }) => [page, textOf(html.querySelector('.page-title'))]),
  );
}

/** Tag names as a problem names them: `Tags "A", "B"`, or `no Tags`. */
function describeTags(names: string[]): string {
  return names.length === 0 ? 'no Tags' : `Tags ${names.map((name) => `"${name}"`).join(', ')}`;
}

/** An element's text as it reads, whitespace collapsed; empty for no element. */
function textOf(element: HTMLElement | null): string {
  return element?.text.replace(/\s+/g, ' ').trim() ?? '';
}

/** What's wrong with an element's lang, if anything. */
function langProblem(name: string, element: HTMLElement | null, expected: string): string | undefined {
  if (element === null) return `no ${name}, expected one with lang "${expected}"`;
  const lang = element.getAttribute('lang');
  if (lang === undefined) return `${name} has no lang, expected "${expected}"`;
  if (lang !== expected) return `${name} has lang "${lang}", expected "${expected}"`;
}

/** Every built page, parsed, in URL order so problems come out in a stable order. */
async function builtPages(buildDir: string): Promise<{ page: string; html: HTMLElement }[]> {
  const pages = await Promise.all(
    (await htmlFiles(buildDir)).map(async (file) => ({
      page: pageUrl(relative(buildDir, file)),
      html: parse(await readFile(file, 'utf8')),
    })),
  );
  return pages.sort((a, b) => (a.page < b.page ? -1 : 1));
}

/** What an inner page should be, from its URL; nothing for other pages, like the home page or 404. */
function innerPage(page: string): InnerPage | undefined {
  if (page === '/notes/') return { prompt: '~/notes $ ls' };
  if (page === '/notes/tags/') return { prompt: '~/notes/tags $ ls' };
  const tag = page.match(tagPageUrl)?.[1];
  if (tag !== undefined) return { prompt: `~/notes/tags/${tag} $ ls` };
  const note = page.match(/^\/notes\/([^/]+)\/$/)?.[1];
  if (note !== undefined) return { prompt: `~/notes $ cat ${note}`, piece: { kind: 'Note', id: note } };
  const sideProject = page.match(/^\/side-projects\/([^/]+)\/$/)?.[1];
  if (sideProject !== undefined) {
    return { prompt: `~/side-projects $ cat ${sideProject}`, piece: { kind: 'Side Project', id: sideProject } };
  }
}
