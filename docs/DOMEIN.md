# Domein & hosting

Een domein kan maar naar één host wijzen. `www.reviewplus.io` draait op Framer, dus de shop start op een subdomein.

Alle URL's (links, canonicals, sitemap, robots, schema, OG, `llms.txt`, `products.json`, Mollie-returns) worden gegenereerd uit twee variabelen:

| Variabele | Fase 1 | Fase 2 |
|---|---|---|
| `SITE_URL` | `https://shop.reviewplus.io` | `https://www.reviewplus.io` |
| `SHOP_BASE_PATH` | `/` | `/shop` |

Ze staan in GitHub → Settings → Secrets and variables → Actions → **Variables** (en lokaal in `.env`). Geen hardcoded paden in de code: gebruik altijd `url()` / `absoluteUrl()` uit `src/lib/url.ts`.

## Fase 1 (nu): `shop.reviewplus.io`

1. GitHub-repo → Settings → Pages → Source: **GitHub Actions**.
2. DNS bij je domeinbeheerder: `CNAME shop → <github-gebruiker>.github.io` (bij een organisatie: `<org>.github.io`).
3. Settings → Pages → Custom domain: `shop.reviewplus.io` (staat ook in `public/CNAME`) → wacht op het certificaat → **Enforce HTTPS** aan.
4. Framer → Site settings → Redirects: `/shop` → `https://shop.reviewplus.io` (301). Voeg `/shop/*` → `https://shop.reviewplus.io/:path` toe als Framer wildcards ondersteunt.
5. Framer-navigatie: menu-item **Shop** → `https://shop.reviewplus.io`.
6. Optioneel: domein verifiëren in GitHub (Settings → Pages → Verified domains) tegen domain takeover.

Canonicals wijzen in deze fase naar `shop.reviewplus.io`.

## Fase 2 (later): hele site op GitHub, shop onder `/shop`

Als de hele site van Framer naar deze repo verhuist:

1. Zet de variabelen op `SITE_URL=https://www.reviewplus.io` en `SHOP_BASE_PATH=/shop`. Getest: `npm run build` met deze waarden levert overal `https://www.reviewplus.io/shop/...` op (CI bouwt deze variant ook bij elke push als controle).
2. Twee opties voor de repo-structuur:
   - **A (eenvoudig):** de hoofdsite als apart Astro-project, en de shop-build onder `/shop` publiceren (bv. de `dist/` van de shop kopiëren naar `dist/shop` in de deploy-workflow).
   - **B (één project, aanbevolen op termijn):** verplaats `src/pages/*` naar `src/pages/shop/*`, zet `SHOP_BASE_PATH=/shop` en Astro's `base` op `/`, en zet de hoofdsite-pagina's in `src/pages/`. Header, footer en `brand.ts` zijn al losse, gedeelde onderdelen. De `url()`-helper moet dan `/shop` zelf toevoegen (dat doet hij al op basis van `SHOP_BASE_PATH`); pas alleen `base` in `astro.config.mjs` aan.
3. `public/CNAME` → `www.reviewplus.io`, DNS `www` naar GitHub Pages.
4. **Redirects van het subdomein**: laat `shop.reviewplus.io` naar een aparte kleine GitHub Pages-repo (of Cloudflare Redirect Rule) wijzen met per URL een 301 naar `https://www.reviewplus.io/shop/<pad>`. GitHub Pages kan geen echte 301 geven; met Cloudflare (Bulk/Single Redirect Rule `shop.reviewplus.io/*` → `https://www.reviewplus.io/shop/${1}`, 301) gaat dat wel en is het het netst. Zonder Cloudflare: HTML-pagina's met `<link rel="canonical">` naar de nieuwe URL + `<meta http-equiv="refresh" content="0; url=...">`.
5. `robots.txt` in fase 2: de robots.txt van de hoofdsite is leidend (crawlers lezen alleen `/robots.txt`). Neem daar de regels uit `dist/shop/robots.txt` over, inclusief `Sitemap: https://www.reviewplus.io/shop/sitemap-index.xml`.
6. Werk in Make de URL naar `products.json` en de `Access-Control-Allow-Origin` bij.
7. Google Search Console: adreswijziging aanvragen voor het subdomein.

## Alternatief (optioneel, niet gebouwd): Cloudflare Worker als reverse proxy

Wil je `www.reviewplus.io/shop` al gebruiken terwijl de rest nog op Framer staat, dan kan dat met een Cloudflare Worker voor `www.reviewplus.io`:

```js
export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/shop' || url.pathname.startsWith('/shop/')) {
      url.hostname = '<github-gebruiker>.github.io'; // of het shop-subdomein
      return fetch(new Request(url, req));
    }
    return fetch(req); // naar Framer
  },
};
```

Kanttekeningen:
- Het domein moet dan via Cloudflare lopen (nameservers naar Cloudflare, proxy aan).
- **Framer achter een proxy** vraagt extra configuratie: Framer verwacht het custom domain rechtstreeks; met Cloudflare-proxy moet je SSL op *Full (strict)* zetten en kunnen Framer's domeinverificatie en certificaatvernieuwing haperen. Test dit eerst op een testdomein.
- De shop-build moet dan al `SHOP_BASE_PATH=/shop` en `SITE_URL=https://www.reviewplus.io` gebruiken.
- Extra bewegend onderdeel om te beheren; daarom niet standaard gebouwd.
