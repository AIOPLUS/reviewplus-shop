/** Algemene shop-teksten die op meerdere pagina's terugkomen. */

/**
 * Social proof. Alleen echte, geverifieerde gegevens.
 * De "900+ bedrijven" komt van www.reviewplus.io. TODO: Jordan bevestigt dat dit actueel is.
 */
export const socialProof = {
  customerCount: 'Meer dan 900 bedrijven',
  platforms: ['Google', 'Trustpilot', 'Tripadvisor', 'Facebook'],
  /**
   * TODO: Jordan levert echte reviews/klantlogo's aan (met toestemming).
   * Formaat: { quote: '...', naam: 'Voornaam', bedrijf: 'Bedrijfsnaam', plaats: 'Plaats' }
   */
  testimonials: [] as { quote: string; naam: string; bedrijf: string; plaats: string }[],
};

export const shopFaq = [
  {
    vraag: 'Wat kost de NFC-kaartenset?',
    antwoord:
      'Niets. Bedrijven in Nederland en België met een KvK- of KBO-nummer ontvangen één set van drie NFC-reviewkaarten gratis. Ook de verzending is gratis.',
  },
  {
    vraag: 'Hoe krijg ik de NFC-totem gratis?',
    antwoord:
      'Kies bij je aanvraag voor de totem en plan daarna een korte, vrijblijvende demo van Review Plus in. Zodra je demo is ingepland, versturen we de totem gratis.',
  },
  {
    vraag: 'Zit ik ergens aan vast?',
    antwoord:
      'Nee. De kaarten en de totem zijn van jou. We nemen contact met je op over je aanvraag en over Review Plus Online, maar een abonnement is nooit verplicht.',
  },
  {
    vraag: 'Waarom vragen jullie mijn KvK- of KBO-nummer?',
    antwoord:
      'De actie is alleen voor bedrijven, en per bedrijf is er één gratis set en één gratis totem. Met je bedrijfsnummer houden we dat eerlijk.',
  },
  {
    vraag: 'Kan ik meer kaarten of totems bestellen?',
    antwoord:
      "Ja. Extra kaarten en totems voeg je toe in dezelfde aanvraag. Je betaalt alleen voor de extra's, met iDEAL, Bancontact of creditcard.",
  },
  {
    vraag: 'Kunnen de kaarten en totems in onze eigen huisstijl?',
    antwoord:
      'Ja. Kies bij je aanvraag voor "eigen ontwerp", dan maken we de NFC-kaarten en de totem met jouw logo, kleuren en tekst. We nemen contact met je op over het ontwerp en de mogelijkheden.',
    // TODO: Jordan bepaalt of maatwerk binnen de gratis actie valt of extra kost, en vult dat hier aan.
  },
  {
    vraag: 'Hoe snel worden de kaarten verstuurd?',
    antwoord: 'We versturen je kaartenset zo snel mogelijk na je aanvraag, los van je demo.', // TODO: Jordan vult levertijd in
  },
];
