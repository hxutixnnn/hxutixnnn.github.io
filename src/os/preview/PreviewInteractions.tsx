import { useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import { Switch } from "@base-ui/react/switch";
import type { CoreAppId } from "@/apps/contract";
import type { Rect, Viewport, WindowState } from "@/os/domain/windows";
import { Dock } from "@/os/shell/Launcher";
import { MenuBar } from "@/os/shell/MenuBar";
import { Spotlight } from "@/os/shell/Spotlight";
import { WindowFrame } from "@/os/shell/WindowFrame";
import { PreviewSegmentedControl, PreviewTabs } from "@/os/preview/PreviewSelectionControls";

const viewport: Viewport = { width: 540, height: 336 };
const initialWindow: WindowState = {
  id: "window-101",
  appId: "about",
  status: "open",
  rect: { x: 20, y: 22, width: 496, height: 282 },
  z: 1,
};
const running: readonly CoreAppId[] = ["about", "projects"];
const matches = ["Glass materials", "Window chrome", "Spotlight", "Dock"];

function InteractiveControls() {
  const [enabled, setEnabled] = useState(true);
  const [level, setLevel] = useState(0.68);
  const [segment, setSegment] = useState("All");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => matches.filter((item) => item.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <article className="preview-card preview-live-controls">
      <p className="preview-sample-label">LIVE INTERACTION LAB</p>
      <h3>Try the component contracts</h3>
      <p className="preview-live-controls__copy">
        These controls stay interactive while the complete gallery remains useful in static HTML.
      </p>
      <div className="preview-live-controls__row">
        <Switch.Root
          className="preview-switch"
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Live focus mode"
        >
          <Switch.Thumb className="preview-switch__thumb" />
        </Switch.Root>
        <span>
          <strong>{enabled ? "Focus mode on" : "Focus mode off"}</strong>
          <small>Switch with an announced state</small>
        </span>
      </div>
      <div className="preview-slider-row">
        <Slider.Root
          className="preview-slider"
          value={level}
          min={0}
          max={1}
          step={0.01}
          onValueChange={setLevel}
        >
          <Slider.Label className="preview-slider-row__label">
            Level <output>{Math.round(level * 100)}%</output>
          </Slider.Label>
          <Slider.Control className="preview-slider__control">
            <Slider.Track className="preview-slider__track">
              <Slider.Indicator className="preview-slider__indicator" />
              <Slider.Thumb className="preview-slider__thumb" aria-label="Live level" />
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
      </div>
      <PreviewSegmentedControl
        label="Live segments"
        options={[
          { id: "All", label: "All" },
          { id: "Core", label: "Core" },
          { id: "Social", label: "Social" },
        ]}
        value={segment}
        onChange={setSegment}
      />
      <PreviewTabs
        idPrefix="live-content"
        label="Live content tabs"
        options={[
          { id: "overview", label: "Overview", panel: "A compact interactive control set." },
          { id: "details", label: "Details", panel: "Keyboard and pointer input share the same state." },
          { id: "notes", label: "Notes", panel: "Tabs use roving focus and linked panels." },
        ]}
        value={tab}
        onChange={setTab}
      />
      <label className="preview-field preview-live-search">
        <span>Filter shell samples</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try ‘window’"
        />
      </label>
      <ul className="preview-list" aria-label="Filtered live samples">
        {results.map((item) => (
          <li key={item}>
            <span className="preview-list__dot" aria-hidden="true" />
            <span>
              <strong>{item}</strong>
              <small>{segment} component</small>
            </span>
          </li>
        ))}
      </ul>
      {results.length === 0 && (
        <p className="preview-muted" role="status">
          No live samples match “{query}”.
        </p>
      )}
    </article>
  );
}

function InteractiveSystem() {
  const [announcement, setAnnouncement] = useState("Live system ready");
  const [spotlight, setSpotlight] = useState(false);
  const [emptySpotlight, setEmptySpotlight] = useState(false);
  const [popover, setPopover] = useState(false);
  const [dialog, setDialog] = useState(false);

  function openSpotlight(empty: boolean) {
    setEmptySpotlight(empty);
    setSpotlight(true);
  }

  return (
    <article className="preview-card preview-live-system">
      <p className="preview-sample-label">LIVE SYSTEM SURFACES</p>
      <h3>Open, close, search, and return.</h3>
      <p className="preview-live-controls__copy">
        Menu, Control Center, Spotlight, popover, and dialog use the same project-owned shell primitives.
      </p>
      <div className="preview-live-system__stage">
        <MenuBar
          activeTitle="Preview Gallery"
          hasActiveWindow
          mobile={false}
          onOpenAbout={() => setAnnouncement("About selected")}
          onClose={() => setAnnouncement("Close selected")}
          onMinimize={() => setAnnouncement("Minimize selected")}
          onMaximize={() => setAnnouncement("Maximize selected")}
          documentUrl="/about/"
          onOpenSpotlight={() => openSpotlight(false)}
          announce={setAnnouncement}
          persistSettings={false}
        />
        <div className="preview-live-system__copy">
          <span className="preview-eyebrow">MENU BAR / STATUS / DOCK</span>
          <p>Use the top-left system and app menus, Control Center, or the magnifier.</p>
        </div>
        <Dock
          running={running}
          selected="about"
          minimized={[{ ...initialWindow, id: "window-102", appId: "blog", status: "minimized" }]}
          bounceToken={null}
          onOpen={(id) => setAnnouncement(`${id} selected`)}
          onRestoreMinimized={() => setAnnouncement("Window restored from Dock")}
          onTrash={() => setAnnouncement("Trash selected")}
        />
      </div>
      <p className="preview-system-status" role="status" aria-live="polite">
        {announcement}
      </p>
      <div className="preview-live-system__actions">
        <button
          type="button"
          className="preview-button preview-button--primary"
          onClick={() => openSpotlight(false)}
        >
          Populated Spotlight
        </button>
        <button
          type="button"
          className="preview-button preview-button--secondary"
          onClick={() => openSpotlight(true)}
        >
          Empty Spotlight
        </button>
        <Popover.Root open={popover} onOpenChange={setPopover}>
          <Popover.Trigger className="preview-button preview-button--secondary">Open popover</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner
              className="preview-popover-positioner"
              side="bottom"
              align="start"
              sideOffset={8}
            >
              <Popover.Popup className="preview-popover" aria-label="Live material notes">
                <strong>Material notes</strong>
                <p>Solid fallback first; blur is a progressive enhancement.</p>
                <button type="button" className="preview-text-button" onClick={() => setPopover(false)}>
                  Close
                </button>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <Dialog.Root open={dialog} onOpenChange={setDialog}>
          <Dialog.Trigger className="preview-button preview-button--primary">Open dialog</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="preview-dialog-backdrop" />
            <Dialog.Popup className="preview-dialog" aria-labelledby="live-dialog-title">
              <span className="preview-eyebrow">FOCUS RETURN</span>
              <h3 id="live-dialog-title">Live dialog</h3>
              <p>Escape closes this surface and returns focus to its trigger.</p>
              <button
                type="button"
                className="preview-button preview-button--primary"
                onClick={() => setDialog(false)}
              >
                Done
              </button>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <Spotlight
        key={`${emptySpotlight}-${spotlight}`}
        open={spotlight}
        initialQuery={emptySpotlight ? "zzzz" : ""}
        onOpenChange={setSpotlight}
        onOpenApp={(id) => setAnnouncement(`${id} opened`)}
        onOpenExternal={(id) => setAnnouncement(`${id} would open externally`)}
        onNavigate={(url) => setAnnouncement(`${url} selected`)}
        onAnnounce={setAnnouncement}
      />
    </article>
  );
}

function InteractiveWindow() {
  const [state, setState] = useState<WindowState>(initialWindow);
  const [open, setOpen] = useState(true);
  const [message, setMessage] = useState("Window ready");
  const restore = () => {
    setState((current) => ({ ...current, status: "open" }));
    setOpen(true);
    setMessage("Window restored");
  };
  const maximize = () =>
    setState((current) => {
      if (current.status === "maximized") {
        const next: WindowState = { ...current, status: "open", rect: initialWindow.rect };
        delete next.restoreRect;
        return next;
      }
      return { ...current, status: "maximized", restoreRect: current.rect };
    });

  return (
    <article className="preview-card preview-live-window">
      <p className="preview-sample-label">LIVE WINDOW SURFACE</p>
      <h3>Drag, resize, minimize, restore.</h3>
      <p className="preview-live-controls__copy">
        The production WindowFrame is mounted with a representative app surface.
      </p>
      <div className="preview-window-stage" aria-label="Live window sample">
        {open ? (
          <WindowFrame
            window={state}
            title="About"
            viewport={viewport}
            mobile={false}
            focused
            minimizing={false}
            resizable
            registerFrame={() => undefined}
            onFocus={() => setMessage("Window focused")}
            onClose={() => {
              setOpen(false);
              setMessage("Window closed");
            }}
            onRequestMinimize={() => {
              setOpen(false);
              setState((current) => ({ ...current, status: "minimized" }));
              setMessage("Window minimized");
            }}
            onMinimizeAnimationEnd={() => undefined}
            onToggleMaximize={maximize}
            onMove={(x, y) => setState((current) => ({ ...current, rect: { ...current.rect, x, y } }))}
            onResize={(rect: Rect) => setState((current) => ({ ...current, rect }))}
            onSnap={() => setMessage("Window snapped")}
          >
            <div className="preview-representative-app">
              <span className="preview-representative-app__kicker">REPRESENTATIVE APP</span>
              <h3>A small surface with a clear job.</h3>
              <p>Focused chrome, accessible controls, and a bounded content region.</p>
              <a className="preview-text-button" href="/apps/about/">
                Read detail →
              </a>
            </div>
          </WindowFrame>
        ) : (
          <div className="preview-window-closed" role="status">
            <strong>Window {state.status === "minimized" ? "minimized" : "closed"}</strong>
            <button type="button" className="preview-button preview-button--secondary" onClick={restore}>
              Restore sample
            </button>
          </div>
        )}
      </div>
      <p className="preview-window-demo__announcement" role="status" aria-live="polite">
        {message}
      </p>
      <div className="preview-window-demo__actions">
        <button type="button" className="preview-button preview-button--secondary" onClick={restore}>
          Restore
        </button>
        <button
          type="button"
          className="preview-button preview-button--secondary"
          disabled={!open}
          onClick={maximize}
        >
          {state.status === "maximized" ? "Restore size" : "Maximize"}
        </button>
      </div>
    </article>
  );
}

export default function PreviewInteractions({ mode }: { mode: "controls" | "system" | "window" }) {
  if (mode === "controls") return <InteractiveControls />;
  if (mode === "system") return <InteractiveSystem />;
  return <InteractiveWindow />;
}
