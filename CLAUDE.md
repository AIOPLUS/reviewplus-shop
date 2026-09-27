# reviewplus-shop

Lead-shop van Review Plus, live op https://shop.reviewplus.io. De centrale instructies (bedrijf, labels, tools, werkafspraken) staan in de hub `AIOPLUS/claude`: lokaal `../CLAUDE.md`; in een cloud-chat haalt de SessionStart-hook ze op. Dit bestand bevat alleen wat specifiek is voor deze repo; de werking staat in `README.md`.

**Main staat direct live.** Werk op een branch, draai `npm run check`, open een PR en merge pas na een groene check en Jordans akkoord.

## Waar staat wat

- **Producten, prijzen en specs**: `src/content/products/*.md`. Hieruit wordt `/products.json` gemaakt; Make rekent daarmee de bedragen uit.
- **Sectorpagina's**: `src/content/sectors/*.md`.
- **Instellingen**:
  - `src/config/site.ts`: landen, `PRICE_NOTE`, `TOTEM_RESERVATION_DAYS`;
  - `src/config/brand.ts`: menu, footer, demo-link;
  - `src/config/shop-content.ts`: FAQ en social proof.
- **Aanvraagflow (3 stappen)**: `src/pages/aanvragen.astro` en `src/lib/client/flow.ts`. Validatie staat in `src/lib/validation.ts`; het aanvullen van NL-adressen gaat via PDOK.
- **Make**:
  - `docs/LEAD-PAYLOAD.md`: het payloadcontract van alle formulieren (ook van de hoofdsite en View Plus). Werk het bij als je een payload wijzigt.
  - De inrichting van Make (routes, datastore, Teamleader-velden) staat in de hub: `docs/make/MAKE-SCENARIO.md`. Wijzigingen in Make doet de chat "AIO Plus - Make".
- **Live reviewteller (pre-order, € 499 / € 699 excl. btw)**: `src/content/tellers/`, `src/lib/reviewplatformen.ts`, componenten `Teller*`, `EigenScore`, `PreorderForm`; Make-route 5e (Mollie). Zie `docs/REVIEWTELLER.md`. Aparte collectie, zodat de gratis aanvraagflow, `products` in /products.json en Make ongemoeid blijven.
- **Opvolgmails**: `docs/OPVOLGING.md` en `docs/templates/`.
- **Lokaal testen zonder Make**: `npm run mock-webhook`.
- **CI**: `.github/workflows/ci.yml` (check + Lighthouse, mobiel). Toegankelijkheid, best practices en SEO moeten ≥ 0,95 halen; de snelheidsscore is een waarschuwing, omdat die op GitHub te veel wisselt.
