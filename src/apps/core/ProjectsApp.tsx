import { externalCatalogue } from "@/apps/catalog";
import { AppIntro, DocumentLink, ExternalLink } from "./shared";

export default function ProjectsApp() {
  return (
    <article className="app-document">
      <AppIntro eyebrow="Selected work" title="Projects with real destinations.">
        Larger applications keep their own deployment and open safely in a new tab; Tien OS remains a small,
        deterministic static site.
      </AppIntro>
      <div className="project-list">
        {externalCatalogue.map((project, index) => (
          <section className="project-card" key={project.id}>
            <span className="project-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2>{project.name}</h2>
              <p>{project.summary}</p>
              <div className="project-actions">
                <a href={project.route}>Project details</a>
                <ExternalLink href={project.target.url}>Launch project</ExternalLink>
              </div>
            </div>
          </section>
        ))}
      </div>
      <DocumentLink href="/works/">View works as a document</DocumentLink>
    </article>
  );
}
