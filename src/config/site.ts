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

/** Hoe prijzen getoond worden. TODO: Jordan bevestigt incl. of excl. btw. */
export const PRICE_NOTE = 'excl. btw'; // TODO: bevestigen ('incl. btw' of 'excl. btw')

/** Reserveringstermijn totem in dagen. TODO: Jordan bevestigt termijn. */
export const TOTEM_RESERVATION_DAYS = 14;
