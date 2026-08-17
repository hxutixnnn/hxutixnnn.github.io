# tienOS design system

This is the web implementation contract derived from the captain-provided macOS 27 design specification.
When this document and a one-off visual choice conflict, prefer platform convention, accessibility, task clarity, consistency, then brand expression.

## Foundations

The source of truth for executable tienOS tokens is [`src/design-system.css`](../src/design-system.css). Glin's pinned Liquid Glass primitives enter through `@glinui/tokens/theme.css`; tienOS maps their generic semantic aliases back to its Light/Dark/Auto tokens and keeps accessibility overrides authoritative. Adopted Glin React sources are committed under [`src/components/ui`](../src/components/ui), so builds never fetch the registry.
Use semantic tokens for shared color, spacing, radius, typography, motion, and shadow foundations; keep component-specific values local until they are promoted to a shared token.
Author component presentation as complete Tailwind utility strings in JSX or TSX. Reserve [`src/styles.css`](../src/styles.css) for global tokens, resets, keyframes, accessibility overrides, and static pre-JavaScript contracts that utilities cannot reasonably own; `pnpm validate:css` enforces that boundary.

### Glin token ownership

Glin `@glinui/tokens@0.1.1` is the visual foundation for shared surfaces and controls. Its OKLCH accent pair, five glass elevations, blur and saturation tiers, refraction borders, glass shadows, spacing scale, and motion durations are authoritative. tienOS semantic names remain only as product-role aliases so application code can distinguish Menu, window, sidebar, content, control, and Dock intent:

| tienOS role              | Glin foundation                             |
| ------------------------ | ------------------------------------------- |
| Menu and Dock            | `--glass-4-surface`                         |
| Window                   | `--glass-5-surface` and `--shadow-glass-lg` |
| Sidebar                  | `--glass-4-surface`                         |
| Detail and content       | `--glass-2-surface`                         |
| Controls                 | `--glass-3-surface`                         |
| Spacing 1–6              | `--space-xs` through `--space-2xl`          |
| Fast and standard motion | `--motion-fast` and `--motion-normal`       |
| Accent                   | Glin-compatible OKLCH `--color-accent`      |

Blur and saturation are also role-mapped in `src/design-system.css`: Menu uses `--glass-blur-md` and `--glass-saturate`, Window uses `--glass-5-blur` and `--glass-saturate`, Sidebar uses `--glass-blur-lg` and `--glass-saturate-subtle`, and Dock and Spotlight use `--glass-4-blur` and `--glass-saturate`. Product surfaces consume the `--tienos-*` aliases rather than product-specific filter values.

The appearance service continues to own `data-theme`; [`src/design-system.css`](../src/design-system.css) projects Glin's official dark values onto tienOS's dark default and restores the official light values under `data-theme="light"`. Increased contrast, reduced transparency, reduced motion, and forced colors intentionally override visual tokens rather than creating a parallel surface system. Glin 0.1.1 publishes no typography tokens, so tienOS retains its semantic type sizes and system-font identity.

### Spacing

| Token              |         Value | Use                             |
| ------------------ | ------------: | ------------------------------- |
| `--tienos-space-1` |  `--space-xs` | Micro gaps and compact insets   |
| `--tienos-space-2` |  `--space-sm` | Control internals               |
| `--tienos-space-3` |  `--space-md` | Compact rows and related groups |
| `--tienos-space-4` |  `--space-lg` | Pane padding                    |
| `--tienos-space-5` |  `--space-xl` | Section separation              |
| `--tienos-space-6` | `--space-2xl` | Major groups                    |
| `--tienos-space-7` |          48px | Heroes and empty states         |

### Surfaces and color

Use semantic text, border, separator, accent, window, sidebar, content, control, and Dock tokens.
Light and dark values are selected by the root `data-theme` attribute. Components observe appearance through the typed Zustand adapter in [`src/stores/appearance.ts`](../src/stores/appearance.ts); runtime ownership and mutation boundaries are defined in the [`appearance architecture`](appearance-architecture.md), and components must not duplicate them.
Do not use color as the only indication of selection or status.
The system provides stronger contrast, opaque reduced-transparency surfaces, and forced-color mappings.

### Typography

tienOS prefers `Inter`, followed by the platform system-font stack.
Use weight, placement, and spacing before adding sizes.
Primary and settings content starts at 13px, secondary content at 12px, captions at 11px, and page titles at 23px.

### Shape

Corners are contextual rather than globally uniform:

- Menus: 14px
- Menu selection nested inside a menu: 10px
- Settings window: 24px
- Settings content groups: 14px
- Standalone compact controls: 10px

Nested radii must preserve concentric spacing.

### Motion

Use Glin's 150ms `--motion-fast` for immediate control feedback and 250ms `--motion-normal` for ordinary state transitions.
Spatial motion must communicate state or direct manipulation.
The wallpaper remains static regardless of motion preference. Light mode uses the bright Paweł Czerwiński ink-cloud wallpaper while Dark mode retains the original blurred wallpaper; Auto follows the live system theme. The resolved image is the only startup wallpaper preloaded and decoded before splash dismissal. Runtime changes settle the destination decode before applying the theme and use its color fallback if decoding fails.
After startup, a changed resolved theme uses the 280ms theme-motion token to crossfade the complete old document composition into the transactionally applied new one. Use the native View Transition API when available and an inert, aria-hidden old-frame layer otherwise; unchanged resolved themes and startup paint directly. Disable the crossfade for reduced motion, reduced transparency, increased contrast, forced colors, and hidden documents.

## Component contracts

The intentional hybrid boundary is behavioral: Base UI remains only for Menu/Menubar, ScrollArea, portaled Select, and custom-preview Radio controls because Glin 0.1.1 has no behavior-preserving counterpart. All of those controls consume the Glin/tienOS visual token layer rather than a separate Base UI theme. The version-pinned retained-interaction decisions live in [`docs/base-ui-inventory.md`](base-ui-inventory.md). Glin Input, Switch, and GlassCard are source-scaffolded at `glinui@0.1.1`; [`glinui.json`](../glinui.json) records the official source layout and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) records its source commit and license. Revisit both inventories whenever either source changes.

### Menu bar and menus

Use Base UI Menu and Menubar semantics, complete keyboard operation, familiar shortcuts, and semantic labels. Glin has no desktop Menubar, so this behavior-critical path intentionally remains Base UI while consuming Glin glass tokens for popup material.
Keep menu presentation compact. The menu bar is an edge-to-edge, non-glass transparent overlay with safe-area top padding, wallpaper-colored text, and a restrained text shadow; the static HTML mirrors those utilities to prevent startup style jumps. Popup menus share the Settings layered glass language: wallpaper-dependent translucent fills, blur and saturation, edge highlights, inner and outer shadows, and conventional radii. Their normal-theme separators are subtle one-pixel inset hairlines; increased contrast, reduced transparency, and forced colors restore stronger full-width rules. Resolved themes and those accessibility modes must retain legible opaque fallbacks.
Selection uses the accent token plus text and positional state, never color alone.

### Spotlight

Spotlight is a transient shell overlay opened by Command-Space or its named menu-bar button; it is not a Dock app or a window lifecycle owner. It searches the live desktop app registry, keeps one keyboard selection visible, and launches through the selected app's existing controller. Escape and desktop interaction dismiss it without changing frontmost window ownership, and dismissal restores focus to the invoking control when applicable.
Use a centered layered-glass search surface with an opaque reduced-transparency fallback, native forced-color mappings, reduced motion, coarse-pointer targets, and compact viewport bounds. Preserve dialog, combobox, listbox, option, active-descendant, empty-state, and contained-focus semantics across keyboard, pointer, and touch input.

### Windows

Desktop windows support pointer dragging, eight-direction resizing, viewport bounds, and minimum dimensions.
Window frames adapt reactively to the available workspace between the rendered menu-bar edge and Dock. Both surfaces are measured and observed for geometry changes rather than duplicated as spacing constants, and the safe-area inset further constrains the bottom boundary.
Compact layouts remain fully visible and fixed rather than scaling their contents.
Registered windows support one-finger dragging from their intended chrome and touch resizing through their `react-rnd` handles; interactive content and independently scrollable panes remain excluded from window dragging.
App windows are non-modal: opening, focusing, or transitioning one must not add a viewport-wide visual or pointer layer; the surrounding desktop, menu bar, Dock, other windows, and portaled popups retain their normal rendering and interaction.
Each registered window's named traffic-light buttons close the app, minimize it to the measured live Dock item, and toggle an app-contained fullscreen frame within the measured workspace. Fullscreen disables drag and resize and restores normal geometry according to the [`window geometry policy`](window-geometry.md); closing always discards fullscreen and reopens at the app's default frame. The minimize transition preserves the window frame and focus target, becomes noninteractive while in flight, and reduces to a short opacity transition when reduced motion is requested.
Traffic lights retain 13px desktop and 11px compact dots with 20px center spacing, producing restrained 7px and 9px visible gaps. Three overlapping 44px-square semantic buttons preserve names, tab order, and coarse-pointer height; invisible generated hit surfaces partition the 84px-wide cluster at the x=32 and x=52 dot midpoints into exclusive 32px, 20px, and 32px regions. The narrower horizontal ownership is the necessary web tradeoff for familiar visual spacing and deterministic nearest-dot routing to close, minimize, and fullscreen. Every point across the cluster interior belongs to exactly one control, focus renders only around the dot outside the hit surface without clipping, and the complete cluster remains above the splitter and inside the compact window.
Preserve a meaningful accessible window name.

### Dock

The bottom-centered Dock projects every registered app and exposes each app's running and minimized state separately from its launcher button. Activating an item opens that app's single window when closed, restores it when minimized, raises it when open but inactive, and minimizes it when already frontmost. Repeated activation must preserve exactly one window per app and settle in the state requested by the latest activation.
Keep the Dock inside horizontal viewport and bottom safe-area bounds, above windows and below portaled menus. Each app item retains a visible focus indicator, an explicit accessible name and tooltip, and a 56px mouse and touch target.
The Dock uses wallpaper-dependent layered glass with conventional radii, restrained transform feedback, opaque reduced-transparency and increased-contrast fallbacks, and native forced-color mappings. The static pre-JavaScript desktop mirrors its running appearance without exposing a deceptive launcher control.

### Sidebars

Use one icon, one title, and optional secondary text.
Rows remain plain and use one native-style selection highlight rather than individual cards.
Settings panes share one continuous window field without a contrasting gutter, hard edge, or separate detail background. The inset rounded sidebar remains distinguishable through its local translucent material, border, shadow, highlight, and spacing.
The Settings sidebar defaults to about 31% on desktop and 40% in compact layouts. Its visually transparent separator supports mouse and touch dragging plus Left/Right, Home, and End keyboard controls, exposes current and clamped percentage bounds, and recomputes safely with the window width. Hover, active, and keyboard focus reveal only a short localized grip; reduced transparency, increased contrast, and forced colors must not restore a full-height seam.
Sidebar navigation and detail content scroll independently when required. In normal themes their scrollbar tracks are transparent and their thumbs fill the track width; scrollbars stay hidden at rest and appear for active scrolling, focus, hover, or dragging. Increased contrast and forced colors provide explicit track and thumb colors.

### Content groups

Prefer a single content surface with whitespace and separators.
Reserve layered glass for the window shell and primary panes; avoid making nested controls glass or wrapping every row in a card.
Settings groups use separators for related rows and spacing between unrelated groups.

### Controls

All controls require accessible names.
Keyboard focus is visible through the semantic focus-ring token.
Pointer hover never provides the only route to functionality.
Icon-only controls retain an adequate click target and an explicit accessible label.

## Accessibility

The implementation must support:

- Visible keyboard focus
- Reduced motion
- Reduced transparency
- Increased contrast
- Forced colors
- Keyboard-only operation
- Accessible names and logical headings
- Text expansion without hiding primary actions
- Responsive reflow without scaling the interface

Any new component must be reviewed in its default state and under these preference modes.

## Intentional web product decisions

The desktop canvas follows the resolved Light, Dark, or Auto appearance and is scroll-locked because it models a bounded operating-system workspace.
Desktop labels remain non-selectable by the captain's product decision; content that users may need to copy must explicitly restore selection.
The sparkle system mark is the tienOS identity and replaces platform-vendor marks.
