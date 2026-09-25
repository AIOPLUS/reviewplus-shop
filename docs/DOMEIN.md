# Domein & hosting

De shop draait op **https://shop.reviewplus.io** (GitHub Pages, `public/CNAME`, DNS `CNAME shop` bij GoDaddy). De hoofdsite **www.reviewplus.io** is een aparte repo (`AIOPLUS/reviewplus-site`) en staat sinds 25-09-2026 ook op GitHub Pages; Framer is niet meer in gebruik.

Alle URL's (links, canonicals, sitemap, robots, schema, OG, `llms.txt`, `products.json`, Mollie-returns) komen uit twee variabelen in GitHub → Settings → Secrets and variables → Actions → **Variables** (lokaal in `.env`). Gebruik in code altijd `url()` / `absoluteUrl()` uit `src/lib/url.ts`, nooit hardcoded paden.

| Variabele | Nu |
|---|---|
| `SITE_URL` | `https://shop.reviewplus.io` |
| `SHOP_BASE_PATH` | `/` |

## Optie voor later: shop onder www.reviewplus.io/shop

Niet gepland. De code kan het al: met `SITE_URL=https://www.reviewplus.io` en `SHOP_BASE_PATH=/shop` levert de build overal `/shop/...`-URL's op (CI bouwt die variant bij elke push als controle). Wat er dan nog moet gebeuren:

1. **Publiceren**: de shop-build in de deploy van reviewplus-site opnemen onder `dist/shop`, of de shoppagina's naar die repo verhuizen.
2. **Oude adressen**: 301-redirects van `shop.reviewplus.io/*` naar `www.reviewplus.io/shop/*`. Het netst gaat dat met een Cloudflare Redirect Rule. Zonder Cloudflare kan het met redirect-pagina's (canonical + meta refresh).
3. **robots.txt van de hoofdsite**: de shopregels en de shop-sitemap toevoegen.
4. **Make**: de URL van `products.json` en de Mollie-`cancelUrl` bijwerken.
5. **Turnstile**: de hostnames controleren.
6. **Google Search Console**: een adreswijziging indienen.
