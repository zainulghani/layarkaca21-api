import { BaseScraper } from './BaseScraper';
import { findJsonLd, parseJsonLd } from './theme';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

interface ActorHit {
  name: string;
  slug: string;
  title: string;
  type: 'movie' | 'series';
  poster: string;
  year: number | null;
  url: string;
}

interface ActorIndex {
  builtAt: number;
  actors: Record<string, ActorHit[]>;
}

/** Slug that keeps non-latin names intact (they are common in LK21 cast lists). */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || encodeURIComponent(name).replace(/%/g, '');
}

const INDEX_KEY = '__lk21_actor_index';
const INDEX_TTL = 60 * 60 * 24;

/**
 * The upstream sites have no actor pages, but every detail page publishes a
 * JSON-LD `actor` array. This scraper derives an actor index from the most
 * recent titles so /person/:id and /actors/popular can return real data.
 */
export class PersonScraper extends BaseScraper {
  private async buildIndex(): Promise<ActorIndex> {
    try {
      const cached = await redis.get(INDEX_KEY);
      if (cached) return JSON.parse(cached) as ActorIndex;
    } catch {
      /* cache miss is fine */
    }

    const $ = await this.fetchHtml('/latest/');
    const links: string[] = [];
    $('.lo-kartu a.lo-kartu-tautan, .grid-poster a').each((_: any, el: any) => {
      const href = $(el).attr('href') || '';
      if (href && !links.includes(href)) links.push(href);
    });

    const limit = Math.min(links.length, 20);
    const hits: ActorHit[] = [];

    const chunkSize = 5;
    for (let i = 0; i < limit; i += chunkSize) {
      const chunk = links.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (url) => {
          try {
            const detail$ = await this.fetchHtml(url);
            const json = findJsonLd(parseJsonLd(detail$), ['Movie', 'TVSeries', 'TVEpisode']) || {};
            const actors = Array.isArray(json.actor) ? json.actor : [];
            if (actors.length === 0) return;
            const title = String(json.name || detail$('meta[property="og:title"]').attr('content') || '').trim();
            const poster = String(json.image || '');
            const year = json.dateCreated ? parseInt(String(json.dateCreated).slice(0, 4), 10) || null : null;
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
            logger.warn(`Actor index skip ${url}: ${error?.message}`);
          }
        })
      );
    }

    const actors: Record<string, ActorHit[]> = {};
    for (const hit of hits) {
      if (!actors[hit.slug]) actors[hit.slug] = [];
      actors[hit.slug].push(hit);
    }

    const index: ActorIndex = { builtAt: Date.now(), actors };
    try {
      await redis.set(INDEX_KEY, JSON.stringify(index), 'EX', INDEX_TTL);
    } catch {
      /* caching is best effort */
    }
    return index;
  }

  async getPopularActors(limit = 20) {
    const index = await this.buildIndex();
    return Object.entries(index.actors)
      .map(([slug, hits]) => ({
        id: slug,
        name: hits[0].name,
        slug,
        knownForCount: hits.length,
        photo: hits[0].poster || '',
        knownFor: hits.slice(0, 5).map((h) => ({
          id: h.url.split('/').filter(Boolean).pop() || '',
          title: h.title,
          type: h.type,
          year: h.year,
          poster: h.poster,
          url: h.url
        }))
      }))
      .sort((a, b) => b.knownForCount - a.knownForCount)
      .slice(0, limit);
  }

  async getPerson(id: string) {
    const index = await this.buildIndex();
    const slug = slugify(id);
    const hits = index.actors[slug] || [];

    const movies = hits
      .filter((h) => h.type === 'movie')
      .map((h) => ({ id: h.url.split('/').filter(Boolean).pop() || '', title: h.title, year: h.year, poster: h.poster, url: h.url }));
    const series = hits
      .filter((h) => h.type === 'series')
      .map((h) => ({ id: h.url.split('/').filter(Boolean).pop() || '', title: h.title, year: h.year, poster: h.poster, url: h.url }));

    return {
      id,
      name: hits[0]?.name || id,
      photo: hits[0]?.poster || '',
      birthDate: '',
      birthPlace: '',
      bio: '',
      knownFor: [...movies, ...series].slice(0, 5),
      movies,
      series,
      awards: []
    };
  }
}
