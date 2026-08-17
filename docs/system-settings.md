# System Settings architecture

`src/apps/system-settings/SystemSettingsApp.tsx` owns the Settings application boundary: selected pane state, category search/navigation, current frame and sidebar percentage, separator input, independent sidebar/detail scroll areas, detail scroll reset, pane heading, and composition of the geometry port and `WindowFrame` slots.

`settingsPanes.ts` is a compile-time descriptor list. A descriptor combines `SettingsPaneMetadata` (`id`, `icon`, `label`, `colorClass`, `group`, and optional `hideHero`) with a directly imported `Component` that receives the pane metadata and Appearance demo-state bindings. The literal IDs form `SettingsPaneId`; they are behavioral identifiers independent of displayed labels and should not be renamed when copy changes.

Focused pane JSX lives under `panes/`. `SystemSettingsApp` owns session-local Appearance demo state so it survives pane navigation, composes the source-scaffolded Glin Input and GlassCard with the retained Base UI ScrollArea, and delegates the control boundary to the [design-system contract](design-system.md) and [Base UI inventory](base-ui-inventory.md). Persisted Light/Dark/Auto state is observed through the appearance store; the [`appearance architecture`](appearance-architecture.md) owns transaction responsibilities. `GeneralPane` retains direct row composition, and `PlaceholderPane` renders the existing category-specific empty state.

## Adding a pane

1. Create one focused pane component with direct JSX under `panes/`.
2. Add its stable ID and one descriptor to `settingsPanes.ts` in the intended navigation order and group.
3. Add rendered semantic coverage for its navigation, heading, content, and accessible controls.

Do not add a schema or generic form renderer. The list is not a runtime registry or plugin API and does not provide dynamic imports, service lookup, app registration, multi-window support, or an event bus. Panes must not query Menu, Dock, or window DOM, dispatch lifecycle internals, mutate frame geometry, or orchestrate appearance transactions. `WindowFrame`, the lifecycle controller, and the workspace geometry and appearance architecture owners retain those responsibilities.
