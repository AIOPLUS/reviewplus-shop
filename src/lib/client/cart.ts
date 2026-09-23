import { readJSON, writeJSON } from './storage';

/**
 * Lichtgewicht winkelwagen. De gratis kaartenset zit altijd in een aanvraag; de totem is gratis
 * als de klant een demo inplant (`totemDemo`). Betaalde extra's staan per productslug in `extras`.
 */
export interface Cart {
  totemDemo: boolean;
  extras: Record<string, number>;
  updated: string;
}

const KEY = 'rp_cart_v1';
const EVENT = 'rp:cart';

export function getCart(): Cart {
  const c = readJSON<Partial<Cart>>('local', KEY, {});
  return { totemDemo: c.totemDemo ?? true, extras: c.extras ?? {}, updated: c.updated ?? '' };
}

export function saveCart(cart: Cart): void {
  const clean: Cart = {
    totemDemo: cart.totemDemo,
    extras: Object.fromEntries(Object.entries(cart.extras).filter(([, n]) => n > 0)),
    updated: new Date().toISOString(),
  };
  writeJSON('local', KEY, clean);
  document.dispatchEvent(new CustomEvent<Cart>(EVENT, { detail: clean }));
}

export function setExtra(slug: string, qty: number, max = 50): Cart {
  const cart = getCart();
  cart.extras[slug] = Math.max(0, Math.min(max, Math.floor(qty) || 0));
  saveCart(cart);
  return getCart();
}

export function setTotemDemo(on: boolean): Cart {
  const cart = getCart();
  cart.totemDemo = on;
  saveCart(cart);
  return cart;
}

export function extrasCount(cart: Cart = getCart()): number {
  return Object.values(cart.extras).reduce((a, b) => a + b, 0);
}

export function clearExtras(): void {
  const cart = getCart();
  cart.extras = {};
  saveCart(cart);
}

export function onCartChange(fn: (cart: Cart) => void): void {
  document.addEventListener(EVENT, (e) => fn((e as CustomEvent<Cart>).detail));
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) fn(getCart());
  });
}
