/** Algemene shop-teksten die op meerdere pagina's terugkomen. */
import { ACTIE } from './site';

const actieEinde = new Date(`${ACTIE.eindDatum}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
const actieMax = ACTIE.maxSets.toLocaleString('nl-NL');

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
    vraag: 'Hoe lang loopt de actie?',
    antwoord:
      `We geven maximaal ${actieMax} gratis kaartensets weg. De actie loopt tot en met ${actieEinde}, of tot alle sets vergeven zijn. De teller op de site laat zien hoeveel sets er nog beschikbaar zijn.`,
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
    vraag: 'Kunnen de kaarten in onze eigen huisstijl?',
    antwoord:
      'De NFC-kaarten en de totem zijn alleen verkrijgbaar in het standaard Review Plus-ontwerp. Wel maken we als betaald maatwerk QR-reviewkaarten met jouw logo, kleuren en tekst. Die vallen meer op en geven je resultaten een extra boost. Geef bij je aanvraag aan dat je interesse hebt, dan sturen we je een voorstel.',
    // TODO: Jordan vult prijzen/pakketten voor maatwerk in zodra die vastliggen.
  },
  {
    vraag: 'Hoe snel worden de kaarten verstuurd?',
    antwoord: 'We versturen je kaartenset zo snel mogelijk na je aanvraag, los van je demo.', // TODO: Jordan vult levertijd in
  },
];
