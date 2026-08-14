export const INITIAL_JAVASCRIPT_GZIP_LIMIT: number;
export const LAZY_APP_JAVASCRIPT_GZIP_LIMIT: number;
export function classifyJavaScriptAssets(
  html: string,
  files: readonly string[],
): { initial: string[]; lazy: string[] };
export function enforceJavaScriptBudgets(initialGzip: number, lazyGzip: number): void;
