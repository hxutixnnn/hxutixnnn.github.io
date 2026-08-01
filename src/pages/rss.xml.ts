import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { postPath, SITE } from "@/content/routes";

export async function GET(context: { site?: URL }) {
  const posts = (await getCollection("posts")).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return rss({
    title: "Tien Nguyen — My Personal Website",
    description: SITE.description,
    site: context.site ?? new URL(SITE.url),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description ?? `An engineering note by ${SITE.author}.`,
      link: `${postPath(post)}/`,
      categories: post.data.tags,
      customData: `<content:encoded><![CDATA[<p>${post.data.description ?? `An engineering note by ${SITE.author}.`}</p><p><strong><a href="${SITE.url}${postPath(post)}/">Keep reading</a>.</strong></p>]]></content:encoded>`,
    })),
  });
}
