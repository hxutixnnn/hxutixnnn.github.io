# tienOS

tienOS is a personal web desktop for projects, experiments, and ideas.

## Stack

- React 19 with Vite
- Tailwind CSS 4
- Base UI for accessible headless interactions
- `react-hotkeys-hook` for keyboard shortcuts
- `react-rnd` for bounded desktop window movement and resizing
- TypeScript and Vitest

## Development

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use these checks before proposing a change:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The default wallpaper is documented in [`src/assets/provenance.yml`](src/assets/provenance.yml).
UI foundations, semantic tokens, component rules, and accessibility behavior are documented in the [`tienOS design system`](docs/design-system.md).

## Loading contract

The splash covers an inert desktop until its production styles are applied, the wallpaper is decoded, and an initial Font Awesome icon has rendered geometry. An eight-second failure escape remains active throughout startup and asset readiness so errors or stalled requests reveal an interactive static desktop fallback; no-script and reduced-motion paths must remain usable.

Future paint-critical assets must participate in this readiness gate, while non-critical assets must load progressively without delaying the first desktop frame. Browser coverage for this contract runs against the built `dist/` output through `vite preview`.
