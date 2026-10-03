import { getCollection, type CollectionEntry } from 'astro:content';

// Everything the site knows about presenting a Side Project: where it lives and its order.
// How a Retired one looks lives in SideProjectStatus and SideProjectList.

export type SideProject = CollectionEntry<'sideProjects'>;

export function sideProjectUrl(sideProject: SideProject) {
  return `/side-projects/${sideProject.id}/`;
}

// Static paths for the Side Project pages; they must produce the URLs sideProjectUrl() links to.
export async function getSideProjectPaths() {
  const sideProjects = await getCollection('sideProjects');
  return sideProjects.map((sideProject) => ({ params: { id: sideProject.id }, props: { sideProject } }));
}

// Running Side Projects first, Retired ones after, each group by name.
export async function getSideProjectsRunningFirst() {
  const sideProjects = await getCollection('sideProjects');
  return sideProjects.sort(
    (a, b) => Number(a.data.retired) - Number(b.data.retired) || a.data.name.localeCompare(b.data.name),
  );
}
