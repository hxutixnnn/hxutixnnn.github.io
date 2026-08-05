import type { ExternalTarget } from "./contract";

export function openExternalTarget(
  target: ExternalTarget,
  openWindow: (url?: string | URL, target?: string, features?: string) => Window | null = window.open.bind(
    window,
  ),
): boolean {
  const url = new URL(target.url);
  const allowedOrigin = new URL(target.allowedOrigin);
  if (
    target.presentation !== "new-tab" ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    allowedOrigin.protocol !== "https:" ||
    allowedOrigin.pathname !== "/" ||
    url.origin !== allowedOrigin.origin
  ) {
    return false;
  }
  const opened = openWindow(url.href, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
  return true;
}
