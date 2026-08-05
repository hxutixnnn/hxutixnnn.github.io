# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Working agreements

- Use the exact Node and pnpm versions in `.node-version` and `package.json`; install with `pnpm install --frozen-lockfile`.
- Run `pnpm validate`, `pnpm build`, and `pnpm test:e2e` before proposing changes. `pnpm build` is the authority for route, link, feed, sitemap, provenance, domain, and bundle-budget checks.
- This repository deploys only to `hxutixnnn.github.io`. Do not add `CNAME`, change DNS/custom-domain settings, or modify the separate `nguyenhuutien.com` presentation.
- Register every added binary, vector, font, audio, or video asset in `src/assets/provenance.yml`; `pnpm validate:assets` rejects missing or changed entries.
- Keep core apps in the compile-time catalogue/loader path under `src/apps/`. Refresh owned public-repository apps with `pnpm sync:repositories` (authenticated `gh-axi`) and review the generated inventory; external apps must remain reviewed HTTPS links—no runtime repository scanning, remote modules, or unreviewed iframes.
- The headless window contract lives in `src/os/domain/windows.ts`; shell behavior belongs in `src/os/shell/`. Desktop drag/resize is narrowly provided by pinned `react-rnd@10.5.3`; mobile must remain a single non-draggable surface.
- Preserve useful static HTML for every canonical and `/apps/<id>/` route. Browser tests run the exact `dist/` output via `astro preview`, not the development server.
- Treat `docs/visual-baseline.md`, `docs/implementation-evidence.md`, and `THIRD_PARTY_NOTICES.md` as the authorities for the reuse, asset-safety, and validation boundary.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
