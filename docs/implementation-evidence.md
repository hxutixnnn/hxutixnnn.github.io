# Tien OS implementation evidence

**Measured:** 2026-08-05 on the production static build (`pnpm build`).

This record captures the durable before/after and visual checks for the first Tien OS baseline. It complements the licensing and selection record in [`visual-baseline.md`](visual-baseline.md).

## Before and after

| Area            | Backup baseline `69aa4f4`                                                                    | Tien OS baseline                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime         | Gatsby `^3.6.1`, React `^17.0.2`, LekoArts theme `^3.0.0`; no pinned Node or package manager | Astro `7.1.6` static output, React `19.2.8`, TypeScript `6.0.3`, exact Node `22.23.1` and pnpm `11.10.0`                                |
| Presentation    | Theme-driven blog with no app/window model or responsive OS policy                           | Original glass-and-depth desktop, semantic menu/launcher, tested reducer, real lazy app surfaces, and mobile single-surface switcher    |
| Domain artifact | `static/CNAME` contained `nguyenhuutien.com`                                                 | The output checker rejects `dist/CNAME`; canonical metadata and Pages deployment target only `https://hxutixnnn.github.io/`             |
| Delivery        | Gatsby build; no repository CI/browser suite                                                 | 48 generated pages, 47 canonical HTML routes checked, RSS and modern/legacy sitemaps, PR validation, and GitHub Pages artifact workflow |
| Assets          | Starter theme assets plus a 468 KiB banner                                                   | Original generated 159.4 KiB banner; every shipped binary recorded with checksum in `src/assets/provenance.yml`                         |

The existing pages, five posts, editorial images, resume, and canonical content routes remain available. Each catalogue entry also has useful static `/apps/<id>/` HTML without requiring JavaScript.

## Reuse boundary

Tien OS uses the asset-free, MIT-licensed `react-rnd@10.5.3` at upstream ref [`fec7303134ab0f0bbe83fdf975ddc15c340f7e5d`](https://github.com/bokuweb/react-rnd/tree/fec7303134ab0f0bbe83fdf975ddc15c340f7e5d) for desktop drag, bounds, and eight-way resize. The lockfile pins integrity `sha512-s/sIT3pGZnQ+57egijkTp9mizjIWrJz68Pq6yd+F/wniFY3IriML18dUXnQe/HP9uMiJ+9MAp44hljG99fZu6Q==`.

Desktop interaction primitives come from the pinned, asset-free, MIT-licensed `@base-ui/react@1.6.0` (see [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)); menu, popover, dialog, switch, slider, and tooltip behavior is upstream, while Tien OS owns the coordinated menubar roving, Spotlight ranking/activation, Control Center binding to the settings store, window chrome, dock magnification, and mobile policy.

Controlled resize dimensions are mirrored only into `WindowFrame` component-local draft state while the pointer moves, committed once to the headless reducer on stop, and then cleared. The mobile path does not mount `react-rnd`. Tien OS owns visuals, routes, focus, persistence, semantics, and responsive policy. The full MIT notices and dependency copyrights are retained in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Built-output and browser evidence

- `scripts/check-static-output.mjs`: **47 HTML routes**, **148.7 KiB** first-party JavaScript gzip, **7.7 KiB** CSS gzip, and **159.4 KiB** banner. Limits are 160 KiB (raised from 100 KiB by the approved Base UI budget), 30 KiB, and 250 KiB respectively.
- The build-time app catalogue records **11 owned public repositories** and maps 10 to external apps; `hxutixnnn.github.io` is represented by Tien OS itself. It also maps all **5 published social profiles** to exact new-tab destinations.
- Vitest: **9 files / 42 tests** passed, including reducer properties (snap included), persistence validation (windows and OS settings), repository/social mapping, safe external launch behavior, catalogue schema, and shell components.
- Playwright against `dist/` through `astro preview`: **15 tests** cover desktop lifecycle/drag/resize/persistence, keyboard menus and focus, direct/no-JS routes, axe, no third-party requests, lazy app code, 320/375/390/430 px viewports, breakpoint transitions, a 200%-zoom-equivalent CSS viewport, forced colors, and reduced motion.
- Lighthouse static-output runs:

  | Route          | Performance | Accessibility | Best practices | SEO |    LCP |    CLS |
  | -------------- | ----------: | ------------: | -------------: | --: | -----: | -----: |
  | `/`            |         100 |           100 |            100 | 100 | 327 ms | 0.0089 |
  | `/about/`      |         100 |            98 |            100 | 100 | 203 ms |      0 |
  | `/apps/about/` |         100 |           100 |            100 | 100 | 324 ms | 0.0089 |

Scores are one local desktop run with the pinned Playwright Chromium and are gates, not field-performance claims.

## Visual and interaction review

`chrome-devtools-axi` inspected the built artifact, not the development server:

- **1440×900:** the Golden Gate dusk wallpaper rendered edge to edge; the slim 30 px menu bar, dock with six original app glyphs, and traffic-light window controls had clear depth and readable contrast. The menu bar, Control Center, Spotlight, dock, and all three desktop window controls were exposed by name in the accessibility tree.
- **390×844:** `.portfolio-shell` switched to `is-mobile`; the About surface measured `x=8`, `y=60`, `width=374`, `height=708`. Both document and body scroll widths were exactly **390 px**. Desktop resize/maximize controls disappeared, while close/minimize and the responsive four-item launcher remained at least 44 px.
- The mobile switcher opened as a named modal dialog, focused its named close control, dimmed the underlying surface, and exposed separate switch/close controls for the running app.
- The southeast resize handle center resolved to a resize handle with pointer events enabled. The browser lifecycle test dragged that center and asserted the `.window-positioner` width increased before confirming persistence after reload.

Temporary review screenshots were deliberately kept outside the repository because the implementation is reproducible and no binary visual baseline is needed for maintenance.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm validate
pnpm build
pnpm test:e2e
CHROME_PATH=<playwright-chromium> pnpm test:lighthouse
```

CI executes the same build and browser gates before packaging `dist/`.
