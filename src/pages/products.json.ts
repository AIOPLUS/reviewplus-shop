import type { APIRoute } from 'astro';
import { getProducts, toPublic } from '@/lib/catalog';
import { absoluteUrl } from '@/lib/url';
import { COUNTRIES, PRICE_NOTE } from '@/config/site';

/**
 * Publieke catalogus. Make.com haalt deze op om het bedrag voor betaalde extra's zelf te berekenen
 * (het bedrag uit de browser wordt nooit vertrouwd). Zie docs/MAKE-SCENARIO.md.
 */
export const GET: APIRoute = async () => {
  const products = (await getProducts()).map((p) => ({ ...toPublic(p), url: absoluteUrl(`/${p.slug}`) }));
  const body = {
    version: 1,
    generated_at: new Date().toISOString(),
    currency: 'EUR',
    price_note: PRICE_NOTE,
    shipping: { cost: 0, countries: COUNTRIES },
    products,
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
