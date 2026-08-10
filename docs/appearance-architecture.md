# Appearance and startup architecture

Appearance keeps the static-first loading contract while giving each runtime responsibility one owner.

| Contract                                                                               | Owner                                    |
| -------------------------------------------------------------------------------------- | ---------------------------------------- |
| Allowed modes, persistence key, theme colors, wallpaper paths, and resolution helpers  | `src/appearance/definitions.ts`          |
| Request ordering, Auto retargeting, decode/fallback, persistence, and committed result | `createAppearanceService`                |
| Theme-owned DOM state and atomic composition                                           | `createDocumentThemeCompositor`          |
| Global native/fallback visual composition                                              | `theme-transition.ts`                    |
| Observable component API                                                               | `stores/appearance.ts`                   |
| Pre-module first paint and useful static desktop                                       | inline `index.html` bootstrap            |
| Static/runtime synchronization                                                         | `scripts/check-appearance-bootstrap.mjs` |

## Service contract

`request(mode)` resolves to a committed or stale result containing the requested mode, resolved Light/Dark theme, and wallpaper readiness. One service-local generation covers wallpaper loading, the compositor commit, persistence, and result publication. A newer request or disposal makes every older callback stale. Auto is checked again after decode; a system change retargets pending Auto but never an explicit request. Decode failure commits the requested resolved theme with `wallpaperReady: false`, which intentionally selects the solid fallback.

The storage writer, current system theme and its subscription, wallpaper loader/decoder, document compositor, animation eligibility, decoded cache, and result observer are injected. The decoded cache is per service unless an explicit cache is supplied. Tests can therefore control every asynchronous boundary and create independent instances without resetting module state. Storage failure preserves the in-session commit.

The Zustand store retains its public mode, pending mode, resolved theme, wallpaper readiness, readiness action, mode action, and system-sync action. It only projects service snapshots. Components do not decode assets or mutate theme DOM.

## Commit and animation contract

The document compositor applies the root appearance/theme datasets, `colorScheme`, wallpaper fallback marker/property, and theme-color metadata as one commit through the document-wide transition owner. The store's injected readiness check requests direct paint before desktop readiness; the transition owner also commits directly for hidden documents, reduced motion/transparency, increased contrast, forced colors, or no rendered desktop. Otherwise native View Transition or the inert DOM snapshot fallback composes the whole document, including portals, Dock, and Settings. The fallback freezes computed styles and geometry and copies form values and scroll state into its old-frame snapshot; because only the inert clone is animated, focus and selection remain in the live document. If native transition setup or fallback snapshotting fails, the current request commits directly.

## Inline parity boundary

The inline bootstrap must execute before module evaluation and therefore cannot import runtime modules. `validate:appearance-bootstrap` reads the exported runtime definitions, executes the human-readable inline bootstrap across valid, invalid, missing, malformed, Light, and Dark inputs, and verifies mode resolution, storage key behavior, media query, colors, preload wallpaper, and static wallpaper fallbacks. It is validation-only: source `index.html`, no-JS behavior, startup failure release, and timeout remain independently useful.

## Phase 6 validation evidence

| Measure                                      |                                                                             Before |                                                                        After |
| -------------------------------------------- | ---------------------------------------------------------------------------------: | ---------------------------------------------------------------------------: |
| Zustand adapter                              | 169 lines; persistence, media, image decode, DOM commit, transaction counter/cache |            83 lines; service wiring, snapshot projection, and stable actions |
| Module-global appearance request/cache state |                                                                                  2 |                                                                            0 |
| Runtime service / document compositor        |                                                                  implicit in store |                                                               111 / 42 lines |
| Runtime definitions / types                  |                                                                  implicit in store |                                                                28 / 22 lines |
| Transition compositor                        |                                            200 lines, one module-global controller |                                     210 lines, resettable controller factory |
| Unit suite                                   |                                                  audit baseline 19 tests / 15.61 s | 170 tests / about 30 s with coverage; focused service/store/compositor tests |
| Built JavaScript gzip                        |                           audit baseline 152.66 kB Vite / 147.7 KiB output checker |                                    155.94 kB Vite / 150.8 KiB output checker |
| Browser suite                                |                                                                           65 cases |   65 passed in 9.2 minutes; all 17 referenced appearance baselines unchanged |

The roughly 3.1 KiB output-checker gzip increase is the measured cost of the explicit injected service, typed result boundary, and resettable compositor; it remains below the 160 KiB gate and adds no dependency or chunk. The parity checker exercises missing, malformed, unsupported, and all three valid persisted values against both system themes (12 combinations), plus both static wallpaper fallbacks. Source `index.html` is unchanged, while built HTML changes only with normal hashed module output.

## Non-goals

No ThemeContext, CSS-in-JS, SSR/hydration path, generalized transaction framework, runtime dependency, generated inline script, or component-level fade is introduced. The persisted key remains `tienos-appearance`, with only `auto`, `light`, and `dark` values.
