# Charlee Profile

An editorial personal profile built with Vinext/Next.js, TypeScript, CSS Modules,
GSAP, ScrollTrigger, Canvas, and WebGL.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Content

Edit personal details, publications, awards, and external links in
`data/profile.ts`. Publications and awards are sorted newest-first; dates may use
either `YYYY` or `YYYY/MM`.

Place background music in `public/music`. MP3, WAV, OGG, and M4A files are added
to `playlist.json` automatically before development and production builds. The
current site intentionally keeps `Exploration Theme.wav` in its original format.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` performs a production build and verifies the rendered profile and
generated music manifest.

## Production

```bash
npm run build
npm run start
```

The repository includes the Vinext Cloudflare Worker and OpenAI Sites hosting
configuration. No database or object-storage binding is required.
