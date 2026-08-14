import { extname } from "node:path";

export const INITIAL_JAVASCRIPT_GZIP_LIMIT = 160 * 1024;
export const LAZY_APP_JAVASCRIPT_GZIP_LIMIT = 10 * 1024;

export function classifyJavaScriptAssets(html, files) {
  const initialReferences = new Set(
    [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+\.js)(?:[?#][^"']*)?["'][^>]*>/gi)].map(
      (match) => match[1].replace(/^\//, ""),
    ),
  );
  const javascript = files.filter((path) => extname(path) === ".js");
  return {
    initial: javascript.filter((path) => initialReferences.has(path.replace(/^.*?dist\//, ""))),
    lazy: javascript.filter((path) => !initialReferences.has(path.replace(/^.*?dist\//, ""))),
  };
}

export function enforceJavaScriptBudgets(initialGzip, lazyGzip) {
  if (initialGzip > INITIAL_JAVASCRIPT_GZIP_LIMIT) {
    throw new Error(`Initial JavaScript budget exceeded: ${(initialGzip / 1024).toFixed(1)} KiB gzip`);
  }
  if (lazyGzip > LAZY_APP_JAVASCRIPT_GZIP_LIMIT) {
    throw new Error(`Lazy app JavaScript budget exceeded: ${(lazyGzip / 1024).toFixed(1)} KiB gzip`);
  }
}
