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
