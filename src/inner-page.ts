// What an inner page's prompt reads, worked out from its URL so the two can't drift apart.
// An `ls` page is a folder and lists itself; a `cat` page is a file shown from the folder above it.

export type InnerPageCommand = 'ls' | 'cat';

export function innerPagePrompt(pathname: string, command: InnerPageCommand) {
  const segments = decodeURIComponent(pathname).split('/').filter(Boolean);
  if (command === 'ls') return { path: `/${segments.join('/')}`, command };
  const file = segments.pop();
  return { path: `/${segments.join('/')}`, command: `cat ${file}` };
}
