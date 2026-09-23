import type { Attribution } from './attribution';

/** Zie docs/LEAD-PAYLOAD.md voor het volledige contract. Wijzig beide tegelijk. */
export const PAYLOAD_VERSION = 1;

export interface LeadLine {
  slug: string;
  naam: string;
  gratis: number;
  extra: number;
  prijs_extra: number;
  normale_prijs: number;
  gratis_voorwaarde: 'altijd' | 'bij-demo' | null;
}

export interface LeadPayload {
  payload_version: number;
  request_type: 'aanvraag' | 'extras_betalen' | 'nieuwsbrief';
  lead_ref: string;
  lead_source: 'shop';
  submitted_at: string;
  bedrijf: {
    land: 'NL' | 'BE';
    naam: string;
    bedrijfsnummer_type: 'kvk' | 'kbo';
    bedrijfsnummer: string;
    btw_nummer: string | null;
    sector: string;
    aantal_locaties: string;
    website: string | null;
    google_profiel: string | null;
  };
  contact: {
    voornaam: string;
    achternaam: string;
    functie: string | null;
    email: string;
    telefoon: string;
  };
  bezorgadres: {
    straat: string;
    huisnummer: string;
    toevoeging: string | null;
    postcode: string;
    plaats: string;
    land: 'NL' | 'BE';
  };
  producten: LeadLine[];
  totem_demo: boolean;
  heeft_betaalde_extras: boolean;
  /** Alleen indicatief; Make herberekent het bedrag uit /products.json. */
  bedrag_extras_indicatief: number;
  vragen: {
    huidige_reviewtool: string | null;
    huidige_reviewtool_anders: string | null;
    aantal_google_reviews: string | null;
  };
  toestemming: {
    actievoorwaarden_privacy: boolean;
    contact_opvolging: boolean;
    nieuwsbrief: boolean;
    tekst_versie: string;
  };
  attributie: Attribution | null;
  pagina: string;
  turnstile_token: string | null;
  return_urls: {
    betaald: string;
    geannuleerd: string;
  };
}

export interface LeadResponse {
  ok: boolean;
  checkoutUrl?: string;
  duplicate?: boolean;
  message?: string;
}

export interface Transport {
  provider: 'make' | 'web3forms' | 'formspree';
  webhookUrl: string;
  web3formsKey: string;
}

export function newLeadRef(): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `RP-${ymd}-${rnd.toUpperCase()}`;
}

async function parse(res: Response): Promise<LeadResponse> {
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  try {
    const json = JSON.parse(text) as Partial<LeadResponse> & { success?: boolean };
    if (json.ok === false || json.success === false) throw new Error(json.message || 'Afgewezen');
    return {
      ok: true,
      ...(json.checkoutUrl ? { checkoutUrl: json.checkoutUrl } : {}),
      ...(json.duplicate ? { duplicate: true } : {}),
    };
  } catch (err) {
    // Make zonder "Webhook response"-module antwoordt met de platte tekst "Accepted".
    if (err instanceof SyntaxError) return { ok: true };
    throw err;
  }
}

/** Verstuur de aanvraag. Gooit een Error bij netwerk- of serverfouten; de UI behoudt dan alle data. */
export async function submitLead(payload: LeadPayload, t: Transport, timeoutMs = 20000): Promise<LeadResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    if (t.provider === 'web3forms') {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: t.web3formsKey,
          subject: `Shop-aanvraag ${payload.bedrijf.naam} (${payload.lead_ref})`,
          from_name: 'Review Plus Shop',
          email: payload.contact.email,
          payload: JSON.stringify(payload, null, 2),
        }),
        signal: ctrl.signal,
      });
      return await parse(res);
    }
    if (!t.webhookUrl) throw new Error('Geen webhook geconfigureerd (PUBLIC_LEAD_WEBHOOK_URL).');
    const res = await fetch(t.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    return await parse(res);
  } finally {
    clearTimeout(timer);
  }
}
