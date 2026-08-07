import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

function isIdentifierStart(character, nextCharacter) {
  return (
    /[A-Z_a-z\u0080-\uFFFF]/u.test(character) ||
    character === "\\" ||
    (character === "-" && /[-A-Z_a-z\u0080-\uFFFF\\]/u.test(nextCharacter))
  );
}

function classSelectors(selector) {
  const classes = [];
  let attributeDepth = 0;
  let quote = "";

  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (quote) {
      if (character === "\\") index += 1;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "[") attributeDepth += 1;
    else if (character === "]") attributeDepth = Math.max(0, attributeDepth - 1);
    else if (
      character === "." &&
      attributeDepth === 0 &&
      isIdentifierStart(selector[index + 1] ?? "", selector[index + 2] ?? "")
    ) {
      let end = index + 1;
      while (end < selector.length) {
        if (selector[end] === "\\") {
          end += 2;
          continue;
        }
        if (!/[-0-9A-Z_a-z\u0080-\uFFFF]/u.test(selector[end])) break;
        end += 1;
      }
      classes.push(selector.slice(index, end));
      index = end - 1;
    }
  }

  return classes;
}

function qualifiedRuleSelectors(css) {
  const selectors = [];

  function parseRuleList(start, end) {
    let preludeStart = start;
    let quote = "";
    let comment = false;
    let parentheses = 0;
    let brackets = 0;

    for (let index = start; index < end; index += 1) {
      const character = css[index];
      const nextCharacter = css[index + 1];
      if (comment) {
        if (character === "*" && nextCharacter === "/") {
          comment = false;
          index += 1;
        }
        continue;
      }
      if (quote) {
        if (character === "\\") index += 1;
        else if (character === quote) quote = "";
        continue;
      }
      if (character === "/" && nextCharacter === "*") {
        comment = true;
        index += 1;
        continue;
      }
      if (character === '"' || character === "'") quote = character;
      else if (character === "(") parentheses += 1;
      else if (character === ")") parentheses = Math.max(0, parentheses - 1);
      else if (character === "[") brackets += 1;
      else if (character === "]") brackets = Math.max(0, brackets - 1);
      else if (parentheses === 0 && brackets === 0 && character === ";") preludeStart = index + 1;
      else if (parentheses === 0 && brackets === 0 && character === "{") {
        const prelude = css.slice(preludeStart, index).trim();
        let blockEnd = index + 1;
        let depth = 1;
        let blockQuote = "";
        let blockComment = false;
        for (; blockEnd < end && depth > 0; blockEnd += 1) {
          const blockCharacter = css[blockEnd];
          const blockNextCharacter = css[blockEnd + 1];
          if (blockComment) {
            if (blockCharacter === "*" && blockNextCharacter === "/") {
              blockComment = false;
              blockEnd += 1;
            }
          } else if (blockQuote) {
            if (blockCharacter === "\\") blockEnd += 1;
            else if (blockCharacter === blockQuote) blockQuote = "";
          } else if (blockCharacter === "/" && blockNextCharacter === "*") {
            blockComment = true;
            blockEnd += 1;
          } else if (blockCharacter === '"' || blockCharacter === "'") blockQuote = blockCharacter;
          else if (blockCharacter === "{") depth += 1;
          else if (blockCharacter === "}") depth -= 1;
        }
        if (/^@scope(?:\s|\()/u.test(prelude)) {
          selectors.push(prelude.slice("@scope".length).trim());
          parseRuleList(index + 1, blockEnd - 1);
        } else if (prelude.startsWith("@")) parseRuleList(index + 1, blockEnd - 1);
        else if (prelude) {
          selectors.push(prelude);
          parseRuleList(index + 1, blockEnd - 1);
        }
        index = blockEnd - 1;
        preludeStart = blockEnd;
      }
    }
  }

  parseRuleList(0, css.length);

  return selectors;
}

const failures = [];
const patterns = process.argv.length > 2 ? process.argv.slice(2) : ["src/**/*.css"];
for (const pattern of patterns) {
  for await (const file of glob(pattern)) {
    const css = await readFile(file, "utf8");
    for (const selector of qualifiedRuleSelectors(css)) {
      for (const classSelector of classSelectors(selector)) {
        failures.push(`${file}: authored ${classSelector} selector in ${selector}`);
      }
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Component CSS audit passed: no authored class selectors in src CSS.");
}
