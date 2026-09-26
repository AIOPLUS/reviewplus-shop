import { brandIcon } from './icons';
import { PLATFORMEN, platformStijl, type ReviewPlatform } from './reviewplatformen';
import type { PlatformGegevens } from './client/reviewteller';

/** Logo's en scorevormen van alle platformen, als gegevens voor de scripts van de reviewteller (alleen tijdens de build). */
export function platformGegevens(): Record<ReviewPlatform, PlatformGegevens> {
  return Object.fromEntries(
    PLATFORMEN.map((p) => {
      const s = platformStijl[p];
      return [p, { logo: brandIcon(s.logo, s.logoKleur), score: s.score, schaal: s.schaal, decimalen: s.decimalen, voorbeeld: s.voorbeeld, slug: s.slug }];
    }),
  ) as Record<ReviewPlatform, PlatformGegevens>;
}

/** Logo voor een keuzepil of kaart (in kleur). */
export const pilLogo = (p: ReviewPlatform) => brandIcon(platformStijl[p].logo, platformStijl[p].logoKleur);
