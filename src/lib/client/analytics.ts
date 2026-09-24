/**
 * Privacyvriendelijke events (Plausible of Umami). Zonder geconfigureerde provider is dit een no-op.
 * Eventnamen: product_view, start_aanvraag, stap_2, stap_3, aanvraag_verzonden, totem_gekozen,
 * demo_klik, demo_later, demo_ingepland, betaling_gestart
 */
export type EventName =
  | 'product_view'
  | 'start_aanvraag'
  | 'stap_2'
  | 'stap_3'
  | 'aanvraag_verzonden'
  | 'totem_gekozen'
  | 'demo_klik'
  | 'demo_later'
  | 'demo_ingepland'
  | 'betaling_gestart';

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: ((event: string, opts?: { props?: Props }) => void) & { q?: unknown[] };
    umami?: { track: (event: string, data?: Props) => void };
  }
}

// Umami heeft geen wachtrij zoals Plausible: events van vóór het laden van het script bewaren we even.
const pending: [EventName, Props][] = [];

function flushUmami(tries = 0): void {
  if (window.umami) {
    for (const [event, props] of pending.splice(0)) window.umami.track(event, props);
  } else if (tries < 40) {
    setTimeout(() => flushUmami(tries + 1), 250);
  }
}

export function track(event: EventName, props: Props = {}): void {
  try {
    if (typeof window.plausible === 'function') window.plausible(event, { props });
    else if (window.umami) window.umami.track(event, props);
    else if (document.querySelector('script[data-website-id]') && pending.push([event, props]) === 1) flushUmami();
    if (import.meta.env.DEV) console.debug('[track]', event, props);
  } catch {
    /* analytics mag de site nooit breken */
  }
}

/** Klikken op elementen met data-track="demo_klik" etc. automatisch meten. */
export function bindTrackedClicks(): void {
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-track]');
    if (!el) return;
    const props: Props = {};
    if (el.dataset.trackPlek) props.plek = el.dataset.trackPlek;
    track(el.dataset.track as EventName, props);
  });
}
