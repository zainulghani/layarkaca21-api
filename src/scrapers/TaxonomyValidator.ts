import { NavigationScraper } from './NavigationScraper';

const navigation = new NavigationScraper();

/**
 * Slug lists for the taxonomy pages (genre / country / year).
 *
 * The upstream theme answers 200 with an empty page for a slug that does not
 * exist, so the HTTP status cannot tell a valid-but-empty category from a
 * typo. The only reliable check is to compare the slug against the published
 * navigation menus.
 *
 * The lists are cached for a while because they rarely change and every
 * category request would otherwise hit the upstream twice.
 */
const TTL_MS = 10 * 60 * 1000;

type MenuKey = 'Genre' | 'Negara' | 'Tahun';

const cache = new Map<MenuKey, { at: number; slugs: Set<string> }>();

async function slugsFor(menu: MenuKey): Promise<Set<string>> {
  const hit = cache.get(menu);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.slugs;

  const items = await navigation.scrapeMenu(menu);
  const slugs = new Set<string>();

  for (const item of items as any[]) {
    const raw = item?.url ?? item?.slug ?? item?.href ?? '';
    if (!raw) continue;
    // URLs look like /genre/action/ or /country/korea/; keep the last segment.
    const parts = String(raw).split('/').filter(Boolean);
    const slug = (parts[parts.length - 1] ?? '').toLowerCase();
    if (slug) slugs.add(slug);
  }

  cache.set(menu, { at: Date.now(), slugs });
  return slugs;
}

/**
 * Returns true when the slug is known upstream, or when the check itself
 * could not be performed. A failed check must not turn a valid request into
 * an error, so uncertainty resolves to "valid".
 */
export async function isKnownTaxonomySlug(
  kind: 'genre' | 'country' | 'year',
  slug: string
): Promise<boolean> {
  const menu: MenuKey | null =
    kind === 'genre' ? 'Genre' : kind === 'country' ? 'Negara' : kind === 'year' ? 'Tahun' : null;
  if (!menu) return true;

  const normalized = slug.toLowerCase();
  if (/^\d{4}$/.test(normalized)) {
    // Years are numeric; the menu carries them too, but any 4-digit year is
    // structurally valid and the upstream page decides on its own.
    return true;
  }

  try {
    const known = await slugsFor(menu);
    if (known.size === 0) return true;
    return known.has(normalized);
  } catch {
    return true;
  }
}

export function clearTaxonomyCache(): void {
  cache.clear();
}
