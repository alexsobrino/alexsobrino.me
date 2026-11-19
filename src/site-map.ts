// The site map: each kind of place on the site, and for each its URL, whether its prompt lists
// (`ls`) or shows a file (`cat`), and its parent, which the page links back to.
// Pages and links ask it where a place is instead of typing URLs out, so they can't drift apart.

export type InnerPageCommand = 'ls' | 'cat';

// A link back to a place: where it goes and how it reads.
export type BackLink = { href: string; label: string };

// Where a page sits on the site: its URL, what its prompt reads, and its link back to its parent.
export type Place = {
  url: string;
  prompt: { path: string; command: string };
  back: BackLink;
};

// The parent of a Note, which a Note page links back to.
const notesListing: BackLink = { href: '/notes/', label: 'notas' };

// A Note, by its slug: a file in the Notes listing, linking back to it.
export function notePlace(note: { id: string }): Place {
  const url = `${notesListing.href}${note.id}/`;
  return { url, prompt: promptAt(url, 'cat'), back: notesListing };
}

// What an inner page's prompt reads, worked out from its URL so the two can't drift apart.
// An `ls` page is a folder and lists itself; a `cat` page is a file shown from the folder above it.
function promptAt(url: string, command: InnerPageCommand) {
  const segments = url.split('/').filter(Boolean);
  if (command === 'ls') return { path: `/${segments.join('/')}`, command };
  const file = segments.pop();
  return { path: `/${segments.join('/')}`, command: `cat ${file}` };
}

// The prompt of an inner page not yet in the site map, from the page's own (percent-encoded) URL.
export function innerPagePrompt(pathname: string, command: InnerPageCommand) {
  return promptAt(decodeURIComponent(pathname), command);
}
