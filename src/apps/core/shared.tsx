import type { PropsWithChildren, ReactNode } from "react";

export function AppSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="app-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function AppIntro({
  eyebrow,
  title,
  children,
}: PropsWithChildren<{ eyebrow: string; title: string }>) {
  return (
    <header className="app-intro">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function DocumentLink({
  href,
  children = "Open document view",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <a className="document-link" href={href}>
      {children} <span aria-hidden="true">→</span>
    </a>
  );
}
