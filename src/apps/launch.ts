import type { EmbeddedTarget, ExternalTarget } from "./contract";

function hasExactHttpsOrigin(
  target: EmbeddedTarget | ExternalTarget,
  presentation: EmbeddedTarget["presentation"] | ExternalTarget["presentation"],
): boolean {
  try {
    const url = new URL(target.url);
    const allowedOrigin = new URL(target.allowedOrigin);
    return (
      target.presentation === presentation &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      allowedOrigin.protocol === "https:" &&
      !allowedOrigin.username &&
      !allowedOrigin.password &&
      allowedOrigin.pathname === "/" &&
      url.origin === allowedOrigin.origin
    );
  } catch {
    return false;
  }
}

export function isSafeEmbeddedTarget(target: EmbeddedTarget): boolean {
  return target.kind === "embedded" && hasExactHttpsOrigin(target, "embedded");
}

export function getEmbeddedFrameSource(targets: readonly EmbeddedTarget[]): string {
  const origins = new Set(
    targets.filter(isSafeEmbeddedTarget).map((target) => new URL(target.allowedOrigin).origin),
  );
  return origins.size > 0 ? [...origins].sort().join(" ") : "'none'";
}

export function openExternalTarget(
  target: ExternalTarget,
  openWindow: (url?: string | URL, target?: string, features?: string) => Window | null = window.open.bind(
    window,
  ),
): boolean {
  if (!hasExactHttpsOrigin(target, "new-tab")) return false;
  const opened = openWindow(target.url, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
  return true;
}
