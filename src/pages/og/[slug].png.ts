import type { APIRoute, GetStaticPaths } from 'astro';
import sharp, { type OverlayOptions } from 'sharp';
import { join } from 'node:path';
import { getProducts, getSectors, getTellers, tellerPrijsLabel } from '@/lib/catalog';
import { brandIcon } from '@/lib/icons';
import { PLATFORMEN, platformStijl, type ReviewPlatform } from '@/lib/reviewplatformen';
import { scoreTekens } from '@/lib/tellerscore';
import { formatPrice } from '@/lib/format';

/**
 * Open Graph-afbeeldingen (1200×630) per product en sectorpagina, bij het builden gegenereerd met de productfoto.
 * De live reviewteller heeft nog geen foto: die wordt als vector getekend (zoals in de View Plus Shop).
 */
type Og = {
  title: string;
  sub: string;
  badge: string;
  image: string;
  teller?: ReviewPlatform;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const [products, sectors, tellers] = await Promise.all([getProducts(), getSectors(), getTellers()]);
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
  for (const t of tellers) {
    const sub = `${tellerPrijsLabel(t)} · 5 of 7 cijfers · NL & BE`;
    paths.push({ params: { slug: t.slug }, props: { title: t.naam, sub, badge: `${PLATFORMEN.length} platformen`, image: '', teller: 'Google' } });
    for (const platform of PLATFORMEN) {
      paths.push({
        params: { slug: `reviewteller-${platformStijl[platform].slug}` },
        props: { title: `Live reviewteller voor ${platform}`, sub, badge: platform, image: '', teller: platform },
      });
    }
  }
  return paths;
};

/** Reviewteller als vector: [logo] [ster + score in kleine klapcijfers] [5 zwarte klapcijfers], op het vlak rechts. */
function tellerSvg(platform: ReviewPlatform): string {
  const st = platformStijl[platform];
  const fw = 44, fh = 62, gap = 6, pad = 18, tegel = 44, scoreW = 66;
  const w = pad * 2 + tegel + scoreW + 5 * fw + 6 * gap;
  const h = fh + pad * 2;
  const x0 = PHOTO.x + (PHOTO.w - w) / 2, y0 = PHOTO.y + (PHOTO.h - h) / 2;
  const logo = brandIcon(st.logo, st.logoKleur);
  const lx = x0 + pad, ly = y0 + pad;
  const sx = lx + tegel + gap, cx = sx + scoreW / 2;
  const font = 'Poppins, Arial, sans-serif';

  // Score in kleine klapcijfers met een gedrukte komma, zoals op de site (lib/tellerscore.ts).
  const { heel, dec } = scoreTekens(st.voorbeeld.score, st.schaal, st.decimalen);
  const mw = 15, mh = 20, mg = 2, komma = 6;
  const rijW = (heel.length + dec.length) * mw + (heel.length + dec.length) * mg + komma;
  const vlak = st.score.vorm === 'vlak';
  const rijY = vlak ? ly + (fh - mh) / 2 : ly + 34;
  let x = cx - rijW / 2;
  const mini = (c: string) => {
    const r = `<rect x="${x}" y="${rijY}" width="${mw}" height="${mh}" rx="3" fill="url(#flap)"/><rect x="${x}" y="${rijY + mh / 2 - 0.5}" width="${mw}" height="1" fill="#000" opacity=".4"/>` +
      (c.trim() ? `<text x="${x + mw / 2}" y="${rijY + mh / 2 + 5}" font-family="${font}" font-size="14" font-weight="600" fill="#fff" text-anchor="middle">${c}</text>` : '');
    x += mw + mg;
    return r;
  };
  let rij = heel.map(mini).join('');
  rij += `<text x="${x + komma / 2 - 1}" y="${rijY + mh - 1}" font-family="${font}" font-size="16" font-weight="700" fill="${vlak ? '#fff' : '#150E08'}" text-anchor="middle">,</text>`;
  x += komma;
  rij += dec.map(mini).join('');
  const symbool = vlak
    ? `<rect x="${cx - rijW / 2 - 5}" y="${rijY - 5}" width="${rijW + 10}" height="${mh + 10}" rx="6" fill="${st.score.kleur}"/>`
    : st.score.vorm === 'ster'
      ? `<path transform="translate(${cx - 13} ${ly + 3}) scale(1.08)" d="M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4l-6.1 3.4 1.4-6.8L2.2 9.3l6.9-.8z" fill="${st.score.kleur}"/>`
      : `<circle cx="${cx}" cy="${ly + 15}" r="11" fill="${st.score.kleur}"/>`;

  const cijfers = String(st.voorbeeld.aantal).padStart(5, ' ').split('');
  const flappen = cijfers
    .map((c, i) => {
      const fx = sx + scoreW + gap + i * (fw + gap);
      return (
        `<rect x="${fx}" y="${ly}" width="${fw}" height="${fh}" rx="7" fill="url(#flap)"/><rect x="${fx}" y="${ly + fh / 2 - 1}" width="${fw}" height="2" fill="#000" opacity=".35"/>` +
        (c.trim() ? `<text x="${fx + fw / 2}" y="${ly + fh / 2 + 12}" font-family="${font}" font-size="34" font-weight="600" fill="#fff" text-anchor="middle">${c}</text>` : '')
      );
    })
    .join('');
  return (
    `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="12" fill="url(#hout)"/>` +
    `<svg x="${lx + 4}" y="${ly + 10}" width="${tegel - 8}" height="${fh - 20}" viewBox="${logo.viewBox}">${logo.body.replaceAll('__ID__', '-og')}</svg>` +
    symbool +
    rij +
    flappen
  );
}

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
  const { title, sub, badge, image, teller } = props as Og;
  const lines = wrap(title, 17);
  const titleY = 285;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="hout" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6ECDD"/><stop offset="1" stop-color="#EAD8BD"/></linearGradient>
    <linearGradient id="flap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e2e2e"/><stop offset=".49" stop-color="#2e2e2e"/><stop offset=".51" stop-color="#141414"/><stop offset="1" stop-color="#141414"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#ffffff"/>
  <path d="M0 630V545A150 85 0 0 1 150 630Z" fill="#1818FF"/>
  <g stroke="#ffffff" stroke-opacity=".25" stroke-width="2">${[40, 90].map((x) => `<path d="M${x} 560V630"/>`).join('')}<path d="M0 595H130"/></g>
  <g transform="translate(80 64) scale(0.0438)" fill="#1818FF">${LOGO}</g>
  <text x="136" y="100" font-family="Poppins, Arial, sans-serif" font-size="40" fill="#0f1d44"><tspan font-weight="700">Review</tspan> Plus</text>
  <rect x="80" y="150" rx="22" ry="22" width="${Math.max(120, badge.length * 15 + 44)}" height="44" fill="#EFF4FF"/>
  <text x="102" y="180" font-family="Poppins, Arial, sans-serif" font-size="22" font-weight="600" fill="#1818FF">${esc(badge)}</text>
  ${lines.map((l, i) => `<text x="80" y="${titleY + i * 64}" font-family="Poppins, Arial, sans-serif" font-size="54" font-weight="700" fill="#0f1d44">${esc(l)}</text>`).join('')}
  <text x="80" y="${titleY + lines.length * 64 + 8}" font-family="Poppins, Arial, sans-serif" font-size="26" fill="#4b5563">${esc(sub)}</text>
  <rect x="${PHOTO.x}" y="${PHOTO.y}" width="${PHOTO.w}" height="${PHOTO.h}" rx="${PHOTO.r}" fill="#EFF4FF"/>
  ${teller ? tellerSvg(teller) : ''}
</svg>`;

  const layers: OverlayOptions[] = [];
  if (image) {
    // Uitgeknipte foto passend op het blauwe vlak, met een zachte schaduw eronder
    const pad = 36;
    const photo = await sharp(join(process.cwd(), 'src/assets/products', image))
      .resize(PHOTO.w - pad * 2, PHOTO.h - pad * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const shadow = await sharp(photo).ensureAlpha().extractChannel(3).blur(14).linear(0.22, 0).toBuffer();
    const { width: sw = 0, height: sh = 0 } = await sharp(photo).metadata();
    const shadowRgba = await sharp({ create: { width: sw, height: sh, channels: 3, background: '#0f1d44' } }).joinChannel(shadow).png().toBuffer();
    layers.push({ input: shadowRgba, left: PHOTO.x + pad, top: PHOTO.y + pad + 14 });
    layers.push({ input: photo, left: PHOTO.x + pad, top: PHOTO.y + pad });
  }
  const png = await sharp(Buffer.from(svg)).composite(layers).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
