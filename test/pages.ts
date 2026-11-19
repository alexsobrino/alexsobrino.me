import { isDeepStrictEqual } from 'node:util';
import type { HTMLElement } from 'node-html-parser';
import type { Build } from './built-site.ts';
import type { ExpectedPage } from './expected-pages.ts';

export type PageProblem = { page: string; message: string };

/** Every expected page that is not in the build. */
export function findMissingPages(expected: ExpectedPage[], build: Build): PageProblem[] {
  return expected.filter(({ url }) => !build.pages.has(url)).map(({ url }) => ({ page: url, message: 'is not in the build' }));
}

/** Every built page that no expected page accounts for, such as a stale Tag page or a Note page under a slug the content doesn't have. */
export function findExtraPages(expected: ExpectedPage[], build: Build): PageProblem[] {
  const expectedUrls = new Set(expected.map(({ url }) => url));
  return [...build.pages.keys()]
    .filter((page) => !expectedUrls.has(page))
    .map((page) => ({ page, message: 'is in the build, but the content calls for no such page' }));
}

/** Every expected page in the build whose prompt is missing or doesn't read as expected. A page not in the build is left to findMissingPages. */
export function findPromptProblems(expected: ExpectedPage[], build: Build): PageProblem[] {
  return findTextProblems(expected, build, 'prompt', '.prompt', ({ prompt }) => prompt);
}

/** Every expected page in the build whose <html lang> isn't its site language, and every Note or Side Project page whose <article lang> isn't that piece's Content language. A page not in the build is left to findMissingPages. */
export function findLanguageProblems(expected: ExpectedPage[], build: Build): PageProblem[] {
  const problems: PageProblem[] = [];
  for (const { url: page, siteLang, contentLang } of expected) {
    const html = build.pages.get(page);
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
    const html = build.pages.get(page);
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

/** Everything wrong with the expected Tags listing: it should list its rows by name, in order, each with its Note count and linking to its Tag page. */
export function findTagListProblems(expected: ExpectedPage[], build: Build): PageProblem[] {
  const problems: PageProblem[] = [];
  for (const { url: page, tagRows: rows } of expected) {
    if (rows === undefined) continue;
    const html = build.pages.get(page);
    if (html === undefined) {
      problems.push({ page, message: 'is not in the build' });
      continue;
    }
    const items = html.querySelectorAll('main li');
    const listed = items.map(textOf);
    const expectedItems = rows.map(({ name, noteCount }) => `${name} · ${noteCount}`);
    if (!isDeepStrictEqual(listed, expectedItems)) {
      problems.push({ page, message: `lists ${JSON.stringify(listed)}, expected ${JSON.stringify(expectedItems)}` });
    }
    for (const item of items) {
      const link = item.querySelector('a');
      if (link === null) {
        problems.push({ page, message: `"${textOf(item)}" has no link` });
        continue;
      }
      const name = textOf(link);
      const href = decodeURIComponent(link.getAttribute('href') ?? '');
      // A Tag that shouldn't be listed at all is already reported above.
      const row = rows.find((row) => row.name === name);
      if (row !== undefined && href !== row.url) {
        problems.push({ page, message: `"${name}" links to ${href}, which is not its Tag page` });
      }
    }
  }
  return problems;
}

/** Every expected Tag page in the build whose title is missing or isn't its Tag's name. A page not in the build is left to findMissingPages. */
export function findTagTitleProblems(expected: ExpectedPage[], build: Build): PageProblem[] {
  return findTextProblems(expected, build, 'title', '.page-title', ({ title }) => title);
}

/** Every expected page in the build whose document title, its `<title>` in the head, is missing or doesn't read as expected. A page not in the build is left to findMissingPages. */
export function findDocumentTitleProblems(expected: ExpectedPage[], build: Build): PageProblem[] {
  return findTextProblems(expected, build, 'document title', 'head > title', ({ documentTitle }) => documentTitle);
}

/** Every expected page in the build where the element at this selector is missing or doesn't read as the page expects. A page that expects nothing of it, or is not in the build, is skipped. */
function findTextProblems(
  expected: ExpectedPage[],
  build: Build,
  name: string,
  selector: string,
  expectedText: (page: ExpectedPage) => string | undefined,
): PageProblem[] {
  const problems: PageProblem[] = [];
  for (const expectedPage of expected) {
    const text = expectedText(expectedPage);
    const html = build.pages.get(expectedPage.url);
    if (text === undefined || html === undefined) continue;
    const problem = textProblem(name, html.querySelector(selector), text);
    if (problem !== undefined) problems.push({ page: expectedPage.url, message: problem });
  }
  return problems;
}

/** Tag names as a problem names them: `Tags "A", "B"`, or `no Tags`. */
function describeTags(names: string[]): string {
  return names.length === 0 ? 'no Tags' : `Tags ${names.map((name) => `"${name}"`).join(', ')}`;
}

/** An element's text as it reads, whitespace collapsed; empty for no element. */
function textOf(element: HTMLElement | null): string {
  return element?.text.replace(/\s+/g, ' ').trim() ?? '';
}

/** What's wrong with an element whose text should read as expected, such as a page's prompt, if anything. */
function textProblem(name: string, element: HTMLElement | null, expected: string): string | undefined {
  if (element === null) return `no ${name}, expected "${expected}"`;
  const actual = textOf(element);
  if (actual !== expected) return `${name} reads "${actual}", expected "${expected}"`;
}

/** What's wrong with an element's lang, if anything. */
function langProblem(name: string, element: HTMLElement | null, expected: string): string | undefined {
  if (element === null) return `no ${name}, expected one with lang "${expected}"`;
  const lang = element.getAttribute('lang');
  if (lang === undefined) return `${name} has no lang, expected "${expected}"`;
  if (lang !== expected) return `${name} has lang "${lang}", expected "${expected}"`;
}
