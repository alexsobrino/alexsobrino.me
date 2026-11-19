// The site map: each kind of place on the site, and for each its URL, whether its prompt lists
// (`ls`) or shows a file (`cat`), and its parent, which the page links back to.
// Pages and links ask it where a place is instead of typing URLs out, so they can't drift apart.

type InnerPageCommand = 'ls' | 'cat';

// A link back to a place: where it goes and how it reads.
type BackLink = { href: string; label: string };

// Where a page sits on the site: its URL, what its prompt reads, and its link back to its parent.
export type Place = {
  url: string;
  prompt: { path: string; command: string };
  back: BackLink;
};

const home: BackLink = { href: '/', label: 'inicio' };

// A place at a URL, its prompt worked out from the URL so the two can't drift apart.
function placeAt(url: string, command: InnerPageCommand, back: BackLink): Place {
  return { url, prompt: promptAt(url, command), back };
}

// The Notes listing: a folder of Notes, linking back to the home page.
export const notesListingPlace = placeAt('/notes/', 'ls', home);
const notesListing: BackLink = { href: notesListingPlace.url, label: 'notas' };

// A Note, by its slug: a file in the Notes listing, linking back to it.
export function notePlace(note: { id: string }): Place {
  return placeAt(`${notesListingPlace.url}${note.id}/`, 'cat', notesListing);
}

// The Tags listing: a folder in the Notes listing, linking back to it.
export const tagsListingPlace = placeAt(`${notesListingPlace.url}tags/`, 'ls', notesListing);

// A Tag, by its slug: a folder in the Tags listing, linking back to the Notes listing (not the
// Tags listing), since a Tag gathers Notes.
export function tagPlace(tag: { id: string }): Place {
  return placeAt(`${tagsListingPlace.url}${tag.id}/`, 'ls', notesListing);
}

// The folder Side Projects are files in. It has no page of its own: the home page lists them.
const sideProjectsFolder = '/side-projects/';

// A Side Project, by its slug: a file in the Side Projects folder, linking back to the home page,
// where Side Projects are shown.
export function sideProjectPlace(sideProject: { id: string }): Place {
  return placeAt(`${sideProjectsFolder}${sideProject.id}/`, 'cat', home);
}

// What an inner page's prompt reads, from its URL as written (slugs are not percent-encoded).
// An `ls` page is a folder and lists itself; a `cat` page is a file shown from the folder above it.
function promptAt(url: string, command: InnerPageCommand) {
  const segments = url.split('/').filter(Boolean);
  if (command === 'ls') return { path: `/${segments.join('/')}`, command };
  const file = segments.pop();
  return { path: `/${segments.join('/')}`, command: `cat ${file}` };
}
