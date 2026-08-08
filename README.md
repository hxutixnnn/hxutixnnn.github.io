# tienOS

tienOS is a personal web desktop for projects, experiments, and ideas.

Choose Auto, Light, or Dark from Appearance in System Settings. The preference persists across reloads; Auto follows the system color scheme as it changes.

## Stack

- React 19 with Vite
- Tailwind CSS 4
- Base UI for accessible headless interactions
- `react-hotkeys-hook` for keyboard shortcuts
- `react-rnd` for bounded desktop window movement and resizing
- Zustand for persisted appearance state
- TypeScript and Vitest

## Development

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use these checks before proposing a change:

```sh
pnpm validate
pnpm build
pnpm test:e2e
```

The default wallpaper is documented in [`src/assets/provenance.yml`](src/assets/provenance.yml).
UI foundations, semantic tokens, component rules, and accessibility behavior are documented in the [`tienOS design system`](docs/design-system.md).

## Loading contract

Before styles load, the inline bootstrap in [`index.html`](index.html) validates the persisted appearance mode, resolves Auto, and applies the theme used by the splash and first desktop frame. Its storage key, accepted values, and fallback behavior must remain synchronized with the runtime Zustand store in [`src/stores/appearance.ts`](src/stores/appearance.ts).

The splash icon is inline in the static HTML, so it paints with the first splash frame without waiting for application JavaScript or the external Font Awesome sprite. The splash covers an inert desktop until its production styles are applied, the wallpaper is decoded, and an initial desktop Font Awesome icon has rendered geometry. An eight-second failure escape remains active throughout startup and asset readiness so errors or stalled requests reveal an intentionally styled static desktop fallback; no-script and reduced-motion paths must remain usable.

Future paint-critical assets must participate in this readiness gate, while non-critical assets must load progressively without delaying the first desktop frame. Browser coverage for this contract runs against the built `dist/` output through `vite preview`.
