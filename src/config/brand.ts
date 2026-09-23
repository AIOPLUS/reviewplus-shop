/**
 * Merkgegevens van Review Plus. Eén bron voor header, footer, schema en e-mails.
 * Later kunnen View Plus, Website Plus en Tab Plus (AIO PLUS) hier een eigen entry krijgen.
 */
export const brand = {
  name: 'Review Plus',
  legalName: 'Review Plus', // TODO: Jordan vult de juridische naam (zoals in KvK) in.
  mainSiteUrl: 'https://www.reviewplus.io',
  appLoginUrl: 'https://app.reviewplus.io/login',
  demoBookingUrl:
    'https://cloud.teamleader.eu/review-plus/bookings/u/review1/t/demonstratie-met-review-plus-2/',
  email: 'support@reviewplus.io',
  /** Rasterlogo voor schema.org/Google (min. 112px). Icoon zelf: components/layout/Logo.astro */
  logo: '/assets/brand/logo-512.png',
  // TODO: Jordan vult de echte profielen in (de huidige site linkt naar algemene placeholders).
  social: {
    linkedin: '',
    instagram: '',
    facebook: '',
  },
  tagline: 'Maak het jezelf makkelijker.',
} as const;

/** Navigatie gelijk aan www.reviewplus.io. Framer-pagina's zijn absolute URLs. */
export const mainNav = [
  { label: 'Home', href: `${brand.mainSiteUrl}/` },
  { label: 'Het product', href: `${brand.mainSiteUrl}/features` },
  { label: 'Over ons', href: `${brand.mainSiteUrl}/about` },
  { label: 'Kennisbank', href: `${brand.mainSiteUrl}/articles` },
] as const;

export const footerNav = [
  {
    title: 'Bedrijf',
    links: [
      { label: 'Home', href: `${brand.mainSiteUrl}/` },
      { label: 'Over ons', href: `${brand.mainSiteUrl}/about` },
      { label: 'Contact', href: `${brand.mainSiteUrl}/contact` },
      { label: 'Kennisbank', href: `${brand.mainSiteUrl}/articles` },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'Functies', href: `${brand.mainSiteUrl}/features` },
      { label: 'Integraties', href: `${brand.mainSiteUrl}/integration` },
      { label: 'Changelog', href: `${brand.mainSiteUrl}/changelog` },
      { label: 'Shop', href: '/' , internal: true },
    ],
  },
  {
    title: 'Wettelijk',
    links: [
      { label: 'Algemene voorwaarden', href: `${brand.mainSiteUrl}/term-and-conditions` },
      { label: 'Privacyverklaring', href: `${brand.mainSiteUrl}/privacy-policy` },
      { label: 'Actievoorwaarden', href: '/actievoorwaarden', internal: true },
    ],
  },
] as const;
