# Make.com-scenario's voor de shop

De site is statisch (GitHub Pages). Alle logica loopt via Make. Er zijn **vijf scenario's**:

| # | Scenario | Trigger |
|---|---|---|
| A | Shop-aanvraag verwerken | Custom webhook (van de site) |
| B | Terugkeer na betaling | Custom webhook (Mollie `redirectUrl`) |
| C | Mollie-betaling verwerkt | Custom webhook (Mollie `webhookUrl`) |
| D | Demo ingepland → totem verzenden | Teamleader: nieuwe afspraak (Watch events / webhook) |
| E | Herinneringen totem | Schema (dagelijks) |

Payload-contract: zie [LEAD-PAYLOAD.md](LEAD-PAYLOAD.md). Secrets (Turnstile secret, Mollie API-key, Teamleader-koppeling) staan **alleen in Make**, nooit in de site of in GitHub.

**Belangrijke volgorde:** de site wacht op het antwoord van scenario A (max. 20 s). Zet daarom de **Webhook response** zo vroeg mogelijk: direct na Turnstile, de dubbelcheck en (indien nodig) het aanmaken van de Mollie-betaling. Teamleader, mails en de verzendlijst komen ná de response.

---

## Voorbereiding

- **Data store** `shop_leads` (Make → Data stores), sleutel `lead_ref`, velden: `email`, `bedrijfsnummer`, `land`, `totem_demo` (bool), `demo_ingepland` (bool), `teamleader_deal_id`, `teamleader_company_id`, `mollie_payment_id`, `betaald` (bool), `aangemaakt` (datum), `herinnering_2` (bool), `herinnering_5` (bool), `payload` (tekst, volledige JSON).
- **Google Sheet** "Te verzenden" met kolommen: `datum`, `lead_ref`, `bedrijf`, `contact`, `straat`, `huisnummer`, `toevoeging`, `postcode`, `plaats`, `land`, `product`, `aantal`, `soort` (gratis/extra/totem), `status` (te verzenden / verzonden), `track&trace`.
- **Teamleader**: pipeline `TODO: naam, bv. "NFC-leads"` met fases *Aangevraagd*, *Demo ingepland*, *Demo gehad*, *Klant Review Plus Online*, *Verloren*. Custom fields op de deal: `Bron`, `Sector`, `UTM source/medium/campaign`, `gclid`, `fbclid`, `Lead ref`, `Totem gekozen`, `Reviewtool`, `Aantal Google-reviews`. Op het bedrijf: `KvK/KBO` (of gebruik het standaardveld ondernemingsnummer).
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

8. **Webhook response**: status `200`, headers `Content-Type: application/json` en `Access-Control-Allow-Origin: https://shop.reviewplus.io`, body:
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

12. **Fulfilment**: Google Sheets → Add row in "Te verzenden" voor de **gratis kaartenset** (altijd direct, los van de demo). Voeg een kolom `ontwerp` toe (`standaard`/`eigen`).
    - **Eigen ontwerp** (`ontwerp.type = "eigen"`): zet de rij op status *Ontwerp nodig* in plaats van *te verzenden*, maak een Teamleader-taak "Ontwerp maken voor {{bedrijf}}" met `ontwerp.wensen`, en stuur de klant een mail met het verzoek om het logo (SVG/PNG) te mailen. Pas na goedkeuring van het ontwerp gaat de status naar *te verzenden*. `TODO: Jordan bepaalt of maatwerk gratis is binnen de actie of een prijs krijgt (dan via Mollie of offerte).` De totem wordt hier **niet** toegevoegd (dat doet scenario D). Betaalde extra's worden pas toegevoegd na betaling (scenario C).

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

1. **Trigger**: Teamleader → *Watch events* / webhook op nieuwe afspraken (`meeting.created` of `calendarEvent.created`, afhankelijk van wat Bookings aanmaakt). Filter op het **demo-type** (`TODO: Jordan controleert in Teamleader Bookings hoe het type "demonstratie-met-review-plus-2" herkenbaar is: titel, activity type of booking-type-id`).
2. Haal de e-mailadressen van de deelnemers op.
3. Data store → Search records waar `email = deelnemer-email` en `totem_demo = true` en `demo_ingepland = false`.
   - Geen match? Zoek ook op het domein van het e-mailadres (bv. `@tandarts-antwerpen.be`) als fallback, en stuur Jordan een melding om handmatig te koppelen.
4. Data store → Update `demo_ingepland = true`.
5. Teamleader → Deal naar fase *Demo ingepland*.
6. Google Sheets → Add row "Te verzenden": 1× NFC-totem (`soort = totem`).
7. Mail naar klant: "Je demo staat gepland, de totem is onderweg" (template `email-demo-ingepland.md`).

## Scenario E: herinneringen totem (dagelijks om 09:00)

1. Data store → Search records: `totem_demo = true`, `demo_ingepland = false`.
2. Iterator → per record: `dagen = dateDifference(now; aangemaakt; days)`.
   - `dagen ≥ 2` en niet `herinnering_2` → mail `email-herinnering-totem.md` (variant dag 2), zet `herinnering_2 = true`.
   - `dagen ≥ 5` en niet `herinnering_5` → zelfde template (variant dag 5), zet `herinnering_5 = true`.
   - `dagen ≥ 14` (`TODO: Jordan bevestigt termijn`, zelfde waarde als `TOTEM_RESERVATION_DAYS` in `src/config/site.ts`) → reservering vervalt: `totem_demo = false`, note in Teamleader, optioneel laatste mail.

---

## CORS (eerst testen)

De site post JSON vanuit de browser naar `hook.*.make.com`. Omdat het `Content-Type: application/json` is, doet de browser eerst een *preflight* (`OPTIONS`). Test dit direct na het aanmaken van de webhook: verstuur een testaanvraag vanaf de live shop en kijk in de browser-console (tabblad Netwerk).
- Werkt het: niets te doen.
- CORS-fout: controleer dat de Webhook response-module de header `Access-Control-Allow-Origin` meestuurt. Blijft de preflight falen, meld het dan: dan passen we de site aan zodat hij `text/plain` stuurt (geen preflight) en zet je in Make een *Parse JSON*-module na de webhook.

## Checklist testen

- [ ] Testaanvraag NL zonder totem → deal, bevestigingsmail, rij "Te verzenden", site gaat naar `/bedankt`
- [ ] Testaanvraag BE met totem → site toont demo-stap; demo boeken met hetzelfde e-mailadres → deal *Demo ingepland* + totem in "Te verzenden"
- [ ] Testaanvraag met 2 extra kaarten → Mollie (testmodus) → betalen → demo-stap/bedankt, rij "extra", factuur in Teamleader
- [ ] Zelfde, maar annuleren → `/aanvragen?status=geannuleerd`, "Extra's alsnog afrekenen" maakt nieuwe betaling
- [ ] Nog een aanvraag met hetzelfde KvK-nummer → duplicaat-mail, geen nieuwe gratis producten
- [ ] Turnstile-token ongeldig (plak een nep-token met de mock) → niets verwerkt
