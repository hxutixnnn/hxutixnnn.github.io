import { MenuBar } from "./components/MenuBar";

export function App() {
  return (
    <main
      aria-label="tienOS desktop"
      className="relative min-h-screen overflow-hidden bg-slate-950 text-white"
    >
      <div className="tienos-wallpaper" aria-hidden="true" />
      <div className="tienos-vignette" aria-hidden="true" />
      <MenuBar />
    </main>
  );
}
