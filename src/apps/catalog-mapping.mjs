const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function compareText(left, right) {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a < b ? -1 : a > b ? 1 : left < right ? -1 : left > right ? 1 : 0;
}

function safeHttpsUrl(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function summary(value, fallback) {
  const text = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return text.length <= 240 ? text : `${text.slice(0, 239).trimEnd()}…`;
}

function repositoryTags(repository) {
  const values = [
    repository.language,
    ...(Array.isArray(repository.topics) ? [...repository.topics].sort(compareText) : []),
    repository.fork ? "fork" : null,
    repository.archived ? "archived" : null,
    repository.disabled ? "disabled" : null,
  ].filter((value) => typeof value === "string" && value.trim());
  const seen = new Set();
  const tags = [];
  for (const value of values) {
    const tag = value.trim().toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags.length > 0 ? tags : ["github"];
}

export function selectRepositoryLaunchUrl(repository) {
  const source = safeHttpsUrl(repository.htmlUrl);
  if (!source || source.hostname !== "github.com") {
    throw new Error(
      `Repository ${repository.fullName ?? repository.name ?? "unknown"} has an invalid GitHub URL`,
    );
  }
  const expectedPath = `/${repository.owner}/${repository.name}`.toLowerCase();
  if (source.pathname.replace(/\/$/, "").toLowerCase() !== expectedPath) {
    throw new Error(`Repository URL does not match its owner and name: ${repository.fullName}`);
  }
  return safeHttpsUrl(repository.homepage)?.href ?? source.href;
}

export function mapRepositoriesToApps(repositories, config) {
  const excluded = new Set(Object.keys(config.excludedRepositories ?? {}));
  const sorted = [...repositories].sort(
    (left, right) =>
      compareText(left.fullName ?? "", right.fullName ?? "") ||
      compareText(right.updatedAt ?? "", left.updatedAt ?? ""),
  );
  const unique = new Map();
  for (const repository of sorted) {
    if (
      repository.owner !== config.owner ||
      repository.private === true ||
      repository.visibility !== "public" ||
      excluded.has(repository.name) ||
      unique.has(repository.fullName)
    ) {
      continue;
    }
    unique.set(repository.fullName, repository);
  }

  const ids = new Set();
  return [...unique.values()].map((repository) => {
    const override = config.overrides?.[repository.name] ?? {};
    const id =
      override.id ??
      `repo-${repository.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`;
    if (!idPattern.test(id) || ids.has(id)) throw new Error(`Invalid or duplicate repository app ID: ${id}`);
    ids.add(id);
    const url = selectRepositoryLaunchUrl(repository);
    const name = override.name ?? repository.name;
    return {
      schemaVersion: 1,
      id,
      status: "active",
      category: "project",
      name,
      summary: summary(
        override.summary ?? repository.description,
        `Explore the ${name} public repository on GitHub.`,
      ),
      route: `/apps/${id}/`,
      icon: override.icon ?? "code",
      owner: config.displayOwner,
      tags: repositoryTags(repository),
      source: repository.htmlUrl,
      target: {
        kind: "external",
        url,
        presentation: "new-tab",
        allowedOrigin: new URL(url).origin,
      },
    };
  });
}

export function mapSocialProfilesToApps(profiles, displayOwner) {
  const ids = new Set();
  return [...profiles]
    .sort((left, right) => compareText(left.name, right.name))
    .map((profile) => {
      const id = `social-${profile.id}`;
      const url = safeHttpsUrl(profile.url);
      if (!idPattern.test(id) || ids.has(id)) throw new Error(`Invalid or duplicate social app ID: ${id}`);
      if (!url) throw new Error(`Social profile ${profile.name} must use a credential-free HTTPS URL`);
      ids.add(id);
      return {
        schemaVersion: 1,
        id,
        status: "active",
        category: "social",
        name: profile.name,
        summary: `Open ${displayOwner}'s ${profile.name} profile in a new tab.`,
        route: `/apps/${id}/`,
        icon: profile.icon,
        owner: displayOwner,
        tags: ["social", "profile"],
        target: {
          kind: "external",
          url: profile.url,
          presentation: "new-tab",
          allowedOrigin: url.origin,
        },
      };
    });
}
