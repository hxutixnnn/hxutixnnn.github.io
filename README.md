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

The initial shell budgets are 100 KiB gzip JavaScript, 30 KiB gzip CSS, and 250 KiB for the largest wallpaper/social image. `scripts/check-static-output.mjs` enforces those limits and rejects a `CNAME` in the Pages artifact.

## Architecture

- `content/` — preserved MDX pages/posts and editorial images
- `src/apps/catalog.json` — reviewed app descriptors; validated before build
- `src/apps/loaders.ts` — compile-time-only lazy core app map
- `src/os/domain/windows.ts` — headless window reducer
- `react-rnd@10.5.3` — pinned, asset-free desktop drag/resize mechanics
- `src/os/shell/` — accessible menu, launcher, desktop, mobile switcher, and window UI
- `src/pages/` — real static routes, including every `/apps/<id>/`
- `src/assets/provenance.yml` — authoritative non-code asset register
- `tests/` — reducer, component, static output, axe, and responsive browser coverage

Substantial projects remain external HTTPS destinations and open in a new tab. Tien OS never discovers repositories at runtime, imports remote modules, or embeds unreviewed iframes.

## Deployment boundary

`.github/workflows/pages.yml` publishes `dist/` from `main` to GitHub Pages without a `CNAME`. It is intentionally scoped to `hxutixnnn.github.io`; do not change DNS, GitHub custom-domain settings, or the separate `nguyenhuutien.com` Vercel presentation as part of this repository deployment.

See [`docs/visual-baseline.md`](docs/visual-baseline.md) for the licensing and fit decision, [`docs/implementation-evidence.md`](docs/implementation-evidence.md) for measured build/browser evidence, and [`AGENTS.md`](AGENTS.md) for concise maintainer guidance.

## License

Original source code is MIT licensed. The previous starter's 0BSD notice is retained in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Personal content and asset-specific terms are recorded separately.
