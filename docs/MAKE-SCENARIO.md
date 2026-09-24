# Make.com-scenario's voor de shop

De site is statisch (GitHub Pages). Alle logica loopt via Make. Er zijn **zes scenario's**:

| # | Scenario | Trigger |
|---|---|---|
| A | Shop-aanvraag verwerken | Custom webhook (van de site) |
| B | Terugkeer na betaling | Custom webhook (Mollie `redirectUrl`) |
| C | Mollie-betaling verwerkt | Custom webhook (Mollie `webhookUrl`) |
| D | Demo ingepland → totem verzenden | Teamleader: nieuwe afspraak (Watch events / webhook) |
| E | Herinneringen totem | Schema (dagelijks) |
| F | Voorraadteller gratis sets | Onderdeel van scenario A (werkt een GitHub Gist bij) |

Payload-contract: zie [LEAD-PAYLOAD.md](LEAD-PAYLOAD.md). Secrets (Turnstile secret, Mollie API-key, Teamleader-koppeling) staan **alleen in Make**, nooit in de site of in GitHub.

**Belangrijke volgorde:** de site wacht op het antwoord van scenario A (max. 20 s). Zet daarom de **Webhook response** zo vroeg mogelijk: direct na Turnstile, de dubbelcheck en (indien nodig) het aanmaken van de Mollie-betaling. Teamleader, mails en de verzendlijst komen ná de response.

## Huidige inrichting in Make (stand 24 september 2026)

Zo staat het nu werkelijk in Make (team "My Team", zone eu1). De scenario's A–F hieronder zijn het volledige ontwerp; wat nog niet gebouwd is, staat onder "Nog te bouwen".

**Gratis Make-plan: maximaal 2 actieve scenario's en 1 MB datastore-opslag.** Daarom loopt alles wat direct moet reageren via **één** scenario en **één** webhook, en staat alle data in **één** datastore.

### Scenario "Review Plus - Shop aanvragen" (actief, id 7570648)

Webhook `shop-aanvraag`: `https://hook.eu1.make.com/q9s2ihd25ksumrh9q550vsmrhq104rvn` (staat als `PUBLIC_LEAD_WEBHOOK_URL` in GitHub).

Router met zeven routes:

| Route | Filter | Wat er gebeurt |
|---|---|---|
| 1. Aanvraag met extra's | geen `type` én `heeft_betaalde_extras = true` | `products.json` ophalen → bedrag berekenen (extra's × `prijsExtra` × 1,21, max. 50 kaarten / 20 totems) → Mollie-betaling via **Make an API Call** (`POST /v2/payments`, `testmode` uit variabele) → record `betaling:<lead_ref>` in `shop_data` → antwoord `{"ok": true, "checkoutUrl": …}` → mail aan support@reviewplus.io |
| 2. Aanvraag zonder extra's | geen `type` én `heeft_betaalde_extras ≠ true` | antwoord `{"ok": true}` → mail |
| 3. Mollie-statusmelding | `type = status` | antwoord `200 ok` → record ophalen → betaling opvragen bij Mollie → bij `paid`: record bijwerken + mail "Betaling ontvangen" |
| 4. Klant terug van Mollie | `type = return` | record ophalen → betaling opvragen → 302 naar `/aanvragen?status=betaald` (paid/authorized/pending) of `?status=geannuleerd` |
| 5. Dubbelcheck & teller | geen `type` én `request_type = aanvraag` (draait ná het antwoord aan de site) | `lead:<kvk/kbo>` bestaat al? → mail "DUBBELE aanvraag" aan jou + vriendelijke mail aan de klant. Nieuw → record `lead:<nummer>`, teller +1 (alleen < 1000 en vóór 1-12-2026), **bevestigingsmail aan de klant**, Gist bijwerken (fout wordt overgeslagen). Vol/verlopen → mail aan jou. Daarna bij elk nieuw bedrijf (ook als de actie vol is): **Teamleader**, zie hieronder |
| 6. Demo ingepland | `type = demo` (vanaf `/bedankt?demo=ingepland`) | antwoord `{"ok": true}` → record `deal:<lead_ref>` ophalen → klopt het e-mailadres, dan de deal naar fase **Demo Ingepland** (`deals.move`) → mail "Demo ingepland via de shop" aan jou |
| 7. Teamleader: fasewissel | `type = deal.moved` (Teamleader-webhook) | antwoord `ok` → record met dit `deal_id` zoeken (geen shop-deal → stop) → deal opvragen → zie "Totem na de demo" |

Mollie krijgt bij het aanmaken van de betaling:
- `redirectUrl` = `…/q9s2ihd25ksumrh9q550vsmrhq104rvn?type=return&ref=<lead_ref>`
- `webhookUrl` = `…/q9s2ihd25ksumrh9q550vsmrhq104rvn?type=status&ref=<lead_ref>`
- `cancelUrl` = `https://shop.reviewplus.io/aanvragen?status=geannuleerd&ref=<lead_ref>`

**Live sinds 24 september 2026:** `testmode` staat in module 4 "Set variables" op `false`, dus betalingen zijn echt. Terug naar testen: zet hem op `true`. (De Mollie-koppeling is via OAuth gemaakt; daarom gaat testen via de `testmode`-parameter in plaats van een test-API-key.)

Koppelingen: Mollie = **"Mollie - shop betalingen"** (met `payments.write`), Gmail = "Jordan's Gmail connection", Teamleader = **"Teamleader - shop"**.

### Teamleader (route 5, na teller en mails)

Geen aparte pijplijn: alles komt in de bestaande **Sales Pipeline**.

1. **Bedrijf zoeken**: eerst op btw-nummer (bij BE zonder btw: `BE` + KBO-nummer), daarna op exact dezelfde bedrijfsnaam. Niet gevonden → bedrijf aanmaken met KvK/KBO, btw, adres, website en tag `review-plus-shop`.
2. **Contact zoeken** op e-mailadres. Niet gevonden → contact aanmaken (tag `review-plus-shop`) en koppelen aan het bedrijf.
3. **Deal** "Shop: <bedrijf>" in fase **Nieuw**, met een samenvatting van de aanvraag (producten, totem + demo, extra's, maatwerk, vragen, adres, herkomst).
4. Record `deal:<lead_ref>` in `shop_data` (voor route 6).
5. **Taak** "Gratis NFC-kaartenset verzenden: <bedrijf>" op de deal, deadline morgen, met het bezorgadres.

**Naar fase Demo Ingepland**: de demo wordt pas ná het versturen van de aanvraag gepland (in Teamleader Bookings). Klikt de klant daarna op "Ik heb mijn demo ingepland", dan stuurt de bedankpagina `?type=demo` met `lead_ref` en e-mail, en zet route 6 de deal in fase **Demo Ingepland**. Dat is wat de klant aangeeft; controleer de afspraak in Teamleader. Zet je de deal zelf op Demo Ingepland, dan werkt het net zo (route 7).

Elke Teamleader-module heeft een *Ignore*-errorhandler, zodat een Teamleader-storing het scenario nooit uitschakelt en de klant er niets van merkt. Lukt de deal niet, dan krijg je de mail "Teamleader: deal niet aangemaakt" en maak je hem handmatig aan.

Fase-ID's: Nieuw `8fa3ee33-24f5-09d4-9462-3d75dc1309ce`, Demo Ingepland `be101259-4210-03e3-bb62-e86bd31309d0`, No Show `75ae6391-e433-0711-9161-b2726213127f`. Hernoem je fases gerust; verwijder je er een, pas dan de ID aan in module 44 (createDeal), 52 (deals.move) of de filters van route 7.

### Totem na de demo (route 7)

In Teamleader is een webhook geregistreerd (sinds 24-09-2026): bij elke fasewissel van een deal (`deal.moved`) stuurt Teamleader een melding naar de shop-webhook. Alleen deals met een record `deal:<lead_ref>` doen iets; andere fasewissels kosten ±4 Make-operaties en stoppen daarna.

De status staat in het veld `status` van het deal-record:

| Deal gaat naar | Voorwaarde | Wat er gebeurt |
|---|---|---|
| **Demo Ingepland** | totem nog niet verzonden | `status = demo_ingepland` |
| **No Show** | `status = demo_ingepland` | `status = no_show` + mail "No-show: geen totem" (no-show = geen totem) |
| **Offerte Verzonden, On Hold, Offerte Getekend, Onboarding ingepland of Closed** | `status = demo_ingepland` | `status = totem_verzenden` + taak "Gratis NFC-totem verzenden" op de deal + mail aan jou |

Zo komt de totem er alleen als de deal eerst op Demo Ingepland stond en daarna is doorgezet. Bij **Geweigerd** gaat er geen automatische totem uit; die kun je altijd handmatig sturen. Een no-show die alsnog een demo plant: zet de deal weer op Demo Ingepland, dan geldt de totem weer na die demo. De taak en mail komen één keer per deal.

Let op: een demo die de klant via Teamleader Bookings boekt, is een agenda-afspraak ("<Naam>: Demonstratie met Review Plus", met het e-mailadres in de omschrijving). Daarvoor heeft Teamleader geen webhook. De deal gaat naar Demo Ingepland via de knop "Ik heb mijn demo ingepland" (route 6) of doordat jij hem verplaatst. Het dagelijkse scenario herkent boekingen ook zelf (zie hieronder).

Webhook bekijken of weghalen: Teamleader API `webhooks.list` / `webhooks.unregister` (url `https://hook.eu1.make.com/q9s2ihd25ksumrh9q550vsmrhq104rvn`, type `deal.moved`), bijvoorbeeld via een Teamleader-module *Make an API Call* in Make.

### Scenario "Review Plus - Dagelijks (demo's en herinneringen)" (actief, id 7583249)

Draait elke dag om 09:00 (Europe/Amsterdam). Dit is het tweede en laatste actieve scenario op het gratis plan.

**1. Geboekte demo's herkennen.** Teamleader `events.list` met zoekterm "Demonstratie met Review Plus" en een eindtijd in de toekomst. Uit de omschrijving van elke afspraak haalt Make het e-mailadres (Bookings zet daar "E-mail: …"). Is er een shop-deal met dat e-mailadres die nog geen demo had (status leeg, `no_show` of `verlopen`), dan:
- `status = demo_ingepland`;
- de deal naar **Demo Ingepland**;
- mail "Demo geboekt: <bedrijf> (<datum>)" aan jou.

Gebruikt de klant bij het boeken een ander e-mailadres, dan vindt Make de deal niet. Zet hem dan zelf op Demo Ingepland.

**2. Herinneringen totem.** Alle shop-deals met `totem_demo = true` en nog geen status:
- **dag 2 en dag 5** na de aanvraag: herinneringsmail aan de klant ("Je gratis NFC-totem ligt klaar: plan je demo in" / "Nog 9 dagen: je gratis NFC-totem"), met de voornaam uit Teamleader en de demo-link;
- **ouder dan 14 dagen** (`TOTEM_RESERVATION_DAYS` in `src/config/site.ts`): `status = verlopen` en de mail "Totem-reservering vervallen" aan jou. Boekt de klant daarna toch nog, dan pakt stap 1 dat alsnog op.

Omdat stap 1 eerst draait, krijgt iemand die al geboekt heeft geen herinnering meer.

### Make-operaties (gratis plan: 1.000 per maand)

Globaal: een nieuwe aanvraag kost ±23 operaties (mails, teller, Gist en Teamleader), een aanvraag met extra's ±6 meer, een fasewissel in Teamleader ±4 (±7 als er een totem-taak komt) en het dagelijkse scenario ±5–10 per dag. Het gratis plan is dus genoeg voor ongeveer 25–30 aanvragen per maand. Kijk in Make bij *Organization → Usage* hoe het verbruik loopt. Is het op, dan stopt Make tot de volgende maand. Neem dan tijdig een betaald Make-abonnement.

### Datastore `shop_data` (id 196583)

Eén datastore voor alles, onderscheiden op de key:

| Key | Inhoud |
|---|---|
| `teller:gratis_sets` | `uitgegeven` (aantal verwerkte gratis sets, start 0) |
| `betaling:<lead_ref>` | `payment_id`, `bedrag`, `status`, `bedrijf`, `email`, `testmode`, `aangemaakt` |
| `lead:<kvk/kbo-nummer>` | `bedrijf`, `bedrijfsnummer`, `email`, `totem_demo`, `aangemaakt` (dubbelcheck) |
| `deal:<lead_ref>` | `deal_id`, `company_id`, `contact_id`, `email`, `bedrijf`, `totem_demo`, `aangemaakt`, `status` (leeg / `demo_ingepland` / `no_show` / `verlopen` / `totem_verzenden`) |

### CORS

Make stuurt zelf al `Access-Control-Allow-Origin: *` mee. Voeg in een Webhook response **geen** eigen `Access-Control-Allow-Origin`-header toe: dan staat hij er dubbel in en weigert de browser het antwoord. Getest: preflight en POST vanaf shop.reviewplus.io werken.

### Nog te bouwen

1. ~~Gist-sleutel~~ **Klaar (24-09-2026):** de Gist-module gebruikt *HTTP → Make a Basic Auth request* met sleutel "GitHub Basic Auth - voorraadteller" (gebruikersnaam AIOPLUS, token als wachtwoord). De oude API-key-sleutel "GitHub - voorraadteller (Gist)" wordt niet meer gebruikt en mag weg. Token verloopt: vernieuw het op tijd op GitHub en werk de sleutel in Make bij.
2. ~~Teamleader~~ **Klaar (24-09-2026):** bedrijf, contact, deal (fase Nieuw) en taak; "Ik heb mijn demo ingepland" → fase Demo Ingepland. Zie hierboven.
3. ~~Totem na demo~~ **Klaar (24-09-2026):** route 7 op de Teamleader-webhook `deal.moved`, zie "Totem na de demo".
4. ~~Herinneringen totem~~ **Klaar (24-09-2026):** scenario "Review Plus - Dagelijks (demo's en herinneringen)", zie hierboven. Herkent ook Bookings-afspraken.

Uitgeschakelde, ongebruikte scenario's die weg mogen: "Review Plus - Mollie (status + terugkeer)", "Review Plus - Mollie terugkeer", "Integration Mollie".

---

## Voorbereiding

- **Data store** `shop_leads` (Make → Data stores), sleutel `lead_ref`, velden: `email`, `bedrijfsnummer`, `land`, `totem_demo` (bool), `demo_ingepland` (bool), `teamleader_deal_id`, `teamleader_company_id`, `mollie_payment_id`, `betaald` (bool), `aangemaakt` (datum), `herinnering_2` (bool), `herinnering_5` (bool), `payload` (tekst, volledige JSON).
- **Google Sheet** "Te verzenden" met kolommen: `datum`, `lead_ref`, `bedrijf`, `contact`, `straat`, `huisnummer`, `toevoeging`, `postcode`, `plaats`, `land`, `product`, `aantal`, `soort` (gratis/extra/totem), `status` (te verzenden / verzonden), `track&trace`.
- **Teamleader**: geen aparte pijplijn; shop-deals komen in de bestaande *Sales Pipeline* in fase *Nieuw*, en na "demo ingepland" in *Demo Ingepland* (zie "Huidige inrichting"). Optioneel later: Custom fields op de deal: `Bron`, `Sector`, `UTM source/medium/campaign`, `gclid`, `fbclid`, `Lead ref`, `Totem gekozen`, `Reviewtool`, `Aantal Google-reviews`. Op het bedrijf: `KvK/KBO` (of gebruik het standaardveld ondernemingsnummer).
- Turnstile: secret key uit het Cloudflare-dashboard.
- Mollie: API-key (live + test) als Make-connectie of als header in een HTTP-module.

---

## Scenario A: shop-aanvraag verwerken

1. **Webhooks → Custom webhook** `shop-aanvraag`. Plak de URL in GitHub → Settings → Variables → `PUBLIC_LEAD_WEBHOOK_URL`. Zet "JSON pass-through" uit, zodat Make de structuur herkent (stuur één testaanvraag vanaf de site of met de mock-payload om de structuur te leren).

2. **Router** op `request_type`:
   - `nieuwsbrief` → contact toevoegen aan je nieuwsbrieftool (of Teamleader-tag "nieuwsbrief") → Webhook response `200 {"ok":true}`. Stop.
   - `extras_betalen` → ga naar stap 7 (alleen Mollie), met de bestaande `lead_ref` uit de data store.
   - `aanvraag` → verder met stap 3.

3. **Turnstile verifiëren** (alleen als `turnstile_token` gevuld is):
   HTTP → Make a request: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`, body *application/x-www-form-urlencoded*: `secret={{TURNSTILE_SECRET}}`, `response={{turnstile_token}}`.
   Filter: `success = true`. Anders: Webhook response `200 {"ok":true}` en stop (bots geen signaal geven). Wil je zonder Turnstile testen, laat de site-key in GitHub leeg; het token is dan `null`. Zet in productie een filter dat `null` **niet** doorlaat zodra Turnstile live staat.

4. **Idempotency**: Data store → Get record `lead_ref`. Bestaat hij al (dubbelklik/retry)? → Webhook response met hetzelfde resultaat als de eerste keer (bewaar `checkoutUrl` in de data store) en stop.

5. **Dubbelcheck**: Teamleader → Search companies op KvK-/KBO-nummer (`bedrijf.bedrijfsnummer`). Heeft dit bedrijf al een deal in de NFC-pipeline met gratis set/totem ontvangen?
   - Zo ja: markeer als duplicaat, **geen** nieuwe gratis producten in "Te verzenden". Stuur de vriendelijke mail (template `docs/templates/email-duplicaat.md`), eventueel met het aanbod om extra's te bestellen. Heeft de klant extra's gekozen, dan mogen die wél doorgaan (ga door naar stap 7 met alleen de extra's).
   - Zet `duplicate: true` in de response.

6. **Data store** → Add record (`lead_ref`, `email`, `bedrijfsnummer`, `totem_demo`, `aangemaakt = now`, `payload`).
   **Voorraadteller**: alleen bij een geldige, niet-dubbele aanvraag → Data store `shop_teller` → record `gratis_sets`: `uitgegeven = uitgegeven + 1`, en het Gist bijwerken (zie scenario F). Staat de teller al op 1000, of is het na de einddatum? Verwerk de aanvraag dan niet als gratis set: stuur een vriendelijke mail en zet `"ok": true` met een notitie in Teamleader.

7. **Mollie-betaling** (alleen als `heeft_betaalde_extras = true`):
   1. HTTP → `GET https://shop.reviewplus.io/products.json` (fase 2: `https://www.reviewplus.io/shop/products.json`).
   2. Bereken het bedrag **zelf**: som van `producten[].extra × products[slug].prijsExtra`. Controleer `extra ≤ maxExtra`. Gebruik **niet** `bedrag_extras_indicatief` of `prijs_extra` uit de payload. Btw: `TODO: Jordan bevestigt of prijsExtra incl. of excl. btw is; tel bij excl. btw 21% op`.
   3. HTTP → `POST https://api.mollie.com/v2/payments` met header `Authorization: Bearer {{MOLLIE_API_KEY}}`:
      ```json
      {
        "amount": { "currency": "EUR", "value": "19.90" },
        "description": "Review Plus extra's RP-20260923-FB9E2B0891",
        "redirectUrl": "https://hook.eu2.make.com/<scenario-B-webhook>?ref=RP-20260923-FB9E2B0891",
        "cancelUrl": "{{return_urls.geannuleerd}}",
        "webhookUrl": "https://hook.eu2.make.com/<scenario-C-webhook>",
        "locale": "nl_NL",
        "method": ["ideal", "bancontact", "creditcard"],
        "metadata": { "lead_ref": "RP-20260923-FB9E2B0891" }
      }
      ```
      Tip: zet bij land `BE` de volgorde `["bancontact","ideal","creditcard"]`, zodat Bancontact bovenaan staat.
      Het bedrag moet een string met 2 decimalen zijn (`formatNumber(bedrag; 2; "."; "")`).
   4. Bewaar `id` (payment id) en `_links.checkout.href` in de data store.

8. **Webhook response**: status `200`, header `Content-Type: application/json` (géén Access-Control-header: Make stuurt die zelf mee), body:
   - met extra's: `{"ok":true,"checkoutUrl":"{{_links.checkout.href}}"}`
   - zonder: `{"ok":true}` (of met `"duplicate":true`)

   *Alles hierna gebeurt nadat de klant al verder is.*

9. **Teamleader** (niet bij duplicaat):
   - Search/Create **Company** (naam, KvK/KBO, btw, land, adres, website).
   - Search/Create **Contact** (voornaam, achternaam, e-mail, telefoon, functie) en koppel aan het bedrijf.
   - Create **Deal** in pipeline `TODO: "NFC-leads"`, fase *Aangevraagd*, titel `Shop: {{bedrijf.naam}}`, bron *Shop*, custom fields (sector, UTM's, gclid/fbclid, lead ref, totem gekozen, reviewtool, aantal reviews).
   - Add **Note** op de deal: producten, aantallen, toestemming + `tekst_versie` + tijdstip, landingspagina.
   - Sla `teamleader_deal_id` op in de data store.

10. **Bevestigingsmail** naar `contact.email` (Gmail/Outlook/Teamleader-mail): template `docs/templates/email-bevestiging.md`. Met demo-link als `totem_demo = true` (en als tip als `false`).

11. **Interne melding** naar Jordan: e-mail of WhatsApp (bv. via Twilio/WhatsApp Business-module) met bedrijf, plaats, producten, totem ja/nee, bron/campagne en de link naar de deal: `https://focus.teamleader.eu/deal_detail.php?id={{deal_id}}` (controleer de URL-vorm in jouw Teamleader).

12. **Fulfilment**: Google Sheets → Add row in "Te verzenden" voor de **gratis kaartenset** (altijd direct, los van de demo, altijd het standaardontwerp).
    - **Maatwerk-upsell** (`maatwerk.interesse = true`): los van de gratis verzending. Maak in Teamleader een aparte **deal/offerte** "QR-kaarten op maat {{bedrijf}}" (of een taak voor jezelf) met `maatwerk.wensen`, en stuur de klant een mail met het verzoek om het logo (SVG/PNG). Maatwerk bestaat alleen uit QR-reviewkaarten; NFC-kaarten en totems zijn (voorlopig) niet op maatwerk verkrijgbaar. Na akkoord op voorstel en ontwerp: factuur/Mollie-betaallink, daarna productie. `TODO: Jordan legt prijzen/pakketten vast.` De totem wordt hier **niet** toegevoegd (dat doet scenario D). Betaalde extra's worden pas toegevoegd na betaling (scenario C).

13. **Nieuwsbrief**: als `toestemming.nieuwsbrief = true` → toevoegen aan de nieuwsbrieflijst.

**Error handling**: zet op de Teamleader- en mail-modules een *Break*-errorhandler (automatisch opnieuw proberen) en een *Resume* op niet-kritieke modules, zodat de klant nooit een fout ziet door een haperende koppeling. De webhook response is dan al verstuurd.

---

## Scenario B: terugkeer na betaling (Mollie `redirectUrl`)

Mollie stuurt de klant na afloop terug naar één `redirectUrl`, ongeacht de uitkomst. Dit scenario controleert de status en stuurt door naar de juiste pagina.

1. **Custom webhook** `shop-betaal-return` (query `ref`).
2. Data store → Get record `ref` → `mollie_payment_id`.
3. HTTP → `GET https://api.mollie.com/v2/payments/{{id}}`.
4. **Webhook response** status `302` met header `Location`:
   - `status = paid` (of `authorized`/`pending` bij creditcard) → `https://shop.reviewplus.io/aanvragen?status=betaald&ref={{ref}}`
   - anders (`canceled`, `expired`, `failed`, `open`) → `https://shop.reviewplus.io/aanvragen?status=geannuleerd&ref={{ref}}`

De site toont dan de demo-stap (als de totem gekozen is) of `/bedankt`, of bij annuleren de keuze "Extra's alsnog afrekenen" of "Verder zonder extra's". Gratis producten blijven altijd aangevraagd.

## Scenario C: Mollie-betaling verwerkt (Mollie `webhookUrl`)

1. **Custom webhook** `shop-mollie` (Mollie POST `id=tr_xxx`, form-encoded).
2. HTTP → `GET https://api.mollie.com/v2/payments/{{id}}`, lees `metadata.lead_ref`.
3. Filter `status = paid` en in de data store nog niet `betaald`.
4. Data store → Update `betaald = true`.
5. Google Sheets → Add rows in "Te verzenden" voor de extra kaarten/totems (`soort = extra`).
6. Teamleader → **Factuur** aanmaken op het bedrijf (regels uit `/products.json`, betaald markeren met de Mollie-referentie) en een note op de deal.
7. Webhook response `200` (Mollie verwacht alleen een 200).

## Scenario D: demo ingepland → totem verzenden

> **Gebouwd als route 7** van het shop-scenario, op basis van fasewissels in Teamleader (zie "Totem na de demo" bovenaan). Teamleader heeft geen webhook voor Bookings-afspraken, dus het ontwerp hieronder is niet letterlijk zo gebouwd.

1. **Trigger**: Teamleader → *Watch events* / webhook op nieuwe afspraken (`meeting.created` of `calendarEvent.created`, afhankelijk van wat Bookings aanmaakt). Filter op het **demo-type** (`TODO: Jordan controleert in Teamleader Bookings hoe het type "demonstratie-met-review-plus-2" herkenbaar is: titel, activity type of booking-type-id`).
2. Haal de e-mailadressen van de deelnemers op.
3. Data store → Search records waar `email = deelnemer-email` en `totem_demo = true` en `demo_ingepland = false`.
   - Geen match? Zoek ook op het domein van het e-mailadres (bv. `@tandarts-antwerpen.be`) als fallback, en stuur Jordan een melding om handmatig te koppelen.
4. Data store → Update `demo_ingepland = true`.
5. Teamleader → Deal naar fase *Demo ingepland*.
6. Google Sheets → Add row "Te verzenden": 1× NFC-totem (`soort = totem`).
7. Mail naar klant: "Je demo staat gepland, de totem is onderweg" (template `email-demo-ingepland.md`).

## Scenario E: herinneringen totem (dagelijks om 09:00)

> **Gebouwd** als "Review Plus - Dagelijks (demo's en herinneringen)", met het veld `status` in plaats van losse vlaggen (zie "Huidige inrichting" bovenaan).

1. Data store → Search records: `totem_demo = true`, `demo_ingepland = false`.
2. Iterator → per record: `dagen = dateDifference(now; aangemaakt; days)`.
   - `dagen ≥ 2` en niet `herinnering_2` → mail `email-herinnering-totem.md` (variant dag 2), zet `herinnering_2 = true`.
   - `dagen ≥ 5` en niet `herinnering_5` → zelfde template (variant dag 5), zet `herinnering_5 = true`.
   - `dagen ≥ 14` (`TODO: Jordan bevestigt termijn`, zelfde waarde als `TOTEM_RESERVATION_DAYS` in `src/config/site.ts`) → reservering vervalt: `totem_demo = false`, note in Teamleader, optioneel laatste mail.

---

## CORS (eerst testen)

De site post JSON vanuit de browser naar `hook.*.make.com`. Omdat het `Content-Type: application/json` is, doet de browser eerst een *preflight* (`OPTIONS`). Test dit direct na het aanmaken van de webhook: verstuur een testaanvraag vanaf de live shop en kijk in de browser-console (tabblad Netwerk).
- Werkt het: niets te doen.
- CORS-fout: controleer dat je in de Webhook response **geen** eigen `Access-Control-Allow-Origin` hebt toegevoegd (Make stuurt `*` al mee). Blijft de preflight falen, meld het dan: dan passen we de site aan zodat hij `text/plain` stuurt (geen preflight) en zet je in Make een *Parse JSON*-module na de webhook.

## Scenario F: voorraadteller gratis sets (via GitHub Gist)

De site toont "Nog X van de 1.000 gratis sets beschikbaar". X is het **echte** aantal: 1000 min het aantal verwerkte, niet-dubbele aanvragen. De teller daalt dus niet door bezoeken, alleen door aanvragen.

Om Make-kosten laag te houden leest de site het getal **niet** uit Make, maar uit een klein openbaar bestand in een GitHub Gist. Make werkt dat bestand alleen bij als er een aanvraag verwerkt is (±3 operaties per aanvraag, 0 per bezoek).

- Gist: https://gist.github.com/AIOPLUS/200f4378b91228b2fdda400ec0f08d36 (secret: niet vindbaar, alleen via de link)
- Bestand: `voorraad.json` → `{"remaining": 1000, "max": 1000, "updated": "…"}`
- De site leest `https://gist.githubusercontent.com/AIOPLUS/200f4378b91228b2fdda400ec0f08d36/raw/voorraad.json` (staat al als `PUBLIC_STOCK_URL` in GitHub → Settings → Variables). GitHub ververst dit binnen ±5 minuten.

### Eenmalig: GitHub-token voor Make

1. github.com → je profielfoto → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Naam: `Make – voorraadteller`. Expiration: bijvoorbeeld 1 jaar (zet een herinnering in je agenda). Resource owner: `AIOPLUS`.
3. **Account permissions** → **Gists**: *Read and write*. Verder niets aanvinken.
4. **Generate token** en kopieer het (je ziet het maar één keer). Bewaar het alleen in Make, nergens anders.

### In scenario A (na de dubbelcheck, alleen bij een geldige, niet-dubbele aanvraag)

1. **Data store → Get a record**: `shop_teller`, key `gratis_sets`.
2. **Data store → Update a record**: `shop_teller`, key `gratis_sets`, `uitgegeven` = `{{uitgegeven + 1}}` (uit stap 1).
3. **Tools → Set variable**: naam `voorraad_json`, waarde:
   ```
   {"remaining": {{max(0; 1000 - (uitgegeven + 1))}}, "max": 1000, "updated": "{{formatDate(now; "YYYY-MM-DDTHH:mm:ss")}}Z"}
   ```
4. **HTTP → Make a request**:
   - URL: `https://api.github.com/gists/200f4378b91228b2fdda400ec0f08d36`
   - Method: `PATCH`
   - Headers:
     - `Authorization` = `Bearer <jouw token>`
     - `Accept` = `application/vnd.github+json`
     - `X-GitHub-Api-Version` = `2022-11-28`
   - Body type: *Raw* · Content type: *JSON (application/json)* · Request content:
     ```
     {"files": {"voorraad.json": {"content": "{{replace(voorraad_json; "\""; "\\""")}}"}}}
     ```
     (De `replace` zet de aanhalingstekens in de binnenste JSON om naar `\"`. Wil je dat niet zelf escapen: gebruik in plaats daarvan de module **JSON → Create JSON** met de structuur `files → voorraad.json → content` (tekst) en zet `voorraad_json` in `content`; die escapet automatisch.)
   - Zet op deze module een **Resume**-errorhandler: als GitHub even niet reageert, gaat de aanvraag gewoon door.
5. Stond `uitgegeven` al op 1000, of is het na de einddatum (30 november 2026)? Verwerk de aanvraag dan niet als gratis set (zie stap 6 van scenario A).

**Handmatig bijstellen** kan altijd: open het Gist op github.com → **Edit** → pas `remaining` aan → **Update secret gist**. Zet `uitgegeven` in de datastore dan op dezelfde stand (1000 − remaining).

Maximum en einddatum voor de site staan in `src/config/site.ts` (`ACTIE.maxSets`, `ACTIE.eindDatum`); houd het getal 1000 in Make daaraan gelijk.

## Checklist testen

- [ ] Testaanvraag NL zonder totem → deal, bevestigingsmail, rij "Te verzenden", site gaat naar `/bedankt`
- [ ] Testaanvraag BE met totem → site toont demo-stap; demo boeken met hetzelfde e-mailadres → deal *Demo ingepland* + totem in "Te verzenden"
- [ ] Testaanvraag met 2 extra kaarten → Mollie (testmodus) → betalen → demo-stap/bedankt, rij "extra", factuur in Teamleader
- [ ] Zelfde, maar annuleren → `/aanvragen?status=geannuleerd`, "Extra's alsnog afrekenen" maakt nieuwe betaling
- [ ] Nog een aanvraag met hetzelfde KvK-nummer → duplicaat-mail, geen nieuwe gratis producten
- [ ] Turnstile-token ongeldig (plak een nep-token met de mock) → niets verwerkt
