// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const site = (env.SITE_URL || 'https://shop.reviewplus.io').replace(/\/+$/, '');
const rawBase = env.SHOP_BASE_PATH || '/';
const base = rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}`;

export default defineConfig({
  site,
  base,
  trailingSlash: 'never',
  build: { format: 'file' },
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !/\/(bedankt|404)(\.html)?$/.test(page),
    }),
  ],
  image: { responsiveStyles: true },
  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.SITE_URL': JSON.stringify(site),
      'import.meta.env.SHOP_BASE_PATH': JSON.stringify(base),
    },
  },
});
