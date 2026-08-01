import { usesSummary } from "@/content/portfolio";
import { AppIntro, AppSection, DocumentLink } from "./shared";

export default function UsesApp() {
  return (
    <article className="app-document">
      <AppIntro eyebrow="Workspace" title="Tools should fade into the work.">
        A compact inventory of the hardware and software currently used to design, build, and debug products.
      </AppIntro>
      <div className="two-column-list">
        <AppSection title="Hardware">
          <ul>
            {usesSummary.hardware.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AppSection>
        <AppSection title="Software">
          <ul>
            {usesSummary.software.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AppSection>
      </div>
      <DocumentLink href="/uses/">View the detailed setup</DocumentLink>
    </article>
  );
}
