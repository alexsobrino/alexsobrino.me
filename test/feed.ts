import { XMLParser } from 'fast-xml-parser';
import { isBuilt, type Build } from './built-site.ts';
import type { ExpectedNote, ExpectedPage } from './expected-pages.ts';

export type FeedProblem = { item: string; message: string };

type FeedItem = { link?: string; category?: string[] };

// Items and their categories as arrays even when there is only one; values kept as text, so a
// category like "2026" stays a string.
const parser = new XMLParser({
  parseTagValue: false,
  isArray: (_name, jPath) => jPath === 'rss.channel.item' || jPath === 'rss.channel.item.category',
});

/** A Note page the feed should carry an item for: where it is, its Note, and its Tags by name, in the Note's order. */
type NotePage = { url: string; note: ExpectedNote; tagNames: string[] };

/** Everything wrong with the built RSS feed, checked against the expected Note pages it should link to. */
export function findFeedProblems(build: Build, site: string, expected: ExpectedPage[]): FeedProblem[] {
  const origin = new URL(site).origin;
  if (build.feed === undefined) return [{ item: 'feed', message: 'rss.xml is not in the build' }];
  const channel = parser.parse(build.feed).rss?.channel;
  if (channel === undefined) return [{ item: 'feed', message: 'rss.xml is not RSS: it has no <rss><channel>' }];

  const problems: FeedProblem[] = [];
  const notePages: NotePage[] = expected.flatMap(({ url, note, tags = [] }) =>
    note === undefined ? [] : [{ url, note, tagNames: tags.map(({ name }) => name) }],
  );
  const notePagesByUrl = new Map(notePages.map((page) => [page.url, page]));
  // Which item carries each Note, and the last item that carried one, to check the order.
  const itemOfNote = new Map<string, number>();
  let previous: { position: number; note: ExpectedNote } | undefined;

  for (const [index, { link = '', category = [] }] of ((channel.item ?? []) as FeedItem[]).entries()) {
    const position = index + 1;
    const report = (message: string) => problems.push({ item: `item ${position} (${link})`, message });

    // A relative link is resolved against the site, so the rest of the item can still be checked.
    const url = new URL(link, site);
    if (!URL.canParse(link)) report(`link is relative, expected an absolute URL on ${origin}`);
    else if (url.origin !== origin) report(`link is not on ${origin}`);
    else if (!isBuilt(build, decodeURIComponent(url.pathname))) report(`links to ${url.pathname}, which is not built`);

    const page = notePagesByUrl.get(decodeURIComponent(url.pathname));
    if (page === undefined) {
      report(`links to ${url.pathname}, which is no Note`);
      continue;
    }
    const { note, tagNames } = page;
    if (itemOfNote.has(note.id)) {
      report(`is a second item for Note "${note.id}", after item ${itemOfNote.get(note.id)}`);
      continue;
    }
    itemOfNote.set(note.id, position);

    if (previous && note.date > previous.note.date) {
      report(`is newer (${day(note.date)}) than item ${previous.position} (${day(previous.note.date)}), expected newest first`);
    }
    previous = { position, note };

    if (JSON.stringify(category) !== JSON.stringify(tagNames)) {
      report(`categories are ${JSON.stringify(category)}, expected ${JSON.stringify(tagNames)}`);
    }
  }

  for (const { note } of notePages) {
    if (!itemOfNote.has(note.id)) problems.push({ item: 'feed', message: `has no item for Note "${note.id}"` });
  }
  return problems;
}

/** A date as YYYY-MM-DD. */
function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}
