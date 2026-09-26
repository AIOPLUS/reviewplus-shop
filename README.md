# Review Plus Shop

Statische lead-generatie-shop voor Review Plus: bedrijven in Nederland en België vragen gratis een **NFC 3-kaartenset** aan en krijgen een **NFC-totem** gratis als ze een demo inplannen. Aanvragen gaan als JSON naar Make.com → Teamleader. Betaalde extra's lopen via Mollie (vanuit Make).

- Stack: Astro 7 (static) · TypeScript · Tailwind CSS 4 · vanilla-TS islands (geen framework-runtime)
- Hosting: GitHub Pages op `https://shop.reviewplus.io` (hoofdsite: repo `AIOPLUS/reviewplus-site`, zie `docs/DOMEIN.md`)
- Lighthouse mobiel (lokaal gemeten): 99–100 op alle vier de categorieën, LCP ≤ 1,8 s, CLS ≈ 0

## Snel starten

```bash
npm install
cp .env.example .env            # waarden invullen (alles mag leeg voor lokaal)
npm run dev                     # http://localhost:4321
```

Aanvraagflow lokaal testen zonder Make:

```bash
npm run mock-webhook            # http://localhost:8787/hook, simuleert ook Mollie
```

Zet in `.env.development.local`: `PUBLIC_LEAD_WEBHOOK_URL=http://localhost:8787/hook`.

| Script | Wat |
|---|---|
| `npm run dev` / `build` / `preview` | Astro |
| `npm run typecheck` | `astro check` |
| `npm run lint` | ESLint (TS + Astro) |
| `npm run linkcheck` | Interne links in `dist/` (`linkcheck:external` controleert ook externe) |
| `npm run check` | typecheck + lint + build + linkcheck |
| `npm run lhci` | Lighthouse CI (zoals in GitHub Actions) |
| `npm run lighthouse:local` | Lighthouse lokaal op Windows (omzeilt een tmp-map-bug van lhci) |
| `npm run mock-webhook` | Lokale test-webhook |

## Configuratie

**Build-variabelen** (`.env`, of GitHub → Settings → Secrets and variables → Actions → *Variables*):

| Variabele | Voorbeeld | |
|---|---|---|
| `SITE_URL` | `https://shop.reviewplus.io` | Basis voor canonicals, sitemap, schema, OG |
| `SHOP_BASE_PATH` | `/` | Alle links worden hieruit opgebouwd |
| `PUBLIC_LEAD_PROVIDER` | `make` | `make` \| `web3forms` \| `formspree` (fallback) |
| `PUBLIC_LEAD_WEBHOOK_URL` | `https://hook.eu2.make.com/…` | Make-webhook (of Formspree-endpoint) |
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | | Alleen bij `web3forms` |
| `PUBLIC_TURNSTILE_SITE_KEY` | | Cloudflare Turnstile; leeg = uit |
| `PUBLIC_KVK_PROXY_URL` | | KvK-autofill in het aanvraagformulier (Worker in `AIOPLUS/reviewplus-site/workers/kvk-zoeken`); leeg = uit |
| `PUBLIC_ANALYTICS_PROVIDER` | `plausible` | `plausible` \| `umami` \| leeg |
| `PUBLIC_UMAMI_WEBSITE_ID` | | Umami: Website ID uit cloud.umami.is (met provider `umami` is dit het enige wat nodig is) |
| `PUBLIC_ANALYTICS_DOMAIN` / `PUBLIC_ANALYTICS_SCRIPT_URL` | | Optioneel: ander domein of eigen script-URL (standaard `cloud.umami.is/script.js` of `plausible.io/js/script.js`). Alleen dit domein wordt gemeten. |
| `PUBLIC_META_PIXEL_ID`, `PUBLIC_GADS_ID`, `PUBLIC_GADS_CONVERSION_LABEL` | | Leeg = niet laden. Gevuld = cookiebanner verschijnt; pixels laden pas na "Accepteren". |

`PUBLIC_*`-waarden komen in de publieke site terecht; dat is de bedoeling (webhook-URL, site-keys, pixel-ID's). **Echte geheimen** (Turnstile secret, Mollie API-key, Teamleader) staan alleen in Make.

Overige instellingen in code:
- `src/config/site.ts`: landen, feature flags, `PRICE_NOTE` (incl./excl. btw), `TOTEM_RESERVATION_DAYS`
- `src/config/brand.ts`: merkgegevens, navigatie, footer, social links, demo- en login-link
- `src/config/shop-content.ts`: shop-FAQ en social proof (reviews/klantlogo's)
- `src/styles/tokens.css`: design tokens (afgeleid van www.reviewplus.io: Poppins, `#0040C1`, pill-knoppen)

## Content beheren

- **Producten**: `src/content/products/*.md` (schema in `src/content.config.ts`). Prijzen, gratis voorwaarde, max. aantallen, specs, FAQ. `/products.json` wordt hieruit gegenereerd en door Make gebruikt om bedragen te berekenen, dus prijzen hoef je maar op één plek aan te passen.
  - Specs met de waarde `TODO` worden niet getoond op de site.
- **Sectorpagina's** (`/voor/[sector]`): `src/content/sectors/*.md`. Nieuwe sector = nieuw bestand; pagina, sitemap, OG-afbeelding en `llms.txt` volgen automatisch.
- **Productfoto's/mockups**: staan in **`src/assets/products/`** (niet in `public/`, want alleen daar worden ze automatisch naar AVIF/WebP met `srcset` omgezet). Koppel ze via `afbeeldingen:` (+ `afbeeldingAlts:` voor de alt-teksten) in het product; de eerste foto is de hoofdfoto, de rest verschijnt in de galerij. **Uitgeknipte** foto's (transparante achtergrond, `*-uitgeknipt.webp`) krijgen automatisch een zacht blauw podium met slagschaduw; gewone foto's worden volledig getoond op hun eigen randkleur. De onbewerkte originelen staan in `src/assets/products/origineel/`.
- **Maatwerk**: alleen **betaalde QR-reviewkaarten** in eigen huisstijl (blok `MaatwerkBlok` op home en sectorpagina's, met `kaart-qr-maatwerk-voorbeeld-uitgeknipt.webp`). NFC-kaarten en totems zijn (voorlopig) alleen standaard verkrijgbaar. In stap 3 kan de klant interesse aanvinken (`maatwerk` in de payload), waarna Make een voorstel/offerte klaarzet.
- **Logo**: officiële bronbestanden in `src/assets/brand/`. Het icoon is als SVG nagebouwd in `src/components/layout/Logo.astro` (kleur `--color-logo: #1818FF`); `public/favicon.svg`, `public/apple-touch-icon.png` en `public/assets/brand/logo-512.png` (voor Google/schema) zijn daaruit gemaakt.
- **`src/assets/referentie/`**: beeld ter inspiratie (bv. van concurrenten); wordt niet op de site gebruikt.

## Live reviewteller (pre-order)

Nieuwe productlijn: houten tellers met klapcijfers (Smiirl Custom Counter) voor Google, Trustpilot, Tripadvisor, Booking.com, Airbnb en Yelp, met 5 of 7 cijfers. De prijs is € 499 of € 699 per stuk, excl. btw.
- **Pagina's:** `/live-reviewteller` en `/reviewteller/<platform>`, plus een productkaart en een blok op de homepage en de branchepagina's.
- **Inhoud en prijzen:** `src/content/tellers/`; de platformen staan in `src/lib/reviewplatformen.ts`.
- **Bestellen:** als pre-order met betaling vooraf via Mollie (`PreorderForm`, voorwaarden op `/pre-ordervoorwaarden`). Het formulier gaat naar Make-route 5e, die het bedrag zelf uitrekent uit `/products.json`.
- **Betalingen:** live sinds 26-09-2026. Meer uitleg en de open vragen voor Smiirl staan in [`docs/REVIEWTELLER.md`](docs/REVIEWTELLER.md).

## Labelwisselaar (AIO Plus)

Het beeldmerk in de header opent een menu met alle labels van AIO Plus: met de muis bij hover, op touch met een tik. Er staat ook een lijst in het mobiele menu en in de footer. De componenten (`LabelSwitcher`, `LabelMark`, `LabelList`) zijn een kopie van reviewplus-site. De labels komen bij het bouwen uit `https://www.reviewplus.io/labels.json`; lukt dat niet, dan uit `src/data/labels.json`. Een label aanpassen doe je in reviewplus-site. Deploy daarna de shop opnieuw, of wacht op de volgende push.

## Structuur

```
src/
  config/        brand.ts, site.ts, shop-content.ts   ← merk- en shopinstellingen
  content/       products/, sectors/                   ← content collections
  components/
    layout/      Header, Footer, CookieBanner          ← gedeeld, herbruikbaar voor de hele site
    seo/         Seo (meta, OG, JSON-LD)
    shop/        ProductCard, PriceTag, ProductVisual, TotemPromo, Faq, …
    flow/        Field (toegankelijk formulierveld)
  layouts/       BaseLayout
  lib/           url.ts (base path), schema.ts, catalog.ts, validation.ts, format.ts
    client/      flow.ts (aanvraagflow), cart.ts, lead.ts, attribution.ts, analytics.ts, consent.ts, storage.ts
  pages/         index, [product], aanvragen, bedankt, actievoorwaarden, voor/[sector], 404,
                 products.json, llms.txt, robots.txt, og/[slug].png
scripts/         linkcheck, mock-webhook, lighthouse-local
docs/            DOMEIN, MAKE-SCENARIO, LEAD-PAYLOAD, OPVOLGING, templates/
```

De hoofdsite staat in een aparte repo (`AIOPLUS/reviewplus-site`). De shop kan later onder `www.reviewplus.io/shop` komen; zie `docs/DOMEIN.md`.

## Hoe de aanvraagflow werkt

1. **Stap 1 Bedrijf**: land (NL/BE) bepaalt de validatie: KvK (8 cijfers) of KBO (`0123.456.789`, mod-97-controle), btw-formaat (waarschuwing), sector, locaties, website, Google-profiel.
2. **Stap 2 Contact & bezorging**: telefoon wordt E.164 (`+31…`/`+32…`), vriendelijke waarschuwing bij gmail/hotmail e.d., postcode NL `1234 AB` / BE `2000`. NL-adressen worden aangevuld via de gratis PDOK Locatieserver.
3. **Stap 3 Bevestigen**: overzicht (normale prijs doorgestreept, "Verzending: gratis"), totem + demo standaard aangevinkt, twee korte vragen, verplichte akkoorden (niet vooraf aangevinkt), optioneel nieuwsbrief, Turnstile.
4. **Versturen** → Make antwoordt `{ok, checkoutUrl?}`:
   - `checkoutUrl` → door naar Mollie (alleen voor extra's) → terug via Make naar demo-stap of `/bedankt`; bij annuleren: "Extra's alsnog afrekenen" of "Verder zonder extra's"
   - totem gekozen → **demo-stap** (Teamleader Bookings kan niet ingebed worden (`X-Frame-Options: SAMEORIGIN`), dus een grote knop die in een nieuw tabblad opent) met "Later inplannen"
   - anders → `/bedankt` (met demo-upsell)
5. Bij een fout blijft alles ingevuld (sessionStorage), met "Probeer opnieuw" en een mailto-fallback. Honeypot-veld tegen simpele bots.

Winkelwagen (extra kaarten/totems, totemkeuze) staat in `localStorage`; formulierdata alleen in `sessionStorage` (persoonsgegevens) en wordt na afronden gewist. Alle opslag is in try/catch verpakt: de flow werkt ook zonder.

**Analytics-events**: `product_view`, `start_aanvraag`, `stap_2`, `stap_3`, `aanvraag_verzonden`, `totem_gekozen`, `demo_klik`, `demo_later`, `betaling_gestart`. **Advertentieconversie** (Meta `Lead`, Google Ads `conversion`) vuurt één keer per aanvraag op de demo-stap of `/bedankt`, alleen na toestemming, met `lead_ref` als deduplicatie-ID.

## Afwijkingen van het plan (bewuste keuzes)

- **Tailwind 4** gebruikt design tokens via `@theme` in `src/styles/tokens.css` in plaats van `tailwind.config`.
- **Productfoto's** in `src/assets/products/` in plaats van `public/assets/products/`: alleen zo werkt de automatische AVIF/WebP-conversie.
- **Demo-boeking niet ingebed**: Teamleader staat iframes niet toe; het is een knop naar een nieuw tabblad.
- **Lokale Lighthouse** via `scripts/lighthouse-local.mjs`: `lhci autorun` crasht op Windows bij het opruimen van de tijdelijke Chrome-map. In CI (Linux) draait gewoon `lhci autorun`.
- **Social proof**: alleen "Meer dan 900 bedrijven" (overgenomen van www.reviewplus.io) en platformnamen. Reviews/klantlogo's verschijnen pas als ze in `shop-content.ts` staan.

## Openstaande TODO's in de code

```bash
grep -rn "TODO" src docs
```

Belangrijkste: specs (afmeting, materiaal, chip) per product · incl./excl. btw · reserveringstermijn totem · no-show-beleid · levertijd · juridische naam · social links · pipeline-naam in Teamleader · reviewtool-opties · bewaartermijn en verwerkers in de privacytekst · logo en mockups · jurist.

## Handmatige taken voor Jordan

- [x] GitHub-repo aanmaken, code pushen, Pages activeren (Source: GitHub Actions)
- [x] DNS: `CNAME shop → <github-gebruiker>.github.io`; in GitHub Pages custom domain + **Enforce HTTPS**
- [x] ~~Framer-redirect `/shop`~~ niet meer nodig: Framer is vervangen door reviewplus-site (25-09-2026)
- [x] Make-scenario's bouwen volgens `docs/MAKE-SCENARIO.md`; webhook-URL in GitHub Variables (`PUBLIC_LEAD_WEBHOOK_URL`); CORS testen (klaar 24-09-2026, zie "Huidige inrichting")
- [x] Teamleader: pipeline + custom fields aanmaken (niet nodig: bestaande Sales Pipeline, fases Nieuw en Demo Ingepland)
- [x] Cloudflare Turnstile: site-key (GitHub Variable `PUBLIC_TURNSTILE_SITE_KEY`) + secret (Make → Data stores → `shop_data` → `config:turnstile` → `waarde`). Eerst de site-key, dan de secret. Test daarna met een echte aanvraag: komt de bevestigingsmail, dan klopt het; krijg je "Aanvraag tegengehouden door spamfilter", dan hoort de secret niet bij de site-key. (live 24-09-2026)
- [x] Beslissen: prijzen incl./excl. btw (`PRICE_NOTE`), reserveringstermijn totem (`TOTEM_RESERVATION_DAYS`), beleid bij no-show (excl. btw, 14 dagen, no-show = geen totem)
- [x] Mollie-account (iDEAL + Bancontact + creditcard) koppelen in Make (live)
- [x] Teamleader Bookings: demo-type herkenbaar maken voor scenario D (herkenning op titel "Demonstratie met Review Plus" + e-mailadres in het dagelijkse scenario)
- [x] Analytics kiezen (Plausible/Umami) en variabelen zetten; pixel-ID's zetten als je advertenties draait (Umami Cloud live; pixels nog niet)
- [ ] Logo's (SVG), productmockups (`src/assets/products/`) en echte reviews/klantlogo's (met toestemming) aanleveren
- [ ] Actievoorwaarden en privacytekst laten controleren door een jurist; privacyverklaring op de hoofdsite aanvullen
