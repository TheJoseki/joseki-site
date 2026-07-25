// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Nothing else tells a crawler this page exists.
  integrations: [sitemap()],

  site: 'https://thejoseki.com',

  build: {
    // Astro inlines small stylesheets into a <style> tag by default. The CSP
    // here is `style-src 'self'`, which refuses inline styles, so every
    // stylesheet has to be a real file. The alternative is a per-build hash or
    // nonce — more moving parts than a static site should carry, and one more
    // thing to forget.
    inlineStylesheets: 'never',
  },
});
