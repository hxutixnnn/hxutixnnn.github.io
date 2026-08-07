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

Use semantic text, border, separator, accent, window, sidebar, content, control, and scrim tokens.
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
Continuous wallpaper motion runs only when reduced motion is not requested.

## Component contracts

### Menu bar and menus

Use Base UI menu semantics, complete keyboard operation, familiar shortcuts, and semantic labels.
Keep menu presentation compact. The top surface uses Tailwind-owned translucent gradient layers, pseudo-element edge highlights, backdrop blur/saturation, and inset/drop shadows; reduced transparency replaces it with the opaque menu token, while increased contrast and forced colors remove ambiguous transparency. The static HTML mirrors the same utilities to prevent startup material jumps. No menu-bar effect is retained in global CSS; only the existing document, keyframe, and accessibility contracts remain there because utilities cannot consistently target those global states.
Selection uses the accent token plus text and positional state, never color alone.

### Windows

Desktop windows support pointer dragging, eight-direction resizing, viewport bounds, and minimum dimensions.
Window frames adapt reactively to the available viewport. Their top drag boundary is measured from the rendered menu-bar edge and observed for geometry changes rather than duplicated as a spacing constant.
Compact layouts remain fully visible and fixed rather than scaling their contents.
Preserve a meaningful accessible window name.

### Sidebars

Use one icon, one title, and optional secondary text.
Rows remain plain and use one native-style selection highlight rather than individual cards.
Settings sidebars use an inset rounded material panel that remains visually separate from the primary content.
Sidebar navigation and detail content scroll independently when required; their scrollbars stay hidden at rest and appear for active scrolling, focus, hover, or dragging.

### Content groups

Prefer a single content surface with whitespace and separators.
Avoid glass-on-glass and card-within-card nesting.
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
