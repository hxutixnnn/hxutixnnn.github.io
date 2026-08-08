# tienOS design system

This is the web implementation contract derived from the captain-provided macOS 27 design specification.
When this document and a one-off visual choice conflict, prefer platform convention, accessibility, task clarity, consistency, then brand expression.

## Foundations

The source of truth for executable tokens is [`src/design-system.css`](../src/design-system.css).
Use semantic tokens for shared color, spacing, radius, typography, motion, and shadow foundations; keep component-specific values local until they are promoted to a shared token.
Author component presentation as complete Tailwind utility strings in JSX or TSX. Reserve [`src/styles.css`](../src/styles.css) for global tokens, resets, keyframes, accessibility overrides, and static pre-JavaScript contracts that utilities cannot reasonably own; `pnpm validate:css` enforces that boundary.

### Spacing

| Token              | Value | Use                             |
| ------------------ | ----: | ------------------------------- |
| `--tienos-space-1` |   4px | Micro gaps and compact insets   |
| `--tienos-space-2` |   8px | Control internals               |
| `--tienos-space-3` |  12px | Compact rows and related groups |
| `--tienos-space-4` |  16px | Pane padding                    |
| `--tienos-space-5` |  24px | Section separation              |
| `--tienos-space-6` |  32px | Major groups                    |
| `--tienos-space-7` |  48px | Heroes and empty states         |

### Surfaces and color

Use semantic text, border, separator, accent, window, sidebar, content, control, Dock, and scrim tokens.
Light and dark values are selected by the root `data-theme` attribute. The typed Zustand store in [`src/stores/appearance.ts`](../src/stores/appearance.ts) is the single runtime owner of appearance state; components must not own or duplicate it.
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

Use 120ms for immediate control feedback and 200ms for ordinary state transitions.
Spatial motion must communicate state or direct manipulation.
Continuous wallpaper motion runs only when reduced motion is not requested. Light mode uses the bright Paweł Czerwiński ink-cloud wallpaper while Dark mode retains the original blurred wallpaper; Auto follows the live system theme. The resolved image is the only startup wallpaper preloaded and decoded before splash dismissal. Runtime changes settle the destination decode before applying the theme and use its color fallback if decoding fails.
After startup, a changed resolved theme uses the 280ms theme-motion token to crossfade the complete old document composition into the transactionally applied new one. Use the native View Transition API when available and an inert, aria-hidden old-frame layer otherwise; unchanged resolved themes and startup paint directly. Disable the crossfade for reduced motion, reduced transparency, increased contrast, forced colors, and hidden documents.

## Component contracts

The version-pinned audit and adoption decisions for every installed Base UI export live in [`docs/base-ui-inventory.md`](base-ui-inventory.md). Revisit that inventory whenever `@base-ui/react` changes version or a new interaction is added.

### Menu bar and menus

Use Base UI menu semantics, complete keyboard operation, familiar shortcuts, and semantic labels.
Keep menu presentation compact. The menu bar is an edge-to-edge, non-glass transparent overlay with safe-area top padding, wallpaper-colored text, and a restrained text shadow; the static HTML mirrors those utilities to prevent startup style jumps. Popup menus share the Settings layered glass language: wallpaper-dependent translucent fills, blur and saturation, edge highlights, inner and outer shadows, and conventional radii. Their normal-theme separators are subtle one-pixel inset hairlines; increased contrast, reduced transparency, and forced colors restore stronger full-width rules. Resolved themes and those accessibility modes must retain legible opaque fallbacks.
Selection uses the accent token plus text and positional state, never color alone.

### Windows

Desktop windows support pointer dragging, eight-direction resizing, viewport bounds, and minimum dimensions.
Window frames adapt reactively to the available workspace between the rendered menu-bar edge and Dock. Both surfaces are measured and observed for geometry changes rather than duplicated as spacing constants, and the safe-area inset further constrains the bottom boundary.
Compact layouts remain fully visible and fixed rather than scaling their contents.
The Settings window supports one-finger dragging from its intended chrome and touch resizing through its `react-rnd` handles; interactive content and independently scrollable panes remain excluded from window dragging.
Preserve a meaningful accessible window name.

### Dock

The bottom-centered Dock contains one System Settings app item. Activating it opens the single Settings window when closed or focuses the existing window when open; its running indicator follows that lifecycle without adding a minimize action.
Keep the Dock inside horizontal viewport and bottom safe-area bounds, above windows and below portaled menus. Its app item retains a visible focus indicator, an explicit accessible name and tooltip, and a 56px mouse and touch target.
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
