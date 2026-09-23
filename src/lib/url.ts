import { SITE_URL, SHOP_BASE_PATH } from '@/config/site';

/** Pad binnen de shop, rekening houdend met SHOP_BASE_PATH. url('/aanvragen') → '/shop/aanvragen' */
export function url(path = '/'): string {
  if (/^[a-z]+:/i.test(path) || path.startsWith('#')) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (SHOP_BASE_PATH === '/') return clean;
  return clean === '/' ? SHOP_BASE_PATH : `${SHOP_BASE_PATH}${clean}`;
}

/** Absolute URL (canonical, sitemap, schema, OG). */
export function absoluteUrl(path = '/'): string {
  if (/^[a-z]+:/i.test(path)) return path;
  return `${SITE_URL}${url(path)}`;
}

/** Een asset uit /public, met base path. */
export function asset(path: string): string {
  return url(path);
}
