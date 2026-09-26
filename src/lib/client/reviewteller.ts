/**
 * Live reviewteller (components/shop/Teller.astro) aansturen in de browser:
 * - setTeller: naar een nieuw aantal klappen, cijfer voor cijfer;
 * - zetPlatform: logo en scorevak (ster, bol of blauw vlak) wisselen;
 * - zetScore: het gemiddelde aanpassen;
 * - zetCijfers: tussen 5 en 7 cijfers wisselen.
 * Zonder animatie als de bezoeker minder beweging wil. Overgenomen uit de View Plus Shop (lib/client/teller.ts).
 */
import { scoreHtml, type ScoreVorm } from '@/lib/tellerscore';

export interface PlatformGegevens {
  logo: { viewBox: string; body: string };
  score: { vorm: ScoreVorm; kleur: string };
  schaal: 5 | 10;
  decimalen: 1 | 2;
  voorbeeld: { score: number; aantal: number };
  slug: string;
}

let volgnummer = 0;
const rustig = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const scoreTekst = (score: number, decimalen: number = 1): string =>
  score.toLocaleString('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });

function werkLabelBij(kast: HTMLElement): void {
  const wrap = kast.closest<HTMLElement>('[data-teller-wrap]');
  if (!wrap) return;
  const schaal = kast.dataset.schaal === '10' ? 'op 10' : 'op 5';
  const aantal = Number(kast.dataset.waarde ?? 0).toLocaleString('nl-NL');
  wrap.setAttribute(
    'aria-label',
    `Illustratie van een live reviewteller voor ${kast.dataset.platform} met ${kast.dataset.cijfers} cijfers: score ${scoreTekst(Number(kast.dataset.score), Number(kast.dataset.decimalen ?? 1))} ${schaal}, ${aantal} reviews`,
  );
}

export async function setTeller(kast: HTMLElement, waarde: number): Promise<void> {
  const cijfers = Number(kast.dataset.cijfers ?? 5);
  const tekst = String(Math.max(0, Math.min(waarde, 10 ** cijfers - 1))).padStart(cijfers, ' ');
  kast.dataset.waarde = String(waarde);
  werkLabelBij(kast);
  const flappen = [...kast.querySelectorAll<HTMLElement>('.teller-flap > span')];
  await Promise.all(
    flappen.map(async (el, i) => {
      const nieuw = tekst[i]!.trim();
      if (el.textContent === nieuw) return;
      if (rustig() || !el.animate) {
        el.textContent = nieuw;
        return;
      }
      await el.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(90deg)' }], { duration: 110, easing: 'ease-in' }).finished;
      el.textContent = nieuw;
      await el.animate([{ transform: 'rotateX(-90deg)' }, { transform: 'rotateX(0deg)' }], { duration: 160, easing: 'ease-out' }).finished;
    }),
  );
}

export function zetScore(kast: HTMLElement, score: number, g: PlatformGegevens): void {
  kast.dataset.score = String(score);
  const vak = kast.querySelector<HTMLElement>('.teller-score');
  if (vak) vak.innerHTML = scoreHtml(g.score.vorm, g.score.kleur, scoreTekst(score, g.decimalen));
  werkLabelBij(kast);
}

export function zetPlatform(kast: HTMLElement, platform: string, g: PlatformGegevens, score = g.voorbeeld.score): void {
  kast.dataset.platform = platform;
  kast.dataset.schaal = String(g.schaal);
  kast.dataset.decimalen = String(g.decimalen);
  const tegel = kast.querySelector<HTMLElement>('.teller-icoon');
  if (tegel) tegel.innerHTML = `<svg viewBox="${g.logo.viewBox}">${g.logo.body.replaceAll('__ID__', `-c${++volgnummer}`)}</svg>`;
  zetScore(kast, score, g);
}

export function zetCijfers(kast: HTMLElement, cijfers: 5 | 7): void {
  if (Number(kast.dataset.cijfers) === cijfers) return;
  kast.dataset.cijfers = String(cijfers);
  kast.style.aspectRatio = `${cijfers === 5 ? 42 : 56.4}/10.5`;
  const tekst = String(Math.min(Number(kast.dataset.waarde ?? 0), 10 ** cijfers - 1)).padStart(cijfers, ' ');
  kast.querySelectorAll('.teller-flap').forEach((f) => f.remove());
  for (const c of tekst) {
    const flap = document.createElement('span');
    flap.className = 'teller-flap';
    flap.setAttribute('aria-hidden', 'true');
    const cijfer = document.createElement('span');
    cijfer.textContent = c.trim();
    flap.append(cijfer);
    kast.append(flap);
  }
  werkLabelBij(kast);
}

/**
 * Leest een gemiddelde zoals "4,2" of "4.2". Geeft een foutmelding terug als het geen getal is of buiten
 * 1 tot en met de schaal (5 of 10) valt. Afgerond op het aantal decimalen van het platform (Airbnb: 2).
 */
export function leesScore(invoer: string, schaal: 5 | 10, decimalen: 1 | 2 = 1): { score: number } | { fout: string } {
  const tekst = invoer.trim().replace(',', '.');
  if (!tekst) return { fout: 'Vul je gemiddelde score in.' };
  if (!/^\d{1,2}(\.\d+)?$/.test(tekst)) return { fout: `Vul een getal in, bijvoorbeeld ${schaal === 10 ? '8,7' : decimalen === 2 ? '4,87' : '4,2'}.` };
  const factor = 10 ** decimalen;
  const score = Math.round(Number(tekst) * factor) / factor;
  if (score < 1 || score > schaal) return { fout: `De score loopt van 1 tot ${schaal}.` };
  return { score };
}

/** Leest een aantal reviews ("1.248" of "1248"); maximaal wat de teller met dit aantal cijfers kan tonen. */
export function leesAantal(invoer: string, cijfers: 5 | 7): { aantal: number } | { fout: string } {
  const tekst = invoer.trim().replace(/[.\s]/g, '');
  if (!tekst) return { fout: 'Vul je aantal reviews in.' };
  if (!/^\d+$/.test(tekst)) return { fout: 'Vul een heel getal in, zonder komma.' };
  const aantal = Number(tekst);
  const max = 10 ** cijfers - 1;
  if (aantal > max) return { fout: `Met ${cijfers} cijfers telt de teller tot ${max.toLocaleString('nl-NL')}. Kies ${cijfers === 5 ? '7 cijfers' : 'een lager aantal'}.` };
  return { aantal };
}
