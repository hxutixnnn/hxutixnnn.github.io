import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("src/appearance/definitions.ts", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: "definitions.ts",
});
const runtime = {};
vm.runInNewContext(compiled.outputText, { exports: runtime }, { filename: "definitions.js" });
const contract = {
  modes: runtime.appearanceModes,
  storageKey: runtime.appearanceStorageKey,
  mediaQuery: runtime.appearanceMediaQuery,
  themeColors: runtime.themeColorByTheme,
  wallpapers: runtime.wallpaperByTheme,
};
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error("Inline appearance bootstrap is missing");

for (const saved of [null, ...contract.modes, "sepia", "malformed"]) {
  for (const dark of [false, true]) {
    const attributes = {};
    let themeColor;
    let preload;
    let storageReads = 0;
    const storage = {
      getItem(key) {
        storageReads += 1;
        if (key !== contract.storageKey) throw new Error(`Bootstrap storage key drifted: ${key}`);
        return saved === "malformed" ? "{" : JSON.stringify(saved);
      },
    };
    const context = {
      localStorage: storage,
      matchMedia: (query) => {
        if (query !== contract.mediaQuery) throw new Error(`Bootstrap media query drifted: ${query}`);
        return { matches: dark };
      },
      document: {
        documentElement: {
          dataset: {},
          style: {
            set colorScheme(value) {
              attributes.colorScheme = value;
            },
          },
        },
        querySelector: () => ({
          set content(value) {
            themeColor = value;
          },
        }),
        createElement: () => (preload = {}),
        head: { append: () => {} },
      },
    };
    vm.runInNewContext(script, context);
    if (storageReads !== 1) throw new Error(`Bootstrap storage reads drifted: ${storageReads}`);
    const expectedMode = runtime.readPersistedAppearance(storage);
    const expectedTheme = runtime.resolveAppearance(expectedMode, dark ? "dark" : "light");
    const actual = context.document.documentElement;
    if (
      actual.dataset.appearance !== expectedMode ||
      actual.dataset.theme !== expectedTheme ||
      attributes.colorScheme !== expectedTheme ||
      themeColor !== contract.themeColors[expectedTheme] ||
      preload?.href !== contract.wallpapers[expectedTheme]
    )
      throw new Error(`Bootstrap parity failed for saved=${saved}, dark=${dark}`);
  }
}
for (const wallpaper of Object.values(contract.wallpapers)) {
  if (!html.includes(`url("${wallpaper}")`))
    throw new Error(`Static wallpaper fallback drifted: ${wallpaper}`);
}
console.log("Appearance bootstrap parity validated");
