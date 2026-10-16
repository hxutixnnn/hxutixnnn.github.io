# Tien’s corner of the internet

A software engineering resume with experience, delivered work, AI experiments, recognition, personal projects, and contact links.

Built with React, TypeScript, Vite, and Tien UI appearance controls. The layout retains the live site's sticky portrait sidebar, Archivo typography, IBM Plex Mono labels, and bordered project rows. The sidebar becomes an introduction on mobile. The appearance picker supports system, light, and dark modes with five accents, saved locally. New visitors start with the live site's blue accent. The CV action opens the browser print dialog with an A4 layout.

## Development

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

Pushes to main deploy to https://hxutixnnn.github.io through GitHub Actions. Run `npm run deploy` with an authenticated Cloudflare CLI to publish to nguyenhuutien.com and www.nguyenhuutien.com.

Edit `src/content.ts` for engineering work, experiments, projects, and skills. Edit `src/App.tsx` for employment, recognition, sharing, and contact details. Page metadata lives in `index.html` and print styles in `src/home.css`.

Keep private source evidence, source links, and review artifacts outside this public repository. Public copy distinguishes delivered work from evaluations and experiments, and authored guides from prepared presentation material.
