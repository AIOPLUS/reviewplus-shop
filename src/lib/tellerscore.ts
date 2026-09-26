/**
 * Het scorevak op de reviewteller: ster of bol (of het blauwe vlak van Booking.com) met het gemiddelde in kleine
 * klapcijfers, zodat de score live kan stijgen en dalen: [4] , [7] — Booking.com [ ][8] , [7] — Airbnb [4] , [8][7].
 * Gedeeld door de build (Teller.astro) en de browser (lib/client/reviewteller.ts), dus zonder imports van buildcode.
 */
export type ScoreVorm = 'ster' | 'bol' | 'vlak';

const STER = 'M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4l-6.1 3.4 1.4-6.8L2.2 9.3l6.9-.8z';

/** Cijfers van de score per klapcijfer: hele deel (2 plaatsen bij een schaal van 10) en decimalen. */
export function scoreTekens(score: number, schaal: 5 | 10, decimalen: 1 | 2): { heel: string[]; dec: string[] } {
  const [heel = '', dec = ''] = score.toFixed(decimalen).split('.');
  return { heel: heel.padStart(schaal === 10 ? 2 : 1, ' ').split(''), dec: dec.split('') };
}

const miniflap = (c: string) => `<span class="teller-miniflap"><span>${c.trim()}</span></span>`;

export function scoreHtml(vorm: ScoreVorm, kleur: string, score: number, schaal: 5 | 10, decimalen: 1 | 2): string {
  const { heel, dec } = scoreTekens(score, schaal, decimalen);
  const vlak = vorm === 'vlak';
  const cijfers =
    `<span class="teller-score-flappen${vlak ? ' is-vlak' : ''}"${vlak ? ` style="background:${kleur}"` : ''}>` +
    `${heel.map(miniflap).join('')}<span class="teller-komma">,</span>${dec.map(miniflap).join('')}</span>`;
  if (vlak) return cijfers;
  const symbool =
    vorm === 'ster'
      ? `<svg viewBox="0 0 24 24" class="teller-score-symbool"><path d="${STER}" fill="${kleur}"/></svg>`
      : `<svg viewBox="0 0 24 24" class="teller-score-symbool"><circle cx="12" cy="12" r="9.5" fill="${kleur}"/></svg>`;
  return symbool + cijfers;
}
