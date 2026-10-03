import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';

export type BrokenLink = { page: string; link: string };

/** Every internal link on every built page that points to nothing in the build. */
export async function findBrokenLinks(buildDir: string, site: string): Promise<BrokenLink[]> {
  const origin = new URL(site).origin;
  const broken: BrokenLink[] = [];
  for (const file of await htmlFiles(buildDir)) {
    const page = pageUrl(relative(buildDir, file));
    const html = parse(await readFile(file, 'utf8'));
    for (const link of html.querySelectorAll('[href], [src], [srcset]').flatMap(references)) {
      const url = new URL(link, new URL(page, site));
      if (url.origin !== origin) continue;
      if (!(await isBuilt(buildDir, decodeURIComponent(url.pathname)))) {
        broken.push({ page, link });
      }
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

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));
}

/** The URL a built file is served at: `notes/index.html` is `/notes/`. */
function pageUrl(file: string): string {
  return '/' + file.split(sep).join('/').replace(/(^|\/)index\.html$/, '$1');
}

/** Whether the build serves something at this path: a file, or a folder's `index.html`. */
async function isBuilt(buildDir: string, pathname: string): Promise<boolean> {
  const path = join(buildDir, pathname);
  return (await isFile(path)) || (await isFile(join(path, 'index.html')));
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}
