# Opvolging richting Review Plus Online (voorstel)

> Dit is een voorstel. `TODO: Jordan bepaalt de definitieve tijdlijn en teksten.`
> De opvolging draait in Make/Teamleader; de site levert de data (zie LEAD-PAYLOAD.md).

## Doel

Van gratis kaartenset naar een Review Plus Online-abonnement. De kaarten zijn de eerste stap, de demo (met de totem als trigger) de tweede, het bewijs van resultaat de derde.

## Kaarten koppelen aan Review Plus

- Programmeer iedere set met een **trackbare Review Plus-link** per kaart/totem (bv. `https://go.reviewplus.io/<code>`, TODO: juiste short-link-structuur), die doorverwijst naar de reviewpagina van de klant (Google Bedrijfsprofiel uit de aanvraag).
- NFC en QR op dezelfde kaart krijgen een eigen parameter (`?m=nfc` / `?m=qr`), zodat je ziet hoe er getikt/gescand wordt.
- Leg de codes vast in de rij "Te verzenden" en op de Teamleader-deal (veld `NFC-codes`).
- Zo kun je na 2–3 weken laten zien: *"Je kaarten zijn {{tikken}}× getikt, dat leverde {{nieuwe_reviews}} nieuwe Google-reviews op."* (met de echte cijfers per klant) Sterk verkoopargument voor Review Plus Online (automatisch verzamelen, AI-antwoorden, dashboard).
- Aantal nieuwe reviews: vergelijk het Google-reviewaantal bij aanvraag (`vragen.aantal_google_reviews` + actueel aantal via de Google Places API of handmatig) met dat na X dagen.

## Voorgestelde tijdlijn

| Moment | Voor wie | Kanaal | Doel | Template |
|---|---|---|---|---|
| Dag 0 (direct) | Iedereen | E-mail | Bevestiging aanvraag + (evt.) demo-link | `email-bevestiging.md` |
| Dag 2 en 5 | Totem gekozen, geen demo | E-mail | "Je totem ligt klaar" | `email-herinnering-totem.md` |
| Bij verzending | Iedereen | E-mail (+ WhatsApp) | "Je kaarten zijn onderweg" + gebruikstips | `email-verzonden.md`, `whatsapp-verzonden.md` |
| ~7 dagen na levering | Nog geen demo | E-mail + WhatsApp | Check-in, demo-uitnodiging "en ontvang alsnog de gratis totem" | `email-checkin-dag7.md`, `whatsapp-checkin-dag7.md` |
| ~21 dagen na levering | Iedereen zonder abonnement | E-mail | Resultaten van de kaarten + aanbod Review Plus Online | `email-resultaten-dag21.md` |
| ~45 dagen na levering | Nog geen abonnement | E-mail | Laatste herinnering, daarna naar nieuwsbrief | `email-laatste-dag45.md` |

Stopregels:
- Heeft iemand een demo geboekt, dan stoppen de demo-herinneringen (scenario D zet `demo_ingepland`).
- Klant geworden (deal fase *Klant*)? Stop de hele reeks.
- Afmelden altijd mogelijk (link onderaan elke mail); bij afmelding de tag `geen-opvolging` in Teamleader.
- WhatsApp alleen als het telefoonnummer mobiel is (`+316…` / `+324…`) en binnen kantoortijden.

## Juridisch

Commerciële opvolging is gebaseerd op het verplichte akkoord in de aanvraag ("Ik ga akkoord dat Review Plus contact met mij opneemt over mijn aanvraag en Review Plus Online"). Bewaar dat akkoord met datum en `tekst_versie`. De nieuwsbrief is een aparte, optionele toestemming. `TODO: jurist laten toetsen (AVG, Telecommunicatiewet/ePrivacy voor WhatsApp en e-mail in NL én BE).`

## Templates

Alle teksten staan in [`templates/`](templates/). Variabelen tussen `{{ }}` komen uit de data store/Teamleader. De demo-link is altijd `https://cloud.teamleader.eu/review-plus/bookings/u/review1/t/demonstratie-met-review-plus-2/`.
