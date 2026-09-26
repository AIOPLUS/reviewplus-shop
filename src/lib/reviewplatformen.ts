/**
 * Reviewplatformen voor de live reviewteller (Smiirl Custom Counter, zie docs/REVIEWTELLER.md).
 * Opbouw van de teller, van links naar rechts: [logo] [ster + gemiddelde] [klapcijfers met het aantal reviews].
 * - `icoon`: eenkleurig icoon voor de keuzepillen;
 * - `logo`/`logoKleur`: het logo zoals het op het hout staat;
 * - `score`: hoe het gemiddelde getoond wordt (ster, bol of blauw vlak bij Booking.com) en in welke kleur;
 * - `schaal`: 5 of 10 (Booking.com scoort op 10);
 * - `decimalen`: 1 (4,2) of 2 (Airbnb toont 4,87);
 * - `voorbeeld`: gemiddelde en aantal voor de illustratie (geen echte klantgegevens).
 * De klapcijfers zijn altijd zwart: de Custom Counter heeft volgens Smiirl altijd zwarte cijfers.
 */
export const PLATFORMEN = ['Google', 'Trustpilot', 'Tripadvisor', 'Booking.com', 'Airbnb', 'Yelp'] as const;
export type ReviewPlatform = (typeof PLATFORMEN)[number];

export interface PlatformStijl {
  slug: string;
  icoon: string;
  logo: string;
  logoKleur?: string;
  score: { vorm: 'ster' | 'bol' | 'vlak'; kleur: string };
  schaal: 5 | 10;
  decimalen: 1 | 2;
  voorbeeld: { score: number; aantal: number };
}

export const platformStijl: Record<ReviewPlatform, PlatformStijl> = {
  Google: { slug: 'google', icoon: 'si:google', logo: 'logos:google-icon', score: { vorm: 'ster', kleur: '#FBBC04' }, schaal: 5, decimalen: 1, voorbeeld: { score: 4.7, aantal: 1248 } },
  Trustpilot: { slug: 'trustpilot', icoon: 'si:trustpilot', logo: 'si:trustpilot', logoKleur: '#00B67A', score: { vorm: 'ster', kleur: '#00B67A' }, schaal: 5, decimalen: 1, voorbeeld: { score: 4.5, aantal: 836 } },
  Tripadvisor: { slug: 'tripadvisor', icoon: 'si:tripadvisor', logo: 'si:tripadvisor', logoKleur: '#00AA6C', score: { vorm: 'bol', kleur: '#00AA6C' }, schaal: 5, decimalen: 1, voorbeeld: { score: 4.5, aantal: 612 } },
  'Booking.com': { slug: 'booking', icoon: 'si:bookingdotcom', logo: 'si:bookingdotcom', logoKleur: '#003580', score: { vorm: 'vlak', kleur: '#003580' }, schaal: 10, decimalen: 1, voorbeeld: { score: 8.7, aantal: 2341 } },
  // Airbnb: Bélo-logo in Rausch (#FF385C); de ster in dezelfde kleur (op Airbnb zelf is de ster zwart, nog te bevestigen).
  Airbnb: { slug: 'airbnb', icoon: 'si:airbnb', logo: 'logos:airbnb-icon', score: { vorm: 'ster', kleur: '#FF385C' }, schaal: 5, decimalen: 2, voorbeeld: { score: 4.87, aantal: 214 } },
  Yelp: { slug: 'yelp', icoon: 'si:yelp', logo: 'si:yelp', logoKleur: '#FF1A1A', score: { vorm: 'ster', kleur: '#FF1A1A' }, schaal: 5, decimalen: 1, voorbeeld: { score: 4.3, aantal: 389 } },
};

/** Zwarte klapcijfers (boven- en onderhelft), zoals de Custom Counter. */
export const FLAP_ZWART: readonly [string, string] = ['#2e2e2e', '#141414'];

export const platformVanSlug = (slug: string): ReviewPlatform | undefined =>
  PLATFORMEN.find((p) => platformStijl[p].slug === slug);

/** Score in Nederlandse notatie: 4,2 of 8,7 (Airbnb: 4,87). */
export const scoreTekst = (score: number, decimalen: 1 | 2 = 1): string =>
  score.toLocaleString('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });

/** Namen als lijst in een zin: "Google, Trustpilot, … en Yelp" (of met "of"). */
export const platformLijst = (voegwoord: 'en' | 'of' = 'en'): string =>
  `${PLATFORMEN.slice(0, -1).join(', ')} ${voegwoord} ${PLATFORMEN.at(-1)}`;

/** Hoogste aantal dat een teller met 5 of 7 cijfers kan tonen. */
export const maxAantal = (cijfers: 5 | 7): number => 10 ** cijfers - 1;
