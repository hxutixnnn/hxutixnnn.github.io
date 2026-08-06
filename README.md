# Tien OS portfolio

A static personal-OS portfolio for [hxutixnnn.github.io](https://hxutixnnn.github.io/), built with Astro, React, TypeScript, and MDX.

Tien OS uses an original contemporary glass-and-depth treatment. It is an independent personal project, not a macOS clone, and is not affiliated with Apple Inc. The project ships no Apple logos, fonts, wallpapers, sounds, ROMs, app icons, or candidate implementation assets.

## Toolchain

- Node `22.23.1` (`.node-version` and `.tool-versions`)
- pnpm `11.10.0` (`packageManager` and `pnpm-workspace.yaml` build allowlist)
- Astro static output and React 19 islands

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

## Validation

```sh
pnpm validate          # format, lint, types, catalogue, assets, unit/component tests
pnpm build             # exact static artifact + links/routes/feed/sitemap/budgets
pnpm exec playwright install chromium
pnpm test:e2e          # browser tests against dist through Astro preview
pnpm test:lighthouse   # local static-output Lighthouse thresholds
```

The shell budgets are 160 KiB gzip JavaScript, 30 KiB gzip CSS, and 250 KiB for the largest wallpaper/social image. `scripts/check-static-output.mjs` enforces those limits and rejects a `CNAME` in the Pages artifact.

## Optional analytics

Google Analytics is disabled unless `PUBLIC_GOOGLE_ANALYTICS_ID` contains a measurement ID matching `G-[A-Z0-9]+`. When configured, Tien OS waits for the first valid app open or close event before loading Google Tag Manager, so the initial shell makes no third-party request. Analytics remains disabled when Do Not Track or Global Privacy Control is enabled and on `/preview/` or `/do-not-track/` routes. The configuration anonymizes IP addresses, uses session-expiring cookies, and disables Google signals; interacting with an app can create requests to Google Analytics.

## Architecture

- `content/` — preserved MDX pages/posts and editorial images
- `src/apps/catalog.json` — reviewed core and standalone app descriptors; validated before build
- `src/apps/repositories.json` — generated public-repository inventory used to create project apps
- `src/apps/social-links.json` — published social profiles used by About and generated social apps
- `src/apps/loaders.ts` — compile-time-only lazy core app map
- `src/os/domain/windows.ts` — headless window reducer
- `react-rnd@10.5.3` — pinned, asset-free desktop drag/resize mechanics
- `src/os/shell/` — accessible menu, launcher, desktop, mobile switcher, and window UI
- `src/pages/` — real static routes with useful detail HTML for every `/apps/<id>/`; core and approved embedded-project routes hydrate the requested app in Tien OS
- `src/assets/provenance.yml` — authoritative non-code asset register
- `tests/` — reducer, component, static output, axe, and responsive browser coverage

Reviewed deployed project homepages open in a responsive, least-privilege embedded window with a safe new-tab/source fallback. Social profiles remain protected new-tab destinations. Tien OS never discovers repositories at runtime, imports remote modules, embeds unreviewed iframes, or turns social links into fake internal clients.

## Refreshing public repositories

Use the authenticated `gh-axi` CLI to refresh the complete owned public-repository inventory:

```sh
pnpm sync:repositories
pnpm validate:catalog
```

The sync follows every API page, retains useful repository metadata, and writes `src/apps/repositories.json` in deterministic name order. The static catalogue maps only public repositories with a valid credential-free HTTPS homepage to embedded project targets; GitHub-only entries are omitted rather than presented as projects. The repository URL remains supporting source metadata, never the project launch target. Forked, archived, and disabled entries are still considered when they have a reviewed deployment; private or unrelated repositories are rejected. `hxutixnnn.github.io` is the sole mapping exclusion because the current repository is already represented by the Tien OS system surface. Review the generated JSON diff, including changed homepage values and resulting launch targets, before committing it. Repository display overrides belong in `src/apps/catalog.config.mjs`; social profiles are maintained once in `src/apps/social-links.json`.

## Deployment boundary

`.github/workflows/pages.yml` publishes `dist/` from `main` to GitHub Pages without a `CNAME`. It is intentionally scoped to `hxutixnnn.github.io`; do not change DNS, GitHub custom-domain settings, or the separate `nguyenhuutien.com` Vercel presentation as part of this repository deployment.

See [`docs/visual-baseline.md`](docs/visual-baseline.md) for the licensing and fit decision, [`docs/implementation-evidence.md`](docs/implementation-evidence.md) for the first baseline's measured build/browser evidence, and [`AGENTS.md`](AGENTS.md) for concise maintainer guidance.

## License

Original source code is MIT licensed. The previous starter's 0BSD notice is retained in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Personal content and asset-specific terms are recorded separately.
