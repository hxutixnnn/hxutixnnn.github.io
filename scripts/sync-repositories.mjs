import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { format, resolveConfig } from "prettier";
import { repositoryCatalogConfig } from "../src/apps/catalog.config.mjs";

const fields = `[
  .[] | {
    id,
    name,
    fullName: .full_name,
    owner: .owner.login,
    private,
    visibility,
    description,
    homepage,
    language,
    topics,
    htmlUrl: .html_url,
    fork,
    archived,
    disabled,
    updatedAt: .updated_at
  }
] | @base64`;
const repositories = [];
for (let page = 1; page <= 1000; page += 1) {
  const endpoint = `/users/${repositoryCatalogConfig.owner}/repos?per_page=1&page=${page}&type=owner&sort=full_name&direction=asc`;
  const output = execFileSync("gh-axi", ["api", endpoint, "--jq", fields], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  const encoded = output.match(/^\s*body:\s*"?([A-Za-z0-9+/=]+)"?\s*$/m)?.[1];
  if (!encoded) throw new Error(`gh-axi returned no decodable repository page at page ${page}`);
  const pageRepositories = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  if (pageRepositories.length === 0) break;
  repositories.push(...pageRepositories);
  if (page === 1000) throw new Error("Repository pagination exceeded the safety limit");
}
const inventory = [...new Map(repositories.map((repository) => [repository.fullName, repository])).values()]
  .filter(
    (repository) =>
      repository.owner === repositoryCatalogConfig.owner &&
      repository.private === false &&
      repository.visibility === "public",
  )
  .sort((left, right) => {
    const a = left.fullName.toLowerCase();
    const b = right.fullName.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  });
if (inventory.length === 0) throw new Error("No owned public repositories returned by gh-axi");
const destination = resolve(import.meta.dirname, "../src/apps/repositories.json");
const prettierOptions = (await resolveConfig(destination)) ?? {};
const output = await format(JSON.stringify(inventory), { ...prettierOptions, parser: "json" });
await writeFile(destination, output);
console.log(`Synchronized ${inventory.length} owned public repositories to src/apps/repositories.json.`);
