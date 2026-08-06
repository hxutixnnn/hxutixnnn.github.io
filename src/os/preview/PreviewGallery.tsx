import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import { Switch } from "@base-ui/react/switch";
import { appCatalogue } from "@/apps/catalog";
import type { CoreAppId } from "@/apps/contract";
import type { Rect, Viewport, WindowState } from "@/os/domain/windows";
import { AppIcon, SystemMark } from "@/os/shell/AppIcon";
import { Dock } from "@/os/shell/Launcher";
import { MenuBar } from "@/os/shell/MenuBar";
import { Spotlight } from "@/os/shell/Spotlight";
import {
  BatteryIcon,
  CloseGlyph,
  ControlCenterIcon,
  FullscreenGlyph,
  MinimizeGlyph,
  RestoreGlyph,
  SpotlightIcon,
  TrashIcon,
  WifiIcon,
} from "@/os/shell/StatusIcons";
import { WindowFrame } from "@/os/shell/WindowFrame";
import { PreviewSegmentedControl, PreviewTabs } from "@/os/preview/PreviewSelectionControls";
import "@/styles/preview.css";

const previewApps = appCatalogue.slice(0, 13);
const previewRunning: readonly CoreAppId[] = ["about", "projects"];
const previewViewport: Viewport = { width: 540, height: 336 };
const previewWindowInitial: WindowState = {
  id: "window-99",
  appId: "about",
  status: "open",
  rect: { x: 20, y: 22, width: 496, height: 282 },
  z: 1,
};

const filterItems = [
  { title: "Glass materials", meta: "Surfaces · layered translucency" },
  { title: "Window chrome", meta: "Focused · unfocused · maximized" },
  { title: "Spotlight", meta: "Search · results · empty state" },
  { title: "Dock", meta: "Selected · running · minimized" },
];

function SectionHeading({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <header className="preview-section__heading">
      <span className="preview-section__index">{index}</span>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </header>
  );
}

function SampleLabel({ children }: { children: ReactNode }) {
  return <p className="preview-sample-label">{children}</p>;
}

function TrafficLights({
  label = "Window controls",
  maximized = false,
}: {
  label?: string;
  maximized?: boolean;
}) {
  return (
    <div className="preview-traffic-lights" aria-label={label} role="img">
      <span className="preview-traffic-light preview-traffic-light--close">
        <CloseGlyph />
      </span>
      <span className="preview-traffic-light preview-traffic-light--minimize">
        <MinimizeGlyph />
      </span>
      <span className="preview-traffic-light preview-traffic-light--maximize">
        {maximized ? <RestoreGlyph /> : <FullscreenGlyph />}
      </span>
    </div>
  );
}

function StaticWindowVariant({
  state,
  title,
  caption,
}: {
  state: "focused" | "unfocused" | "maximized";
  title: string;
  caption: string;
}) {
  return (
    <article className={`preview-window-variant preview-window-variant--${state}`}>
      <div className="preview-window-variant__bar">
        <TrafficLights label={`${title} window controls`} maximized={state === "maximized"} />
        <strong>{title}</strong>
        <span aria-hidden="true">↗</span>
      </div>
      <div className="preview-window-variant__body">
        <span className="preview-window-variant__spark" aria-hidden="true" />
        <p>{caption}</p>
      </div>
    </article>
  );
}

function PreviewWindow() {
  const [windowState, setWindowState] = useState<WindowState>(previewWindowInitial);
  const [windowOpen, setWindowOpen] = useState(true);
  const [announcement, setAnnouncement] = useState("Window ready");

  function restore() {
    setWindowState((current) => ({ ...current, status: "open" }));
    setWindowOpen(true);
    setAnnouncement("Representative window restored");
  }

  function toggleMaximize() {
    setWindowState((current) => {
      if (current.status === "maximized") {
        const next: WindowState = { ...current, status: "open", rect: previewWindowInitial.rect };
        delete next.restoreRect;
        return next;
      }
      return { ...current, status: "maximized", restoreRect: current.rect };
    });
    setAnnouncement(windowState.status === "maximized" ? "Window restored" : "Window maximized");
  }

  return (
    <div className="preview-window-demo">
      <div className="preview-window-stage" aria-label="Interactive representative app window">
        {windowOpen ? (
          <WindowFrame
            window={windowState}
            title="About"
            viewport={previewViewport}
            mobile={false}
            focused
            minimizing={false}
            resizable
            registerFrame={() => undefined}
            onFocus={() => setAnnouncement("Representative window focused")}
            onClose={() => {
              setWindowOpen(false);
              setAnnouncement("Representative window closed");
            }}
            onRequestMinimize={() => {
              setWindowOpen(false);
              setWindowState((current) => ({ ...current, status: "minimized" }));
              setAnnouncement("Representative window minimized");
            }}
            onMinimizeAnimationEnd={() => undefined}
            onToggleMaximize={toggleMaximize}
            onMove={(x, y) => setWindowState((current) => ({ ...current, rect: { ...current.rect, x, y } }))}
            onResize={(rect: Rect) => setWindowState((current) => ({ ...current, rect }))}
            onSnap={(position) => {
              const half = Math.round(previewViewport.width / 2);
              setWindowState((current) => ({
                ...current,
                status: "open",
                rect:
                  position === "left"
                    ? { x: 0, y: 0, width: half, height: previewViewport.height }
                    : { x: half, y: 0, width: previewViewport.width - half, height: previewViewport.height },
              }));
              setAnnouncement(`Window snapped ${position}`);
            }}
          >
            <div className="preview-representative-app">
              <span className="preview-representative-app__kicker">PERSONAL SYSTEM / ABOUT</span>
              <h3>A small surface with a clear job.</h3>
              <p>
                This live frame uses the same traffic-light controls, focus behavior, drag, resize, and
                maximize contract as the production shell.
              </p>
              <a className="preview-text-button" href="/apps/about/">
                Read detail →
              </a>
              <div className="preview-representative-app__metrics">
                <span>
                  <strong>07</strong> surfaces
                </span>
                <span>
                  <strong>01</strong> system
                </span>
                <span>
                  <strong>∞</strong> ideas
                </span>
              </div>
            </div>
          </WindowFrame>
        ) : (
          <div className="preview-window-closed" role="status">
            <span className="preview-window-closed__icon" aria-hidden="true">
              ↘
            </span>
            <strong>Window {windowState.status === "minimized" ? "minimized" : "closed"}</strong>
            <button type="button" className="preview-button preview-button--secondary" onClick={restore}>
              Restore sample
            </button>
          </div>
        )}
      </div>
      <p className="preview-window-demo__announcement" role="status" aria-live="polite">
        {announcement}
      </p>
      <div className="preview-window-demo__actions" aria-label="Window sample actions">
        <button type="button" className="preview-button preview-button--secondary" onClick={restore}>
          Restore
        </button>
        <button
          type="button"
          className="preview-button preview-button--secondary"
          onClick={toggleMaximize}
          disabled={!windowOpen}
        >
          {windowState.status === "maximized" ? "Restore size" : "Maximize"}
        </button>
      </div>
    </div>
  );
}

function PreviewSystemSurface() {
  const [announcement, setAnnouncement] = useState("System surface ready");
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightMode, setSpotlightMode] = useState<"populated" | "empty">("populated");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  function openSpotlight(mode: "populated" | "empty") {
    setSpotlightMode(mode);
    setSpotlightOpen(true);
    setAnnouncement(`${mode === "empty" ? "Empty" : "Populated"} Spotlight opened`);
  }

  return (
    <>
      <div className="preview-system-stage">
        <MenuBar
          activeTitle="Preview Gallery"
          hasActiveWindow
          mobile={false}
          onOpenAbout={() => setAnnouncement("About action selected")}
          onClose={() => setAnnouncement("Close action selected")}
          onMinimize={() => setAnnouncement("Minimize action selected")}
          onMaximize={() => setAnnouncement("Maximize action selected")}
          documentUrl="/about/"
          onOpenSpotlight={() => openSpotlight("populated")}
          announce={setAnnouncement}
          persistSettings={false}
        />
        <div className="preview-system-stage__copy">
          <span className="preview-eyebrow">LIVE SYSTEM CHROME</span>
          <h3>Menu bar, menus, status, and Control Center</h3>
          <p>
            Use the top-left menus, the sliders and switches in Control Center, or the magnifier for
            Spotlight.
          </p>
          <div className="preview-system-stage__actions">
            <button
              type="button"
              className="preview-button preview-button--primary"
              onClick={() => openSpotlight("populated")}
            >
              Open populated Spotlight
            </button>
            <button
              type="button"
              className="preview-button preview-button--secondary"
              onClick={() => openSpotlight("empty")}
            >
              Open empty Spotlight
            </button>
          </div>
        </div>
        <Dock
          running={previewRunning}
          selected="about"
          minimized={[{ ...previewWindowInitial, id: "window-100", appId: "blog", status: "minimized" }]}
          bounceToken={null}
          onOpen={(id) => setAnnouncement(`${id} selected from Dock`)}
          onRestoreMinimized={(id) => setAnnouncement(`${id} restored from Dock`)}
          onTrash={() => setAnnouncement("Trash selected")}
        />
      </div>
      <div className="preview-system-status" role="status" aria-live="polite">
        {announcement}
      </div>

      <div className="preview-overlay-actions">
        <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
          <Popover.Trigger
            className="preview-button preview-button--secondary"
            aria-label="Open material popover"
          >
            Open popover
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner
              className="preview-popover-positioner"
              side="bottom"
              align="start"
              sideOffset={8}
            >
              <Popover.Popup className="preview-popover" aria-label="Material notes">
                <strong>Material notes</strong>
                <p>Blur is bounded, optional, and always paired with a solid fallback.</p>
                <button type="button" className="preview-text-button" onClick={() => setPopoverOpen(false)}>
                  Close
                </button>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger className="preview-button preview-button--primary">Open dialog</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="preview-dialog-backdrop" />
            <Dialog.Popup className="preview-dialog" aria-labelledby="preview-dialog-title">
              <span className="preview-eyebrow">COMPONENT CONTRACT</span>
              <h3 id="preview-dialog-title">A focused decision</h3>
              <p>Dialogs trap focus, announce their title, and return focus to the trigger when dismissed.</p>
              <div className="preview-dialog__actions">
                <button
                  type="button"
                  className="preview-button preview-button--secondary"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="preview-button preview-button--primary"
                  onClick={() => {
                    setDialogOpen(false);
                    setAnnouncement("Dialog confirmed");
                  }}
                >
                  Confirm sample
                </button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <Spotlight
        key={`${spotlightMode}-${spotlightOpen ? "open" : "closed"}`}
        open={spotlightOpen}
        initialQuery={spotlightMode === "empty" ? "zzzz" : ""}
        onOpenChange={setSpotlightOpen}
        onOpenApp={(id) => setAnnouncement(`${id} opened from Spotlight`)}
        onOpenExternal={(id) => setAnnouncement(`${id} would open in a new tab`)}
        onNavigate={(url) => setAnnouncement(`${url} selected`)}
        onAnnounce={setAnnouncement}
      />
    </>
  );
}

function PreviewControls() {
  const [switchEnabled, setSwitchEnabled] = useState(true);
  const [sliderValue, setSliderValue] = useState(0.68);
  const [segment, setSegment] = useState("All");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [noticeVisible, setNoticeVisible] = useState(true);
  const filteredItems = useMemo(
    () =>
      filterItems.filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <>
      <div className="preview-subgrid preview-subgrid--controls">
        <article className="preview-card preview-card--wide">
          <SampleLabel>Buttons</SampleLabel>
          <div className="preview-control-row">
            <button type="button" className="preview-button preview-button--primary">
              Primary action
            </button>
            <button type="button" className="preview-button preview-button--secondary">
              Secondary
            </button>
            <button type="button" className="preview-button preview-button--destructive">
              Delete
            </button>
            <button type="button" className="preview-icon-button" aria-label="More options">
              •••
            </button>
            <button
              type="button"
              className="preview-icon-button preview-icon-button--selected"
              aria-label="Favorite selected"
            >
              ★
            </button>
          </div>
          <div className="preview-control-row preview-control-row--links">
            <a href="#controls">Inline link</a>
            <a className="preview-link--quiet" href="#states">
              Quiet link
            </a>
            <button type="button" className="preview-text-button">
              Text action →
            </button>
          </div>
        </article>

        <article className="preview-card">
          <SampleLabel>Fields and search</SampleLabel>
          <label className="preview-field">
            <span>Project name</span>
            <input type="text" defaultValue="Golden hour notes" />
          </label>
          <label className="preview-field preview-search-field">
            <span>Filter components</span>
            <span className="preview-search-field__input">
              <SpotlightIcon />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search components"
              />
            </span>
          </label>
        </article>

        <article className="preview-card">
          <SampleLabel>Switch and slider</SampleLabel>
          <div className="preview-setting-row">
            <span>
              <strong>Focus mode</strong>
              <small>Reduce distractions</small>
            </span>
            <Switch.Root
              className="preview-switch"
              checked={switchEnabled}
              onCheckedChange={setSwitchEnabled}
              aria-label="Focus mode"
            >
              <Switch.Thumb className="preview-switch__thumb" />
            </Switch.Root>
          </div>
          <div className="preview-slider-row">
            <Slider.Root
              className="preview-slider"
              value={sliderValue}
              min={0}
              max={1}
              step={0.01}
              onValueChange={setSliderValue}
            >
              <Slider.Label className="preview-slider-row__label">
                Level <output>{Math.round(sliderValue * 100)}%</output>
              </Slider.Label>
              <Slider.Control className="preview-slider__control">
                <Slider.Track className="preview-slider__track">
                  <Slider.Indicator className="preview-slider__indicator" />
                  <Slider.Thumb className="preview-slider__thumb" aria-label="Level" />
                </Slider.Track>
              </Slider.Control>
            </Slider.Root>
          </div>
        </article>

        <article className="preview-card preview-card--wide">
          <SampleLabel>Segments and tabs</SampleLabel>
          <PreviewSegmentedControl
            label="Filter sample"
            options={[
              { id: "All", label: "All" },
              { id: "Core", label: "Core" },
              { id: "Social", label: "Social" },
            ]}
            value={segment}
            onChange={setSegment}
          />
          <PreviewTabs
            idPrefix="preview-content"
            label="Preview content tabs"
            options={[
              { id: "overview", label: "Overview", panel: "A compact, calm control surface." },
              { id: "details", label: "Details", panel: "Every action keeps its native role and label." },
              {
                id: "notes",
                label: "Notes",
                panel: "Focus rings, contrast, and reduced motion are part of the system.",
              },
            ]}
            value={tab}
            onChange={setTab}
          />
        </article>
      </div>

      <div className="preview-subgrid preview-subgrid--feedback">
        <article className="preview-card">
          <SampleLabel>Badges</SampleLabel>
          <div className="preview-badge-row">
            <span className="preview-badge preview-badge--accent">New</span>
            <span className="preview-badge preview-badge--success">Ready</span>
            <span className="preview-badge preview-badge--warning">Review</span>
            <span className="preview-badge preview-badge--muted">Draft</span>
          </div>
        </article>
        <article className="preview-card">
          <SampleLabel>Notice</SampleLabel>
          {noticeVisible ? (
            <div className="preview-notice" role="status">
              <span className="preview-notice__icon" aria-hidden="true">
                i
              </span>
              <p>
                <strong>Local and reversible.</strong> This gallery never makes a network request.
              </p>
              <button type="button" aria-label="Dismiss notice" onClick={() => setNoticeVisible(false)}>
                ×
              </button>
            </div>
          ) : (
            <button type="button" className="preview-text-button" onClick={() => setNoticeVisible(true)}>
              Show notice
            </button>
          )}
        </article>
        <article className="preview-card">
          <SampleLabel>Filtered list</SampleLabel>
          <ul className="preview-list">
            {filteredItems.map((item) => (
              <li key={item.title}>
                <span className="preview-list__dot" aria-hidden="true" />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                </span>
                <span aria-hidden="true">›</span>
              </li>
            ))}
          </ul>
          {filteredItems.length === 0 && <p className="preview-muted">No components match “{query}”.</p>}
        </article>
      </div>
    </>
  );
}

export default function PreviewGallery() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.body.dataset.previewTheme = theme;
    return () => {
      delete document.body.dataset.previewTheme;
    };
  }, [theme]);

  return (
    <div className={`preview-page preview-page--${theme}`} data-preview-theme={theme}>
      <a className="preview-skip-link" href="#preview-main">
        Skip to component gallery
      </a>
      <header className="preview-header">
        <a className="preview-brand" href="/" aria-label="Back to Tien OS home">
          <SystemMark />
          <span>Tien OS</span>
        </a>
        <nav aria-label="Preview navigation">
          <a href="#tokens">Tokens</a>
          <a href="#controls">Controls</a>
          <a href="#shell">Shell</a>
        </nav>
        <a className="preview-back-link" href="/">
          Back to Tien OS <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="preview-main" className="preview-main">
        <section className="preview-hero" aria-labelledby="preview-title">
          <div className="preview-hero__copy">
            <p className="preview-eyebrow">TIEN OS / VISUAL CHECKPOINT / V1</p>
            <h1 id="preview-title">UI components for a calmer desktop.</h1>
            <p className="preview-hero__lede">
              A reviewable gallery of the proposed macOS 27-inspired direction: layered glass, precise
              typography, quiet controls, and a responsive system that stays useful at 320px.
            </p>
            <div className="preview-hero__actions">
              <a className="preview-button preview-button--primary" href="/">
                Open Tien OS
              </a>
              <a className="preview-button preview-button--secondary" href="/about/">
                View document mode
              </a>
            </div>
          </div>
          <aside className="preview-hero__aside" aria-label="Preview status">
            <span className="preview-status-dot" aria-hidden="true" />
            <strong>Checkpoint 01</strong>
            <p>Preview only · production shell unchanged</p>
            <button
              type="button"
              className="preview-appearance-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} preview appearance`}
            >
              <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>{" "}
              {theme === "dark" ? "Light" : "Dark"} appearance
            </button>
          </aside>
        </section>

        <nav className="preview-toc" aria-label="Component sections">
          <a href="#tokens">
            <span>01</span>Tokens
          </a>
          <a href="#materials">
            <span>02</span>Materials
          </a>
          <a href="#controls">
            <span>03</span>Controls
          </a>
          <a href="#states">
            <span>04</span>States
          </a>
          <a href="#icons">
            <span>05</span>Icons
          </a>
          <a href="#shell">
            <span>06</span>Shell
          </a>
        </nav>

        <section id="tokens" className="preview-section" aria-labelledby="tokens-title">
          <SectionHeading index="01" title="Design tokens and typography">
            The grammar underneath every surface: cool neutrals, coastal color, measured depth, and
            system-first type.
          </SectionHeading>
          <div className="preview-token-layout">
            <div className="preview-token-swatches" aria-label="Color tokens">
              {[
                ["Ink", "#f5f7ff", "Primary text"],
                ["Soft ink", "#d3d9ee", "Secondary text"],
                ["Azure", "#9fdcff", "Action accent"],
                ["Orchid", "#c9b6ff", "Secondary accent"],
                ["Focus", "#ffe28a", "Keyboard focus"],
                ["Deep", "#0b101f", "Canvas"],
              ].map(([name, value, use]) => (
                <div className="preview-token" key={name}>
                  <span style={{ background: value }} />
                  <strong>{name}</strong>
                  <code>{value}</code>
                  <small>{use}</small>
                </div>
              ))}
            </div>
            <div className="preview-type-specimen">
              <SampleLabel>System font strategy</SampleLabel>
              <p className="preview-type-specimen__display">Good tools get out of the way.</p>
              <p className="preview-type-specimen__body">
                ui-rounded → SF Pro Rounded → Segoe UI → system-ui. This is a contemporary system-font stack,
                not a bundled proprietary face.
              </p>
              <p className="preview-type-specimen__mono">PREVIEW / 01 / 2026</p>
            </div>
          </div>
        </section>

        <section id="materials" className="preview-section" aria-labelledby="materials-title">
          <SectionHeading index="02" title="Appearance, materials, geometry">
            Dark and light remain the same system. Glass adds hierarchy, never replaces contrast.
          </SectionHeading>
          <div className="preview-appearance-grid">
            <article className="preview-appearance-card preview-appearance-card--dark">
              <span className="preview-eyebrow">DARK / DUSK</span>
              <h3>Deep water, bright type</h3>
              <p>Translucent charcoal, blue-white ink, and a violet edge highlight.</p>
              <div className="preview-appearance-card__mini">
                <span />
                <span />
                <span />
              </div>
            </article>
            <article className="preview-appearance-card preview-appearance-card--light">
              <span className="preview-eyebrow">LIGHT / DAY</span>
              <h3>Cloud, paper, and clear edges</h3>
              <p>Warm white materials preserve the same hierarchy and focus color.</p>
              <div className="preview-appearance-card__mini">
                <span />
                <span />
                <span />
              </div>
            </article>
          </div>
          <div className="preview-material-grid">
            <article className="preview-material preview-material--solid">
              <SampleLabel>Solid fallback</SampleLabel>
              <strong>Canvas</strong>
              <p>Readable without blur support.</p>
            </article>
            <article className="preview-material preview-material--glass">
              <SampleLabel>Layer 01 · Glass</SampleLabel>
              <strong>Frosted surface</strong>
              <p>Blur, tint, border, inset highlight.</p>
            </article>
            <article className="preview-material preview-material--tint">
              <SampleLabel>Layer 02 · Tint</SampleLabel>
              <strong>Color lens</strong>
              <p>Azure and orchid used sparingly.</p>
            </article>
          </div>
          <div className="preview-geometry-grid">
            <article className="preview-card">
              <SampleLabel>Spacing scale</SampleLabel>
              <div className="preview-spacing">
                <span style={{ width: 8 }}>8</span>
                <span style={{ width: 16 }}>16</span>
                <span style={{ width: 24 }}>24</span>
                <span style={{ width: 40 }}>40</span>
                <span style={{ width: 64 }}>64</span>
              </div>
            </article>
            <article className="preview-card">
              <SampleLabel>Radii</SampleLabel>
              <div className="preview-radii">
                <span className="preview-radius--s">S / 10</span>
                <span className="preview-radius--m">M / 14</span>
                <span className="preview-radius--l">L / 20</span>
                <span className="preview-radius--pill">Pill</span>
              </div>
            </article>
            <article className="preview-card">
              <SampleLabel>Shadows</SampleLabel>
              <div className="preview-shadow-samples">
                <span>Lift</span>
                <span>Float</span>
                <span>Window</span>
              </div>
            </article>
          </div>
        </section>

        <section id="controls" className="preview-section" aria-labelledby="controls-title">
          <SectionHeading index="03" title="Controls and feedback">
            Native semantics, generous targets, and interaction states that explain themselves.
          </SectionHeading>
          <PreviewControls />
        </section>

        <section id="states" className="preview-section" aria-labelledby="states-title">
          <SectionHeading index="04" title="Loading, empty, and error">
            Every wait, no-result, and failure state has a useful next step.
          </SectionHeading>
          <div className="preview-state-grid">
            <article className="preview-state preview-state--loading">
              <span className="preview-spinner" aria-hidden="true" />
              <strong>Loading projects…</strong>
              <p role="status">Preparing the local catalogue</p>
            </article>
            <article className="preview-state preview-state--empty">
              <span className="preview-state__glyph" aria-hidden="true">
                ∅
              </span>
              <strong>Nothing here yet</strong>
              <p>Your saved collection will appear in this space.</p>
              <button type="button" className="preview-text-button">
                Browse projects →
              </button>
            </article>
            <article className="preview-state preview-state--error">
              <span className="preview-state__glyph" aria-hidden="true">
                !
              </span>
              <strong>Couldn’t load this view</strong>
              <p role="alert">The content stayed local. Try again when ready.</p>
              <button type="button" className="preview-button preview-button--secondary">
                Try again
              </button>
            </article>
          </div>
        </section>

        <section id="icons" className="preview-section" aria-labelledby="icons-title">
          <SectionHeading index="05" title="Original icons and status language">
            Inline SVG glyphs authored for Tien OS: recognizable at a glance, independent of platform marks.
          </SectionHeading>
          <div className="preview-icon-gallery" aria-label="Original app icons">
            {previewApps.map((app) => (
              <div className="preview-icon-sample" key={app.id}>
                <AppIcon appId={app.id} />
                <span>{app.name}</span>
              </div>
            ))}
          </div>
          <div className="preview-status-gallery">
            <div className="preview-status-sample">
              <WifiIcon />
              <span>Connected</span>
            </div>
            <div className="preview-status-sample">
              <BatteryIcon />
              <span>82%</span>
            </div>
            <div className="preview-status-sample">
              <ControlCenterIcon />
              <span>Control</span>
            </div>
            <div className="preview-status-sample">
              <SpotlightIcon />
              <span>Spotlight</span>
            </div>
            <div className="preview-status-sample">
              <TrashIcon />
              <span>Trash</span>
            </div>
          </div>
        </section>

        <section id="shell" className="preview-section" aria-labelledby="shell-title">
          <SectionHeading index="06" title="System shell checkpoint">
            The parts that make the language feel like a system: chrome, menus, Dock, Control Center,
            Spotlight, and a real window.
          </SectionHeading>
          <div className="preview-shell-subsection">
            <div className="preview-subsection-heading">
              <h3>Window chrome</h3>
              <p>Focused, unfocused, and maximized states make hierarchy visible without color alone.</p>
            </div>
            <div className="preview-window-variants">
              <StaticWindowVariant
                state="focused"
                title="Focused"
                caption="Full contrast · active controls"
              />
              <StaticWindowVariant
                state="unfocused"
                title="Unfocused"
                caption="Reduced saturation · still readable"
              />
              <StaticWindowVariant
                state="maximized"
                title="Maximized"
                caption="Edge-to-edge · restore available"
              />
            </div>
          </div>
          <div className="preview-shell-subsection">
            <div className="preview-subsection-heading">
              <h3>Live menu bar, Dock, and overlays</h3>
              <p>
                These are the production shell components in a contained review surface. Try every menu,
                popover, dialog, switch, slider, and Spotlight mode.
              </p>
            </div>
            <PreviewSystemSurface />
          </div>
          <div className="preview-shell-subsection">
            <div className="preview-subsection-heading">
              <h3>Representative app window</h3>
              <p>
                Drag the title bar, resize from the lower-right handle, then exercise the controls. The mobile
                shell remains a separate single-surface policy.
              </p>
            </div>
            <PreviewWindow />
          </div>
        </section>

        <footer className="preview-footer">
          <p>
            <strong>Preview checkpoint 01.</strong> Original CSS, SVG, HTML, system fonts, and project-owned
            behavior only.
          </p>
          <a href="/">
            Return to Tien OS home <span aria-hidden="true">↗</span>
          </a>
        </footer>
      </main>
    </div>
  );
}
