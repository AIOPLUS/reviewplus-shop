#!/usr/bin/env node
/**
 * Lokale test-webhook die zich gedraagt als het Make-scenario.
 *   node scripts/mock-webhook.mjs            → http://localhost:8787/hook
 * Zet in .env.development.local:  PUBLIC_LEAD_WEBHOOK_URL=http://localhost:8787/hook
 *
 * - Logt elke payload (en schrijft de laatste naar scripts/.last-payload.json)
 * - Antwoordt { ok: true } of, bij betaalde extra's, { ok: true, checkoutUrl } naar een nep-Mollie-pagina
 * - GET /stock → { remaining } (voorraadteller; daalt per aanvraag)
 * - Herberekent het bedrag uit dist/products.json of src (zoals Make dat moet doen)
 */
import http from 'node:http';
import { writeFileSync } from 'node:fs';

const PORT = Number(process.env.PORT || 8787);
const PRICES = { 'nfc-kaartenset': 9.95, 'nfc-totem': 24.95 };
const payments = new Map();
let remaining = 1000; // voorraadteller (zoals scenario F in Make)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

function validate(p) {
  const errors = [];
  if (p.request_type === 'nieuwsbrief') return p.email ? [] : ['email ontbreekt'];
  for (const k of ['lead_ref', 'bedrijf', 'contact', 'bezorgadres', 'producten', 'toestemming']) if (!p[k]) errors.push(`${k} ontbreekt`);
  if (p.bedrijf?.bedrijfsnummer_type === 'kvk' && !/^\d{8}$/.test(p.bedrijf.bedrijfsnummer)) errors.push('kvk ongeldig');
  if (p.bedrijf?.bedrijfsnummer_type === 'kbo' && !/^[01]\d{3}\.\d{3}\.\d{3}$/.test(p.bedrijf.bedrijfsnummer)) errors.push('kbo ongeldig');
  if (!p.toestemming?.actievoorwaarden_privacy || !p.toestemming?.contact_opvolging) errors.push('toestemming ontbreekt');
  return errors;
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();

    if (req.method === 'GET' && url.pathname.startsWith('/mollie/')) {
      const pay = payments.get(url.pathname.split('/')[2]);
      if (!pay) return res.writeHead(404).end('onbekend');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta name=viewport content="width=device-width"><body style="font-family:sans-serif;padding:2rem;max-width:480px;margin:auto">
        <h1>Nep-Mollie (test)</h1><p>Bedrag: <b>€ ${pay.amount.toFixed(2)}</b> voor ${pay.ref}</p>
        <p><a href="${pay.paid}" style="display:inline-block;padding:1rem 1.5rem;background:#0040C1;color:#fff;border-radius:99px;text-decoration:none">Betalen (iDEAL)</a>
        &nbsp;<a href="${pay.cancel}">Annuleren</a></p></body>`);
    }

    if (req.method === 'GET' && url.pathname === '/stock') {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ remaining }));
    }
    if (req.method !== 'POST' || url.pathname !== '/hook') return res.writeHead(404, cors).end();
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let p;
      try {
        p = JSON.parse(body);
      } catch {
        res.writeHead(400, { ...cors, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, message: 'geen JSON' }));
      }
      writeFileSync(new URL('./.last-payload.json', import.meta.url), JSON.stringify(p, null, 2));
      const errors = validate(p);
      console.log(`\n[${new Date().toLocaleTimeString()}] ${p.request_type} ${p.lead_ref ?? ''} ${errors.length ? 'FOUTEN: ' + errors.join(', ') : 'OK'}`);
      console.log(JSON.stringify(p, null, 2));
      if (url.searchParams.get('fail')) {
        res.writeHead(500, cors);
        return res.end('fout');
      }
      if (errors.length) {
        res.writeHead(422, { ...cors, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, message: errors.join(', ') }));
      }
      if (p.request_type === 'aanvraag' && remaining > 0) remaining--;
      const amount = (p.producten ?? []).reduce((s, l) => s + (l.extra || 0) * (PRICES[l.slug] ?? 0), 0);
      const out = { ok: true };
      if (amount > 0) {
        const id = Math.random().toString(36).slice(2, 10);
        payments.set(id, { amount, ref: p.lead_ref, paid: p.return_urls.betaald, cancel: p.return_urls.geannuleerd });
        out.checkoutUrl = `http://localhost:${PORT}/mollie/${id}`;
      }
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  })
  .listen(PORT, () => console.log(`Mock-webhook op http://localhost:${PORT}/hook`));
