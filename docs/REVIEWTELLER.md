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
| `/live-reviewteller` | Productpagina met tellerkiezer (platform, 5 of 7 cijfers, "Nieuwe review", gemiddelde omhoog/omlaag), "Probeer met je eigen score", specificaties, offerteformulier en FAQ. De keuze staat in de URL: `?platform=booking&cijfers=7`. |
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
- **Offerteformulier**: `OfferteForm.astro`.
- **Productkaart en blok**: `TellerKaart.astro` en `ReviewTellerBlok.astro`.
- **Productinhoud**: `src/content/tellers/live-reviewteller.md`.

## Prijzen

Er zijn nog geen verkoopprijzen. In `src/content/tellers/live-reviewteller.md` staat bij beide varianten `prijs: null`. Daardoor toont de shop overal "Prijs volgt" met een offerteknop, en geeft het productschema geen prijs aan Google.

Zet je een prijs in (excl. btw), dan verschijnt die in de kiezer, op de kaart, in `llms.txt`, in `products.json` en in het schema (als Offer).

De adviesprijzen van Smiirl zijn € 399 (5 cijfers) en € 549 (7 cijfers) excl. btw. **Publiceer ze niet zonder akkoord van Jordan.**

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

## Offertes: via de bestaande contactroute in Make

Het offerteformulier stuurt `request_type: contact` naar dezelfde webhook. Route 5b ("Contactbericht", achter Turnstile) verwerkt het al:
- er gaat een mail naar support@reviewplus.io met Reply-To naar de klant;
- de klant krijgt een kopie.

In het bericht staan het platform, het aantal cijfers, het aantal tellers en de opmerking van de klant. Er gaat ook een veld `offerte` mee (`product`, `platform`, `cijfers`, `aantal`) en `lead_source: shop-reviewteller`. Make gebruikt die velden nu niet.

**Make is niet gewijzigd.** Een nieuwe `request_type` (zoals `offerte`) zou via route 2 als gratis aanvraag verwerkt worden en een onvolledige mail sturen. Daarom gebruiken we `contact`.

De onderwerpregel van de mail is "Contactbericht via reviewplus.io: <naam>". Wil je een eigen onderwerp, een Teamleader-deal of een eigen fase voor offertes, dan kan dat met een aparte route in Make. Dat vraagt om een wijziging in Make en toestemming van Jordan.

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
