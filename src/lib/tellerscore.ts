/**
 * HTML van het scorevak op de reviewteller (ster, bol of blauw vlak + gemiddelde). Gedeeld door de build
 * (Teller.astro) en de browser (lib/client/reviewteller.ts), dus zonder imports van buildcode.
 */
export type ScoreVorm = 'ster' | 'bol' | 'vlak';

const STER = 'M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4l-6.1 3.4 1.4-6.8L2.2 9.3l6.9-.8z';

export function scoreHtml(vorm: ScoreVorm, kleur: string, tekst: string): string {
  if (vorm === 'vlak') {
    return `<span class="teller-score-vlak" style="background:${kleur}">${tekst}</span>`;
  }
  const symbool =
    vorm === 'ster'
      ? `<svg viewBox="0 0 24 24" class="teller-score-symbool"><path d="${STER}" fill="${kleur}"/></svg>`
      : `<svg viewBox="0 0 24 24" class="teller-score-symbool"><circle cx="12" cy="12" r="9.5" fill="${kleur}"/></svg>`;
  return `${symbool}<span class="teller-score-getal">${tekst}</span>`;
}
