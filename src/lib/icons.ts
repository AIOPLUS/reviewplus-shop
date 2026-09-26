import simpleIcons from '@iconify-json/simple-icons/icons.json';
import logos from '@iconify-json/logos/icons.json';

type IconSet = {
  icons: Record<string, { body: string; width?: number; height?: number }>;
  aliases?: Record<string, { parent: string }>;
  width?: number;
  height?: number;
};

const sets: Record<string, IconSet> = { si: simpleIcons as IconSet, logos: logos as IconSet };

/**
 * SVG-gegevens van een merklogo uit Iconify ("si:trustpilot" = Simple Icons, "logos:google-icon" = SVG Logos).
 * Alleen tijdens de build. Met `kleur` wordt een eenkleurig Simple Icons-logo in die kleur gezet.
 */
export function brandIcon(id: string, kleur?: string): { body: string; viewBox: string } {
  const [prefix, name] = id.split(':');
  const set = sets[prefix];
  if (!set) throw new Error(`Onbekende iconenset: ${prefix}`);
  const icon = set.icons[name] ?? set.icons[set.aliases?.[name]?.parent ?? ''];
  if (!icon) throw new Error(`Icoon niet gevonden: ${id}`);
  const w = icon.width ?? set.width ?? 24;
  const h = icon.height ?? set.height ?? 24;
  // Id's in een logo (kleurverloop, clipPath) krijgen een uniek achtervoegsel, anders botsen twee logo's op één pagina.
  let body = icon.body.replace(/id="([^"]+)"/g, 'id="$1__ID__"').replace(/url\(#([^)]+)\)/g, 'url(#$1__ID__)');
  if (kleur) body = body.replaceAll('currentColor', kleur);
  return { body, viewBox: `0 0 ${w} ${h}` };
}

let teller = 0;
/** Maakt de __ID__-plekken in een logo uniek (per keer dat het op een pagina staat). */
export const uniekeIds = (body: string): string => body.replaceAll('__ID__', `-i${++teller}`);
