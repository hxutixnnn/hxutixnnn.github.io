import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("src/appearance/definitions.ts", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const file = ts.createSourceFile("definitions.ts", source, ts.ScriptTarget.Latest, true);
const values = new Map();
const read = (node) => {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(read);
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties.map((property) => [property.name.text, read(property.initializer)]),
    );
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return read(node.expression);
  throw new Error(`Unsupported appearance definition: ${node.getText(file)}`);
};
for (const statement of file.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && declaration.initializer)
      values.set(declaration.name.text, read(declaration.initializer));
  }
}
const contract = {
  modes: values.get("appearanceModes"),
  storageKey: values.get("appearanceStorageKey"),
  mediaQuery: values.get("appearanceMediaQuery"),
  themeColors: values.get("themeColorByTheme"),
  wallpapers: values.get("wallpaperByTheme"),
};
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error("Inline appearance bootstrap is missing");

for (const saved of [null, ...contract.modes, "sepia", "malformed"]) {
  for (const dark of [false, true]) {
    const attributes = {};
    let themeColor;
    let preload;
    const context = {
      localStorage: { getItem: () => (saved === "malformed" ? "{" : JSON.stringify(saved)) },
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
    const expectedMode = contract.modes.includes(saved) ? saved : "auto";
    const expectedTheme = expectedMode === "auto" ? (dark ? "dark" : "light") : expectedMode;
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
