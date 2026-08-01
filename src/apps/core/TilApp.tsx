import { tilEntries } from "@/content/portfolio";
import { AppIntro, DocumentLink } from "./shared";

export default function TilApp() {
  return (
    <article className="app-document">
      <AppIntro eyebrow="Small notes" title="Today I learned.">
        Tiny discoveries are easier to remember when they have a durable home.
      </AppIntro>
      <ol className="til-list">
        {tilEntries.map((entry) => (
          <li key={entry.date}>
            <time dateTime={entry.date}>{entry.date}</time>
            <p>{entry.text}</p>
          </li>
        ))}
      </ol>
      <blockquote>Remember to appreciate the little things in life.</blockquote>
      <DocumentLink href="/til/" />
    </article>
  );
}
