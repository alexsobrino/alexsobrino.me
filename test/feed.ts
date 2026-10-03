import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { isBuilt } from './built-site.ts';
import type { ContentNote } from './content.ts';

export type FeedProblem = { item: string; message: string };

type FeedItem = { link?: string; category?: string[] };

// Items and their categories as arrays even when there is only one; values kept as text, so a
// category like "2026" stays a string.
const parser = new XMLParser({
  parseTagValue: false,
  isArray: (_name, jPath) => jPath === 'rss.channel.item' || jPath === 'rss.channel.item.category',
});

/** Everything wrong with the built RSS feed, checked against the Notes it should carry. */
export async function findFeedProblems(buildDir: string, site: string, notes: ContentNote[]): Promise<FeedProblem[]> {
  const origin = new URL(site).origin;
  const xml = await readFile(join(buildDir, 'rss.xml'), 'utf8').catch(() => undefined);
  if (xml === undefined) return [{ item: 'feed', message: 'rss.xml is not in the build' }];
  const channel = parser.parse(xml).rss?.channel;
  if (channel === undefined) return [{ item: 'feed', message: 'rss.xml is not RSS: it has no <rss><channel>' }];

  const problems: FeedProblem[] = [];
  const notesById = new Map(notes.map((note) => [note.id, note]));
  // Which item carries each Note, and the last item that carried one, to check the order.
  const itemOfNote = new Map<string, number>();
  let previous: { position: number; note: ContentNote } | undefined;

  for (const [index, { link = '', category = [] }] of ((channel.item ?? []) as FeedItem[]).entries()) {
    const position = index + 1;
    const report = (message: string) => problems.push({ item: `item ${position} (${link})`, message });

    // A relative link is resolved against the site, so the rest of the item can still be checked.
    const url = new URL(link, site);
    if (!URL.canParse(link)) report(`link is relative, expected an absolute URL on ${origin}`);
    else if (url.origin !== origin) report(`link is not on ${origin}`);
    else if (!(await isBuilt(buildDir, decodeURIComponent(url.pathname)))) {
      report(`links to ${url.pathname}, which is not built`);
    }

    // A Note's page is at /notes/<id>/.
    const id = decodeURIComponent(url.pathname).match(/^\/notes\/(.+)\/$/)?.[1];
    const note = id === undefined ? undefined : notesById.get(id);
    if (note === undefined) {
      report(`links to ${url.pathname}, which is no Note`);
      continue;
    }
    if (itemOfNote.has(note.id)) {
      report(`is a second item for Note "${note.id}", after item ${itemOfNote.get(note.id)}`);
      continue;
    }
    itemOfNote.set(note.id, position);

    if (previous && note.date > previous.note.date) {
      report(`is newer (${day(note.date)}) than item ${previous.position} (${day(previous.note.date)}), expected newest first`);
    }
    previous = { position, note };

    if (JSON.stringify(category) !== JSON.stringify(note.tags)) {
      report(`categories are ${JSON.stringify(category)}, expected ${JSON.stringify(note.tags)}`);
    }
  }

  for (const note of notes) {
    if (!itemOfNote.has(note.id)) problems.push({ item: 'feed', message: `has no item for Note "${note.id}"` });
  }
  return problems;
}

/** A date as YYYY-MM-DD. */
function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}
