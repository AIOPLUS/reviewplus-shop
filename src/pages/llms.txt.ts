import type { APIRoute } from 'astro';
import { getProducts, getSectors, getTellers, tellerPrijsLabel } from '@/lib/catalog';
import { PLATFORMEN, platformStijl } from '@/lib/reviewplatformen';
import { absoluteUrl } from '@/lib/url';
import { brand } from '@/config/brand';
import { formatPrice } from '@/lib/format';
import { ACTIE, PRICE_NOTE } from '@/config/site';

export const GET: APIRoute = async () => {
  const [products, sectors, tellers] = await Promise.all([getProducts(), getSectors(), getTellers()]);
  const tellerLines = tellers.map(
    (t) =>
      `- [${t.naam}](${absoluteUrl(`/${t.slug}`)}): ${t.kort} 5 of 7 cijfers. ${tellerPrijsLabel(t)}; offerte aanvragen op de productpagina. Per platform: ${PLATFORMEN.map((p) => `[${p}](${absoluteUrl(`/reviewteller/${platformStijl[p].slug}`)})`).join(', ')}.`,
  );
  const productLines = products.map((p) => {
    const cond = p.gratisVoorwaarde === 'bij-demo' ? 'gratis bij het inplannen van een demo' : 'altijd gratis';
    return `- [${p.naam}](${absoluteUrl(`/${p.slug}`)}): ${cond}, max. ${p.maxPerBedrijf} per bedrijf, normale waarde ${formatPrice(p.normalePrijs)}. Extra ${p.extraEenheid}: ${formatPrice(p.prijsExtra)} per stuk (${PRICE_NOTE}).`;
  });
  const body = `# ${brand.name} Shop

> ${brand.name} is reputatiemanagement-software uit Nederland. Via deze shop vragen bedrijven in Nederland en België gratis een NFC 3-kaartenset aan waarmee klanten met één tik een review achterlaten. Wie een demo van Review Plus inplant, krijgt er gratis een NFC-totem (tafelstandaard) bij.

## Aanbod
${productLines.join('\n')}

## Op offerte (geen onderdeel van de gratis actie)
${tellerLines.join('\n')}

## Voorwaarden (kort)
- Alleen voor bedrijven met een KvK-nummer (NL) of KBO-nummer (BE).
- Eén gratis kaartenset en één gratis totem per bedrijf; de totem is gratis bij het inplannen van een demo.
- Verzending is altijd gratis, levering in Nederland en België.
- De actie is beperkt tot maximaal ${ACTIE.maxSets} gratis kaartensets en loopt tot en met ${ACTIE.eindDatum} (of zolang de voorraad strekt).
- Geen verplichting tot een abonnement.
- NFC-kaarten en totems zijn alleen verkrijgbaar in het standaard Review Plus-ontwerp. Betaald maatwerk (geen onderdeel van de gratis actie): QR-reviewkaarten in de eigen huisstijl van het bedrijf (logo, kleuren, tekst); prijs op aanvraag.
- Volledige voorwaarden: ${absoluteUrl('/actievoorwaarden')}

## Belangrijke pagina's
- [Shop](${absoluteUrl('/')})
- [Gratis aanvragen](${absoluteUrl('/aanvragen')})
- [Actievoorwaarden](${absoluteUrl('/actievoorwaarden')})
- [Productcatalogus (JSON)](${absoluteUrl('/products.json')})
${sectors.map((s) => `- [${s.naam}](${absoluteUrl(`/voor/${s.slug}`)})`).join('\n')}

## Over ${brand.name}
- Website: ${brand.mainSiteUrl}
- Demo boeken: ${brand.demoBookingUrl}
- Contact: ${brand.email}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
