import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** Writes a fake folder, such as a build or src/content, to a temp dir: each key is a path inside it. */
export async function fakeFolder(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'built-site-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  return dir;
}
