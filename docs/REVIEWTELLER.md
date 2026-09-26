# Live reviewteller (Smiirl Custom Counter)

Nieuwe productlijn in de Review Plus Shop, besloten door Jordan op 26-09-2026. De reviewteller stond eerst in de View Plus Shop, maar hoort bij Review Plus.

We verkopen de **Custom Counter** van Smiirl als reseller. Het is een houten teller met mechanische klapcijfers, met 5 of 7 cijfers.

- **Opbouw** (van links naar rechts): het logo van het platform, dan een ster met het gemiddelde, dan de klapcijfers met het aantal reviews.
- **Platformen**:

| Platform | Scoreteken | Kleur | Schaal |
|---|---|---|---|
| Google | meerkleurige G, gouden ster | #FBBC04 | op 5 |
| Trustpilot | groene ster | #00B67A | op 5 |
| Tripadvisor | groene bol | #00AA6C | op 5 |
| Booking.com | score in een donkerblauw vlak | #003580 | op 10 |
| Airbnb | Airbnb-logo, ster (toegevoegd 26-09-2026) | #FF385C | op 5, met twee decimalen (4,87) |
| Yelp | rode ster | #FF1A1A | op 5 |

- **Cijfers**: de klapcijfers zijn altijd zwart. Scores staan met een komma: 4,2 of 8,7.
- **Specificaties**: zie `docs/SMIIRL-ONDERZOEK.md` in de View Plus Shop (`../viewplus-shop`).

## Wat er op de site staat

| Waar | Wat |
|---|---|
| `/live-reviewteller` | Productpagina (pre-order, € 499 / € 699 excl. btw) met tellerkiezer (platform, 5 of 7 cijfers, "Nieuwe review", gemiddelde omhoog/omlaag), "Probeer met je eigen score", specificaties, offerteformulier en FAQ. De keuze staat in de URL: `?platform=booking&cijfers=7`. |
| `/reviewteller/<platform>` | Pagina per platform (`google`, `trustpilot`, `tripadvisor`, `booking`, `airbnb`, `yelp`). Het platform staat vast. |
| Homepage | Productkaart in "Het aanbod" en het blok "Nieuw: laat je reviews live zien in je zaak". |
| `/voor/<branche>` | Productkaart en een blok met voorbeelden per branche: `reviewteller:` in `src/content/sectors/*.md`. |
| FAQ, `llms.txt`, sitemap | Zijn bijgewerkt. |
| OG-afbeeldingen | `/og/live-reviewteller.png` en `/og/reviewteller-<platform>.png`, met de teller als vector. |

Onder elke teller staat "Illustratie. Productfoto's volgen."

**Code**
- **Gegevens per platform**: `src/lib/reviewplatformen.ts`, met de logo's uit `@iconify-json` via `src/lib/icons.ts`.
- **Illustratie**: `src/components/shop/Teller.astro`.
- **Animatie en invoercontrole**: `src/lib/client/reviewteller.ts`.
- **Kiezer**: `TellerKiezer.astro`.
- **"Probeer met je eigen score"**: `EigenScore.astro`.
- **Pre-orderformulier**: `PreorderForm.astro`, voorwaarden op `/pre-ordervoorwaarden`.
- **Productkaart en blok**: `TellerKaart.astro` en `ReviewTellerBlok.astro`.
- **Productinhoud**: `src/content/tellers/live-reviewteller.md`.

## Prijzen

€ 499 (5 cijfers) en € 699 (7 cijfers) per stuk, exclusief btw (Jordan, 26-09-2026). Ze staan in `src/content/tellers/live-reviewteller.md` en gaan via `/products.json` (sleutel `offerte_producten`) naar Make. Wijzig je een prijs, dan rekent Make na de volgende deploy automatisch met de nieuwe prijs.

## Productschema: waarom een eigen collectie

De collectie `products` is gebouwd voor de gratis leadproducten: `prijs: number`, `type`-enum, `gratisVoorwaarde`, `prijsExtra`, enzovoort. Die velden worden op meer plekken gebruikt:

- **De aanvraagflow** (`aanvragen.astro` en `flow.ts`): de gratis aanvraag toont elk product uit `products` als regel met extra's. Een reviewteller zou daar als "gratis" product met extra's verschijnen.
- **De homepage, branchepagina's en OG-afbeeldingen**: die zoeken op `type` (`kaartenset`/`totem`) en tonen `normalePrijs` als "t.w.v.".
- **Make, route 1**: haalt `/products.json` op en rekent met `first(map(3.data.products; "prijsExtra"; "slug"; "nfc-kaartenset"))` en hetzelfde voor `nfc-totem`. Make kijkt dus alleen naar die twee slugs onder de sleutel `products`.

**Gekozen oplossing:** een aparte collectie `tellers` (`src/content.config.ts`) voor producten op offerte, met:
- varianten (5 of 7 cijfers);
- `prijs: number | null`;
- status `op-aanvraag`;
- specs, voordelen, inhoud van de doos en FAQ.

In `/products.json` staan ze onder een eigen sleutel `offerte_producten`. De sleutel `products` is ongewijzigd. Daardoor:
- blijven de aanvraagflow, de gratis actie en de extra's via Mollie precies werken zoals nu;
- ziet Make niets nieuws in `products`. Route 1 blijft werken; een extra sleutel in de JSON negeert Make;
- kan er later een product op offerte bij (bijvoorbeeld een Google-bord of The Tag) zonder de leadproducten aan te raken.

Wil je de teller later echt online verkopen (in een winkelwagen, met Mollie), dan is een aparte bestelroute in Make nodig. Route 1 rekent alleen met de extra's van de kaartenset en de totem. **Dat is een wijziging in Make: eerst overleggen.**

## Pre-order met betaling via Mollie (sinds 26-09-2026)

Op de productpagina's staat het formulier "Pre-order je live reviewteller" (`src/components/shop/PreorderForm.astro`). De klant vult in:
- platform, cijfers en aantal (1–10);
- bedrijf, land (NL/BE), eventueel KvK/KBO en btw-nummer;
- bezorgadres en contactpersoon;
- akkoord op de [pre-ordervoorwaarden](../src/pages/pre-ordervoorwaarden.astro) (versie in `src/config/preorder.ts`).

Het formulier toont een overzicht met btw en totaal. Verzending naar NL en BE is gratis. Bij een Belgisch bedrijf met een geldig btw-nummer (BE0123456789) wordt de btw verlegd.

**Flow**
1. De site stuurt `request_type: preorder` naar de Make-webhook (payload: `docs/LEAD-PAYLOAD.md`).
2. Make, route "Pre-order" (modules 170–178):
   - haalt `/products.json` op en rekent het bedrag **zelf** uit: prijs × aantal, plus 21% btw of verlegd;
   - maakt een Mollie-betaling aan en slaat het record `betaling:<ref>` op met `soort: preorder` (met de bestelling in `waarde`);
   - antwoordt de site met `checkoutUrl` en mailt support ("nog niet betaald").

   Ongeldige invoer (onbekend platform of variant, geen prijs, geen akkoord) geeft `{"ok": false}` (400) en er wordt geen betaling aangemaakt.
3. De klant betaalt bij Mollie en komt terug via route 4 (terugkeer) op `/live-reviewteller?status=betaald#preorder`. Bij annuleren komt hij terug op `?status=geannuleerd`.
4. Mollie meldt de betaling via route 3 (statusmelding):
   - support krijgt "Pre-order betaald";
   - de klant krijgt een bevestiging (module 179).

**Live sinds 26-09-2026.** Jordan heeft een testbestelling gedaan (betaald in Mollie-testmodus, alle mails kwamen aan). Daarna is `testmode` in module 171 op `{{false}}` gezet, dus klanten betalen echt. Terug naar testen: zet hem weer op `{{true}}`. In `waarde` van het betaalrecord staan de bestelling en de btw-tekst, gescheiden door `|` (bijvoorbeeld `1× live reviewteller Google, 5 cijfers|incl. 21% btw`). De mails lezen dat uit.

**Na een betaalde pre-order (handwerk):** stuur de factuur, bestel de teller bij Smiirl en laat de klant de verwachte leverdatum weten.

## Open vragen (navragen bij Smiirl)

1. **Kan de score live meelopen?** Jordan wil dat de gemiddelde score, net als het aantal, live kan stijgen en dalen (besluit 26-09-2026). De illustratie toont de score daarom in kleine klapcijfers onder de ster, bijvoorbeeld [4] , [7]; bij Booking.com [ ][8] , [7] in het blauwe vlak en bij Airbnb [4] , [8][7].
   - Op de site laat "Nieuwe review" het aantal met 1 stijgen en rekent het gemiddelde opnieuw uit.
   - Met de knoppen − en + stijgt of daalt het gemiddelde met 0,1.
   - De Custom Counter heeft alleen één rij klapcijfers. Vraag Smiirl of een uitvoering met extra klapcijfers voor de score mogelijk is, of dat er een tweede (kleine) teller nodig is. Anders wordt de score vast gedrukt en loopt hij niet mee.
   - De teksten op de site beloven dit nog niet expliciet; pas ze aan zodra Smiirl het bevestigt.
2. **Mogen de logo's van Google, Trustpilot, Tripadvisor, Booking.com, Airbnb en Yelp op de teller?** Smiirl drukt alleen logo's waar de klant de rechten op heeft. Het weigert bijvoorbeeld de logo's van Facebook en Instagram. Mogelijke oplossingen: toestemming of richtlijnen van het platform, of het logo van de klant zelf.
3. **Hoe komen de getallen op de teller?** Dit is nog niet gebouwd; hieronder alleen de uitwerking.
   - De Custom Counter heeft een API: `set-number`, `add-number` en `reset-number` via HTTP GET, met een teller-id en een token. Make kan die aanroepen.
   - EmbedMyReviews (app.reviewplus.io) verzamelt al reviews van Google, Trustpilot, Tripadvisor, Booking.com en Yelp. Controleer of Airbnb daar ook bij zit: Airbnb heeft geen open API voor reviews. Het aantal reviews en het gemiddelde per locatie kunnen daar misschien vandaan komen: via de Agency API, een webhook bij een nieuwe review of een periodieke export.
   - Mogelijke opzet: een Make-scenario dat periodiek per klant het aantal ophaalt uit EmbedMyReviews en `set-number` aanroept.
   - Let op: het gratis Make-plan heeft maar 2 actieve scenario's (beide bezet) en 1.000 operaties per maand. Per klant en per update kost dit operaties. Waarschijnlijk is dus een betaald Make-plan nodig, of het gaat in het dagelijkse scenario (één keer per dag).
   - Nog uitzoeken: welk endpoint van EmbedMyReviews het aantal en het gemiddelde per platform geeft, of er een webhook "nieuwe review" is, en waar we per klant het teller-id en token van Smiirl bewaren (niet in de site).

Verder:
- **Airbnb**:
  - Airbnb toont het gemiddelde met twee decimalen (bijvoorbeeld 4,87). De teller en de invoercontrole volgen dat.
  - Op Airbnb zelf is de ster zwart. In de illustratie staat hij in Airbnb-roze (#FF385C), zoals de andere platformen in hun eigen kleur. Bevestig welke kleur het wordt.
- **Cijferkleur**: volgens Smiirl zijn de klapcijfers van de Custom Counter altijd zwart. Zo staan ze ook in de illustratie.
- **Levertijd en installatie**: Smiirl verzendt pas na goedkeuring van het logo, en dan binnen 15 dagen. Wie installeert en koppelt de teller (wij of de klant), en rekenen we daar iets voor?
