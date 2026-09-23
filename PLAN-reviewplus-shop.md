# Plan van aanpak: Review Plus Shop (lead-gen webshop)

> Instructie voor Claude Code: lees dit hele document, maak eerst een kort technisch plan, en voer daarna de fases hieronder zelfstandig uit. Stel alleen vragen als je echt vastloopt. Alles wat gemarkeerd is met `TODO:` vult Jordan later zelf in; verzin geen prijzen, klantnamen, reviews of statistieken.

---

## 1. Rol & opdracht

Je bent een senior full-stack engineer, conversie-specialist en technisch SEO-specialist. Bouw een statische, snelle webshop voor **Review Plus** (reputatiemanagement-software, Nederland) die gehost wordt via **GitHub Pages**.

De shop is geen klassieke webshop maar een **lead-generatiemachine**:

1. Bedrijven in **Nederland en België** vragen gratis een **Review Plus NFC 3-kaartenset** aan (altijd gratis, ook gratis verzending). Wie daarbij een **demo inplant**, krijgt er een **gratis NFC-totem** bij.
2. Daarmee ontstaat een gekwalificeerde B2B-lead in Teamleader.
3. Review Plus benadert die lead vervolgens voor een **Review Plus Online**-abonnement.

Primaire KPI: aantal **gekwalificeerde aanvragen** (echt bedrijf, KvK- of KBO-nummer, akkoord op opvolging).
Secundaire KPI: percentage aanvragen dat een **demo inplant** (de totem is daarvoor de trigger, dus stuur de flow daar actief op).

---

## 2. Domein & hosting (belangrijk)

De hoofdsite `www.reviewplus.io` draait nu op **Framer**. Een domein kan maar naar één host wijzen, dus `/shop` kan niet direct op GitHub Pages staan zolang de rest op Framer staat.

**Fase 1 (nu): subdomein**
- Shop draait op `https://shop.reviewplus.io` via GitHub Pages (`public/CNAME` = `shop.reviewplus.io`).
- In Framer maakt Jordan een redirect: `/shop` → `https://shop.reviewplus.io` (301). Zo werken advertenties en links naar `reviewplus.io/shop` al meteen.
- Canonical URLs wijzen in deze fase naar `shop.reviewplus.io`.

**Fase 2 (later): volledige site naar GitHub**
- Als de hele site van Framer naar GitHub verhuist, komt de shop op `https://www.reviewplus.io/shop`.
- Het subdomein krijgt dan een 301 naar `/shop` (redirect-pagina's per URL + canonical-wijziging).
- Maak het project hier nu al klaar voor: gebruik een `SHOP_BASE_PATH` (`/` in fase 1, `/shop` in fase 2) en een `SITE_URL` in config, en genereer álle links, canonicals, sitemap en schema daaruit. Geen hardcoded paden.

**Alternatief (optioneel, niet standaard bouwen):** een Cloudflare Worker als reverse proxy die `/shop/*` naar GitHub Pages stuurt en de rest naar Framer. Documenteer dit alleen in `docs/DOMEIN.md` als optie, met de kanttekening dat Framer achter een proxy extra configuratie vraagt.

---

## 3. Huisstijl: afstemmen op de huidige website

De shop moet voelen als een onderdeel van `https://www.reviewplus.io`, niet als een losse site.

1. **Haal de huidige stijl op**: download de HTML/CSS van `https://www.reviewplus.io` (curl) en leid daaruit af: fonts, kleuren (hex), border-radius, schaduwen, knopstijlen, spacing en breakpoints. Leg ze vast als design tokens in `src/styles/tokens.css` en `tailwind.config`.
2. **Merkkleur**: Review Plus is **marine blauw**. Het logo-icoon (kwartcirkels + vierkanten) staat in `public/assets/brand/`. `TODO: Jordan levert logo's (SVG) en exacte hex-codes aan als de extractie niet klopt.`
3. **Header** gelijk aan de huidige site: logo, `Home`, `Het product`, `Over ons`, `Kennisbank`, `Shop` (nieuw, actief), knop `Log in` (→ `https://app.reviewplus.io/login`) en knop `Boek een demo`. Links naar Framer-pagina's zijn absolute URLs naar `https://www.reviewplus.io/...`.
4. **Footer** gelijk aan de huidige site: kolommen Bedrijf / Product / Wettelijk, nieuwsbrief-veld, social links, copyright.
5. **Demo-link**: gebruik overal dezelfde Teamleader-bookinglink als de huidige site: `https://cloud.teamleader.eu/review-plus/bookings/u/review1/t/demonstratie-met-review-plus-2/`.
6. **Taal & toon**: Nederlands, je-vorm, zakelijk en toegankelijk, zoals de huidige site ("Maak het jezelf makkelijker").
7. **Beeld**: productfoto's/mockups van NFC-kaarten, totem en dashboard staan in `public/assets/products/`. `TODO: Jordan kopieert de mockups hierheen.` Converteer naar AVIF/WebP met responsive `srcset`.

---

## 4. Aanbod & productcatalogus

Beheer producten als content-bestanden in `src/content/products/*.md` met een getypeerd schema (Astro Content Collections):

| Veld | Type | Toelichting |
|---|---|---|
| `slug`, `naam`, `korteOmschrijving` | string | |
| `type` | `kaartenset` \| `totem` \| `losse-kaart` \| `bundel` | |
| `prijs` | number | `0` voor gratis |
| `gratisVoorwaarde` | `altijd` \| `bij-demo` \| null | wanneer het product gratis is |
| `maxPerBedrijf` | number | |
| `platformen` | string[] | bv. Google, Trustpilot, Facebook |
| `specs` | object | afmeting, materiaal, NFC-chip, QR ja/nee |
| `afbeeldingen` | string[] | |
| `status` | `beschikbaar` \| `binnenkort` \| `uitverkocht` | |
| `prijsExtra` | number | prijs per extra stuk boven het gratis aantal (afgerekend via Mollie, zie §6) |

Voeg aan het schema toe: `normalePrijs` (number, de reguliere waarde die doorgestreept getoond wordt bij gratis producten, bv. "t.w.v. € 24,95 – nu gratis").

**Aanbod (vastgesteld):**

| Product | Gratis actie | Normale prijs / extra's |
|---|---|---|
| **NFC 3-kaartenset** | Altijd gratis, 1 set per bedrijf | Normale prijs **€ 9,95** per kaart; extra kaarten € 9,95 per stuk |
| **NFC-totem (tafelstandaard)** | Gratis bij het **inplannen van een demo**, 1 per bedrijf | Normale prijs **€ 24,95**; extra totems € 24,95 per stuk |

- Toon bij gratis producten altijd de normale prijs doorgestreept ("t.w.v. € 24,95, nu gratis bij je demo"), zodat de waarde van het cadeau zichtbaar is.
- De totem is de haak voor de demo: toon hem op de shop-home, productpagina's en in de aanvraagflow als "Plan een demo in en ontvang de totem gratis".
- Extra kaarten en totems kunnen in dezelfde bestelling worden toegevoegd (aantal-selector).
- Leveren in **Nederland en België**.
- `TODO: Jordan bevestigt of prijzen incl. of excl. btw getoond worden (B2B: excl. btw mag, mits duidelijk vermeld).`

**Verzendkosten (vastgesteld): geen.** Verzending is altijd gratis, in NL en BE. Communiceer dit prominent ("Gratis, ook gratis verzonden"). De kwaliteit van leads bewaken we met het verplichte KvK-/KBO-nummer, de dubbelcheck en de anti-spam (§6 en §7), niet met een drempelbedrag.

---

## 5. Pagina's

| URL (relatief aan base) | Doel |
|---|---|
| `/` | Shop-home: hero "Gratis NFC-reviewkaarten voor jouw bedrijf", hoe het werkt (3 stappen), producten, social proof, FAQ, CTA |
| `/[product]` | Productpagina: foto's, specs, voordelen, "zo werkt het" (tik → reviewpagina), FAQ, CTA |
| `/aanvragen` | Aanvraag-/checkoutflow (meerstaps) |
| `/bedankt` | Bevestiging + directe upsell: "Boek een gratis demo en haal meer uit je kaarten" |
| `/actievoorwaarden` | Voorwaarden van de gratis actie |
| `/voor/[sector]` | Advertentie-landingspagina's per sector: `horeca`, `tandartsen`, `hospitality`, `retail`, `beauty` (content per sector in `src/content/sectors/`) |
| `/404` | In huisstijl, met links terug |

Winkelwagen: lichtgewicht, client-side (klein island), opgeslagen in `localStorage` (try/catch), zodat een bezoeker de gratis set, de totem (via demo) en betaalde extra's kan combineren. Voor alleen de gratis set mag de flow de winkelwagen overslaan (één knop: "Vraag gratis aan").

---

## 6. Aanvraagflow (de kern)

Meerstaps formulier, mobile-first, maximaal 3 stappen met voortgangsbalk:

**Stap 1: Bedrijf**
- Land* (Nederland / België; bepaalt validatie van bedrijfsnummer, postcode en telefoon)
- Bedrijfsnaam*, bedrijfsnummer*: **KvK-nummer** (NL, 8 cijfers) of **KBO-/ondernemingsnummer** (BE, 10 cijfers, formaat `0123.456.789`), btw-nummer (optioneel), sector* (select), aantal locaties*, website, link naar Google Bedrijfsprofiel (of zoekveld bedrijfsnaam + plaats)

**Stap 2: Contact & bezorging**
- Voornaam*, achternaam*, functie, e-mail* (zakelijk; waarschuw vriendelijk bij gmail/hotmail maar blokkeer niet), telefoon* (+31 of +32), bezorgadres* met landafhankelijke validatie (NL-postcode `1234 AB`, BE-postcode 4 cijfers); straat/plaats automatisch aanvullen als dat zonder betaalde API kan, anders handmatig

**Stap 3: Bevestigen**
- Overzicht van de aanvraag, met gratis producten (normale prijs doorgestreept), eventuele extra's en "Verzending: gratis"
- Keuze (standaard aangevinkt): **"Ja, ik wil ook de gratis NFC-totem en plan een korte demo in"**
- Vraag: "Welke reviewtool gebruik je nu?" (geen / anders / TODO opties) en "Hoeveel Google-reviews heb je ongeveer?"
- Checkbox* akkoord actievoorwaarden en privacyverklaring
- Checkbox* "Ik ga akkoord dat Review Plus contact met mij opneemt over mijn aanvraag en Review Plus Online" (niet vooraf aangevinkt)
- Optioneel: checkbox nieuwsbrief

**Stap 4: Demo inplannen (alleen als de totem is gekozen)**
- Na verzenden van de aanvraag direct doorleiden naar de demo-stap: toon de Teamleader-bookingpagina (`DEMO_BOOKING_URL`) ingebed als dat technisch kan, anders als grote knop die in een nieuw tabblad opent.
- Tekst: "Nog één stap: kies een moment voor je demo en de totem is van jou." Laat duidelijk zien dat de kaarten sowieso al onderweg gaan.
- Knop "Later inplannen" is toegestaan; dan krijgt de lead herinneringen (§7) en blijft de totem gereserveerd tot de demo is ingepland.
- De koppeling tussen boeking en aanvraag gebeurt in Make op **e-mailadres**; vraag de klant daarom in de boekingsstap hetzelfde e-mailadres te gebruiken.

**Techniek**
- Anti-spam: honeypot-veld + **Cloudflare Turnstile** (token meesturen; verificatie gebeurt in Make, zie §7).
- Verstuur als JSON `POST` naar `PUBLIC_LEAD_WEBHOOK_URL` (Make.com). Fallback-optie in config: Web3Forms/Formspree.
- Stuur mee: alle velden, producten, `lead_source: "shop"`, UTM-parameters (`utm_source/medium/campaign/content/term`), `gclid`/`fbclid`, landingspagina, sector-pagina, timestamp. UTM's bewaren in `sessionStorage` bij eerste bezoek.
- Documenteer het exacte JSON-contract in `docs/LEAD-PAYLOAD.md` met een voorbeeld.
- **Afrekenen alleen bij betaalde extra's.** Een aanvraag met alleen gratis producten heeft géén betaalstap. Zitten er extra kaarten of totems in de winkelwagen, dan maakt Make.com via de **Mollie API** een betaling aan voor alleen die extra's en geeft de `checkoutUrl` terug; de site stuurt de klant daarheen. Betaalmethoden: iDEAL (NL) en Bancontact (BE) eerst, daarna creditcard.
  - Het bedrag wordt in Make opnieuw berekend uit de productconfig (niet het bedrag uit de browser vertrouwen). Publiceer de catalogus daarvoor ook als `/products.json`.
  - Na betaling volgt de demo-stap (als de totem gekozen is) of `/bedankt`. Bij annuleren: terug naar `/aanvragen?status=geannuleerd` met de gegevens intact, en de gratis producten blijven gewoon aangevraagd.
- Foutafhandeling: bij mislukte POST de ingevulde data behouden, duidelijke melding en "probeer opnieuw" + fallback-mailto.

---

## 7. Integraties zonder eigen backend (Make.com + Teamleader)

GitHub Pages is statisch; alle logica loopt via **Make.com**. Bouw de site, en schrijf in `docs/MAKE-SCENARIO.md` stap voor stap het scenario dat Jordan in Make aanmaakt:

1. **Webhook** ontvangt de aanvraag.
2. **HTTP**: verifieer Turnstile-token bij Cloudflare (`siteverify`); stop bij ongeldig.
3. **Dubbelcheck**: zoek bedrijf op KvK- of KBO-nummer in Teamleader; al een gratis set of totem ontvangen → markeer als duplicaat en stuur een vriendelijke mail (eventueel met aanbod voor extra's).
4. **Teamleader**: maak/werk bij Bedrijf + Contactpersoon, maak een **Deal** in pipeline `TODO: naam, bv. "NFC-leads"`, fase "Aangevraagd", met bron, sector, UTM's en producten in velden/notities.
5. **Bevestigingsmail** naar de aanvrager (Nederlands, huisstijl), inclusief demo-link.
6. **Interne melding** naar Jordan (mail of WhatsApp) met samenvatting + link naar de deal.
7. **Fulfilment kaarten**: rij toevoegen aan een Google Sheet "Te verzenden" (land, adres, producten, status). De kaartenset gaat altijd direct mee, los van de demo.
8. **Totem op demo**: een tweede scenario luistert naar nieuwe Teamleader-afspraken van het demo-type, matcht op e-mailadres met een open aanvraag met totem, zet de deal op fase "Demo ingepland" en voegt de totem toe aan "Te verzenden".
9. **Herinneringen**: totem gekozen maar na 2 en 5 dagen nog geen demo → herinneringsmail "Je totem ligt klaar, plan je demo in" met de bookinglink. Na 14 dagen vervalt de reservering (`TODO: Jordan bevestigt termijn`).
10. **Betaalde extra's**: Mollie-webhook → bij status `paid` de extra's toevoegen aan "Te verzenden" en een factuur maken in Teamleader.
11. **Respons** terug naar de site (`200` + `{ ok: true, checkoutUrl?: string }`), zodat de site doorgaat naar betalen, de demo-stap of `/bedankt`.

---

## 8. Opvolging richting Review Plus Online

De site ondersteunt de opvolging; de opvolging zelf draait in Make/Teamleader. Schrijf een voorstel in `docs/OPVOLGING.md` dat Jordan kan aanpassen:

- **Kaarten koppelen aan Review Plus**: iedere verstuurde set wordt geprogrammeerd met een trackbare Review Plus-link (NFC/QR-analytics per code). Zo kan Jordan later laten zien hoeveel tikken en reviews de kaarten opleverden: sterk verkoopargument.
- **Voorstel tijdlijn** (`TODO: Jordan bepaalt definitief`): dag 0 bevestiging; bij verzending "je kaarten zijn onderweg + hoe te gebruiken"; ~dag 7 na levering check-in + demo-uitnodiging ("en ontvang alsnog de gratis totem") voor wie nog geen demo heeft; ~dag 21 resultaten van de kaarten + aanbod Review Plus Online; ~dag 45 laatste herinnering.
- Teksten als templates in `docs/templates/` (e-mail en WhatsApp), Nederlands, je-vorm.

---

## 9. Advertenties, tracking & conversie

- **Sectorpagina's** (`/voor/[sector]`) als landingspagina's voor Meta- en Google-advertenties: eigen hero, sectorvoorbeelden (bv. kaartje bij de rekening in horeca, totem bij de balie van de tandarts), zelfde aanvraagflow.
- **Analytics**: privacyvriendelijk (Plausible of Umami, `TODO: keuze`), met events: `product_view`, `start_aanvraag`, `stap_2`, `stap_3`, `aanvraag_verzonden`, `totem_gekozen`, `demo_klik`, `demo_later`, `betaling_gestart`.
- **Advertentiepixels** (Meta Pixel, Google Ads-conversie): alleen laden na toestemming via een lichte, eigen **cookiebanner** (AVG-proof, weigeren even makkelijk als accepteren). Conversie-event op `/bedankt`. Pixel-ID's via env-variabelen, standaard leeg = niet laden.
- Open Graph-afbeeldingen per product en sectorpagina voor nette advertentie- en deelpreviews.

---

## 10. SEO & GEO

- Unieke title/meta per pagina, canonical (op basis van `SITE_URL` + `SHOP_BASE_PATH`), Open Graph/Twitter, `sitemap.xml`, `robots.txt` (AI-crawlers toegestaan: GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended).
- JSON-LD: `Organization` (identiek aan hoofdsite), `Product` + `Offer` (ook bij prijs 0, `priceCurrency: EUR`, `availability`), `FAQPage`, `BreadcrumbList`.
- `/llms.txt` met korte, feitelijke beschrijving van het aanbod, de voorwaarden en links.
- Antwoord-eerst-teksten: elke pagina start met 40–60 woorden die uitleggen wat het is, voor wie, en wat het kost.
- Lighthouse mobiel ≥ 95 op alle vier de categorieën; LCP < 2,0 s, CLS < 0,05.

---

## 11. Juridisch (templates, laat Jordan laten checken)

- `/actievoorwaarden`: alleen voor bedrijven met een KvK-nummer (NL) of KBO-nummer (BE); 1 gratis kaartenset en 1 gratis totem per bedrijf; de totem is gratis bij het inplannen van een demo en wordt verzonden nadat de demo is ingepland; gratis verzending; levergebied Nederland en België; zolang de voorraad strekt; Review Plus mag aanvragen weigeren; geen verplichting tot een abonnement. `TODO: Jordan bepaalt wat er gebeurt bij een no-show op de demo.`
- Privacy: vermeld doel (verzending + commerciële opvolging), bewaartermijn, verwerkers (Make, Teamleader, Cloudflare, analytics). Link naar bestaande privacyverklaring op de hoofdsite en markeer benodigde aanvullingen als `TODO:`.
- Duidelijk vermelden: `TODO: laat actievoorwaarden en privacytekst controleren door een jurist.`

---

## 12. Techniek & repo

- **Stack**: Astro (static) + TypeScript + Tailwind CSS; kleine islands in vanilla TS of Preact. Geen zware frameworks.
- **Config** in `src/config/site.ts`: `SITE_URL`, `SHOP_BASE_PATH`, demo-link, login-link, social links, `DEMO_BOOKING_URL`, `COUNTRIES = ['NL', 'BE']`, feature flags. Geen verzendkosten-logica bouwen. Mollie-sleutels staan alleen in Make, nooit in de site. Env-variabelen: `PUBLIC_LEAD_WEBHOOK_URL`, `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_ANALYTICS_*`, `PUBLIC_META_PIXEL_ID`, `PUBLIC_GADS_ID`, met `.env.example`.
- **Toekomstbestendig**: structureer het project zo dat de volledige site (en later View Plus, Website Plus en Tab Plus binnen AIO PLUS) in dezelfde repo kan landen: shop-pagina's onder een eigen map, gedeelde layout/header/footer als losse componenten, merkgegevens in één brand-config.
- **Deploy**: `.github/workflows/deploy.yml` (Node LTS, `actions/configure-pages`, `upload-pages-artifact`, `deploy-pages`) op push naar `main`, met GitHub Secrets/Variables voor de env-variabelen.
- **CI**: typecheck, lint, build, linkcheck en Lighthouse CI (faalt onder de drempels).
- **Toegankelijkheid**: WCAG 2.2 AA, toetsenbordbediening, zichtbare focus, labels bij alle velden, foutmeldingen gekoppeld via `aria-describedby`.

---

## 13. Uitvoering in fases

| Fase | Inhoud | Klaar als… |
|---|---|---|
| 1 | Scaffold, config, design tokens uit huidige site, header/footer | Build slaagt, header/footer lijken visueel op reviewplus.io |
| 2 | Productcatalogus + shop-home + productpagina's | Producten uit content worden correct getoond |
| 3 | Winkelwagen + aanvraagflow + validatie + anti-spam | Testaanvraag komt als correcte JSON binnen op een test-webhook |
| 4 | Demo-stap, Mollie-doorstuur voor extra's, bedankt-pagina, sectorpagina's | Drie flows werken op mobiel: alleen gratis, gratis + demo, gratis + extra's |
| 5 | Tracking, cookiebanner, SEO/GEO, schema, llms.txt | Schema valideert, pixels laden pas na toestemming |
| 6 | CI/CD, GitHub Pages, docs (`DOMEIN.md`, `MAKE-SCENARIO.md`, `LEAD-PAYLOAD.md`, `OPVOLGING.md`, `README.md`) | Deploy slaagt, Lighthouse ≥ 95 |

Na elke fase: build, lint en typecheck draaien en alle fouten oplossen. Sluit af met de Lighthouse-scores en een checklist van handmatige taken.

---

## 14. Handmatige taken voor Jordan (niet door Claude Code)

- [ ] GitHub-repo aanmaken en Pages activeren
- [ ] DNS: CNAME `shop` → `<github-gebruiker>.github.io`; in GitHub Pages "Enforce HTTPS" aan
- [ ] In Framer: redirect `/shop` → `https://shop.reviewplus.io` en een `Shop`-link in de navigatie
- [ ] Make.com-scenario bouwen volgens `docs/MAKE-SCENARIO.md`; webhook-URL in GitHub Variables zetten
- [ ] Teamleader-pipeline en eventuele extra velden aanmaken
- [ ] Cloudflare Turnstile-sitekey aanmaken
- [ ] Beslissen: prijzen incl./excl. btw, reserveringstermijn totem, beleid bij no-show
- [ ] Mollie-account (iDEAL + Bancontact) koppelen aan Make voor betaalde extra's
- [ ] In Teamleader Bookings controleren dat het demo-type herkenbaar is voor het totem-scenario
- [ ] Logo's, productmockups en echte klantlogo's/reviews (met toestemming) aanleveren
- [ ] Actievoorwaarden en privacytekst laten controleren door een jurist
