import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import config from '../astro.config.mjs';
import { siteLanguage } from '../src/site-language.ts';
import { findBrokenLinks } from './built-site.ts';
import { readContent, type Content } from './content.ts';
import { findFeedProblems } from './feed.ts';
import { findLanguageProblems, findNoteTagProblems, findPromptProblems, findTagListProblems, type PageProblem } from './pages.ts';

// The built site, as `npm run build` leaves it, and the content it was built from.
const buildDir = fileURLToPath(new URL('../dist/', import.meta.url));
const contentDir = fileURLToPath(new URL('../src/content/', import.meta.url));
let content: Content;

before(async () => {
  assert.ok(existsSync(buildDir), `No build at ${buildDir}: run \`npm run build\` first.`);
  content = await readContent(contentDir);
});

test('every internal link and asset reference points to something in the build', async () => {
  const broken = await findBrokenLinks(buildDir, config.site!);

  assert.deepEqual(
    broken,
    [],
    `Broken internal links:\n${broken.map(({ page, link }) => `  on ${page}: ${link}`).join('\n')}`,
  );
});

test('every inner page has the prompt its URL says it should', async () => {
  const problems = await findPromptProblems(buildDir);

  assert.deepEqual(problems, [], `Wrong prompts:\n${listed(problems)}`);
});

test('every page is in the site language, and every Note and Side Project in its own Content language', async () => {
  const problems = await findLanguageProblems(buildDir, siteLanguage, content);

  assert.deepEqual(problems, [], `Wrong languages:\n${listed(problems)}`);
});

test("every Note page shows its Tags after the date, in the Note's order, each linking to its Tag page", async () => {
  const problems = await findNoteTagProblems(buildDir, content.notes);

  assert.deepEqual(problems, [], `Wrong Tags on Note pages:\n${listed(problems)}`);
});

test('the Tags listing shows every Tag that has Notes, by name, with its Note count and a link to its page', async () => {
  const problems = await findTagListProblems(buildDir, siteLanguage, content.notes);

  assert.deepEqual(problems, [], `Tags listing problems:\n${listed(problems)}`);
});

test('the RSS feed carries one item per Note, newest first, linking to its page with its Tags', async () => {
  const problems = await findFeedProblems(buildDir, config.site!, content.notes);

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
