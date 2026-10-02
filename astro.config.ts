import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './site.config';
import { buildModel } from './src/lib/model';
import { readListings } from './src/lib/fs-listings';

// Pages left out of the sitemap: thin location pages (noindex) and form result pages.
const { noindexUrls } = buildModel(readListings());
const excluded = (path: string) =>
  noindexUrls.has(path) || path.startsWith('/add-your-business/') && path !== '/add-your-business/' || path === '/404/' || path === '/search/';

export default defineConfig({
  site: site.url,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [sitemap({ filter: (page) => !excluded(new URL(page).pathname) })],
  devToolbar: { enabled: false },
  // Never inline scripts: the CSP (public/_headers) allows only same-origin script files.
  vite: { build: { assetsInlineLimit: 0 } },
});
