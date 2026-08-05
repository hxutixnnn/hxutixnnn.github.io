import { projectCatalogue } from "@/apps/catalog";
import { AppIntro, DocumentLink, ExternalLink } from "./shared";

export default function ProjectsApp() {
  return (
    <article className="app-document">
      <AppIntro eyebrow="Public work" title="Every project has a real destination.">
        This build-time catalogue includes every owned public GitHub repository plus selected deployed work.
        Each app opens its configured homepage when available, or falls back to its repository.
      </AppIntro>
      <div className="project-list">
        {projectCatalogue.map((project, index) => (
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
