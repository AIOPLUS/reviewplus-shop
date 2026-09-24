import { readJSON, writeJSON } from './storage';

/**
 * Toestemming voor marketingcookies (Meta Pixel, Google Ads). Analytics (Plausible/Umami) is cookieloos
 * en valt hier niet onder. Pixels laden pas na "Accepteren".
 */
const KEY = 'rp_consent_v1';
export type Consent = { marketing: boolean; date: string } | null;

export interface PixelConfig {
  metaPixelId: string;
  gadsId: string;
  gadsConversionLabel: string;
}

type Fbq = ((...args: unknown[]) => void) & {
  queue: unknown[];
  loaded: boolean;
  version: string;
  callMethod?: (...args: unknown[]) => void;
  push: unknown;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let cfg: PixelConfig = { metaPixelId: '', gadsId: '', gadsConversionLabel: '' };
let loaded = false;

export function getConsent(): Consent {
  return readJSON<Consent>('local', KEY, null);
}

export function setConsent(marketing: boolean): void {
  writeJSON('local', KEY, { marketing, date: new Date().toISOString() });
  if (marketing) loadPixels();
  else if (loaded) revokePixels();
  document.dispatchEvent(new CustomEvent('rp:consent', { detail: { marketing } }));
}

/** Toestemming ingetrokken terwijl de pixels al geladen zijn: direct stoppen met meten. */
function revokePixels(): void {
  try {
    window.fbq?.('consent', 'revoke');
    window.gtag?.('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  } catch {
    /* pixel-fouten negeren */
  }
}

export function configurePixels(c: PixelConfig): void {
  cfg = c;
}

export function hasPixels(): boolean {
  return Boolean(cfg.metaPixelId || cfg.gadsId);
}

function addScript(src: string): void {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

export function loadPixels(): void {
  if (loaded || !getConsent()?.marketing) return;
  loaded = true;

  if (cfg.metaPixelId) {
    const queue: unknown[] = [];
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else queue.push(args);
    }) as Fbq;
    fbq.queue = queue;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.push = fbq;
    window.fbq = fbq;
    window._fbq = fbq;
    addScript('https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', cfg.metaPixelId);
    fbq('track', 'PageView');
  }

  if (cfg.gadsId) {
    const dataLayer: unknown[] = (window.dataLayer = window.dataLayer || []);
    window.gtag = function gtag() {
      // gtag verwacht het originele arguments-object
      // eslint-disable-next-line prefer-rest-params
      dataLayer.push(arguments);
    };
    // Google Consent Mode v2: pas geladen na "Accepteren", dus advertentiesignalen staan aan; geen Google Analytics.
    window.gtag('consent', 'default', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'denied',
    });
    window.gtag('js', new Date());
    window.gtag('config', cfg.gadsId);
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.gadsId)}`);
  }
}

/** Leadconversie één keer per aanvraag afvuren (alleen na toestemming). */
export function fireLeadConversion(ref: string, value = 0): void {
  const key = `rp_conv_${ref}`;
  if (readJSON<boolean>('session', key, false)) return;
  writeJSON('session', key, true);
  if (!getConsent()?.marketing) return;
  loadPixels();
  try {
    window.fbq?.('track', 'Lead', { value, currency: 'EUR' }, { eventID: ref });
    if (cfg.gadsId && cfg.gadsConversionLabel) {
      window.gtag?.('event', 'conversion', {
        send_to: `${cfg.gadsId}/${cfg.gadsConversionLabel}`,
        value,
        currency: 'EUR',
        transaction_id: ref,
      });
    }
  } catch {
    /* pixel-fouten negeren */
  }
}
