import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';
import { htmlFiles, pageUrl } from './built-site.ts';
import type { Content } from './content.ts';

export type PageProblem = { page: string; message: string };

/** An inner page, as its URL says it should be: its prompt, and the Note or Side Project it shows. */
type InnerPage = { prompt: string; piece?: { kind: 'Note' | 'Side Project'; id: string } };

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
    const actual = prompt.text.replace(/\s+/g, ' ').trim();
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
  const tag = page.match(/^\/notes\/tags\/([^/]+)\/$/)?.[1];
  if (tag !== undefined) return { prompt: `~/notes/tags/${tag} $ ls` };
  const note = page.match(/^\/notes\/([^/]+)\/$/)?.[1];
  if (note !== undefined) return { prompt: `~/notes $ cat ${note}`, piece: { kind: 'Note', id: note } };
  const sideProject = page.match(/^\/side-projects\/([^/]+)\/$/)?.[1];
  if (sideProject !== undefined) {
    return { prompt: `~/side-projects $ cat ${sideProject}`, piece: { kind: 'Side Project', id: sideProject } };
  }
}
