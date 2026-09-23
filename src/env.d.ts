/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_URL: string;
  readonly SHOP_BASE_PATH: string;
  readonly PUBLIC_LEAD_PROVIDER?: string;
  readonly PUBLIC_LEAD_WEBHOOK_URL?: string;
  readonly PUBLIC_WEB3FORMS_ACCESS_KEY?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_STOCK_URL?: string;
  readonly PUBLIC_ANALYTICS_PROVIDER?: string;
  readonly PUBLIC_ANALYTICS_DOMAIN?: string;
  readonly PUBLIC_ANALYTICS_SCRIPT_URL?: string;
  readonly PUBLIC_UMAMI_WEBSITE_ID?: string;
  readonly PUBLIC_META_PIXEL_ID?: string;
  readonly PUBLIC_GADS_ID?: string;
  readonly PUBLIC_GADS_CONVERSION_LABEL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
