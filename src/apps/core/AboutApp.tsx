import { socialLinks } from "@/content/portfolio";
import { AppIntro, AppSection, DocumentLink, ExternalLink } from "./shared";

export default function AboutApp() {
  return (
    <article className="app-document about-app">
      <AppIntro eyebrow="About this system" title="Hi, I’m Tien.">
        I build useful software, learn in public, and turn recurring problems into small, practical tools.
      </AppIntro>
      <AppSection title="Now">
        <p>
          I have used React professionally since 2018, while personal projects give me room to explore other
          languages, product ideas, and better engineering habits.
        </p>
      </AppSection>
      <AppSection title="Connect">
        <ul className="link-grid">
          {socialLinks.map(([name, href]) => (
            <li key={name}>
              <ExternalLink href={href}>{name}</ExternalLink>
            </li>
          ))}
        </ul>
      </AppSection>
      <aside className="notice-card">
        <strong>Independent by design.</strong>
        <p>
          Tien OS is a personal project inspired by contemporary desktop interfaces. It is not affiliated
          with, endorsed by, or sponsored by Apple Inc.
        </p>
      </aside>
      <DocumentLink href="/about/" />
    </article>
  );
}
