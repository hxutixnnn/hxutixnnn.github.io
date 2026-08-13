# App-keyed single-window lifecycle ownership

The current registry contains one retained System Settings instance, while the shell lifecycle boundary is keyed by `AppId` so each registered app receives an independent single-window controller.
Each app lifecycle is owned by the pure single-window machine and `useDesktopAppController`; this does not introduce same-app window IDs or z-order.
`App` composes projections for the menu, Dock, and registered window surfaces without deciding visibility transitions, keeping lifecycle counters, or owning effect transport.
`WindowFrame` projects state and executes typed effects through the narrow genie driver.
The driver reports generation-tagged settlement and never chooses lifecycle destination truth.
The `SystemSettingsApp` content boundary and pane ownership are documented in [`docs/system-settings.md`](system-settings.md).

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

The machine emits typed `FOCUS`, `START_TRANSITION`, and `CANCEL_TRANSITION` effects.
The controller is the sole owner of their ordered queue at the React boundary.
`WindowFrame` acknowledges the exact batch it processes by count, so effects appended during that render remain queued for the next pass.
`WindowFrame` solely owns physical animation, focus restoration, inertness, lifecycle data attributes, fullscreen coordination, chrome, and `react-rnd` mechanics.
`src/windows/transitions/genie.ts` owns run identity, interruption, live retargeting, settlement rejection, reduced motion, and cleanup.
Pure frame policy and shell workspace measurement are owned by [`docs/window-geometry.md`](window-geometry.md).
A registered app can reuse `WindowFrame` by supplying grouped lifecycle and geometry ports plus content; app identity stays at the shell/controller boundary.

## Invariants

- There is one presence and one visibility value per registered app; no independent open/minimized/visibility lifecycle truth exists.
- Closed state is inactive and not fullscreen. The state has no same-app window collection, window IDs, z-order, or persistence.
- A completion whose generation is not current is a no-op. Close/relaunch therefore cannot consume a stale minimize or restore request.
- Dock and menu activation are deterministic under repetition; an activation that reverses a transition supersedes the prior generation.
- Fullscreen is app-contained and survives minimize/restore; closing starts a fresh normal window.
- Focus requests use the reducer's epoch. Restore focus is emitted only when the current restore settles visibly.

## Extension boundary and non-goals

Each registered app is intentionally a single-window owner. `src/desktop/apps.ts` owns static descriptors, and the shell projects those descriptors into Dock launchers and app-keyed controller state. This phase does not define `WindowId`, same-app collections, z-order, event buses, persistence, external-app execution, or a generalized window framework. Appearance services, styling changes, and multi-window behavior remain separate roadmap phases.

## Phase 1 measurements

The declaration count includes each React state or ref that stores lifecycle truth, a lifecycle request, or a generation/focus delivery counter. It excludes props and projected values, geometry and DOM refs, and non-lifecycle Settings state. Typed effect transport and physical adapter bookkeeping are reported separately because neither is authoritative lifecycle truth.

| Location                                            | Audit baseline | Phase 1 | Change                                                                          |
| --------------------------------------------------- | -------------: | ------: | ------------------------------------------------------------------------------- |
| `App` lifecycle state/ref/counter declarations      |             10 |       0 | Replaced by the controller's reducer state.                                     |
| `SystemSettings` independent lifecycle declarations |              7 |       0 | Replaced by reducer projections and typed effects.                              |
| Controller authoritative lifecycle state            |              0 |       1 | One reducer state containing the six documented fields.                         |
| `App` effect-transport declarations                 |              0 |       1 | One typed effect queue; it cannot decide lifecycle state.                       |
| `SystemSettings` physical adapter refs/counters     |              3 |       4 | Animation run, transition, deferred-frame, and focus delivery bookkeeping only. |

Lifecycle decision predicates count one `if` or conditional expression that selects or guards a lifecycle state mutation or typed effect; a compound predicate counts once. Event classification and physical DOM, animation, frame, and rendering guards are excluded. Applying that definition to the base commit and this phase gives:

| Lifecycle owner                | Audit baseline | Phase 1 |
| ------------------------------ | -------------: | ------: |
| `App`                          |             12 |       0 |
| `SystemSettings`               |             11 |       0 |
| `singleWindowMachine`          |              0 |      18 |
| **Total lifecycle predicates** |         **23** |  **18** |

The audit baseline's coverage-enabled validation measured 6 files and 19 tests in 15.61s. The comparable Phase 1 `pnpm validate` run, recorded before the documentation-only exhaustive-table expansion, measured 8 files and 38 tests in 18.91s. The expanded current suite enumerates 8 files and 127 tests; its focused reducer/property measurement covers 99 tests in 2.66s and reports 98.5% branch coverage for `singleWindowMachine`. These current totals include all 90 parameterized reachable-state/event table cases.

The baseline output checker measured 147.7 KiB JavaScript gzip; this phase measures 148.6 KiB (+0.9 KiB, below the 2 KiB budget). The audit-baseline and Phase 1 exact-`dist/` browser runs each pass all 65 cases in 2.8m, with no screenshot baseline changes. `pnpm validate` and `pnpm build` pass for Phase 1.
