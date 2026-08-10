# Window geometry ownership

The shell owns the measured workspace and the Settings window owns only its current frame/input mechanics.

- `src/windows/geometry.ts` is the pure geometry domain. It owns `Rect`, `Frame`, `Viewport`, `Workspace`, the desktop/compact policies, menu/Dock/safe-area bounds, fullscreen sizing, normal-frame restoration, resize clamping, and sidebar splitter bounds. It imports no React, DOM, app, store, component, Base UI, or `react-rnd` code.
- `src/windows/useWorkspaceGeometry.ts` is the single measurement owner. `App` supplies explicit refs for the Menu Bar surface, Dock surface, and Settings Dock button. The hook owns the first measurement, `ResizeObserver`, `MutationObserver`, viewport/orientation listeners, safe-area reads, coalescing, cleanup, and immutable workspace/target snapshots.
- `MenuBar` and `Dock` attach those refs; they do not make geometry decisions. `App` passes the immutable `Workspace` and typed Dock target provider through `SystemSettings` props.
- `SystemSettings` consumes the workspace and applies `react-rnd` frame mechanics. It does not discover Menu Bar, Dock, or Dock icon elements with document selectors and does not register workspace observers.

## Invariants

For a usable workspace, clamped frames are finite and non-negative, remain below the viewport's right and bottom edges, start at or below the measured Menu Bar bottom, and end at or above the measured Dock/safe-area boundary. Repeated clamping is idempotent. Compact defaults remain tied to the current viewport/menu/Dock measurements; desktop restoration clamps the saved normal frame to the latest workspace; compact restoration recomputes the compact default. Top/left resize policies retain the opposite edge whenever the requested size and usable bounds make that feasible.

The owner tolerates missing refs during static startup or transitions. A missing surface falls back to the viewport boundary until a later coalesced measurement. Target rects are remeasured with the observed Dock/target surfaces so genie destinations remain current without selector discovery.

## Phase 2 measurement record

Compared with the Phase 1 branch baseline (`7280844`), `SystemSettings.tsx` is 1,106 lines to 985 lines. Its three Menu/Dock/icon `document.querySelector` calls are now zero; its `ResizeObserver` and `MutationObserver` registrations are now zero; its two workspace-related window listener calls are now zero (the remaining listener pair is the window interaction pointer listener). The five decomposed browser files still execute 65 cases, with all 17 existing PNG baselines retained byte-for-byte and no screenshot updates. The Vitest run grew from the audit's 19 tests to 140 tests; the current coverage run took 5.69 seconds for test execution (20.83 seconds total) and reported 70.7% statements / 63.65% branches. Build output gzip moved from 147.7 KiB to 149.6 KiB (+1.9 KiB), below the 2 KiB phase budget.

## Non-goals

This boundary is not a layout engine, snap/tiling system, multi-monitor abstraction, context graph, service locator, app registry, or multi-window manager. Window-frame/genie extraction, Settings-pane moves, appearance refactoring, CSS/data-state renames, and visual redesign remain separate work.
