# System Settings architecture

`src/apps/system-settings/SystemSettingsApp.tsx` owns the Settings application boundary: selected pane state, category search/navigation, sidebar sizing and separator input, independent sidebar/detail scroll areas, detail scroll reset, pane heading, and composition in `WindowFrame` slots.

`settingsPanes.ts` is a compile-time descriptor list. Each descriptor has a stable `SettingsPaneId` that is independent of its displayed label, navigation metadata, group, and a directly imported React component. IDs are behavioral identifiers and should not be renamed when copy changes.

Focused pane JSX lives under `panes/`. `SystemSettingsApp` owns session-local Appearance demo state so it survives pane navigation, while `AppearancePane` remains the bespoke Base UI renderer. Persisted Light/Dark/Auto state and appearance transactions remain owned by the appearance store. `GeneralPane` retains direct row composition, and `PlaceholderPane` renders the existing category-specific empty state.

## Adding a pane

1. Create one focused pane component with direct JSX under `panes/`.
2. Add its stable ID and one descriptor to `settingsPanes.ts` in the intended navigation order and group.
3. Add rendered semantic coverage for its navigation, heading, content, and accessible controls.

Do not add a schema or generic form renderer. The list is not a runtime registry or plugin API and does not provide dynamic imports, service lookup, app registration, multi-window support, or an event bus. Panes must not query Menu, Dock, or window DOM, dispatch lifecycle internals, mutate frame geometry, or orchestrate appearance transactions. `WindowFrame`, the lifecycle controller, workspace geometry owner, and appearance store retain those responsibilities.
