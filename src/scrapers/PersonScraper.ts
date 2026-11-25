import { BaseScraper } from './BaseScraper';
import { findJsonLd, parseJsonLd, parseGridCards, type Card } from './theme';
import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

/**
 * Person / actor endpoints.
 *
 * Upstream has no dedicated "person" page on the `lo-*` theme, but the
 * `grid-poster` theme (lk21official.cloud) exposes a WordPress taxonomy
 * `muvicast` with one term per actor and the post count of their filmography.
 * The taxonomy term slug maps 1:1 to the archive page `/cast/<slug>/`, which
 * renders the full filmography with posters.
 *
 * Two sources are combined:
 *   1. `muvicast` taxonomy + `/cast/<slug>/` archives  -> complete movie list
 *   2. JSON-LD `actor` arrays of recent `lo-*` titles   -> series/TV credits
 *
 * The second source is required because the grid theme only indexes movies.
 */

interface CastTerm {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface KnownForItem {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year: number | null;
  poster: string;
  rating: number | null;
  url: string;
}

interface JsonLdHit {
  name: string;
  slug: string;
  title: string;
  type: 'movie' | 'series';
  poster: string;
  year: number | null;
  url: string;
}

/** Slug that keeps non-latin names intact (they are common in LK21 cast lists). */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || encodeURIComponent(name).replace(/%/g, '');
}

const CAST_BASE_KEY = '__lk21_cast_base';
const TERM_CACHE_PREFIX = '__lk21_cast_term:';
const INDEX_KEY = '__lk21_actor_index';
const TTL_SHORT = 60 * 60 * 6;
const TTL_LONG = 60 * 60 * 24;

export class PersonScraper extends BaseScraper {
  /** First upstream base that exposes the `muvicast` taxonomy. */
  private async castBase(): Promise<string | null> {
    try {
      const cached = await redis.get(CAST_BASE_KEY);
      if (cached) return cached;
    } catch {
      /* cache miss is fine */
    }

    for (const base of this.baseUrls) {
      try {
        const probe = await this.fetchJson(`${base}/wp-json/wp/v2/muvicast?per_page=1&_fields=id`);
        if (Array.isArray(probe)) {
          try {
            await redis.set(CAST_BASE_KEY, base, 'EX', TTL_LONG);
          } catch {
            /* best effort */
          }
          return base;
        }
      } catch (error: any) {
        logger.warn(`muvicast taxonomy unavailable on ${base}: ${error?.message}`);
      }
    }
    return null;
  }

  /** Resolve a user supplied id to a `muvicast` term. */
  private async findTerm(id: string): Promise<CastTerm | null> {
    const base = await this.castBase();
    if (!base) return null;

    const cacheKey = `${TERM_CACHE_PREFIX}${id}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as CastTerm;
    } catch {
      /* cache miss is fine */
    }

    let term: CastTerm | null = null;

    // 1. exact slug
    try {
      const bySlug = await this.fetchJson(
        `${base}/wp-json/wp/v2/muvicast?slug=${encodeURIComponent(id)}&_fields=id,name,slug,count`
      );
      if (Array.isArray(bySlug) && bySlug.length) {
        term = bySlug[0] as CastTerm;
      }
    } catch (error: any) {
      logger.warn(`muvicast slug lookup failed for ${id}: ${error?.message}`);
    }

    // 2. fuzzy name search (also matches "Eric Roberts Jr" -> "eric-roberts-jr")
    if (!term) {
      try {
        const bySearch = await this.fetchJson(
          `${base}/wp-json/wp/v2/muvicast?search=${encodeURIComponent(id)}&per_page=10&_fields=id,name,slug,count`
        );
        if (Array.isArray(bySearch) && bySearch.length) {
          const wanted = slugify(id);
          term =
            bySearch.find((t: CastTerm) => t.slug === wanted) ||
            (bySearch.find((t: CastTerm) => t.count > 1) as CastTerm) ||
            (bySearch[0] as CastTerm);
        }
      } catch (error: any) {
        logger.warn(`muvicast search failed for ${id}: ${error?.message}`);
      }
    }

    if (term) {
      try {
        await redis.set(cacheKey, JSON.stringify(term), 'EX', TTL_LONG);
      } catch {
        /* best effort */
      }
    }
    return term;
  }

  /** Filmography cards of the `/cast/<slug>/` archive. */
  private async archiveCards(base: string, slug: string, pages = 2): Promise<Card[]> {
    const out: Card[] = [];
    for (let page = 1; page <= pages; page++) {
      const path = page === 1 ? `/cast/${slug}/` : `/cast/${slug}/page/${page}/`;
      let $: any;
      try {
        $ = await this.fetchHtml(`${base}${path}`);
      } catch (error: any) {
        logger.warn(`cast archive failed ${path}: ${error?.message}`);
        break;
      }
      const scope = $('#grid-wrapper');
      const cards = parseGridCards($, scope.length ? scope : $.root(), base);
      if (!cards.length) break;
      out.push(...cards);
    }
    return out;
  }

  /**
   * Series / TV credits, harvested from the JSON-LD `actor` array of the most
   * recent titles on the `lo-*` theme (the grid theme does not index TV).
   */
  private async jsonLdIndex(): Promise<Record<string, JsonLdHit[]>> {
    try {
      const cached = await redis.get(INDEX_KEY);
      if (cached) return JSON.parse(cached) as Record<string, JsonLdHit[]>;
    } catch {
      /* cache miss is fine */
    }

    const hits: JsonLdHit[] = [];
    const collect = async (path: string) => {
      let $: any;
      try {
        $ = await this.fetchHtml(path);
      } catch {
        return;
      }
      const links: string[] = [];
      $('.lo-kartu a.lo-kartu-tautan, .grid-poster a').each((_: any, el: any) => {
        const href = $(el).attr('href') || '';
        if (href && !links.includes(href)) links.push(href);
      });

      const chunkSize = 5;
      for (let i = 0; i < Math.min(links.length, 30); i += chunkSize) {
        const chunk = links.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (url) => {
            try {
              const detail$ = await this.fetchHtml(url);
              const json = findJsonLd(parseJsonLd(detail$), ['Movie', 'TVSeries', 'TVEpisode']) || {};
              const actors = Array.isArray(json.actor) ? json.actor : [];
              if (!actors.length) return;
              const title = String(
                json.name || detail$('meta[property="og:title"]').attr('content') || ''
              ).trim();
              const poster = String(json.image || '');
              const year = json.dateCreated
                ? parseInt(String(json.dateCreated).slice(0, 4), 10) || null
                : null;
              const isSeries = json['@type'] === 'TVSeries' || json['@type'] === 'TVEpisode';
              for (const actor of actors) {
                const name = String(actor?.name || '').trim();
                if (!name) continue;
                hits.push({
                  name,
                  slug: slugify(name),
                  title,
                  type: isSeries ? 'series' : 'movie',
                  poster,
                  year,
                  url
                });
              }
            } catch (error: any) {
              logger.warn(`actor index skip ${url}: ${error?.message}`);
            }
          })
        );
      }
    };

    await collect('/latest/');
    await collect('/series-terbaru/');

    const index: Record<string, JsonLdHit[]> = {};
    for (const hit of hits) {
      if (!index[hit.slug]) index[hit.slug] = [];
      index[hit.slug].push(hit);
    }
    try {
      await redis.set(INDEX_KEY, JSON.stringify(index), 'EX', TTL_SHORT);
    } catch {
      /* best effort */
    }
    return index;
  }

  private static toKnownFor(cards: Card[]): KnownForItem[] {
    return cards.map((c) => ({
      id: c.slug,
      title: c.title,
      type: c.type,
      year: c.year,
      poster: c.poster,
      rating: c.rating,
      url: c.url
    }));
  }

  /** Credits stored by the incremental crawler. */
  private async dbCredits(slug: string) {
    try {
      return await prisma.actorCredit.findMany({
        where: { personSlug: slug },
        orderBy: { year: 'desc' },
        take: 60
      });
    } catch (error: any) {
      logger.warn(`db credit lookup failed for ${slug}: ${error?.message}`);
      return [];
    }
  }

  /** People with the most credits in the local index. */
  private async dbPopular(limit: number) {
    try {
      const grouped = await prisma.actorCredit.groupBy({
        by: ['personSlug', 'personName'],
        _count: { _all: true },
        orderBy: { _count: { personSlug: 'desc' } },
        take: limit
      });
      return grouped.map((g) => ({
        slug: g.personSlug,
        name: g.personName,
        count: g._count._all
      }));
    } catch (error: any) {
      logger.warn(`db popular actors failed: ${error?.message}`);
      return [];
    }
  }

  async getPopularActors(limit = 20) {
    const base = await this.castBase();
    const terms: CastTerm[] = [];

    if (base) {
      try {
        const data = await this.fetchJson(
          `${base}/wp-json/wp/v2/muvicast?per_page=${limit}&orderby=count&order=desc&_fields=id,name,slug,count`
        );
        if (Array.isArray(data)) terms.push(...(data as CastTerm[]));
      } catch (error: any) {
        logger.warn(`popular actors query failed: ${error?.message}`);
      }
    }

    const out: any[] = [];
    const chunkSize = 5;
    for (let i = 0; i < terms.length; i += chunkSize) {
      const chunk = terms.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (term) => {
          try {
            const cards = base ? await this.archiveCards(base, term.slug, 1) : [];
            const knownFor = PersonScraper.toKnownFor(cards).slice(0, 5);
            out.push({
              id: term.slug,
              name: term.name,
              slug: term.slug,
              knownForCount: term.count,
              photo: knownFor[0]?.poster || '',
              knownFor
            });
          } catch (error: any) {
            logger.warn(`actor enrichment failed ${term.slug}: ${error?.message}`);
            out.push({
              id: term.slug,
              name: term.name,
              slug: term.slug,
              knownForCount: term.count,
              photo: '',
              knownFor: []
            });
          }
        })
      );
    }

    out.sort((a, b) => b.knownForCount - a.knownForCount);
    const merged = out.slice(0, limit);

    // People that only exist in the local credit index (non-latin names, TV
    // credits) are appended so they are reachable through this endpoint too.
    const known = new Set(merged.map((a) => a.id));
    for (const person of await this.dbPopular(limit)) {
      if (merged.length >= limit) break;
      if (known.has(person.slug)) continue;
      const credits = await this.dbCredits(person.slug);
      merged.push({
        id: person.slug,
        name: person.name,
        slug: person.slug,
        knownForCount: person.count,
        photo: credits[0]?.poster || '',
        knownFor: credits.slice(0, 5).map((c) => ({
          id: c.titleSlug,
          title: c.title,
          type: c.type,
          year: c.year,
          poster: c.poster || '',
          rating: c.rating,
          url: c.url || ''
        }))
      });
    }

    return merged.slice(0, limit);
  }

  async getPerson(id: string) {
    const term = await this.findTerm(id);
    const base = await this.castBase();
    const slug = term?.slug || slugify(id);

    let cards: Card[] = [];
    if (base && term) {
      try {
        cards = await this.archiveCards(base, term.slug, 3);
      } catch (error: any) {
        logger.warn(`cast archive failed for ${term.slug}: ${error?.message}`);
      }
    }

    const movies = cards
      .filter((c) => c.type === 'movie')
      .map((c) => ({
        id: c.slug,
        title: c.title,
        year: c.year,
        poster: c.poster,
        rating: c.rating,
        url: c.url
      }));
    const series = cards
      .filter((c) => c.type === 'series')
      .map((c) => ({
        id: c.slug,
        title: c.title,
        year: c.year,
        poster: c.poster,
        rating: c.rating,
        url: c.url
      }));

    // Series credits and titles harvested by the incremental crawler.
    const db = await this.dbCredits(slug);
    for (const credit of db) {
      const bucket = credit.type === 'series' ? series : movies;
      if (bucket.some((m) => m.title === credit.title)) continue;
      bucket.push({
        id: credit.titleSlug,
        title: credit.title,
        year: credit.year,
        poster: credit.poster || '',
        rating: credit.rating,
        url: credit.url || ''
      });
    }

    // Series credits harvested from the JSON-LD index of the lo-* theme.
    const index = await this.jsonLdIndex();
    const jsonHits = index[slug] || [];
    for (const hit of jsonHits) {
      if (hit.type === 'series' && !series.some((s) => s.title === hit.title)) {
        series.push({
          id: hit.url.split('/').filter(Boolean).pop() || '',
          title: hit.title,
          year: hit.year,
          poster: hit.poster,
          rating: null,
          url: hit.url
        });
      }
    }

    const knownFor = [...movies, ...series].slice(0, 5);

    return {
      id: term?.slug || id,
      name: term?.name || db[0]?.personName || jsonHits[0]?.name || id,
      photo: knownFor[0]?.poster || '',
      birthDate: '',
      birthPlace: '',
      bio: '',
      knownFor,
      movies,
      series,
      awards: []
    };
  }
}
