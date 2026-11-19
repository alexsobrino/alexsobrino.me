import { readdir, readFile } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';

/**
 * The built site, read once and handed to every check: each page parsed, by URL in URL order so
 * problems come out in a stable order; the path of every file the build serves; and the RSS feed's
 * text, if the build has one.
 */
export type Build = { pages: Map<string, HTMLElement>; files: Set<string>; feed: string | undefined };

/** Reads and parses the build in this folder. */
export async function readBuild(buildDir: string): Promise<Build> {
  const entries = await readdir(buildDir, { recursive: true, withFileTypes: true });
  // Each file by the path it is served at: `notes/index.html` is `/notes/index.html`.
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => '/' + relative(buildDir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
  const pages = await Promise.all(
    files
      .filter((file) => file.endsWith('.html'))
      .map(async (file) => [pageUrl(file), parse(await readFile(join(buildDir, file), 'utf8'))] as const),
  );
  const feed = files.includes('/rss.xml') ? await readFile(join(buildDir, 'rss.xml'), 'utf8') : undefined;
  return { pages: new Map(pages.sort(([a], [b]) => (a < b ? -1 : 1))), files: new Set(files), feed };
}

/** The URL a built file is served at: `/notes/index.html` is `/notes/`. */
function pageUrl(file: string): string {
  return file.replace(/(^|\/)index\.html$/, '$1');
}

/** Whether the build serves something at this path: a file, or a folder's `index.html`. */
export function isBuilt(build: Build, pathname: string): boolean {
  const path = posix.normalize(pathname);
  return build.files.has(path) || build.files.has(posix.join(path, 'index.html'));
}

export type BrokenLink = { page: string; link: string };

/** Every internal link on every built page that points to nothing in the build. */
export function findBrokenLinks(build: Build, site: string): BrokenLink[] {
  const origin = new URL(site).origin;
  const broken: BrokenLink[] = [];
  for (const [page, html] of build.pages) {
    for (const link of html.querySelectorAll('[href], [src], [srcset]').flatMap(references)) {
      const url = new URL(link, new URL(page, site));
      if (url.origin !== origin) continue;
      if (!isBuilt(build, decodeURIComponent(url.pathname))) broken.push({ page, link });
    }
  }
  return broken;
}

/** The links and asset references an element makes, in attribute order. */
function references(element: HTMLElement): string[] {
  const href = element.getAttribute('href');
  const src = element.getAttribute('src');
  const srcset = element.getAttribute('srcset');
  return [
    ...(href === undefined ? [] : [href]),
    ...(src === undefined ? [] : [src]),
    // "a.webp 1x, b.webp 2x": each candidate is a URL, then an optional descriptor.
    ...(srcset === undefined ? [] : srcset.split(',').map((candidate) => candidate.trim().split(/\s+/)[0])),
  ];
}
