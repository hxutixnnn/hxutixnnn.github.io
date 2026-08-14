import { describe, expect, it } from "vitest";
import {
  INITIAL_JAVASCRIPT_GZIP_LIMIT,
  LAZY_APP_JAVASCRIPT_GZIP_LIMIT,
  classifyJavaScriptAssets,
  enforceJavaScriptBudgets,
} from "../scripts/static-output-budgets.mjs";

describe("static output JavaScript budgets", () => {
  it("separates HTML-requested startup code from deferred app chunks", () => {
    const assets = classifyJavaScriptAssets(
      '<script type="module" src="/assets/index.js"></script><link rel="modulepreload" href="/assets/runtime.js">',
      [
        "/tmp/dist/assets/index.js",
        "/tmp/dist/assets/runtime.js",
        "/tmp/dist/assets/CalculatorApp.js",
        "/tmp/dist/assets/site.css",
      ],
    );
    expect(assets.initial.map((path) => path.split("/").at(-1))).toEqual(["index.js", "runtime.js"]);
    expect(assets.lazy.map((path) => path.split("/").at(-1))).toEqual(["CalculatorApp.js"]);
  });

  it("enforces initial and deferred ceilings independently", () => {
    expect(() =>
      enforceJavaScriptBudgets(INITIAL_JAVASCRIPT_GZIP_LIMIT, LAZY_APP_JAVASCRIPT_GZIP_LIMIT),
    ).not.toThrow();
    expect(() => enforceJavaScriptBudgets(INITIAL_JAVASCRIPT_GZIP_LIMIT + 1, 0)).toThrow(
      "Initial JavaScript budget exceeded",
    );
    expect(() => enforceJavaScriptBudgets(0, LAZY_APP_JAVASCRIPT_GZIP_LIMIT + 1)).toThrow(
      "Lazy app JavaScript budget exceeded",
    );
  });
});
