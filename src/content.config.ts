import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

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
    /** Kan in eigen huisstijl (logo, kleuren, tekst) worden gemaakt. */
    aanpasbaar: z.boolean().default(false),
    status: z.enum(['beschikbaar', 'binnenkort', 'uitverkocht']),
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
    faq,
  }),
});

export const collections = { products, sectors };
