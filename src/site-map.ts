// The site map: each kind of place on the site, and for each its URL, whether its prompt lists
// (`ls`) or shows a file (`cat`), and its parent, which the page links back to.
// Pages and links ask it where a place is instead of typing URLs out, so they can't drift apart.

export type InnerPageCommand = 'ls' | 'cat';

/** Where a page sits on the site: its URL, what its prompt reads, and its link back to its parent. */
export type Place = {
  url: string;
  prompt: { path: string; command: string };
  back: { href: string; label: string };
};

/** A place another place can link back to: its URL and how the back link to it reads. */
type Parent = { url: string; label: string };

const notesListing: Parent = { url: '/notes/', label: 'notas' };

/** A Note, by its slug: a file in the Notes listing, linking back to it. */
export function notePlace(note: { id: string }): Place {
  return place(`${notesListing.url}${note.id}/`, 'cat', notesListing);
}

function place(url: string, command: InnerPageCommand, parent: Parent): Place {
  return { url, prompt: innerPagePrompt(url, command), back: { href: parent.url, label: parent.label } };
}

// What an inner page's prompt reads, worked out from its URL so the two can't drift apart.
// An `ls` page is a folder and lists itself; a `cat` page is a file shown from the folder above it.
// Exported for the inner pages not yet in the site map, which work it out from their own URL.
export function innerPagePrompt(pathname: string, command: InnerPageCommand) {
  const segments = decodeURIComponent(pathname).split('/').filter(Boolean);
  if (command === 'ls') return { path: `/${segments.join('/')}`, command };
  const file = segments.pop();
  return { path: `/${segments.join('/')}`, command: `cat ${file}` };
}
