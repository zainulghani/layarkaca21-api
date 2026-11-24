import * as cheerio from 'cheerio';

export type Theme = 'lo' | 'grid' | 'unknown';

export interface Card {
  id: string;
  slug: string;
  type: 'movie' | 'series';
  title: string;
  year: number | null;
  poster: string;
  rating: number | null;
  duration: string | null;
  genre: string | null;
  url: string;
  path: string;
}

/** Detect which upstream theme the fetched HTML uses. */
export function detectTheme($: cheerio.CheerioAPI): Theme {
  if ($('.lo-kartu').length > 0 || $('section.lo-sek').length > 0) return 'lo';
  if ($('.grid-poster').length > 0 || $('.widget-item').length > 0) return 'grid';
  return 'unknown';
}

function slugFromHref(href: string): string {
  const parts = href.split('?')[0].split('#')[0].split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function absolute(href: string, base: string): string {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  return `${base.replace(/\/$/, '')}${href.startsWith('/') ? '' : '/'}${href}`;
}

function pickNumber(text: string): number | null {
  const m = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Parse a list of cards from the `lo-*` theme (lk21official.fun and friends). */
export function parseLoCards($: cheerio.CheerioAPI, scope: cheerio.Cheerio<any>, base: string): Card[] {
  const items: Card[] = [];
  const roots: any[] = [];

  scope.find('.lo-kartu').each((_: any, el: any) => {
    roots.push(el);
  });

  for (const el of roots) {
    const card = $(el);
    const linkEl = card.find('a.lo-kartu-tautan').first();
    const href = linkEl.attr('href') || card.find('a').first().attr('href') || '';
    if (!href) continue;

    const img = card.find('img.lo-poster').first();
    const poster = img.attr('src') || img.attr('data-src') || '';
    const title =
      card.find('.lo-kartu-judul').first().text().trim() ||
      img.attr('alt')?.trim() ||
      '';

    if (!title) continue;

    const isSeries = /\/series\//.test(href) || card.find('.jarvis-eps').length > 0;
    const epsText = card.find('.jarvis-eps').first().text().trim();
    const duration =
      card.find('.lo-badge-durasi').first().text().trim() ||
      card.find('.duration').first().text().trim() ||
      null;

    items.push({
      id: slugFromHref(href),
      slug: slugFromHref(href),
      type: isSeries ? 'series' : 'movie',
      title,
      year: pickNumber(card.find('.lo-badge-tahun').first().text()),
      poster: absolute(poster, base),
      rating: pickNumber(card.find('.lo-badge-rating').first().text()),
      duration,
      genre: card.find('.lo-kartu-genre').first().text().trim() || null,
      url: absolute(href, base),
      path: href.split('?')[0].split('#')[0],
      ...(epsText ? { episodes: epsText } : {}),
    } as Card);
  }
  return items;
}

/** Parse cards from the `grid-poster` theme (lk21official.cloud / dunia21 style). */
export function parseGridCards($: cheerio.CheerioAPI, scope: cheerio.Cheerio<any>, base: string): Card[] {
  const items: Card[] = [];
  const roots: any[] = [];

  scope.find('article.widget-item, article.mega-item').each((_: any, el: any) => {
    roots.push(el);
  });

  for (const el of roots) {
    const card = $(el);
    const href = card.find('figure.grid-poster a').first().attr('href') || card.find('a').first().attr('href') || '';
    if (!href) continue;
    const img = card.find('figure.grid-poster img').first();
    const poster = img.attr('src') || img.attr('data-src') || '';
    const title = card.find('.grid-title').first().text().trim() || img.attr('alt')?.trim() || '';
    if (!title) continue;

    const yearMatch = title.match(/\((\d{4})\)/);
    const genres: string[] = [];
    card.find('.grid-categories a[href*="/genre/"], .grid-categories a[href*="/tag/"]').each((_: any, a: any) => {
      const label = $(a).text().trim();
      if (label) genres.push(label);
    });

    items.push({
      id: slugFromHref(href),
      slug: slugFromHref(href),
      type: /\/series\//.test(href) ? 'series' : 'movie',
      title: title.replace(/\s*\(\d{4}\)\s*$/, '').trim(),
      year: yearMatch ? parseInt(yearMatch[1], 10) : null,
      poster: absolute(poster, base),
      rating: pickNumber(card.find('.rating').first().text()),
      duration: card.find('.duration').first().text().trim() || null,
      genre: genres.length ? genres.join(', ') : null,
      url: absolute(href, base),
      path: href.split('?')[0].split('#')[0]
    });
  }
  return items;
}

/** Parse cards regardless of theme. */
export function parseCards($: cheerio.CheerioAPI, scope: cheerio.Cheerio<any>, base: string): Card[] {
  const theme = detectTheme($);
  if (theme === 'lo') return parseLoCards($, scope, base);
  if (theme === 'grid') return parseGridCards($, scope, base);
  const lo = parseLoCards($, scope, base);
  if (lo.length) return lo;
  return parseGridCards($, scope, base);
}

export interface JsonLd {
  '@type'?: string;
  [k: string]: any;
}

/** Collect every JSON-LD block on the page. */
export function parseJsonLd($: cheerio.CheerioAPI): JsonLd[] {
  const out: JsonLd[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).text().trim();
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      /* ignore malformed blocks */
    }
  });
  return out;
}

export function findJsonLd(blocks: JsonLd[], types: string[]): JsonLd | undefined {
  return blocks.find((b) => {
    const t = b['@type'];
    if (!t) return false;
    if (Array.isArray(t)) return t.some((x) => types.includes(String(x)));
    return types.includes(String(t));
  });
}

/** "PT1H19M" / "PT79M" -> "1h 19m" */
export function isoDurationToText(iso?: string): string | null {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return null;
  const hours = m[1] ? `${m[1]}h` : '';
  const minutes = m[2] ? `${m[2]}m` : '';
  const seconds = m[3] ? `${m[3]}s` : '';
  const out = `${hours} ${minutes}`.trim();
  return out || seconds || null;
}

/** Read the pagination total ("Halaman 2 dari 27 total halaman"). */
export function parseTotalPages($: cheerio.CheerioAPI): number {
  const info = $('.lo-hal-info').first().text();
  const m = info.match(/dari\s+([\d.,]+)/i);
  if (m) {
    const n = parseInt(m[1].replace(/[.,]/g, ''), 10);
    if (n > 0) return n;
  }
  const last = $('.wai-pag a.page-numbers, .lo-pagin a.page-numbers').last().attr('href') || '';
  const pm = last.match(/\/page\/(\d+)\//);
  return pm ? parseInt(pm[1], 10) : 1;
}

/** True when the pagination block advertises a next page. */
export function parseHasNextPage($: cheerio.CheerioAPI): boolean {
  const next = $('.wai-pag a.next, .lo-pagin a.next').first().attr('href') || '';
  return !!next;
}
