/** Opslag die nooit crasht (privévenster, geblokkeerde cookies, thumbnail-render). */
type Area = 'local' | 'session';

function store(area: Area): Storage | null {
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readJSON<T>(area: Area, key: string, fallback: T): T {
  try {
    const raw = store(area)?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(area: Area, key: string, value: unknown): void {
  try {
    store(area)?.setItem(key, JSON.stringify(value));
  } catch {
    /* opslag niet beschikbaar: geen probleem, de flow werkt zonder */
  }
}

export function remove(area: Area, key: string): void {
  try {
    store(area)?.removeItem(key);
  } catch {
    /* idem */
  }
}
