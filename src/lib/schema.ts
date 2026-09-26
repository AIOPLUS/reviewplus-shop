import { brand } from '@/config/brand';
import { absoluteUrl } from './url';
import type { Product, Teller } from './catalog';

type Json = Record<string, unknown>;

export function organizationSchema(): Json {
  const sameAs = Object.values(brand.social).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${brand.mainSiteUrl}/#organization`,
    name: brand.name,
    url: brand.mainSiteUrl,
    logo: absoluteUrl(brand.logo),
    email: brand.email,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function faqSchema(faq: { vraag: string; antwoord: string }[]): Json | null {
  if (!faq.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.vraag,
      acceptedAnswer: { '@type': 'Answer', text: f.antwoord },
    })),
  };
}

const availability: Record<Product['status'], string> = {
  beschikbaar: 'https://schema.org/InStock',
  binnenkort: 'https://schema.org/PreOrder',
  uitverkocht: 'https://schema.org/OutOfStock',
};

export function productSchema(p: Product, imageUrl: string): Json {
  const pageUrl = absoluteUrl(`/${p.slug}`);
  const shipping = {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'EUR' },
    shippingDestination: [
      { '@type': 'DefinedRegion', addressCountry: 'NL' },
      { '@type': 'DefinedRegion', addressCountry: 'BE' },
    ],
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${brand.name} ${p.naam}`,
    description: p.korteOmschrijving,
    sku: p.slug,
    image: imageUrl,
    url: pageUrl,
    brand: { '@type': 'Brand', name: brand.name },
    offers: [
      {
        '@type': 'Offer',
        url: pageUrl,
        price: p.prijs.toFixed(2),
        priceCurrency: 'EUR',
        availability: availability[p.status],
        eligibleRegion: ['NL', 'BE'],
        businessFunction: 'http://purl.org/goodrelations/v1#Sell',
        seller: { '@id': `${brand.mainSiteUrl}/#organization` },
        shippingDetails: shipping,
      },
    ],
  };
}

/**
 * Product op offerte (live reviewteller). Zonder bekende prijs geen Offer: we geven geen prijs op die niet klopt.
 */
export function tellerSchema(t: Teller, path: string, imageUrl: string, naam = t.naam): Json {
  const pageUrl = absoluteUrl(path);
  const prijzen = t.varianten.filter((v) => v.prijs !== null);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${brand.name} ${naam}`,
    description: t.kort,
    sku: t.slug,
    image: imageUrl,
    url: pageUrl,
    brand: { '@type': 'Brand', name: brand.name },
    ...(prijzen.length
      ? {
          offers: prijzen.map((v) => ({
            '@type': 'Offer',
            url: pageUrl,
            name: v.label,
            price: v.prijs!.toFixed(2),
            priceCurrency: 'EUR',
            eligibleRegion: ['NL', 'BE'],
            seller: { '@id': `${brand.mainSiteUrl}/#organization` },
          })),
        }
      : {}),
  };
}
