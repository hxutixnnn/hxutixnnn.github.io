import { learningResources } from "@/content/portfolio";
import { AppIntro, DocumentLink, ExternalLink } from "./shared";

export default function ResourcesApp() {
  return (
    <article className="app-document">
      <AppIntro eyebrow="Library" title="A deliberately short reading list.">
        Useful web-development educators and references, kept small enough to revisit instead of becoming a
        link graveyard.
      </AppIntro>
      <ul className="resource-list">
        {learningResources.map(([name, url, description]) => (
          <li key={name}>
            <h2>
              <ExternalLink href={url}>{name}</ExternalLink>
            </h2>
            <p>{description}</p>
          </li>
        ))}
      </ul>
      <DocumentLink href="/resources/" />
    </article>
  );
}
