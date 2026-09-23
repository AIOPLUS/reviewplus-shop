/**
 * Landafhankelijke validatie voor NL en BE. Puur (geen DOM), zodat het ook in tests of Make-scripts
 * herbruikbaar is. Elke validator geeft { ok, value (genormaliseerd), error?, warning? } terug.
 */
export type CountryCode = 'NL' | 'BE';

export interface Result {
  ok: boolean;
  value: string;
  error?: string;
  warning?: string;
}

const ok = (value: string, warning?: string): Result => ({ ok: true, value, ...(warning ? { warning } : {}) });
const fail = (value: string, error: string): Result => ({ ok: false, value, error });

/** KvK-nummer (NL): 8 cijfers. */
export function validateKvk(input: string): Result {
  const digits = input.replace(/\D/g, '');
  if (!digits) return fail(input, 'Vul je KvK-nummer in.');
  if (digits.length !== 8) return fail(input, 'Een KvK-nummer bestaat uit 8 cijfers.');
  return ok(digits);
}

/** KBO-/ondernemingsnummer (BE): 10 cijfers, begint met 0 of 1, mod-97 controle. Formaat 0123.456.789. */
export function validateKbo(input: string): Result {
  let digits = input.replace(/^BE/i, '').replace(/\D/g, '');
  if (!digits) return fail(input, 'Vul je ondernemingsnummer (KBO) in.');
  if (digits.length === 9) digits = `0${digits}`;
  if (digits.length !== 10) return fail(input, 'Een ondernemingsnummer bestaat uit 10 cijfers, bijvoorbeeld 0123.456.789.');
  if (!/^[01]/.test(digits)) return fail(input, 'Een ondernemingsnummer begint met 0 of 1.');
  const base = Number(digits.slice(0, 8));
  const check = Number(digits.slice(8));
  if (97 - (base % 97) !== check) return fail(input, 'Dit ondernemingsnummer klopt niet. Controleer de cijfers.');
  return ok(`${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`);
}

export function validateCompanyNumber(country: CountryCode, input: string): Result {
  return country === 'NL' ? validateKvk(input) : validateKbo(input);
}

/** Btw-nummer (optioneel). Alleen een waarschuwing bij een afwijkend formaat. */
export function validateVat(country: CountryCode, input: string): Result {
  const v = input.replace(/[\s.-]/g, '').toUpperCase();
  if (!v) return ok('');
  const re = country === 'NL' ? /^NL\d{9}B\d{2}$/ : /^BE[01]\d{9}$/;
  const example = country === 'NL' ? 'NL123456789B01' : 'BE0123456789';
  return re.test(v) ? ok(v) : ok(v, `Controleer je btw-nummer, het formaat is meestal ${example}.`);
}

export function validatePostcode(country: CountryCode, input: string): Result {
  const v = input.trim().toUpperCase();
  if (!v) return fail(input, 'Vul je postcode in.');
  if (country === 'NL') {
    const m = v.replace(/\s+/g, '').match(/^([1-9]\d{3})([A-Z]{2})$/);
    if (!m || ['SA', 'SD', 'SS'].includes(m[2]!)) return fail(input, 'Vul een Nederlandse postcode in, zoals 1234 AB.');
    return ok(`${m[1]} ${m[2]}`);
  }
  if (!/^[1-9]\d{3}$/.test(v)) return fail(input, 'Een Belgische postcode bestaat uit 4 cijfers, zoals 2000.');
  return ok(v);
}

/** Telefoon: +31 of +32. Lokale notatie (06…, 04…, 020…) wordt omgezet naar het land van het bedrijf. */
export function validatePhone(country: CountryCode, input: string): Result {
  let v = input.replace(/[\s().-]/g, '');
  if (!v) return fail(input, 'Vul je telefoonnummer in.');
  if (v.startsWith('00')) v = `+${v.slice(2)}`;
  if (v.startsWith('0')) v = `${country === 'NL' ? '+31' : '+32'}${v.slice(1)}`;
  if (/^\+310/.test(v) || /^\+320/.test(v)) v = `${v.slice(0, 3)}${v.slice(4)}`;
  if (/^\+31[1-9]\d{8}$/.test(v) || /^\+32[1-9]\d{7,8}$/.test(v)) return ok(v);
  return fail(input, 'Vul een Nederlands (+31) of Belgisch (+32) telefoonnummer in.');
}

const FREE_MAIL = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.nl', 'hotmail.be', 'outlook.com', 'outlook.be', 'live.nl', 'live.be',
  'live.com', 'msn.com', 'yahoo.com', 'yahoo.nl', 'icloud.com', 'me.com', 'ziggo.nl', 'kpnmail.nl', 'planet.nl', 'home.nl',
  'telenet.be', 'skynet.be', 'proximus.be', 'hetnet.nl', 'xs4all.nl', 'protonmail.com', 'proton.me',
];

export function validateEmail(input: string): Result {
  const v = input.trim().toLowerCase();
  if (!v) return fail(input, 'Vul je e-mailadres in.');
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return fail(input, 'Dit e-mailadres lijkt niet te kloppen.');
  const domain = v.split('@')[1] ?? '';
  if (FREE_MAIL.includes(domain)) {
    return ok(v, 'Tip: gebruik bij voorkeur je zakelijke e-mailadres, dan kunnen we je aanvraag sneller koppelen aan je bedrijf.');
  }
  return ok(v);
}

export function normalizeUrl(input: string): Result {
  let v = input.trim();
  if (!v) return ok('');
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!u.hostname.includes('.')) throw new Error('host');
    return ok(u.toString());
  } catch {
    return fail(input, 'Dit lijkt geen geldige link. Voorbeeld: www.jouwbedrijf.nl');
  }
}

export function required(input: string, message: string): Result {
  return input.trim() ? ok(input.trim()) : fail(input, message);
}
