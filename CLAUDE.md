# reviewplus-shop

Lead-shop, live op https://shop.reviewplus.io. **Een push naar `main` staat direct live**, dus draai eerst `npm run check`. Het algemene overzicht staat in `../CLAUDE.md` en de werking in `README.md`.

## Waar staat wat

- **Producten, prijzen en specs**: `src/content/products/*.md`. Hieruit wordt `/products.json` gemaakt; Make rekent daarmee de bedragen uit.
- **Sectorpagina's**: `src/content/sectors/*.md`.
- **Instellingen**:
  - `src/config/site.ts`: landen, `PRICE_NOTE`, `TOTEM_RESERVATION_DAYS`;
  - `src/config/brand.ts`: menu, footer, demo-link;
  - `src/config/shop-content.ts`: FAQ en social proof.
- **Aanvraagflow (3 stappen)**: `src/pages/aanvragen.astro` en `src/lib/client/flow.ts`. Validatie staat in `src/lib/validation.ts`; het aanvullen van NL-adressen gaat via PDOK.
- **Make**:
  - `docs/MAKE-SCENARIO.md`: alle routes, de datastore en de Teamleader-velden, ook voor de formulieren van de hoofdsite;
  - `docs/LEAD-PAYLOAD.md`: het payloadcontract.
  - Werk deze documenten bij als je Make wijzigt.
- **Live reviewteller (pre-order, € 499 / € 699 excl. btw)**: `src/content/tellers/`, `src/lib/reviewplatformen.ts`, componenten `Teller*`, `EigenScore`, `PreorderForm`; Make-route 5e (Mollie). Zie `docs/REVIEWTELLER.md`. Aparte collectie, zodat de gratis aanvraagflow, `products` in /products.json en Make ongemoeid blijven.
- **Opvolgmails**: `docs/OPVOLGING.md` en `docs/templates/`.
- **Lokaal testen zonder Make**: `npm run mock-webhook`.
