import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { PLATFORMEN } from './lib/reviewplatformen';

const faq = z.array(z.object({ vraag: z.string(), antwoord: z.string() })).default([]);

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    slug: z.string(),
    naam: z.string(),
    korteOmschrijving: z.string(),
    /** 40–60 woorden antwoord-eerst tekst bovenaan de productpagina. */
    samenvatting: z.string(),
    type: z.enum(['kaartenset', 'totem', 'losse-kaart', 'bundel']),
    /** Prijs van het gratis aanbod (0 = gratis). */
    prijs: z.number().min(0),
    /** Reguliere waarde, doorgestreept getoond bij gratis producten. */
    normalePrijs: z.number().min(0),
    gratisVoorwaarde: z.enum(['altijd', 'bij-demo']).nullable(),
    /** Aantal stuks dat gratis is binnen de actie. */
    gratisAantal: z.number().int().min(0).default(1),
    maxPerBedrijf: z.number().int().min(0),
    /** Prijs per extra stuk boven het gratis aantal (afgerekend via Mollie). */
    prijsExtra: z.number().min(0),
    /** Eenheid van een extra (bv. "kaart" bij de kaartenset). */
    extraEenheid: z.string(),
    maxExtra: z.number().int().min(0).default(50),
    platformen: z.array(z.string()),
    specs: z.object({
      afmeting: z.string(),
      materiaal: z.string(),
      nfcChip: z.string(),
      qr: z.boolean(),
      inhoud: z.string().optional(),
    }),
    voordelen: z.array(z.string()),
    afbeeldingen: z.array(z.string()).default([]),
    /** Beschrijving per afbeelding (alt-tekst), zelfde volgorde als afbeeldingen. */
    afbeeldingAlts: z.array(z.string()).default([]),
    status: z.enum(['beschikbaar', 'binnenkort', 'uitverkocht']),
    volgorde: z.number().default(0),
    faq,
  }),
});

/**
 * Producten op offerte (zoals de live reviewteller). Apart van `products`, omdat de aanvraagflow, de gratis actie,
 * /products.json (sleutel `products`) en Make (route 1 rekent met prijsExtra van nfc-kaartenset en nfc-totem) alleen
 * met die gratis leadproducten werken. Prijzen excl. btw per variant; `null` = "Prijs volgt" (offerte aanvragen).
 * Zie docs/REVIEWTELLER.md.
 */
const tellers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tellers' }),
  schema: z.object({
    slug: z.string(),
    naam: z.string(),
    /** Eén zin voor de productkaart. */
    kort: z.string(),
    /** 40–60 woorden, antwoord-eerst, bovenaan de productpagina. */
    samenvatting: z.string(),
    varianten: z
      .array(z.object({ id: z.enum(['5-cijfers', '7-cijfers']), label: z.string(), omschrijving: z.string(), prijs: z.number().min(0).nullable() }))
      .min(1),
    specs: z.array(z.object({ label: z.string(), waarde: z.string() })).default([]),
    voordelen: z.array(z.string()),
    inDeDoos: z.array(z.string()).default([]),
    status: z.enum(['beschikbaar', 'binnenkort', 'op-aanvraag']),
    volgorde: z.number().default(0),
    faq,
  }),
});

const sectors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sectors' }),
  schema: z.object({
    slug: z.string(),
    naam: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    heroTitel: z.string(),
    heroTekst: z.string(),
    samenvatting: z.string(),
    voorbeelden: z.array(z.object({ titel: z.string(), tekst: z.string(), product: z.enum(['kaartenset', 'totem']) })),
    /** Voorbeelden met de live reviewteller: welk platform past bij deze branche, en waarom. */
    reviewteller: z.array(z.object({ platform: z.enum(PLATFORMEN), tekst: z.string() })).default([]),
    faq,
  }),
});

export const collections = { products, tellers, sectors };
