import { readJSON, writeJSON } from './storage';

const KEY = 'rp_attribution';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'] as const;

export interface Attribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  landing_page: string;
  referrer: string | null;
  sector_page: string | null;
  first_seen: string;
}

/** Bij eerste bezoek (per sessie) UTM's, click-id's en landingspagina vastleggen. */
export function captureAttribution(sectorPage?: string | null): void {
  const existing = readJSON<Attribution | null>('session', KEY, null);
  const params = new URLSearchParams(window.location.search);
  const hasCampaign = PARAMS.some((p) => params.get(p));

  if (!existing || hasCampaign) {
    const next: Attribution = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
      gclid: params.get('gclid'),
      fbclid: params.get('fbclid'),
      landing_page: window.location.href.split('#')[0] ?? window.location.href,
      referrer: document.referrer || null,
      sector_page: sectorPage ?? existing?.sector_page ?? null,
      first_seen: new Date().toISOString(),
    };
    writeJSON('session', KEY, next);
  } else if (sectorPage && !existing.sector_page) {
    writeJSON('session', KEY, { ...existing, sector_page: sectorPage });
  }
}

export function getAttribution(): Attribution | null {
  return readJSON<Attribution | null>('session', KEY, null);
}
