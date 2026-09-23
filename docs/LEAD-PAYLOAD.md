# Lead-payload (contract site → Make.com)

De aanvraagflow stuurt één JSON-`POST` naar `PUBLIC_LEAD_WEBHOOK_URL` (Make custom webhook).
Bron van waarheid in code: `src/lib/client/lead.ts` (`LeadPayload`). Wijzig code en dit document altijd samen en verhoog `payload_version` bij brekende wijzigingen.

- Methode: `POST`
- Headers: `Content-Type: application/json`, `Accept: application/json`
- Timeout aan de sitekant: 20 seconden

## Soorten verzoeken (`request_type`)

| `request_type` | Wanneer | Wat Make doet |
|---|---|---|
| `aanvraag` | Klant verstuurt stap 3 | Volledige flow (Turnstile, dubbelcheck, Teamleader, mails, fulfilment, eventueel Mollie) |
| `extras_betalen` | Klant annuleerde de betaling en klikt "Extra's alsnog afrekenen" | **Alleen** nieuwe Mollie-betaling maken voor de extra's bij dezelfde `lead_ref`. Geen nieuwe deal, geen dubbelcheck. `producten[].gratis` is hier altijd 0. |
| `nieuwsbrief` | Aanmelding via het footerveld | Contact toevoegen aan nieuwsbrieflijst. Payload is kort, zie onderaan. |

## Velden (`aanvraag` / `extras_betalen`)

| Veld | Type | Toelichting |
|---|---|---|
| `payload_version` | number | Nu `1` |
| `request_type` | string | Zie hierboven |
| `lead_ref` | string | Uniek per aanvraag, bv. `RP-20260923-25EF842DF2`. Blijft gelijk bij "probeer opnieuw" → gebruik als **idempotency key** (zelfde ref = niet dubbel verwerken). |
| `lead_source` | `"shop"` | Vast |
| `submitted_at` | ISO 8601 | Tijd in de browser (UTC) |
| `bedrijf.land` | `"NL"` \| `"BE"` | |
| `bedrijf.naam` | string | |
| `bedrijf.bedrijfsnummer_type` | `"kvk"` \| `"kbo"` | |
| `bedrijf.bedrijfsnummer` | string | KvK: 8 cijfers (`12345678`). KBO: `0123.456.789` (mod-97 gecontroleerd). **Sleutel voor de dubbelcheck.** |
| `bedrijf.btw_nummer` | string \| null | Genormaliseerd (`NL123456789B01` / `BE0123456789`), niet verplicht |
| `bedrijf.sector` | string | `horeca`, `tandartsen`, `hospitality`, `retail`, `beauty`, `zorg-overig`, `zakelijke-dienstverlening`, `bouw-installatie`, `automotive`, `anders` |
| `bedrijf.aantal_locaties` | string | `1`, `2-5`, `6-10`, `11+` |
| `bedrijf.website` | string \| null | Volledige URL |
| `bedrijf.google_profiel` | string \| null | Link naar Google Bedrijfsprofiel |
| `contact.voornaam` / `achternaam` | string | |
| `contact.functie` | string \| null | |
| `contact.email` | string | Lowercase. **Sleutel voor de koppeling met de demo-boeking.** |
| `contact.telefoon` | string | E.164: `+31612345678` / `+32470123456` |
| `bezorgadres.straat` / `huisnummer` / `plaats` | string | |
| `bezorgadres.toevoeging` | string \| null | |
| `bezorgadres.postcode` | string | NL `1234 AB`, BE `2000` |
| `bezorgadres.land` | `"NL"` \| `"BE"` | |
| `producten[]` | array | Alleen regels met `gratis > 0` of `extra > 0` |
| `producten[].slug` | string | `nfc-kaartenset`, `nfc-totem` |
| `producten[].gratis` | number | Aantal gratis stuks (totem alleen als `totem_demo`) |
| `producten[].extra` | number | Aantal betaalde extra's |
| `producten[].prijs_extra` / `normale_prijs` | number | Informatief. **Niet gebruiken voor het bedrag.** |
| `producten[].gratis_voorwaarde` | `"altijd"` \| `"bij-demo"` \| null | |
| `totem_demo` | boolean | Klant wil de totem en plant een demo in |
| `heeft_betaalde_extras` | boolean | Zo ja → Mollie-betaling aanmaken |
| `bedrag_extras_indicatief` | number | Alleen ter controle. **Make herberekent uit `/products.json`.** |
| `vragen.huidige_reviewtool` | string \| null | `geen`, `anders` (uitbreidbaar) |
| `vragen.huidige_reviewtool_anders` | string \| null | Vrije tekst bij "anders" |
| `vragen.aantal_google_reviews` | string \| null | `0-10`, `11-50`, `51-100`, `101-250`, `250+`, `weet-niet` |
| `toestemming.actievoorwaarden_privacy` | boolean | Altijd `true` (verplicht in formulier) |
| `toestemming.contact_opvolging` | boolean | Altijd `true` (verplicht). Bewaar dit met datum in Teamleader. |
| `toestemming.nieuwsbrief` | boolean | Optioneel |
| `toestemming.tekst_versie` | string | Versie van de toestemmingsteksten, bv. `v1-2026-09` |
| `attributie` | object \| null | Zie hieronder |
| `pagina` | string | URL van de aanvraagpagina (zonder query) |
| `turnstile_token` | string \| null | Verifiëren in Make (stap 2 van het scenario). `null` als Turnstile niet is geconfigureerd. |
| `return_urls.betaald` / `geannuleerd` | string | Waar de klant na Mollie naartoe moet (zie MAKE-SCENARIO, "Terugkeer na betaling") |

### `attributie`
Vastgelegd bij het eerste bezoek in de sessie (`sessionStorage`), overschreven als er een nieuwe campagne-URL binnenkomt.

| Veld | Toelichting |
|---|---|
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | string \| null |
| `gclid`, `fbclid` | string \| null |
| `landing_page` | Eerste URL in de sessie, inclusief query |
| `referrer` | `document.referrer` van die eerste pagina |
| `sector_page` | Slug van de bezochte sectorpagina (`/voor/[sector]`), anders null |
| `first_seen` | ISO 8601 |

## Voorbeeld (`aanvraag`, BE, totem + 2 extra kaarten)

```json
{
  "payload_version": 1,
  "request_type": "aanvraag",
  "lead_ref": "RP-20260923-FB9E2B0891",
  "lead_source": "shop",
  "submitted_at": "2026-09-23T15:25:02.114Z",
  "bedrijf": {
    "land": "BE",
    "naam": "Tandarts Antwerpen",
    "bedrijfsnummer_type": "kbo",
    "bedrijfsnummer": "0403.170.701",
    "btw_nummer": null,
    "sector": "tandartsen",
    "aantal_locaties": "2-5",
    "website": null,
    "google_profiel": null
  },
  "contact": {
    "voornaam": "Els",
    "achternaam": "Peeters",
    "functie": null,
    "email": "els@tandarts-antwerpen.be",
    "telefoon": "+32470123456"
  },
  "bezorgadres": {
    "straat": "Meir",
    "huisnummer": "10",
    "toevoeging": null,
    "postcode": "2000",
    "plaats": "Antwerpen",
    "land": "BE"
  },
  "producten": [
    { "slug": "nfc-kaartenset", "naam": "NFC 3-kaartenset", "gratis": 1, "extra": 2, "prijs_extra": 9.95, "normale_prijs": 29.85, "gratis_voorwaarde": "altijd" },
    { "slug": "nfc-totem", "naam": "NFC-totem (tafelstandaard)", "gratis": 1, "extra": 0, "prijs_extra": 24.95, "normale_prijs": 24.95, "gratis_voorwaarde": "bij-demo" }
  ],
  "totem_demo": true,
  "heeft_betaalde_extras": true,
  "bedrag_extras_indicatief": 19.9,
  "vragen": { "huidige_reviewtool": "anders", "huidige_reviewtool_anders": "Trustoo", "aantal_google_reviews": "11-50" },
  "toestemming": { "actievoorwaarden_privacy": true, "contact_opvolging": true, "nieuwsbrief": false, "tekst_versie": "v1-2026-09" },
  "attributie": {
    "utm_source": "meta", "utm_medium": "paid", "utm_campaign": "tandarts-test", "utm_content": null, "utm_term": null,
    "gclid": null, "fbclid": "abc123",
    "landing_page": "https://shop.reviewplus.io/voor/tandartsen?utm_source=meta&utm_medium=paid&utm_campaign=tandarts-test&fbclid=abc123",
    "referrer": null, "sector_page": "tandartsen", "first_seen": "2026-09-23T15:24:01.311Z"
  },
  "pagina": "https://shop.reviewplus.io/aanvragen",
  "turnstile_token": "0.AbCdEf…",
  "return_urls": {
    "betaald": "https://shop.reviewplus.io/aanvragen?status=betaald&ref=RP-20260923-FB9E2B0891",
    "geannuleerd": "https://shop.reviewplus.io/aanvragen?status=geannuleerd&ref=RP-20260923-FB9E2B0891"
  }
}
```

## Nieuwsbrief-payload

```json
{ "request_type": "nieuwsbrief", "lead_source": "shop", "email": "jij@bedrijf.nl", "submitted_at": "2026-09-23T15:00:00.000Z", "pagina": "https://shop.reviewplus.io/" }
```

## Respons van Make

Gebruik in Make de module **Webhooks → Webhook response**:

| Situatie | Status | Body |
|---|---|---|
| Gelukt, alleen gratis producten | `200` | `{ "ok": true }` |
| Gelukt, met betaalde extra's | `200` | `{ "ok": true, "checkoutUrl": "https://www.mollie.com/checkout/…" }` |
| Dubbele aanvraag (al eerder gratis ontvangen) | `200` | `{ "ok": true, "duplicate": true }` (de site gaat gewoon door; Make stuurt de vriendelijke mail) |
| Turnstile ongeldig / spam | `200` | `{ "ok": true }` (niets verwerken, bot geen signaal geven) |
| Ongeldige data | `422` | `{ "ok": false, "message": "…" }` |

Headers in de response: `Content-Type: application/json` en `Access-Control-Allow-Origin: https://shop.reviewplus.io` (fase 2: `https://www.reviewplus.io`).

Geen Webhook response-module? Dan antwoordt Make met de platte tekst `Accepted`; de site behandelt dat als `{ ok: true }` (maar dan werkt de Mollie-doorstuur niet).

Bij een netwerkfout, timeout of status ≥ 400 toont de site een foutmelding met "Probeer opnieuw" en een mailto naar support. De ingevulde gegevens blijven bewaard (sessionStorage), en `lead_ref` blijft gelijk.

## Lokaal testen

```bash
npm run mock-webhook
```
En in `.env.development.local`: `PUBLIC_LEAD_WEBHOOK_URL=http://localhost:8787/hook`. De mock logt de payload, schrijft de laatste naar `scripts/.last-payload.json` en simuleert Mollie (betalen/annuleren). `?fail=1` achter de webhook-URL simuleert een serverfout.
