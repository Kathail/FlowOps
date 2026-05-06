# citywater.ca — marketing site

Single-page brochure for CityWater. Plain HTML + Tailwind CSS v4. No framework, no build-step JavaScript, no client-side tooling beyond the Tailwind CLI.

## Stack

- HTML hand-written in `index.html`
- Tailwind v4 via `@tailwindcss/cli` — config lives in `src/input.css` via `@theme`
- Fonts: Fraunces + Public Sans + JetBrains Mono via Google Fonts
- Output: static files in `dist/`

## Local dev

```sh
npm install
npm run dev    # rebuilds CSS on save; open index.html in a browser
```

For live reload, the simplest path is the VS Code "Live Server" extension or `npx serve` in another terminal.

## Production build

```sh
npm run build
```

Outputs to `dist/`:

- `dist/output.css` — purged + minified Tailwind
- `dist/index.html` — copied verbatim
- `dist/{public assets}` — copied from `public/` if present

## Deploy — Cloudflare Pages

The site deploys from this directory of the monorepo.

**Cloudflare Pages settings:**

- Build command: `cd marketing && npm install && npm run build`
- Build output directory: `marketing/dist`
- Root directory: (leave blank — repo root)
- Environment variable: `NODE_VERSION=20`

**Custom domain:**

- `citywater.ca` (apex) → Cloudflare Pages
- `www.citywater.ca` → 301 redirect to apex (configure in Cloudflare DNS / Page Rules)

## Replacing the screenshot

The hero figure currently renders a placeholder. To replace:

1. Export a screenshot from the running app (the demo dashboard works well). Recommended: 2400×1350 PNG.
2. Save it to `public/screenshots/dashboard.png`.
3. Replace the placeholder `<div>` in `index.html` (search for `replace with /public/screenshots/dashboard.png`) with:

   ```html
   <img
     src="./screenshots/dashboard.png"
     alt="CityWater supervisor dashboard showing today's open work, by area, with KPIs."
     class="h-full w-full object-cover"
   />
   ```

The `cp -r public/* dist/` step in the build script will copy the screenshot into the deployed bundle.

## Adding pages later

If/when this grows beyond a single page (FAQ, blog, case studies, pricing), this is the point to migrate to Astro or similar. For now, one HTML file is the right amount of complexity.
