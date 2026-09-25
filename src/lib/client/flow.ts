import type { PublicProduct } from '@/lib/catalog';
import { formatPrice } from '@/lib/format';
import {
  normalizeUrl, required, validateCompanyNumber, validateEmail, validatePhone, validatePostcode, validateVat,
  type CountryCode, type Result,
} from '@/lib/validation';
import { getAttribution } from './attribution';
import { track } from './analytics';
import { clearExtras, extrasCount, getCart, onCartChange, setExtra, setTotemDemo, type Cart } from './cart';
import { fireLeadConversion } from './consent';
import { newLeadRef, PAYLOAD_VERSION, submitLead, type LeadLine, type LeadPayload } from './lead';
import { readJSON, remove, writeJSON } from './storage';
import { formatteerPostcode, kvkAutofill } from './kvk-autofill';

const DRAFT_KEY = 'rp_draft_v1';
const LAST_KEY = 'rp_last';
const CONSENT_TEXT_VERSION = 'v1-2026-09';
const STEP_LABELS = ['Bedrijf', 'Contact & bezorging', 'Bevestigen'];

type Validator = (v: string, c: CountryCode) => Result;

const VALIDATORS: Record<string, Validator> = {
  bedrijfsnaam: (v) => required(v, 'Vul je bedrijfsnaam in.'),
  bedrijfsnummer: (v, c) => validateCompanyNumber(c, v),
  btw: (v, c) => validateVat(c, v),
  sector: (v) => required(v, 'Kies je sector.'),
  locaties: (v) => required(v, 'Kies het aantal locaties.'),
  website: (v) => normalizeUrl(v),
  google: (v) => normalizeUrl(v),
  voornaam: (v) => required(v, 'Vul je voornaam in.'),
  achternaam: (v) => required(v, 'Vul je achternaam in.'),
  email: (v) => validateEmail(v),
  telefoon: (v, c) => validatePhone(c, v),
  postcode: (v, c) => validatePostcode(c, v),
  huisnummer: (v) => (/^\d{1,5}\s?[a-zA-Z]?$/.test(v.trim()) ? { ok: true, value: v.trim() } : { ok: false, value: v, error: 'Vul je huisnummer in.' }),
  straat: (v) => required(v, 'Vul je straat in.'),
  plaats: (v) => required(v, 'Vul je plaats in.'),
};

const STEP_FIELDS: Record<number, string[]> = {
  1: ['bedrijfsnaam', 'bedrijfsnummer', 'btw', 'sector', 'locaties', 'website', 'google'],
  2: ['voornaam', 'achternaam', 'email', 'telefoon', 'postcode', 'huisnummer', 'straat', 'plaats'],
  3: [],
};

interface LastRequest {
  ref: string;
  totem: boolean;
  email: string;
  voornaam: string;
  extras: boolean;
  paid?: boolean;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      getResponse: (id?: string) => string | undefined;
      reset: (id?: string) => void;
      isExpired?: (id?: string) => boolean;
    };
  }
}

export function initFlow(): void {
  const root = document.querySelector<HTMLElement>('[data-flow]');
  const form = document.querySelector<HTMLFormElement>('#aanvraag');
  if (!root || !form) return;

  const cfg = root.dataset;
  const catalog = JSON.parse(document.getElementById('catalog')?.textContent || '[]') as PublicProduct[];
  const set = catalog.find((p) => p.type === 'kaartenset');
  const totem = catalog.find((p) => p.type === 'totem');
  const $ = <T extends HTMLElement = HTMLElement>(sel: string, scope: ParentNode = root) => scope.querySelector<T>(sel);
  const $$ = <T extends HTMLElement = HTMLElement>(sel: string, scope: ParentNode = root) => Array.from(scope.querySelectorAll<T>(sel));
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
  const val = (name: string) => (field(name)?.value ?? '').trim();
  const country = (): CountryCode => ((form.querySelector<HTMLInputElement>('input[name=land]:checked')?.value as CountryCode) || 'NL');
  const maatwerk = (): boolean => Boolean((field('maatwerk') as HTMLInputElement | null)?.checked);
  const syncMaatwerk = () => {
    $('[data-maatwerk-wensen]')!.hidden = !maatwerk();
  };

  let step = 1;
  let started = false;
  let turnstileId: string | undefined;
  let submitting = false;

  // ── Concept bewaren (sessionStorage, alleen deze sessie) ─────────────────
  type Draft = { values: Record<string, string | boolean>; ref: string };
  const draft = readJSON<Draft>('session', DRAFT_KEY, { values: {}, ref: newLeadRef() });

  function saveDraft(): void {
    const values: Record<string, string | boolean> = {};
    for (const el of Array.from(form!.elements) as HTMLInputElement[]) {
      if (!el.name || el.name.startsWith('hp_') || el.type === 'submit' || el.type === 'button') continue;
      if (el.type === 'radio') {
        if (el.checked) values[el.name] = el.value;
      } else if (el.type === 'checkbox') values[el.name] = el.checked;
      else values[el.name] = el.value;
    }
    draft.values = values;
    writeJSON('session', DRAFT_KEY, draft);
  }

  function restoreDraft(): void {
    for (const [name, v] of Object.entries(draft.values)) {
      if (name === 'totem_demo') continue; // komt uit de winkelwagen
      const nodes = form!.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(name)}"]`);
      nodes.forEach((el) => {
        if (el.type === 'radio') el.checked = el.value === v;
        else if (el.type === 'checkbox') el.checked = Boolean(v);
        else el.value = String(v);
      });
    }
  }

  // ── Meldingen per veld ───────────────────────────────────────────────────
  function showResult(name: string, r: Result | null): void {
    const wrap = form!.querySelector<HTMLElement>(`[data-field="${name}"]`);
    const input = field(name);
    const msg = wrap?.querySelector<HTMLElement>('[data-msg]');
    if (!wrap || !input || !msg) return;
    if (!r || (r.ok && !r.warning)) {
      input.removeAttribute('aria-invalid');
      msg.textContent = '';
      msg.className = 'error';
    } else if (!r.ok) {
      input.setAttribute('aria-invalid', 'true');
      msg.textContent = r.error ?? '';
      msg.className = 'error';
    } else {
      input.removeAttribute('aria-invalid');
      msg.textContent = r.warning ?? '';
      msg.className = 'warn';
    }
  }

  function checkField(name: string, normalize = true): Result {
    const r = VALIDATORS[name]!(val(name), country());
    const el = field(name);
    if (normalize && r.ok && el && el instanceof HTMLInputElement && r.value && el.type !== 'email') el.value = r.value;
    showResult(name, r);
    return r;
  }

  function checkboxRequired(name: string, message: string): boolean {
    const el = field(name) as HTMLInputElement;
    const ok = el.checked;
    showResult(name, ok ? null : { ok: false, value: '', error: message });
    return ok;
  }

  function validateStep(n: number): boolean {
    let firstBad: HTMLElement | null = null;
    for (const name of STEP_FIELDS[n] ?? []) {
      const r = checkField(name);
      if (!r.ok && !firstBad) firstBad = field(name);
    }
    if (n === 3) {
      const a = checkboxRequired('akkoord_voorwaarden', 'Ga akkoord met de actievoorwaarden en de privacyverklaring om verder te gaan.');
      const b = checkboxRequired('akkoord_contact', 'Dit akkoord is nodig om je aanvraag te kunnen behandelen.');
      if (!a && !firstBad) firstBad = field('akkoord_voorwaarden');
      if (!b && !firstBad) firstBad = field('akkoord_contact');
    }
    firstBad?.focus();
    return !firstBad;
  }

  // ── Landafhankelijke labels ──────────────────────────────────────────────
  function applyCountry(): void {
    const c = country();
    const numLabel = form!.querySelector<HTMLLabelElement>('label[for=bedrijfsnummer]');
    const numHint = document.getElementById('bedrijfsnummer-hint');
    const btwHint = document.getElementById('btw-hint');
    const pc = field('postcode') as HTMLInputElement;
    if (numLabel?.firstChild) numLabel.firstChild.textContent = c === 'NL' ? 'KvK-nummer' : 'Ondernemingsnummer (KBO)';
    if (numHint) numHint.textContent = c === 'NL' ? '8 cijfers, te vinden op je KvK-uittreksel.' : '10 cijfers, bijvoorbeeld 0123.456.789.';
    if (btwHint) btwHint.textContent = c === 'NL' ? 'Bijvoorbeeld NL123456789B01' : 'Bijvoorbeeld BE0123456789';
    pc.placeholder = c === 'NL' ? '1234 AB' : '2000';
    for (const name of ['bedrijfsnummer', 'btw', 'postcode', 'telefoon']) if (val(name)) checkField(name, false);
    const kvkHint = document.getElementById('bedrijfsnaam-hint');
    if (kvkHint && cfg.kvkProxy) kvkHint.hidden = c !== 'NL';
    const status = $('[data-address-status]');
    if (status) status.textContent = c === 'NL' && cfg.addressLookup ? 'Vul postcode en huisnummer in, dan vullen we straat en plaats automatisch aan.' : '';
  }

  // ── Adres aanvullen (NL, PDOK Locatieserver, gratis) ─────────────────────
  let lookupSeq = 0;
  async function lookupAddress(): Promise<void> {
    if (country() !== 'NL' || !cfg.addressLookup) return;
    const pc = validatePostcode('NL', val('postcode'));
    const nr = val('huisnummer').match(/^\d+/)?.[0];
    if (!pc.ok || !nr) return;
    const seq = ++lookupSeq;
    const status = $('[data-address-status]')!;
    status.textContent = 'Adres opzoeken…';
    try {
      const q = `${pc.value.replace(' ', '')} ${nr}`;
      const res = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${encodeURIComponent(q)}&fq=type:adres&rows=1&fl=straatnaam,woonplaatsnaam,postcode,huisnummer`);
      const json = (await res.json()) as { response: { docs: { straatnaam: string; woonplaatsnaam: string; postcode: string; huisnummer: number }[] } };
      const doc = json.response.docs[0];
      if (seq !== lookupSeq) return;
      if (doc && doc.postcode === pc.value.replace(' ', '') && String(doc.huisnummer) === nr) {
        for (const [name, value] of [['straat', doc.straatnaam], ['plaats', doc.woonplaatsnaam]] as const) {
          const el = field(name) as HTMLInputElement;
          if (!el.value || el.dataset.auto === '1') {
            el.value = value;
            el.dataset.auto = '1';
            showResult(name, null);
          }
        }
        status.textContent = `Gevonden: ${doc.straatnaam} ${nr}, ${doc.woonplaatsnaam}. Klopt dit niet? Pas het hieronder aan.`;
        saveDraft();
      } else {
        status.textContent = 'We konden dit adres niet automatisch vinden. Vul straat en plaats zelf in.';
      }
    } catch {
      status.textContent = 'Vul straat en plaats zelf in.';
    }
  }

  // ── Winkelwagen / overzicht ──────────────────────────────────────────────
  function lineHtml(p: PublicProduct, cart: Cart): string {
    const extra = cart.extras[p.slug] ?? 0;
    const isTotem = p.gratisVoorwaarde === 'bij-demo';
    const freeQty = isTotem ? (cart.totemDemo ? p.gratisAantal : 0) : p.gratisAantal;
    const unit = p.extraEenheid === 'kaart' ? 'kaarten' : 'totems';
    const freeLabel = isTotem
      ? cart.totemDemo
        ? `<span class="font-medium text-brand-600">Gratis bij je demo</span> <s class="text-muted">${formatPrice(p.normalePrijs)}</s>`
        : `<span class="text-muted">Niet gekozen</span>`
      : `<span class="font-medium text-brand-600">Gratis</span> <s class="text-muted">${formatPrice(p.normalePrijs)}</s>`;
    return `
      <li class="grid gap-2">
        <div class="flex items-start justify-between gap-3">
          <p class="font-medium">${freeQty ? `${freeQty}× ` : ''}${p.naam}</p>
          ${isTotem ? `<button type="button" class="shrink-0 text-sm text-brand-600 underline" data-totem-line-toggle>${cart.totemDemo ? 'Verwijderen' : 'Toevoegen'}</button>` : ''}
        </div>
        <p class="text-sm">${freeLabel}</p>
        ${
          p.prijsExtra > 0 && root!.dataset.extrasEnabled !== '0'
            ? `<div class="flex items-center justify-between gap-2 rounded-xl bg-surface-alt px-3 py-2">
                <label for="x-${p.slug}" class="text-sm text-ink-soft">Extra ${unit} <span class="text-muted">(${formatPrice(p.prijsExtra)} p/st)</span></label>
                <div class="flex items-center">
                  <button type="button" class="size-9 rounded-full text-lg text-brand-600 hover:bg-brand-100" data-x-step="-1" data-slug="${p.slug}" aria-label="Eén ${p.extraEenheid} minder">−</button>
                  <input id="x-${p.slug}" type="number" min="0" max="${p.maxExtra}" value="${extra}" inputmode="numeric" class="w-10 bg-transparent text-center [appearance:textfield]" data-x-input data-slug="${p.slug}" />
                  <button type="button" class="size-9 rounded-full text-lg text-brand-600 hover:bg-brand-100" data-x-step="1" data-slug="${p.slug}" aria-label="Eén ${p.extraEenheid} meer">+</button>
                </div>
              </div>`
            : ''
        }
      </li>`;
  }

  function extrasAmount(cart: Cart): number {
    return catalog.reduce((sum, p) => sum + (cart.extras[p.slug] ?? 0) * p.prijsExtra, 0);
  }

  function renderSummary(): void {
    const cart = getCart();
    const lines = $('[data-lines]')!;
    const focusedSlug = (document.activeElement as HTMLElement | null)?.dataset?.slug;
    lines.innerHTML = catalog.map((p) => lineHtml(p, cart)).join('');
    if (focusedSlug) $<HTMLInputElement>(`[data-x-input][data-slug="${focusedSlug}"]`)?.focus();
    const amount = extrasAmount(cart);
    $('[data-extras-total-row]')!.hidden = amount === 0;
    $('[data-free-total-row]')!.hidden = amount > 0;
    $('[data-extras-total]')!.textContent = formatPrice(amount);
    const toggle = $<HTMLInputElement>('[data-totem-toggle]');
    if (toggle) toggle.checked = cart.totemDemo;
    const submit = $<HTMLButtonElement>('[data-submit]');
    if (submit && !submitting) submit.textContent = amount > 0 ? 'Verstuur aanvraag en betaal extra\'s' : 'Verstuur aanvraag';
    if (step === 3) renderReview();
  }

  function renderReview(): void {
    const cart = getCart();
    const c = country();
    const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
    const addr = `${esc(val('straat'))} ${esc(val('huisnummer'))}${val('toevoeging') ? ` ${esc(val('toevoeging'))}` : ''}, ${esc(val('postcode'))} ${esc(val('plaats'))}, ${c === 'NL' ? 'Nederland' : 'België'}`;
    const items: string[] = [];
    if (set) items.push(`<li>${set.gratisAantal}× ${esc(set.naam)}: <strong>gratis</strong> <s class="text-muted">${formatPrice(set.normalePrijs)}</s></li>`);
    if (totem && cart.totemDemo) items.push(`<li>${totem.gratisAantal}× ${esc(totem.naam)}: <strong>gratis bij je demo</strong> <s class="text-muted">${formatPrice(totem.normalePrijs)}</s></li>`);
    for (const p of catalog) {
      const n = cart.extras[p.slug] ?? 0;
      if (n) items.push(`<li>${n}× extra ${esc(p.extraEenheid)} (${esc(p.naam)}): ${formatPrice(n * p.prijsExtra)}</li>`);
    }
    if (maatwerk()) items.push('<li>QR-reviewkaarten in je eigen huisstijl: <strong>we sturen je een voorstel</strong> (betaald, los van deze aanvraag)</li>');
    items.push('<li>Verzending: <strong>gratis</strong></li>');
    $('[data-review]')!.innerHTML = `
      <dl class="grid gap-3 md:grid-cols-2">
        <div><dt class="text-muted">Bedrijf</dt><dd class="font-medium">${esc(val('bedrijfsnaam'))}<br><span class="font-normal">${c === 'NL' ? 'KvK' : 'KBO'} ${esc(val('bedrijfsnummer'))}</span></dd></div>
        <div><dt class="text-muted">Contact</dt><dd class="font-medium">${esc(val('voornaam'))} ${esc(val('achternaam'))}<br><span class="font-normal">${esc(val('email'))} · ${esc(val('telefoon'))}</span></dd></div>
        <div class="md:col-span-2"><dt class="text-muted">Bezorgadres</dt><dd>${addr}</dd></div>
        <div class="md:col-span-2"><dt class="text-muted">Producten</dt><dd><ul class="mt-1 grid gap-1">${items.join('')}</ul></dd></div>
      </dl>
      <button type="button" class="mt-3 text-brand-600 underline" data-prev="1">Gegevens wijzigen</button>`;
  }

  // ── Stappen ──────────────────────────────────────────────────────────────
  function showStep(n: number | 'demo', focus = true): void {
    $$('[data-step]').forEach((el) => (el.hidden = el.dataset.step !== String(n)));
    const progressWrap = $('[data-progress-wrap]')!;
    if (n === 'demo') {
      progressWrap.hidden = true;
      $('[data-flow-header]')!.hidden = true;
      $('[data-summary]')!.hidden = true;
      root!.classList.remove('lg:grid-cols-[1fr_380px]');
      const title = document.getElementById('demo-title');
      if (focus) title?.focus();
      window.scrollTo({ top: 0 });
      return;
    }
    step = n;
    progressWrap.hidden = false;
    $('[data-progress-label]')!.textContent = `Stap ${n} van 3: ${STEP_LABELS[n - 1]}`;
    $('[data-progress-bar]')!.style.width = `${(n / 3) * 100}%`;
    $('[data-progress]')!.setAttribute('aria-valuenow', String(n));
    if (n === 3) {
      renderReview();
      loadTurnstile();
    }
    if (focus) {
      const title = $(`[data-step="${n}"] [data-step-title]`);
      title?.focus({ preventScroll: true });
      root!.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  function go(n: number): void {
    if (n > step && !validateStep(step)) return;
    if (n === 2 && step === 1) track('stap_2');
    if (n === 3 && step === 2) track('stap_3');
    showStep(n);
  }

  // ── Turnstile ────────────────────────────────────────────────────────────
  function loadTurnstile(): void {
    const key = cfg.turnstile;
    const slot = $('[data-turnstile-slot]');
    if (!key || !slot || turnstileId !== undefined) return;
    const render = () => {
      if (!window.turnstile || turnstileId !== undefined) return;
      turnstileId = window.turnstile.render(slot, { sitekey: key, language: 'nl', appearance: 'interaction-only', action: 'aanvraag' });
    };
    if (window.turnstile) return render();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }

  async function turnstileToken(): Promise<string | null> {
    if (!cfg.turnstile) return null;
    for (let i = 0; i < 20; i++) {
      const t = window.turnstile?.getResponse(turnstileId);
      if (t) return t;
      await new Promise((r) => setTimeout(r, 250));
    }
    return window.turnstile?.getResponse(turnstileId) || null;
  }

  // ── Payload ──────────────────────────────────────────────────────────────
  function buildPayload(requestType: LeadPayload['request_type'], token: string | null): LeadPayload {
    const cart = getCart();
    const c = country();
    const producten: LeadLine[] = catalog
      .map((p) => {
        const isTotem = p.gratisVoorwaarde === 'bij-demo';
        const gratis = requestType === 'extras_betalen' ? 0 : isTotem ? (cart.totemDemo ? p.gratisAantal : 0) : p.gratisAantal;
        return {
          slug: p.slug, naam: p.naam, gratis, extra: cart.extras[p.slug] ?? 0,
          prijs_extra: p.prijsExtra, normale_prijs: p.normalePrijs, gratis_voorwaarde: p.gratisVoorwaarde,
        };
      })
      .filter((l) => l.gratis > 0 || l.extra > 0);
    const origin = window.location.origin;
    const self = cfg.self || '/aanvragen';
    const ref = draft.ref;
    return {
      payload_version: PAYLOAD_VERSION,
      request_type: requestType,
      lead_ref: ref,
      lead_source: 'shop',
      submitted_at: new Date().toISOString(),
      bedrijf: {
        land: c,
        naam: val('bedrijfsnaam'),
        bedrijfsnummer_type: c === 'NL' ? 'kvk' : 'kbo',
        bedrijfsnummer: validateCompanyNumber(c, val('bedrijfsnummer')).value,
        btw_nummer: val('btw') ? validateVat(c, val('btw')).value : null,
        sector: val('sector'),
        aantal_locaties: val('locaties'),
        website: val('website') || null,
        google_profiel: val('google') || null,
      },
      contact: {
        voornaam: val('voornaam'),
        achternaam: val('achternaam'),
        functie: val('functie') || null,
        email: validateEmail(val('email')).value,
        telefoon: validatePhone(c, val('telefoon')).value,
      },
      bezorgadres: {
        straat: val('straat'),
        huisnummer: val('huisnummer'),
        toevoeging: val('toevoeging') || null,
        postcode: validatePostcode(c, val('postcode')).value,
        plaats: val('plaats'),
        land: c,
      },
      producten,
      totem_demo: cart.totemDemo,
      maatwerk: {
        interesse: maatwerk(),
        wensen: maatwerk() ? val('maatwerk_wensen') || null : null,
      },
      heeft_betaalde_extras: producten.some((l) => l.extra > 0),
      bedrag_extras_indicatief: Math.round(extrasAmount(cart) * 100) / 100,
      vragen: {
        huidige_reviewtool: val('reviewtool') || null,
        huidige_reviewtool_anders: val('reviewtool') === 'anders' ? val('reviewtool_anders') || null : null,
        aantal_google_reviews: val('reviews') || null,
      },
      toestemming: {
        actievoorwaarden_privacy: (field('akkoord_voorwaarden') as HTMLInputElement).checked,
        contact_opvolging: (field('akkoord_contact') as HTMLInputElement).checked,
        nieuwsbrief: (field('nieuwsbrief') as HTMLInputElement).checked,
        tekst_versie: CONSENT_TEXT_VERSION,
      },
      attributie: getAttribution(),
      pagina: window.location.href.split('?')[0] ?? window.location.href,
      turnstile_token: token,
      return_urls: {
        betaald: `${origin}${self}?status=betaald&ref=${encodeURIComponent(ref)}`,
        geannuleerd: `${origin}${self}?status=geannuleerd&ref=${encodeURIComponent(ref)}`,
      },
    };
  }

  // ── Na verzenden ─────────────────────────────────────────────────────────
  function notice(kind: 'info' | 'warn' | 'error' | 'success', html: string): void {
    const el = $('[data-notice]')!;
    const styles = {
      info: 'border-brand-200 bg-brand-50 text-ink',
      warn: 'border-warning/30 bg-warning-bg text-ink',
      error: 'border-danger/30 bg-danger-bg text-danger',
      success: 'border-success/30 bg-success-bg text-ink',
    };
    el.className = `mt-6 rounded-2xl border p-4 text-sm ${styles[kind]}`;
    el.innerHTML = html;
    el.hidden = false;
  }

  function goToDemoOrThanks(last: LastRequest): void {
    fireLeadConversion(last.ref);
    if (last.totem) {
      const emailEl = $('[data-demo-email]');
      if (emailEl) emailEl.textContent = last.email;
      showStep('demo');
    } else {
      window.location.href = `${cfg.bedankt}?ref=${encodeURIComponent(last.ref)}`;
    }
  }

  function submitError(message: string): void {
    const box = $('[data-submit-error]')!;
    const subject = encodeURIComponent('Aanvraag NFC-kaarten (formulier werkte niet)');
    box.innerHTML = `
      <p class="font-medium">${message}</p>
      <p class="mt-1 text-ink-soft">Je gegevens zijn bewaard. Probeer het opnieuw, of mail ons via
      <a class="underline" href="mailto:${cfg.fallbackEmail}?subject=${subject}">${cfg.fallbackEmail}</a>.</p>
      <button type="submit" class="btn btn-secondary mt-3">Probeer opnieuw</button>`;
    box.classList.remove('hidden');
    box.focus();
  }

  async function send(requestType: LeadPayload['request_type']): Promise<void> {
    if (submitting) return;
    const submitBtn = $<HTMLButtonElement>('[data-submit]')!;
    const errorBox = $('[data-submit-error]')!;
    errorBox.classList.add('hidden');

    // Honeypot: doe alsof het gelukt is, verstuur niets.
    if ((field('hp_bedrijfsurl') as HTMLInputElement)?.value) {
      window.location.href = cfg.bedankt || '/';
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    submitBtn.textContent = 'Bezig met versturen…';
    try {
      const token = await turnstileToken();
      if (cfg.turnstile && !token) throw new Error('turnstile');
      const payload = buildPayload(requestType, token);
      const res = await submitLead(payload, {
        provider: (cfg.provider as 'make' | 'web3forms' | 'formspree') || 'make',
        webhookUrl: cfg.webhook || '',
        web3formsKey: cfg.web3forms || '',
      });
      const last: LastRequest = {
        ref: payload.lead_ref,
        totem: payload.totem_demo,
        email: payload.contact.email,
        voornaam: payload.contact.voornaam,
        extras: payload.heeft_betaalde_extras,
      };
      writeJSON('session', LAST_KEY, last);
      if (requestType === 'aanvraag') {
        track('aanvraag_verzonden', { land: payload.bedrijf.land, sector: payload.bedrijf.sector, totem: payload.totem_demo, extras: payload.heeft_betaalde_extras });
        if (payload.totem_demo) track('totem_gekozen', { plek: 'verzonden' });
      }
      if (res.checkoutUrl) {
        track('betaling_gestart', { bedrag: payload.bedrag_extras_indicatief });
        window.location.href = res.checkoutUrl;
        return;
      }
      remove('session', DRAFT_KEY);
      goToDemoOrThanks(last);
    } catch (err) {
      const msg =
        err instanceof Error && err.message === 'turnstile'
          ? 'De beveiligingscontrole is nog niet afgerond. Wacht een paar seconden en probeer het opnieuw.'
          : 'Het versturen is niet gelukt.';
      window.turnstile?.reset(turnstileId);
      submitError(msg);
    } finally {
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  }

  // ── Terugkomst van Mollie ────────────────────────────────────────────────
  function handleReturn(): boolean {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const last = readJSON<LastRequest | null>('session', LAST_KEY, null);
    if (!status) return false;
    if (status === 'betaald') {
      clearExtras();
      remove('session', DRAFT_KEY);
      const l = last ?? { ref: params.get('ref') ?? 'onbekend', totem: false, email: '', voornaam: '', extras: true };
      writeJSON('session', LAST_KEY, { ...l, paid: true });
      notice('success', '<strong>Betaling gelukt.</strong> Je extra\'s worden samen met je gratis producten verzonden.');
      goToDemoOrThanks(l);
      return true;
    }
    if (status === 'geannuleerd') {
      showStep(3, false);
      notice('warn', `
        <p><strong>De betaling is niet afgerond.</strong> Geen zorgen: je gratis producten zijn al aangevraagd.</p>
        <p class="mt-1 text-ink-soft">Wil je de extra's alsnog afrekenen, of ga je verder zonder extra's?</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="btn btn-primary" data-retry-pay>Extra's alsnog afrekenen</button>
          <button type="button" class="btn btn-secondary" data-skip-extras>Verder zonder extra's</button>
        </div>`);
      $('[data-retry-pay]')?.addEventListener('click', () => void send('extras_betalen'));
      $('[data-skip-extras]')?.addEventListener('click', () => {
        clearExtras();
        remove('session', DRAFT_KEY);
        goToDemoOrThanks(last ?? { ref: params.get('ref') ?? 'onbekend', totem: getCart().totemDemo, email: val('email'), voornaam: val('voornaam'), extras: false });
      });
      return true;
    }
    return false;
  }

  // ── KvK-autofill (NL): bedrijfsnaam of KvK-nummer typen, bedrijf kiezen, rest wordt ingevuld ──
  kvkAutofill({
    proxyUrl: cfg.kvkProxy ?? '',
    velden: [field('bedrijfsnaam'), field('bedrijfsnummer')].filter((el): el is HTMLInputElement => el instanceof HTMLInputElement),
    actief: () => country() === 'NL',
    vul: (r) => {
      // Adresvelden altijd overschrijven (ook leeg), zodat er niets van een eerdere keuze blijft staan
      const zet = (name: string, waarde: string) => {
        const el = field(name);
        if (el) el.value = waarde;
      };
      zet('bedrijfsnaam', r.naam);
      zet('bedrijfsnummer', r.kvkNummer);
      zet('postcode', formatteerPostcode(r.postcode));
      zet('huisnummer', r.huisnummer);
      zet('toevoeging', r.huisletter);
      zet('straat', r.straat);
      zet('plaats', r.plaats);
      for (const name of ['straat', 'plaats']) {
        const el = field(name);
        if (el && el.value) el.dataset.auto = '1';
      }
      for (const name of ['bedrijfsnaam', 'bedrijfsnummer', 'postcode', 'huisnummer', 'straat', 'plaats']) {
        if (VALIDATORS[name] && val(name)) checkField(name);
      }
      updateMapsLink();
      saveDraft();
    },
  });

  // ── Events ───────────────────────────────────────────────────────────────
  form.addEventListener('focusin', () => {
    if (!started) {
      started = true;
      track('start_aanvraag');
    }
  });
  form.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'straat' || t.name === 'plaats') t.dataset.auto = '';
    saveDraft();
  });
  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'land') applyCountry();
    if (t.name === 'reviewtool') $('[data-reviewtool-other]')!.hidden = t.value !== 'anders';
    if (t.name === 'maatwerk') {
      syncMaatwerk();
      if (step === 3) renderReview();
    }
    saveDraft();
  });
  form.addEventListener('focusout', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name && VALIDATORS[t.name] && (t.value || t.getAttribute('aria-invalid'))) checkField(t.name);
    if (t.name === 'postcode' || t.name === 'huisnummer') void lookupAddress();
    if (t.name === 'bedrijfsnaam') updateMapsLink();
  });
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-next],[data-prev],[data-x-step],[data-totem-line-toggle]');
    if (!t) return;
    if (t.dataset.next) go(Number(t.dataset.next));
    else if (t.dataset.prev) showStep(Number(t.dataset.prev));
    else if (t.dataset.xStep) {
      const slug = t.dataset.slug!;
      const p = catalog.find((x) => x.slug === slug);
      setExtra(slug, (getCart().extras[slug] ?? 0) + Number(t.dataset.xStep), p?.maxExtra);
    } else if (t.hasAttribute('data-totem-line-toggle')) {
      const on = !getCart().totemDemo;
      setTotemDemo(on);
      if (on) track('totem_gekozen', { plek: 'overzicht' });
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('[data-x-input]')) {
      const p = catalog.find((x) => x.slug === t.dataset.slug);
      setExtra(t.dataset.slug!, Number(t.value), p?.maxExtra);
    }
    if (t.matches('[data-totem-toggle]')) {
      setTotemDemo(t.checked);
      if (t.checked) track('totem_gekozen', { plek: 'stap_3' });
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    for (const n of [1, 2]) {
      if (!validateStep(n)) {
        showStep(n);
        validateStep(n);
        return;
      }
    }
    if (!validateStep(3)) return;
    void send('aanvraag');
  });
  $('[data-demo-open]')?.addEventListener('click', () => track('demo_klik', { plek: 'demo_stap' }));
  $('[data-demo-later]')?.addEventListener('click', () => track('demo_later'));

  function updateMapsLink(): void {
    const a = $<HTMLAnchorElement>('[data-maps-search]');
    const name = val('bedrijfsnaam');
    if (a) a.href = name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}` : 'https://www.google.com/maps';
  }

  // ── Start ────────────────────────────────────────────────────────────────
  if (!cfg.webhook && cfg.provider !== 'web3forms') {
    console.warn('[aanvraag] PUBLIC_LEAD_WEBHOOK_URL ontbreekt: verzenden zal mislukken.');
  }
  restoreDraft();
  const presetSector = new URLSearchParams(window.location.search).get('sector') || getAttribution()?.sector_page;
  const sectorEl = field('sector') as HTMLSelectElement;
  if (presetSector && !sectorEl.value && Array.from(sectorEl.options).some((o) => o.value === presetSector)) sectorEl.value = presetSector;
  $('[data-reviewtool-other]')!.hidden = val('reviewtool') !== 'anders';
  if (new URLSearchParams(window.location.search).get('maatwerk') === '1') {
    const mw = field('maatwerk') as HTMLInputElement | null;
    if (mw) mw.checked = true;
  }
  syncMaatwerk();
  applyCountry();
  updateMapsLink();
  writeJSON('session', DRAFT_KEY, draft);
  if (window.matchMedia('(max-width: 1199px)').matches) ($('[data-summary-details]') as HTMLDetailsElement).open = extrasCount() > 0;
  renderSummary();
  onCartChange(renderSummary);
  if (!handleReturn()) showStep(1, false);
}
