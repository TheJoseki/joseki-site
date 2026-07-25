# thejoseki.com

Vendor site for **Joseki** — toolkits for agentic engineering work.

Astro, static output, deployed to Cloudflare Pages.

> **Phase 1.** The shell, the design system and the verification harness are in
> place. The copy on the home page is placeholder and says so; products become
> a content collection in Phase 2.

## Why Astro here

The product page at [clawform.thejoseki.com](https://clawform.thejoseki.com) is
hand-written HTML with no framework, because it is one page and will stay one
page. This site is the opposite case: a second product already exists, so
"add a product" has to be *a file*, not a refactor. That is the entire
justification — a layout component and a content collection. If it were only
ever going to be one page, this would be plain HTML too.

## Commands

```bash
npm install
npm run dev        # local dev server
npm run compile    # static output into dist/
npm run verify     # compile, then run the harness against the output

cd test && npm run setup   # once: Playwright and a headless Chromium
```

## Verification

`test/verify.mjs` does two things.

**Reads the build.** Astro can quietly add what a static page should not have,
so the harness checks that no client JavaScript was emitted, that no `<style>`
block was inlined (the CSP refuses inline styles), that `_headers` and the
favicon reached the output, and that the accent literal appears in exactly one
file.

**Drives a browser** at 375 / 768 / 1280 / 1440: no horizontal page scroll,
nothing wider than the viewport, contrast measured on **computed** styles for
every distinct text-on-background combination it can find, a focus ring on
every tab stop, smooth-scroll disabled under `prefers-reduced-motion`.

It serves `dist/` over HTTP rather than opening the file. Astro emits absolute
asset paths, which are correct for a web server and resolve to the drive root
over `file://` — the first run reported a confident 21.00:1 on text that was
simply unstyled black on white. Green that means nothing is worse than red.

## The accent, and why it is defined once

`--accent` is `#FF9900`, in `src/styles/tokens.css`, and nowhere else. The
harness fails if that literal appears in any other stylesheet or component.

Joseki currently shares Clawform's orange. That was a decision, and its cost is
deferred rather than avoided: once a second product has a page, orange no
longer distinguishes anything and the accent stops carrying meaning. Keeping
the literal in one place is what keeps reversing it a one-line change instead
of a search-and-replace across two sites.

The only exception is `public/favicon.svg` — an SVG loaded via `<img>` cannot
read a CSS custom property, so the mark carries the value directly.

## Content security

`public/_headers` sets `default-src 'none'`, `'self'` for styles and images,
and one named host for the Cloudflare Web Analytics beacon that Pages injects
into the served HTML.

`connect-src` needs `'self'` as well as the vendor host, which is not obvious:
the beacon loads from `static.cloudflareinsights.com` but reports back to
`/cdn-cgi/rum` on this origin. Allowing only the vendor host lets the script
load and silently send nothing. That bug shipped on the product site and was
caught by its harness, not by looking at a dashboard.

`astro.config.mjs` sets `inlineStylesheets: 'never'` so `style-src 'self'`
stays satisfiable. If a build starts inlining, the page renders correctly on
disk and unstyled in production.

## Deploy

Cloudflare Pages, connected to this repository.

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |

`thejoseki.com` is **not** attached yet — it still points at the previous site.
Moving it is the last step, and it is deliberately last: the domain should not
change hands until the harness passes against the deployed URL.
