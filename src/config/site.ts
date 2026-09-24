import { brand } from './brand';

const env = import.meta.env;

function normBase(raw: string | undefined): string {
  if (!raw || raw === '/') return '/';
  return `/${raw.replace(/^\/+|\/+$/g, '')}`;
}

/** Absolute origin zonder trailing slash, bv. https://shop.reviewplus.io */
export const SITE_URL = (env.SITE_URL || 'https://shop.reviewplus.io').replace(/\/+$/, '');
/** "/" in fase 1 (subdomein), "/shop" in fase 2. */
export const SHOP_BASE_PATH = normBase(env.SHOP_BASE_PATH);

export const DEMO_BOOKING_URL = brand.demoBookingUrl;
export const LOGIN_URL = brand.appLoginUrl;

export const COUNTRIES = ['NL', 'BE'] as const;
export type Country = (typeof COUNTRIES)[number];
export const COUNTRY_LABELS: Record<Country, string> = { NL: 'Nederland', BE: 'België' };

export const LEAD = {
  provider: (env.PUBLIC_LEAD_PROVIDER || 'make') as 'make' | 'web3forms' | 'formspree',
  webhookUrl: env.PUBLIC_LEAD_WEBHOOK_URL || '',
  web3formsKey: env.PUBLIC_WEB3FORMS_ACCESS_KEY || '',
  turnstileSiteKey: env.PUBLIC_TURNSTILE_SITE_KEY || '',
  fallbackEmail: brand.email,
};

export const ANALYTICS = {
  provider: (env.PUBLIC_ANALYTICS_PROVIDER || '') as '' | 'plausible' | 'umami',
  domain: env.PUBLIC_ANALYTICS_DOMAIN || new URL(SITE_URL).host,
  scriptUrl: env.PUBLIC_ANALYTICS_SCRIPT_URL || '',
  umamiWebsiteId: env.PUBLIC_UMAMI_WEBSITE_ID || '',
};

export const PIXELS = {
  metaPixelId: env.PUBLIC_META_PIXEL_ID || '',
  gadsId: env.PUBLIC_GADS_ID || '',
  gadsConversionLabel: env.PUBLIC_GADS_CONVERSION_LABEL || '',
};

export const FEATURES = {
  /** Aantal-selector voor betaalde extra's (kaarten/totems via Mollie). */
  paidExtras: true,
  /** Straat/plaats automatisch invullen voor NL via PDOK (gratis, overheid). */
  addressLookupNL: true,
  /** Cookiebanner tonen; alleen relevant als er pixels geconfigureerd zijn. */
  cookieBanner: true,
};

/** Hoe prijzen getoond worden. */
export const PRICE_NOTE = 'excl. btw'; // bevestigd door Jordan (sept 2026); Make rekent extra's af incl. 21% btw

/**
 * Actie-limiet en voorraadteller. De teller toont het ECHTE aantal resterende gratis sets:
 * Make telt verwerkte aanvragen en schrijft { remaining } naar een GitHub Gist (docs/MAKE-SCENARIO.md, scenario F);
 * de site leest dat Gist via PUBLIC_STOCK_URL (0 Make-operaties per bezoek). Zonder URL: het maximum.
 * Maximaal 1000 gratis sets; actie geldig t/m de einddatum (bevestigd door Jordan, sept 2026).
 */
export const ACTIE = {
  maxSets: 1000,
  /** Laatste dag van de actie (ISO). "Tot november 2026" → aangenomen t/m 30 november 2026. */
  eindDatum: '2026-11-30',
  stockUrl: env.PUBLIC_STOCK_URL || '',
};

/** Reserveringstermijn totem in dagen. TODO: Jordan bevestigt termijn. */
export const TOTEM_RESERVATION_DAYS = 14;
