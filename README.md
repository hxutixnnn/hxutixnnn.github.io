# tienOS

tienOS is a personal web desktop for projects, experiments, and ideas.

Choose Auto, Light, or Dark from Appearance in System Settings. The preference persists across reloads; Auto follows the system color scheme as it changes, and post-startup changes between resolved Light and Dark crossfade after the destination wallpaper has decoded or its fallback is ready.

Open Spotlight with Command-Space or the menu-bar search button, then search the installed tienOS apps and press Enter or select a result to launch it. Escape or an interaction with the desktop dismisses Spotlight and restores focus to the invoking control when applicable.

Launch Calculator from the Dock or Spotlight for decimal arithmetic, percent and sign operations, chained calculations, and repeated equals. Its keypad also accepts digits, `+`, `-`, `*`, `/`, `%`, Enter or `=`, Escape, and Backspace or Delete.

## Stack

- React 19 with Vite
- Tailwind CSS 4
- Base UI for accessible headless interactions
- `react-hotkeys-hook` for keyboard shortcuts
- `react-rnd` for bounded desktop window movement and resizing
- Zustand as the observable appearance adapter
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

The default Light and Dark wallpapers are documented in [`src/assets/provenance.yml`](src/assets/provenance.yml).
UI foundations, semantic tokens, component rules, and accessibility behavior are documented in the [`tienOS design system`](docs/design-system.md).

## Loading contract

Before styles load, the inline bootstrap in [`index.html`](index.html) validates the persisted appearance mode, resolves Auto, and applies the theme used by the splash and first desktop frame. `validate:appearance-bootstrap` guards its load-bearing constants and behavior against the runtime definitions. Runtime ownership, transaction results, injection seams, and the static parity boundary are documented in [`docs/appearance-architecture.md`](docs/appearance-architecture.md).

The splash icon is inline in the static HTML, so it paints with the first splash frame without waiting for application JavaScript or the external Font Awesome sprite. The splash covers an inert desktop until its production styles are applied, the wallpaper is decoded, and an initial desktop Font Awesome icon has rendered geometry. A rejected readiness gate starts release of the intentionally styled static desktop fallback without waiting for the eight-second escape, which remains active throughout startup and asset readiness for stalled requests. No-script and reduced-motion paths must remain usable.

Future paint-critical assets must participate in this readiness gate, while non-critical assets must load progressively without delaying the first desktop frame. Browser coverage for this contract runs against the built `dist/` output through `vite preview`.

## Browser contract tests

Playwright coverage is split by regression boundary in `tests/e2e/`: `startup`, `menus`, `settings-layout`, `calculator`, `appearance`, `window-lifecycle`, and `spotlight`. Put a regression in the narrowest owning contract; lifecycle/geometry/input behavior belongs in `window-lifecycle`, Calculator behavior belongs in `calculator`, Spotlight search and shell-overlay behavior belongs in `spotlight`, and Settings content and control layout belongs in `settings-layout`. Small semantic interactions live in `tests/e2e/drivers/` (`desktop`, `settingsWindow`, and `appearance`); keep direct assertions in specs rather than growing a page-object framework. The exhaustive reducer transition table is in `src/windows/singleWindowMachine.test.ts`; React-boundary characterization remains in `tests/lifecycle-characterization.test.ts`. The lifecycle architecture and invariants are owned by `docs/window-lifecycle.md`; Settings app and pane ownership is documented in [`docs/system-settings.md`](docs/system-settings.md).

Without `PLAYWRIGHT_BASE_URL`, Playwright first builds the current checkout, then derives worktree-specific ports and starts strict-port processes for the production preview and the isolated multi-app fixture. It never reuses an existing server, so `pnpm test:e2e` cannot silently exercise stale `dist/` output. Set `TIENOS_E2E_PORT` and `TIENOS_E2E_FIXTURE_PORT` to override those ports. `PLAYWRIGHT_BASE_URL` disables the local production build and preview for an explicitly managed server; the isolated fixture server still starts for registry composition coverage. CI may set `TIENOS_E2E_SKIP_BUILD=1` only after the current job has produced or restored a validated `dist/` artifact.
