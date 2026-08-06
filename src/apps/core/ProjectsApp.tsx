import { projectCatalogue } from "@/apps/catalog";
import type { CoreAppProps } from "@/apps/contract";
import { AppIntro, DocumentLink } from "./shared";

export default function ProjectsApp({ openApp }: Pick<CoreAppProps, "openApp">) {
  return (
    <article className="app-document">
      <AppIntro eyebrow="Public work" title="Every project has a real destination.">
        This build-time catalogue includes reviewed deployed work from owned public repositories. Projects
        with no deployed HTTPS homepage are intentionally omitted; each retained project opens inside this
        shell.
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
                <a
                  href={project.route}
                  onClick={(event) => {
                    if (!openApp) return;
                    event.preventDefault();
                    openApp(project.id);
                  }}
                >
                  Launch project
                </a>
              </div>
            </div>
          </section>
        ))}
      </div>
      <DocumentLink href="/works/">View works as a document</DocumentLink>
    </article>
  );
}
