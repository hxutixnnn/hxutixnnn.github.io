# Window geometry ownership

The shell owns workspace measurement, `SystemSettings` owns the current frame value, and `WindowFrame` owns physical frame/input mechanics.

- `src/windows/geometry.ts` is the pure geometry domain. It owns `Rect`, `Frame`, `Viewport`, `Workspace`, the desktop/compact policies, menu/Dock/safe-area bounds, fullscreen sizing, normal-frame restoration, resize clamping, and sidebar splitter bounds. It imports no React, DOM, app, store, component, Base UI, or `react-rnd` code.
- `src/windows/useWorkspaceGeometry.ts` is the single measurement owner. `App` supplies explicit refs for the Menu Bar surface, Dock surface, and Settings Dock button. The hook owns the first measurement, `ResizeObserver`, `MutationObserver`, viewport/orientation listeners, safe-area reads, coalescing, cleanup, and immutable workspace/target snapshots.
- `MenuBar` and `Dock` attach those refs; they do not make geometry decisions. `App` passes the immutable `Workspace` and typed Dock target provider through `SystemSettings` props.
- `WindowFrame` consumes immutable workspace/frame values and is the only `react-rnd` owner.
- `SystemSettings` owns the current frame and sidebar ratio and passes immutable geometry values plus a typed Dock target provider through the frame port.

## Invariants

For a usable workspace, clamped frames are finite and non-negative, remain below the viewport's right and bottom edges, start at or below the measured Menu Bar bottom, and end at or above the measured Dock/safe-area boundary. Repeated clamping is idempotent. Compact defaults remain tied to the current viewport/menu/Dock measurements; desktop restoration clamps the saved normal frame to the latest workspace; compact restoration recomputes the compact default. Top/left resize policies retain the opposite edge whenever the requested size and usable bounds make that feasible.

The owner tolerates missing refs during static startup or transitions. The initial snapshot uses a 30px menu boundary and the viewport bottom; after the first committed measurement, a missing Menu Bar falls back to the viewport top and a missing Dock falls back to the viewport bottom until a later coalesced measurement. Target rects are remeasured with the observed Dock/target surfaces so genie destinations remain current without selector discovery.

## Phase 3 measurement record

The Phase 2 baseline moved `SystemSettings.tsx` from 1,106 to 985 lines and removed all Menu/Dock selectors and workspace observers.
Phase 3 moves physical frame policy again, leaving `SystemSettings.tsx` at 589 lines with zero selectors and zero `react-rnd` imports.
`WindowFrame.tsx` is 320 lines and the genie driver is 162 lines.
The five browser files retain 65 cases and all 17 PNG baselines without updates.
The Phase 3 build remains 149.6 KiB JavaScript gzip by the output checker, unchanged from the Phase 2 documented result.

## Non-goals

This boundary is not a layout engine, snap/tiling system, multi-monitor abstraction, context graph, service locator, app registry, or multi-window manager. Settings-pane moves, appearance refactoring, CSS/data-state renames, and visual redesign remain separate work.
