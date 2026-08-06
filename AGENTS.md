# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

## Working agreements

- Use the exact Node and pnpm versions in `.node-version` and `package.json`; install with `pnpm install --frozen-lockfile`.
- Run `pnpm validate`, `pnpm build`, and `pnpm test:e2e` before proposing changes. `pnpm build` is the authority for asset provenance and the Vite output contract: useful root fallback HTML, the GitHub Pages canonical domain, local-reference integrity, first-party initial resources, and bundle and wallpaper budgets.
- This repository deploys only to `hxutixnnn.github.io`. Do not add `CNAME`, change DNS/custom-domain settings, or modify the separate `nguyenhuutien.com` presentation.
- Register every added binary, vector, font, audio, or video asset in `src/assets/provenance.yml`; `pnpm validate:assets` rejects missing or changed entries.
- Preserve useful static HTML for the canonical root route. Browser tests run the exact `dist/` output via `vite preview`, not the development server.
- Treat `src/assets/provenance.yml`, `scripts/check-asset-provenance.mjs`, and `scripts/check-static-output.mjs` as the authorities for asset safety and static output; `THIRD_PARTY_NOTICES.md` owns dependency notices.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
