import type { ReviewPlatform } from '@/lib/reviewplatformen';

/**
 * Teksten per platformpagina (/reviewteller/<slug>). Beschrijvend: niets beloven wat Smiirl nog niet bevestigd
 * heeft (zie docs/REVIEWTELLER.md, open vragen).
 */
export const platformPaginas: Record<ReviewPlatform, { titel: string; intro: string; branches: string }> = {
  Google: {
    titel: 'Live Google-reviewteller',
    intro: 'Een houten teller met de meerkleurige Google-G, een gouden ster met je gemiddelde en het aantal Google-reviews in klapcijfers.',
    branches: 'Past bij winkels, salons, praktijken en elke zaak waar klanten je via Google vinden.',
  },
  Trustpilot: {
    titel: 'Live Trustpilot-reviewteller',
    intro: 'Een houten teller met het Trustpilot-logo, een groene ster met je TrustScore en het aantal reviews in klapcijfers.',
    branches: 'Past bij webwinkels met een afhaalpunt of showroom, en bij dienstverleners die op Trustpilot beoordeeld worden.',
  },
  Tripadvisor: {
    titel: 'Live Tripadvisor-reviewteller',
    intro: 'Een houten teller met het Tripadvisor-logo, een groene bol met je gemiddelde en het aantal reviews in klapcijfers.',
    branches: 'Past bij restaurants, cafés, attracties en hotels met veel toeristen.',
  },
  'Booking.com': {
    titel: 'Live Booking.com-reviewteller',
    intro: 'Een houten teller met het Booking.com-logo, je score op 10 in een donkerblauw vlak en het aantal beoordelingen in klapcijfers.',
    branches: 'Past bij hotels, B&B’s, vakantieparken en andere accommodaties.',
  },
  Airbnb: {
    titel: 'Live Airbnb-reviewteller',
    intro: 'Een houten teller met het Airbnb-logo, een ster met je gemiddelde en het aantal Airbnb-reviews in klapcijfers.',
    branches: 'Past bij B&B’s, vakantiewoningen, appartementen en andere verhuur via Airbnb.',
  },
  Yelp: {
    titel: 'Live Yelp-reviewteller',
    intro: 'Een houten teller met het Yelp-logo, een rode ster met je gemiddelde en het aantal reviews in klapcijfers.',
    branches: 'Past bij horeca en winkels met veel internationale bezoekers.',
  },
};
