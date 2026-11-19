import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { parse, type HTMLElement } from 'node-html-parser';
import { htmlFiles, pageUrl } from './built-site.ts';
import { tagNames, type ContentNote } from './content.ts';
import type { ExpectedPage } from './expected-pages.ts';

export type PageProblem = { page: string; message: string };

/** The built site's pages, each parsed, by URL in URL order: read once and handed to the checks. */
export type Build = Map<string, HTMLElement>;

/** Every expected page that is not in the build. */
export function findMissingPages(expected: ExpectedPage[], build: Build): PageProblem[] {
  return expected.filter(({ url }) => !build.has(url)).map(({ url }) => ({ page: url, message: 'is not in the build' }));
}

/** Every built page that no expected page accounts for, such as a stale Tag page or a Note page under a slug the content doesn't have. */
export function findExtraPages(expected: ExpectedPage[], build: Build): PageProblem[] {
  const expectedUrls = new Set(expected.map(({ url }) => url));
  return [...build.keys()]
    .filter((page) => !expectedUrls.has(page))
    .map((page) => ({ page, message: 'is in the build, but the content calls for no such page' }));
}

/** A Tag page's URL, /notes/tags/<id>/. */
const tagPageUrl = /^\/notes\/tags\/([^/]+)\/$/;

/** Every expected page in the build whose prompt is missing or doesn't read as expected. A page not in the build is left to findMissingPages. */
export function findPromptProblems(expected: ExpectedPage[], build: Build): PageProblem[] {
  const problems: PageProblem[] = [];
  for (const { url: page, prompt: expectedPrompt } of expected) {
    const html = build.get(page);
    if (html === undefined) continue;
    const prompt = html.querySelector('.prompt');
    if (prompt === null) {
      problems.push({ page, message: `no prompt, expected "${expectedPrompt}"` });
      continue;
    }
    const actual = textOf(prompt);
    if (actual !== expectedPrompt) {
      problems.push({ page, message: `prompt reads "${actual}", expected "${expectedPrompt}"` });
    }
  }
  return problems;
}

/** Every expected page in the build whose <html lang> isn't its site language, and every Note or Side Project page whose <article lang> isn't that piece's Content language. A page not in the build is left to findMissingPages. */
export function findLanguageProblems(expected: ExpectedPage[], build: Build): PageProblem[] {
  const problems: PageProblem[] = [];
  for (const { url: page, siteLang, contentLang } of expected) {
    const html = build.get(page);
    if (html === undefined) continue;
    const htmlProblem = langProblem('<html>', html.querySelector('html'), siteLang);
    if (htmlProblem !== undefined) problems.push({ page, message: htmlProblem });
    if (contentLang === undefined) continue;
    const articleProblem = langProblem('<article>', html.querySelector('article'), contentLang);
    if (articleProblem !== undefined) problems.push({ page, message: articleProblem });
  }
  return problems;
}

/** Every expected Note page in the build whose meta line doesn't show the date then the Note's Tags in its order, each linking to its Tag page. A page not in the build is left to findMissingPages. */
export function findNoteTagProblems(expected: ExpectedPage[], build: Build): PageProblem[] {
  const problems: PageProblem[] = [];
  for (const { url: page, tags } of expected) {
    const html = build.get(page);
    if (tags === undefined || html === undefined) continue;
    const names = tags.map(({ name }) => name);
    const meta = html.querySelector('.page-meta');
    if (meta === null) {
      problems.push({ page, message: `no meta line, expected the date then ${describeTags(names)}` });
      continue;
    }
    const actual = textOf(meta);
    const expectedMeta = [textOf(meta.querySelector('time')), ...names].join(' · ');
    if (actual !== expectedMeta) {
      problems.push({ page, message: `meta line reads "${actual}", expected "${expectedMeta}"` });
      continue;
    }
    const links = meta.querySelectorAll('a');
    const linked = links.map(textOf);
    if (!isDeepStrictEqual(linked, names)) {
      problems.push({ page, message: `meta line links to ${describeTags(linked)}, expected ${describeTags(names)}` });
      continue;
    }
    // The links read as the Tags, in order, so each link is the Tag at its place.
    for (const [i, link] of links.entries()) {
      const { name, url } = tags[i];
      const href = decodeURIComponent(link.getAttribute('href') ?? '');
      if (href === url) continue;
      const title = expected.find((other) => other.url === href)?.title;
      if (title === undefined) problems.push({ page, message: `Tag "${name}" links to ${href}, which is no Tag page` });
      else problems.push({ page, message: `Tag "${name}" links to ${href}, the Tag page of "${title}"` });
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
  for (const name of notes.flatMap((note) => [...new Set(tagNames(note))])) counts.set(name, (counts.get(name) ?? 0) + 1);
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

/** Reads and parses every built page, in URL order so problems come out in a stable order. */
export async function readBuild(buildDir: string): Promise<Build> {
  const pages = await Promise.all(
    (await htmlFiles(buildDir)).map(async (file) => [pageUrl(relative(buildDir, file)), parse(await readFile(file, 'utf8'))] as const),
  );
  return new Map(pages.sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** Every built page, parsed, in URL order. */
async function builtPages(buildDir: string): Promise<{ page: string; html: HTMLElement }[]> {
  return [...(await readBuild(buildDir))].map(([page, html]) => ({ page, html }));
}
