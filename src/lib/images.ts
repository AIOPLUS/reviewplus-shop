import type { ImageMetadata } from 'astro';
import sharp from 'sharp';
import { join } from 'node:path';

/** Alle productfoto's uit src/assets/products (bij het builden geoptimaliseerd naar AVIF/WebP). */
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/products/*.{png,jpg,jpeg,webp,avif}', { eager: true });

export function productImage(name: string | undefined): ImageMetadata | undefined {
  if (!name) return undefined;
  return Object.entries(files).find(([p]) => p.endsWith(`/${name}`))?.[1]?.default;
}

const edgeCache = new Map<string, string>();

/**
 * Gemiddelde randkleur van een foto, zodat we hem met object-contain kunnen tonen zonder zichtbare balken.
 * Werkt op het bronbestand, alleen tijdens het builden.
 */
export async function edgeColor(name: string): Promise<string> {
  if (edgeCache.has(name)) return edgeCache.get(name)!;
  let hex = '#f4f5f7';
  try {
    const img = sharp(join(process.cwd(), 'src/assets/products', name)).removeAlpha();
    const { width = 1, height = 1 } = await img.metadata();
    // Alleen de bovenhoeken: onderaan/opzij raken producten (bv. blauwe kaarten) vaak de rand.
    const s = Math.max(4, Math.round(Math.min(width, height) * 0.04));
    const regions = [
      { left: 0, top: 0, width: s, height: s },
      { left: width - s, top: 0, width: s, height: s },
    ];
    // Let op: sharp.stats() negeert extract(), dus we middelen de ruwe pixels van elke hoek zelf.
    const sums = [0, 0, 0];
    for (const r of regions) {
      const { data } = await sharp(join(process.cwd(), 'src/assets/products', name)).removeAlpha().extract(r).raw().toBuffer({ resolveWithObject: true });
      const n = data.length / 3;
      for (let i = 0; i < data.length; i += 3) for (let c = 0; c < 3; c++) sums[c]! += data[i + c]! / n / regions.length;
    }
    hex = `#${sums.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  } catch {
    /* fallback-kleur */
  }
  edgeCache.set(name, hex);
  return hex;
}
