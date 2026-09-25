/**
 * KvK-autofill: zoekt tijdens het typen in het Handelsregister (via onze KvK-Worker) en vult
 * bedrijfsnaam, KvK-nummer en adres in. Toegankelijk als combobox (pijltjes, Enter, Escape).
 * Staat alleen aan als PUBLIC_KVK_PROXY_URL is ingesteld en het land Nederland is.
 * Faalt stil: bij een fout typt de bezoeker gewoon zelf verder.
 */

export interface KvkResultaat {
  kvkNummer: string;
  vestigingsnummer: string;
  naam: string;
  type: string;
  straat: string;
  huisnummer: string;
  huisletter: string;
  postcode: string;
  plaats: string;
}

interface Opties {
  proxyUrl: string;
  /** Invoervelden waarop gezocht wordt (bedrijfsnaam en/of KvK-nummer). */
  velden: HTMLInputElement[];
  /** Mag er gezocht worden (bv. alleen bij land = NL)? */
  actief?: () => boolean;
  /** Vult het formulier met het gekozen bedrijf. */
  vul: (r: KvkResultaat) => void;
}

const postcodeNetjes = (p: string) => p.replace(/^(\d{4})\s*([A-Za-z]{2})$/, (_, a: string, b: string) => `${a} ${b.toUpperCase()}`);

export function formatteerPostcode(p: string): string {
  return postcodeNetjes(p.trim());
}

let teller = 0;

export function kvkAutofill({ proxyUrl, velden, actief = () => true, vul }: Opties): void {
  if (!proxyUrl) return;
  for (const input of velden) koppel(input);

  function koppel(input: HTMLInputElement) {
    const id = `kvk-lijst-${++teller}`;
    const wrapper = input.parentElement!;
    wrapper.classList.add('relative');

    const lijst = document.createElement('ul');
    lijst.id = id;
    lijst.setAttribute('role', 'listbox');
    lijst.setAttribute('aria-label', 'Bedrijven uit het KvK Handelsregister');
    lijst.className = 'kvk-lijst';
    lijst.hidden = true;
    wrapper.appendChild(lijst);

    const status = document.createElement('p');
    status.className = 'sr-only';
    status.setAttribute('aria-live', 'polite');
    wrapper.appendChild(status);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', id);
    input.setAttribute('autocomplete', 'off');

    let resultaten: KvkResultaat[] = [];
    let actieveIndex = -1;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    let laatsteTerm = '';

    const sluit = () => {
      lijst.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      actieveIndex = -1;
    };

    const markeer = (i: number) => {
      actieveIndex = i;
      [...lijst.children].forEach((li, n) => li.setAttribute('aria-selected', String(n === i)));
      if (i >= 0) {
        input.setAttribute('aria-activedescendant', `${id}-${i}`);
        (lijst.children[i] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    };

    const kies = (i: number) => {
      const r = resultaten[i];
      if (!r) return;
      vul(r);
      sluit();
      status.textContent = `${r.naam} ingevuld met gegevens uit het KvK Handelsregister.`;
    };

    const toon = () => {
      lijst.replaceChildren();
      if (!resultaten.length) {
        sluit();
        status.textContent = laatsteTerm.length >= 3 ? 'Geen bedrijven gevonden in het KvK Handelsregister.' : '';
        return;
      }
      resultaten.forEach((r, i) => {
        const li = document.createElement('li');
        li.id = `${id}-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        const adres = [r.straat && `${r.straat} ${r.huisnummer}${r.huisletter}`.trim(), r.plaats].filter(Boolean).join(', ');
        const naam = document.createElement('span');
        naam.className = 'kvk-naam';
        naam.textContent = r.naam;
        const info = document.createElement('span');
        info.className = 'kvk-info';
        info.textContent = [`KvK ${r.kvkNummer}`, adres, r.type === 'nevenvestiging' ? 'nevenvestiging' : ''].filter(Boolean).join(' · ');
        li.append(naam, info);
        // mousedown i.p.v. click: gebeurt vóór de blur van het invoerveld
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          kies(i);
        });
        lijst.appendChild(li);
      });
      const bron = document.createElement('li');
      bron.className = 'kvk-bron';
      bron.setAttribute('role', 'presentation');
      bron.textContent = 'Bron: KvK Handelsregister';
      lijst.appendChild(bron);
      lijst.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      markeer(-1);
      status.textContent = `${resultaten.length} ${resultaten.length === 1 ? 'bedrijf' : 'bedrijven'} gevonden. Gebruik de pijltjestoetsen om te kiezen.`;
    };

    const zoek = async (term: string) => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch(`${proxyUrl}?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { resultaten?: KvkResultaat[] };
        if (term !== laatsteTerm) return;
        resultaten = data.resultaten ?? [];
        toon();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          resultaten = [];
          sluit();
        }
      }
    };

    input.addEventListener('input', () => {
      window.clearTimeout(timer);
      const term = input.value.trim();
      laatsteTerm = term;
      if (!actief() || term.length < 3) {
        resultaten = [];
        sluit();
        return;
      }
      timer = window.setTimeout(() => zoek(term), 300);
    });

    input.addEventListener('keydown', (e) => {
      if (lijst.hidden) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        markeer(Math.min(actieveIndex + 1, resultaten.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        markeer(Math.max(actieveIndex - 1, 0));
      } else if (e.key === 'Enter' && actieveIndex >= 0) {
        e.preventDefault();
        kies(actieveIndex);
      } else if (e.key === 'Escape') {
        sluit();
      }
    });

    input.addEventListener('blur', () => window.setTimeout(sluit, 120));
  }
}
