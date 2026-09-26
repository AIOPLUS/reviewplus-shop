import { getCollection, type CollectionEntry } from 'astro:content';

export type Product = CollectionEntry<'products'>['data'];
export type Sector = CollectionEntry<'sectors'>['data'];

export async function getProducts(): Promise<Product[]> {
  const entries = await getCollection('products');
  return entries.map((e) => e.data).sort((a, b) => a.volgorde - b.volgorde);
}

export async function getSectors(): Promise<Sector[]> {
  const entries = await getCollection('sectors');
  return entries.map((e) => e.data);
}

/** Publieke catalogus: gebruikt door /products.json (Make herberekent bedragen hieruit) en de aanvraagflow. */
export interface PublicProduct {
  slug: string;
  naam: string;
  type: Product['type'];
  prijs: number;
  normalePrijs: number;
  gratisVoorwaarde: Product['gratisVoorwaarde'];
  gratisAantal: number;
  maxPerBedrijf: number;
  prijsExtra: number;
  extraEenheid: string;
  maxExtra: number;
  status: Product['status'];
}

export function toPublic(p: Product): PublicProduct {
  return {
    slug: p.slug,
    naam: p.naam,
    type: p.type,
    prijs: p.prijs,
    normalePrijs: p.normalePrijs,
    gratisVoorwaarde: p.gratisVoorwaarde,
    gratisAantal: p.gratisAantal,
    maxPerBedrijf: p.maxPerBedrijf,
    prijsExtra: p.prijsExtra,
    extraEenheid: p.extraEenheid,
    maxExtra: p.maxExtra,
    status: p.status,
  };
}

/** Specs zonder TODO-waarden (die tonen we niet op de site). */
export function visibleSpecs(p: Product): { label: string; value: string }[] {
  const rows = [
    { label: 'Inhoud', value: p.specs.inhoud ?? '' },
    { label: 'Afmeting', value: p.specs.afmeting },
    { label: 'Materiaal', value: p.specs.materiaal },
    { label: 'NFC-chip', value: p.specs.nfcChip },
    { label: 'QR-code', value: p.specs.qr ? 'Ja, voor telefoons zonder NFC' : 'Nee' },
    { label: 'Werkt met', value: p.platformen.join(', ') },
  ];
  return rows.filter((r) => r.value && !/^TODO/i.test(r.value));
}

// ── Producten op offerte (live reviewteller) ─────────────────────────────────────────────────────
export type Teller = CollectionEntry<'tellers'>['data'];

export async function getTellers(): Promise<Teller[]> {
  return (await getCollection('tellers')).map((e) => e.data).sort((a, b) => a.volgorde - b.volgorde);
}

/** "vanaf € 399" als er prijzen zijn, anders "Prijs volgt". Prijzen excl. btw. */
export function tellerPrijsLabel(t: Teller): string {
  const prijzen = t.varianten.map((v) => v.prijs).filter((x): x is number => x !== null);
  if (!prijzen.length) return 'Prijs volgt';
  const min = Math.min(...prijzen);
  return `${new Set(prijzen).size > 1 ? 'vanaf ' : ''}€ ${min.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Offerteproducten voor /products.json, onder een eigen sleutel (Make leest alleen `products`). */
export function tellerPubliek(t: Teller) {
  return {
    slug: t.slug,
    naam: t.naam,
    status: t.status,
    bestellen: 'offerte',
    varianten: t.varianten.map((v) => ({ id: v.id, label: v.label, prijs: v.prijs })),
  };
}
