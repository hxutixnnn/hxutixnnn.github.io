import { postSummaries } from "@/content/portfolio";
import { AppIntro, DocumentLink } from "./shared";

export default function BlogApp() {
  return (
    <article className="app-document">
      <AppIntro eyebrow="Notebook" title="Problems, fixes, and things learned.">
        Short engineering notes remain ordinary static pages, so every article is linkable, readable, and
        useful without the desktop shell.
      </AppIntro>
      <ol className="post-list">
        {postSummaries.map((post) => (
          <li key={post.path}>
            <time dateTime={post.date}>{post.date}</time>
            <div>
              <h2>
                <a href={post.path}>{post.title}</a>
              </h2>
              {post.tags.length > 0 && <p>{post.tags.join(" · ")}</p>}
            </div>
          </li>
        ))}
      </ol>
      <DocumentLink href="/blog/">Open the blog index</DocumentLink>
    </article>
  );
}
