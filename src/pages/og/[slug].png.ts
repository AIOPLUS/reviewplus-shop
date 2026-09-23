import type { APIRoute, GetStaticPaths } from 'astro';
import sharp, { type OverlayOptions } from 'sharp';
import { join } from 'node:path';
import { getProducts, getSectors } from '@/lib/catalog';
import { formatPrice } from '@/lib/format';

/** Open Graph-afbeeldingen (1200×630) per product en sectorpagina, bij het builden gegenereerd met de productfoto. */
type Og = {
  title: string;
  sub: string;
  badge: string;
  image: string;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const [products, sectors] = await Promise.all([getProducts(), getSectors()]);
  const set = products.find((p) => p.type === 'kaartenset');
  const setImage = set?.afbeeldingen[0] ?? '';
  const paths: { params: { slug: string }; props: Og }[] = [
    { params: { slug: 'shop' }, props: { title: 'Gratis NFC-reviewkaarten voor jouw bedrijf', sub: 'Gratis verzonden in Nederland en België', badge: 'Review Plus Shop', image: setImage } },
  ];
  for (const p of products) {
    paths.push({
      params: { slug: p.slug },
      props: {
        title: p.naam,
        sub: `t.w.v. ${formatPrice(p.normalePrijs)}, ${p.gratisVoorwaarde === 'bij-demo' ? 'nu gratis bij je demo' : 'nu gratis'}`,
        badge: 'Gratis',
        image: p.afbeeldingen[0] ?? '',
      },
    });
  }
  for (const s of sectors) {
    paths.push({ params: { slug: `voor-${s.slug}` }, props: { title: s.heroTitel, sub: 'Gratis NFC-reviewkaarten · NL & BE', badge: s.naam, image: setImage } });
  }
  return paths;
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max && line) {
      lines.push(line);
      line = w;
    } else line = `${line} ${w}`.trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

const LOGO = '<path d="M0 0H386V410A386 410 0 0 1 0 0Z"/><rect x="520" width="386" height="410"/><path d="M386 548V958H0A386 410 0 0 1 386 548Z"/><rect x="520" y="548" width="386" height="410"/>';
const PHOTO = { x: 700, y: 60, w: 440, h: 510, r: 32 };

export const GET: APIRoute = async ({ props }) => {
  const { title, sub, badge, image } = props as Og;
  const lines = wrap(title, 17);
  const titleY = 285;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <path d="M0 630V545A150 85 0 0 1 150 630Z" fill="#1818FF"/>
  <g stroke="#ffffff" stroke-opacity=".25" stroke-width="2">${[40, 90].map((x) => `<path d="M${x} 560V630"/>`).join('')}<path d="M0 595H130"/></g>
  <g transform="translate(80 70) scale(0.0355)" fill="#1818FF">${LOGO}</g>
  <text x="124" y="97" font-family="Poppins, Arial, sans-serif" font-size="28" fill="#0f1d44"><tspan font-weight="700">Review</tspan> Plus</text>
  <rect x="80" y="150" rx="22" ry="22" width="${Math.max(120, badge.length * 15 + 44)}" height="44" fill="#EFF4FF"/>
  <text x="102" y="180" font-family="Poppins, Arial, sans-serif" font-size="22" font-weight="600" fill="#1818FF">${esc(badge)}</text>
  ${lines.map((l, i) => `<text x="80" y="${titleY + i * 64}" font-family="Poppins, Arial, sans-serif" font-size="54" font-weight="700" fill="#0f1d44">${esc(l)}</text>`).join('')}
  <text x="80" y="${titleY + lines.length * 64 + 8}" font-family="Poppins, Arial, sans-serif" font-size="26" fill="#4b5563">${esc(sub)}</text>
  <rect x="${PHOTO.x}" y="${PHOTO.y}" width="${PHOTO.w}" height="${PHOTO.h}" rx="${PHOTO.r}" fill="#EFF4FF"/>
</svg>`;

  const layers: OverlayOptions[] = [];
  if (image) {
    const mask = Buffer.from(`<svg width="${PHOTO.w}" height="${PHOTO.h}"><rect width="${PHOTO.w}" height="${PHOTO.h}" rx="${PHOTO.r}" fill="#fff"/></svg>`);
    const photo = await sharp(join(process.cwd(), 'src/assets/products', image))
      .resize(PHOTO.w, PHOTO.h, { fit: 'cover', position: 'centre' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
    layers.push({ input: photo, left: PHOTO.x, top: PHOTO.y });
  }
  const png = await sharp(Buffer.from(svg)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
