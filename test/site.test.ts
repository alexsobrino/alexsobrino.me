import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';
import { siteLanguage } from '../src/site-language.ts';
import { findBrokenLinks, readBuild, type Build } from './built-site.ts';
import { readExpectedPages, type ExpectedPage } from './expected-pages.ts';
import { findFeedProblems } from './feed.ts';
import {
  findDocumentTitleProblems,
  findExtraPages,
  findLanguageProblems,
  findMissingPages,
  findNoteListProblems,
  findNoteTagProblems,
  findPromptProblems,
  findTagHeadingProblems,
  findTagListProblems,
  type PageProblem,
} from './pages.ts';

// The built site, as `npm run build` leaves it, and the content it was built from.
const buildDir = fileURLToPath(new URL('../dist/', import.meta.url));
const contentDir = fileURLToPath(new URL('../src/content/', import.meta.url));
let expectedPages: ExpectedPage[];
let build: Build;

before(async () => {
  assert.ok(existsSync(buildDir), `No build at ${buildDir}: run \`npm run build\` first.`);
  expectedPages = await readExpectedPages(contentDir, siteLanguage);
  build = await readBuild(buildDir);
});

test('every internal link and asset reference points to something in the build', () => {
  const broken = findBrokenLinks(build, config.site!);

  assert.deepEqual(
    broken,
    [],
    `Broken internal links:\n${broken.map(({ page, link }) => `  on ${page}: ${link}`).join('\n')}`,
  );
});

test('every page the content calls for is in the build', () => {
  const problems = findMissingPages(expectedPages, build);

  assert.deepEqual(problems, [], `Missing pages:\n${listed(problems)}`);
});

test('every page in the build is one the content calls for', () => {
  const problems = findExtraPages(expectedPages, build);

  assert.deepEqual(problems, [], `Extra pages:\n${listed(problems)}`);
});

test('every expected page has the prompt it should', () => {
  const problems = findPromptProblems(expectedPages, build);

  assert.deepEqual(problems, [], `Wrong prompts:\n${listed(problems)}`);
});

test('every expected page is in the site language, and every Note and Side Project in its own Content language', () => {
  const problems = findLanguageProblems(expectedPages, build);

  assert.deepEqual(problems, [], `Wrong languages:\n${listed(problems)}`);
});

test("every Note page shows its Tags after the date, in the Note's order, each linking to its Tag page", () => {
  const problems = findNoteTagProblems(expectedPages, build);

  assert.deepEqual(problems, [], `Wrong Tags on Note pages:\n${listed(problems)}`);
});

test('the Notes listing lists every Note, and each Tag page its Notes, newest first, each linking to its page', () => {
  const problems = findNoteListProblems(expectedPages, build);

  assert.deepEqual(problems, [], `Wrong Notes in listings:\n${listed(problems)}`);
});

test('the Tags listing shows every Tag that has Notes, by name, with its Note count and a link to its page', () => {
  const problems = findTagListProblems(expectedPages, build);

  assert.deepEqual(problems, [], `Tags listing problems:\n${listed(problems)}`);
});

test("every Tag page is headed with its Tag's name", () => {
  const problems = findTagHeadingProblems(expectedPages, build);

  assert.deepEqual(problems, [], `Wrong Tag page headings:\n${listed(problems)}`);
});

test("every page's document title is its name then the site's, or the site's alone on the home page", () => {
  const problems = findDocumentTitleProblems(expectedPages, build);

  assert.deepEqual(problems, [], `Wrong document titles:\n${listed(problems)}`);
});

test('the RSS feed carries one item per Note, newest first, linking to its page with its Tags', () => {
  const problems = findFeedProblems(build, config.site!, expectedPages);

  assert.deepEqual(
    problems,
    [],
    `RSS feed problems:\n${problems.map(({ item, message }) => `  ${item}: ${message}`).join('\n')}`,
  );
});

/** One line per problem, naming its page. */
function listed(problems: PageProblem[]): string {
  return problems.map(({ page, message }) => `  on ${page}: ${message}`).join('\n');
}
