import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://hxutixnnn.github.io",
  output: "static",
  trailingSlash: "always",
  integrations: [react(), mdx(), sitemap()],
  build: {
    format: "directory",
    inlineStylesheets: "never",
  },
  vite: {
    build: {
      cssMinify: "lightningcss",
    },
  },
});
