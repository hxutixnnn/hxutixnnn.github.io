import type { DesktopAppDescriptor } from "../desktop/apps";

export type SpotlightResult = Readonly<{
  app: DesktopAppDescriptor;
  score: number;
}>;

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\s_-]+/g, "");
}

function rank(value: string, query: string) {
  if (!query) return 0;
  if (value === query) return 400;
  if (value.startsWith(query)) return 300 - (value.length - query.length);
  const substring = value.indexOf(query);
  if (substring >= 0) return 200 - substring * 2 - (value.length - query.length);
  let cursor = 0;
  let gap = 0;
  for (const character of query) {
    const next = value.indexOf(character, cursor);
    if (next < 0) return null;
    gap += next - cursor;
    cursor = next + 1;
  }
  return 100 - gap - (value.length - query.length);
}

/** Registry-backed provider seam; another descriptor source can be concatenated later. */
export function searchDesktopApps(
  apps: readonly DesktopAppDescriptor[],
  rawQuery: string,
): readonly SpotlightResult[] {
  const query = normalize(rawQuery);
  return apps
    .map((app) => {
      const nameScore = rank(normalize(app.name), query);
      const idScore = rank(normalize(app.id), query);
      const score = Math.max(nameScore ?? -Infinity, idScore ?? -Infinity);
      return Number.isFinite(score) ? { app, score } : null;
    })
    .filter((result): result is SpotlightResult => result !== null)
    .sort(
      (a, b) => b.score - a.score || a.app.name.localeCompare(b.app.name) || a.app.id.localeCompare(b.app.id),
    );
}
