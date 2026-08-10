# Single-window lifecycle ownership

The current desktop contract is one retained System Settings instance. Its lifecycle is owned by the pure single-window machine and the `useSingleWindowController` hook. `App` composes projections for the menu, Dock, and Settings surface; it does not decide visibility transitions or keep lifecycle counters. `SystemSettings` renders the projected state and adapts typed transition effects to the existing genie mechanics. Transition completion returns a generation-tagged event to the controller.

## Event and effect contract

| Event                                    | Meaning                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `LAUNCH`                                 | Open the one instance, or raise it when already open.                     |
| `ACTIVATE_FROM_MENU`                     | Launch, raise, focus, or reverse a minimized transition.                  |
| `ACTIVATE_FROM_DOCK`                     | Launch, restore, focus an inactive window, or minimize the active window. |
| `DESKTOP_POINTER` / `WINDOW_INTERACTION` | Update frontmost activity without changing window identity.               |
| `CLOSE`                                  | Close the instance and invalidate outstanding completions.                |
| `MINIMIZE`                               | Request genie minimization, including reversal of a restore.              |
| `TOGGLE_FULLSCREEN`                      | Toggle app-contained fullscreen without changing normal-frame ownership.  |
| `TRANSITION_SETTLED`                     | Commit only the matching generation's minimized or visible destination.   |

The machine emits typed `FOCUS`, `START_TRANSITION`, and `CANCEL_TRANSITION` effects. The controller delivers them at the React boundary. Physical animation, focus restoration, inertness, data attributes, geometry, and fullscreen frame mechanics remain in their existing component adapter until the later frame/geometry phases.

## Invariants

- There is one presence and one visibility value; no independent open/minimized/visibility lifecycle truth exists.
- Closed state is inactive and not fullscreen. The state has no window collection, IDs, z-order, persistence, or registry.
- A completion whose generation is not current is a no-op. Close/relaunch therefore cannot consume a stale minimize or restore request.
- Dock and menu activation are deterministic under repetition; an activation that reverses a transition supersedes the prior generation.
- Fullscreen is app-contained and survives minimize/restore; closing starts a fresh normal window.
- Focus requests use the reducer's epoch. Restore focus is emitted only when the current restore settles visibly.

## Extension boundary and non-goals

The controller is intentionally a single-window owner. A future second app may compose another explicitly approved controller, but this phase does not define `WindowId`, collections, z-order, app registries, event buses, persistence, or a generalized window framework. Geometry extraction, `WindowFrame`, Settings pane moves, appearance services, styling changes, and multi-window behavior remain separate roadmap phases.

## Phase 1 measurements

The audit baseline recorded 10 App lifecycle state/ref/counter declarations and 7 independent System Settings lifecycle state/ref declarations. The refactor leaves those lifecycle declarations in one controller state; the Settings adapter retains only physical transition/focus bookkeeping. App has no lifecycle transition decision branch. The deterministic lifecycle suite now covers 38 Vitest tests (98.5% machine branch coverage).

The baseline output checker measured 147.7 KiB JavaScript gzip; this phase measures 148.6 KiB (+0.9 KiB, below the 2 KiB budget). `pnpm validate` passes, and the exact `dist/` browser run passes all 65 cases with no screenshot baseline changes.
