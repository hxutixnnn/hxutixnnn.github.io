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
  code: (
    <>
      <path d="m18 14-10 10 10 10M30 14l10 10-10 10M27 9l-6 30" />
    </>
  ),
  github: (
    <>
      <circle cx="24" cy="13" r="4" />
      <circle cx="13" cy="34" r="4" />
      <circle cx="35" cy="34" r="4" />
      <path d="M24 17v8M13 30v-5h22v5" />
    </>
  ),
  linkedin: (
    <>
      <circle cx="14" cy="14" r="3" />
      <path d="M14 22v16M23 38V22m0 7c2-5 12-7 12 2v7" />
    </>
  ),
  twitter: (
    <path d="M39 14c-2 1-3 1-5 1-3-4-10-2-10 4v2c-7 0-12-3-16-8-2 4 0 8 3 10-2 0-3 0-4-1 0 4 3 7 7 8-1 1-3 1-4 1 1 3 4 5 8 5-3 2-7 3-11 2 4 3 8 4 13 4 15 0 23-13 22-25 2-1 3-2 4-4-2 1-4 1-7 1 2-1 3-2 4-4z" />
  ),
  facebook: <path d="M28 40V26h6l1-7h-7v-4c0-2 1-4 4-4h4V5c-2 0-4-1-6-1-6 0-10 4-10 11v4h-6v7h6v14" />,
  instagram: (
    <>
      <rect x="8" y="8" width="32" height="32" rx="9" />
      <circle cx="24" cy="24" r="8" />
      <circle cx="34" cy="14" r="1.5" fill="currentColor" stroke="none" />
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
