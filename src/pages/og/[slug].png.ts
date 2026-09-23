import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { getProducts, getSectors } from '@/lib/catalog';
import { formatPrice } from '@/lib/format';

/** Open Graph-afbeeldingen (1200×630) per product en sectorpagina, bij het builden gegenereerd. */
type Og = {
  title: string;
  sub: string;
  badge: string;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const [products, sectors] = await Promise.all([getProducts(), getSectors()]);
  const paths: { params: { slug: string }; props: Og }[] = [
    { params: { slug: 'shop' }, props: { title: 'Gratis NFC-reviewkaarten voor jouw bedrijf', sub: 'Gratis verzonden in Nederland en België', badge: 'Review Plus Shop' } },
  ];
  for (const p of products) {
    paths.push({
      params: { slug: p.slug },
      props: {
        title: p.naam,
        sub: `t.w.v. ${formatPrice(p.normalePrijs)}, ${p.gratisVoorwaarde === 'bij-demo' ? 'nu gratis bij je demo' : 'nu gratis'}`,
        badge: 'Gratis',
      },
    });
  }
  for (const s of sectors) {
    paths.push({ params: { slug: `voor-${s.slug}` }, props: { title: s.heroTitel, sub: 'Gratis NFC-reviewkaarten · NL & BE', badge: s.naam } });
  }
  return paths;
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function wrap(text: string, max = 20): string[] {
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

export const GET: APIRoute = async ({ props }) => {
  const { title, sub, badge } = props as Og;
  const lines = wrap(title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#173EDD"/><stop offset="1" stop-color="#0040C1"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g stroke="#ffffff" stroke-opacity=".07">${Array.from({ length: 22 }, (_, i) => `<path d="M${i * 56} 0V630"/>`).join('')}${Array.from({ length: 12 }, (_, i) => `<path d="M0 ${i * 56}H1200"/>`).join('')}</g>
  <g transform="translate(80 80)" fill="#fff"><path d="M15 15H3A12 12 0 0 1 15 3z"/><rect x="17" y="3" width="12" height="12" rx="2"/><rect x="3" y="17" width="12" height="12" rx="2"/><path d="M17 17h12A12 12 0 0 1 17 29z"/></g>
  <text x="124" y="106" font-family="Poppins, Arial, sans-serif" font-size="28" font-weight="500" fill="#fff">Review Plus</text>
  <rect x="80" y="170" rx="22" ry="22" width="${Math.max(140, badge.length * 17 + 48)}" height="44" fill="#ffffff" fill-opacity=".16"/>
  <text x="104" y="200" font-family="Poppins, Arial, sans-serif" font-size="22" font-weight="500" fill="#fff">${esc(badge)}</text>
  ${lines.map((l, i) => `<text x="80" y="${300 + i * 76}" font-family="Poppins, Arial, sans-serif" font-size="60" font-weight="600" fill="#fff">${esc(l)}</text>`).join('')}
  <text x="80" y="${300 + lines.length * 76 + 20}" font-family="Poppins, Arial, sans-serif" font-size="30" fill="#D1E0FF">${esc(sub)}</text>
  <g transform="translate(860 190) rotate(6)"><rect width="250" height="158" rx="18" fill="#fff"/><g fill="none" stroke="#0040C1" stroke-width="6" stroke-linecap="round"><path d="M40 60a18 18 0 0 1 0 28"/><path d="M52 50a32 32 0 0 1 0 48"/><path d="M64 40a46 46 0 0 1 0 68"/></g><text x="96" y="84" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="600" fill="#0040C1">Tik voor</text><text x="96" y="110" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="600" fill="#0040C1">een review</text></g>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
