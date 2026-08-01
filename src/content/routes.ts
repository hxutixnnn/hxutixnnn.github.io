import type { CollectionEntry } from "astro:content";

export const SITE = {
  name: "Tien OS",
  title: "Nguyễn Hữu Tiền — Tien OS",
  description:
    "A personal operating-system portfolio by Tien Nguyen: projects, notes, resources, and practical engineering posts.",
  url: "https://hxutixnnn.github.io",
  author: "Nguyễn Hữu Tiền",
  socialHandle: "@hxutixnnn",
} as const;

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function postPath(post: CollectionEntry<"posts">): `/${string}` {
  return (post.data.slug ?? `/${slugify(post.data.title)}`) as `/${string}`;
}

export function pagePath(page: CollectionEntry<"pages">): `/${string}` {
  return page.data.slug as `/${string}`;
}

export function tagPath(tag: string): `/tags/${string}/` {
  return `/tags/${slugify(tag)}/`;
}

export function displayDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
