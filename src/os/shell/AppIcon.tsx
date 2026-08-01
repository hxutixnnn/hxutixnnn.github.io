import type { AppId, IconName } from "@/apps/contract";
import { getApp } from "@/apps/catalog";

const paths: Record<IconName, React.ReactNode> = {
  person: (
    <>
      <circle cx="24" cy="18" r="7" />
      <path d="M11 39c2-8 7-12 13-12s11 4 13 12" />
    </>
  ),
  projects: (
    <>
      <path d="M8 15h13l3 4h16v20H8z" />
      <path d="M8 22h32" />
    </>
  ),
  blog: (
    <>
      <path d="M12 8h24v32H12z" />
      <path d="M18 16h12M18 23h12M18 30h8" />
    </>
  ),
  tools: (
    <>
      <path d="M17 10a9 9 0 0 0 10 12l11 11-5 5-11-11A9 9 0 0 1 10 17l6 4 5-5z" />
    </>
  ),
  resources: (
    <>
      <path d="M9 11h13a5 5 0 0 1 5 5v23H14a5 5 0 0 0-5 3z" />
      <path d="M39 11H26a5 5 0 0 0-5 5v23h13a5 5 0 0 1 5 3z" />
    </>
  ),
  idea: (
    <>
      <path d="M16 26a13 13 0 1 1 16 0c-3 2-3 5-3 7H19c0-2 0-5-3-7z" />
      <path d="M19 38h10M21 42h6" />
    </>
  ),
  image: (
    <>
      <rect x="8" y="10" width="32" height="28" rx="5" />
      <circle cx="18" cy="20" r="4" />
      <path d="m10 35 9-9 6 6 5-5 8 8" />
    </>
  ),
  music: (
    <>
      <path d="M20 35V14l17-4v21" />
      <circle cx="14" cy="36" r="6" />
      <circle cx="31" cy="32" r="6" />
    </>
  ),
  car: (
    <>
      <path d="M9 31v-7l4-10h22l4 10v7z" />
      <path d="M13 24h22M15 14l-3-3M33 14l3-3" />
      <circle cx="15" cy="32" r="4" />
      <circle cx="33" cy="32" r="4" />
    </>
  ),
};

export function AppIcon({ appId, size = "normal" }: { appId: AppId; size?: "small" | "normal" }) {
  const app = getApp(appId);
  if (!app) return null;
  return (
    <span className={`app-icon app-icon--${app.icon} app-icon--${size}`} aria-hidden="true">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[app.icon]}
      </svg>
      <span className="app-icon__shine" />
    </span>
  );
}

export function SystemMark() {
  return (
    <span className="system-mark" aria-hidden="true">
      T
    </span>
  );
}
