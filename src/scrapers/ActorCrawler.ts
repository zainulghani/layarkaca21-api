import { BaseScraper } from './BaseScraper';
import { findJsonLd, parseJsonLd } from './theme';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

/** Slug that keeps non-latin names intact (they are common in LK21 cast lists). */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || encodeURIComponent(name).replace(/%/g, '');
}

interface ListPage {
  /** Path template of the list, `page` is replaced by the page number. */
  path: string;
  /** CrawlState label. */
  label: string;
  /**
   * Which upstream base serves this list. The `lo-*` theme and the grid theme
   * expose different paths, and a 404 on one base does not fall through to the
   * next one, so the base is pinned explicitly.
   */
  base: 'lo' | 'grid';
}

/**
 * List pages that are crawled for cast credits.
 *
 * `latest` and `series-terbaru` of the `lo-*` theme expose a JSON-LD `actor`
 * array on every detail page; `download-film-terbaru` of the grid theme
 * exposes the same data through the `muvicast` taxonomy.
 */
const LIST_PAGES: ListPage[] = [
  { path: '/latest/', label: 'latest', base: 'lo' },
  { path: '/series-terbaru/', label: 'series-terbaru', base: 'lo' },
  { path: '/download-film-terbaru/', label: 'download-film-terbaru', base: 'grid' },
  { path: '/populer/', label: 'grid-populer', base: 'grid' }
];

export interface CrawlReport {
  label: string;
  page: number;
  titles: number;
  credits: number;
}

/**
 * Incremental crawler that harvests cast credits from the detail pages and
 * stores them in PostgreSQL.
 *
 * Each run advances the stored cursor of every list page, so the index grows
 * over time instead of rebuilding the whole catalogue on every request.
 */
export class ActorCrawler extends BaseScraper {
  /**
   * Resolve the upstream base for a list. The `lo-*` theme lives on
   * lk21official.fun, the grid theme on lk21official.cloud.
   */
  private baseFor(kind: 'lo' | 'grid'): string | null {
    const bases = this.baseUrls;
    const preferred = kind === 'grid' ? bases[bases.length - 1] : bases[0];
    return preferred || null;
  }

  private async listLinks(path: string, page: number, kind: 'lo' | 'grid'): Promise<string[]> {
    const base = this.baseFor(kind);
    if (!base) return [];
    const endpoint = page > 1 ? `${path}page/${page}/` : path;
    let $: any;
    try {
      $ = await this.fetchHtml(`${base}${endpoint}`);
    } catch (error: any) {
      logger.warn(`credit crawl list failed ${base}${endpoint}: ${error?.message}`);
      return [];
    }

    const links: string[] = [];
    $('.lo-kartu a.lo-kartu-tautan, article.widget-item figure.grid-poster a, article.mega-item figure.grid-poster a').each(
      (_: any, el: any) => {
        const href = $(el).attr('href') || '';
        if (href && !links.includes(href)) links.push(href);
      }
    );
    return links;
  }

  /** Credits of one detail page. */
  private async detailCredits(url: string): Promise<
    Array<{ name: string; slug: string; titleSlug: string; title: string; type: 'movie' | 'series'; year: number | null; poster: string }>
  > {
    let $: any;
    try {
      $ = await this.fetchHtml(url);
    } catch (error: any) {
      logger.warn(`credit crawl detail failed ${url}: ${error?.message}`);
      return [];
    }

    const json = findJsonLd(parseJsonLd($), ['Movie', 'TVSeries', 'TVEpisode']) || {};
    const title = String(json.name || $('meta[property="og:title"]').attr('content') || '').trim();
    const poster = String(json.image || '');
    const year = json.dateCreated ? parseInt(String(json.dateCreated).slice(0, 4), 10) || null : null;
    const type: 'movie' | 'series' = json['@type'] === 'TVSeries' || json['@type'] === 'TVEpisode' ? 'series' : 'movie';
    const titleSlug = url.split('/').filter(Boolean).pop() || '';

    // The `lo-*` theme publishes the cast as a JSON-LD `actor` array.
    const actors = Array.isArray(json.actor) ? json.actor : [];
    const names: string[] = [];
    for (const actor of actors) {
      const name = String(actor?.name || '').trim();
      if (name) names.push(name);
    }

    // The grid theme has no JSON-LD actor array, but renders the cast as
    // "Bintang film:" links to `/cast/<slug>/`.
    if (!names.length) {
      $('a[href*="/cast/"]').each((_: any, el: any) => {
        const name = $(el).text().trim();
        const href = $(el).attr('href') || '';
        if (!name || href.includes('/cast-a-')) return;
        names.push(name);
      });
    }

    if (!names.length) return [];

    const out: Array<{ name: string; slug: string; titleSlug: string; title: string; type: 'movie' | 'series'; year: number | null; poster: string }> = [];
    for (const name of names) {
      out.push({ name, slug: slugify(name), titleSlug, title, type, year, poster });
    }
    return out;
  }

  private async saveCredits(credits: Awaited<ReturnType<ActorCrawler['detailCredits']>>, source: string): Promise<number> {
    if (!credits.length) return 0;

    const rows = credits.map((c) => ({
      personSlug: c.slug,
      personName: c.name,
      titleSlug: c.titleSlug,
      title: c.title,
      type: c.type,
      year: c.year,
      poster: c.poster || null,
      url: null,
      source
    }));

    try {
      const result = await prisma.actorCredit.createMany({
        data: rows,
        skipDuplicates: true
      });
      return result.count;
    } catch (error: any) {
      logger.warn(`credit persist failed: ${error?.message}`);
      return 0;
    }
  }

  private async cursor(label: string): Promise<number> {
    try {
      const state = await prisma.crawlState.findUnique({ where: { label } });
      return state?.cursor ?? 1;
    } catch {
      return 1;
    }
  }

  private async setCursor(label: string, cursor: number): Promise<void> {
    try {
      await prisma.crawlState.upsert({
        where: { label },
        create: { label, cursor },
        update: { cursor }
      });
    } catch (error: any) {
      logger.warn(`cursor persist failed for ${label}: ${error?.message}`);
    }
  }

  /**
   * Crawl one page of every configured list. `titlesPerPage` detail pages are
   * fetched per list page, in parallel batches.
   */
  async crawlPage(titlesPerPage = 24): Promise<CrawlReport[]> {
    const reports: CrawlReport[] = [];

    for (const list of LIST_PAGES) {
      const page = await this.cursor(list.label);
      const links = await this.listLinks(list.path, page, list.base);
      if (!links.length) {
        reports.push({ label: list.label, page, titles: 0, credits: 0 });
        continue;
      }

      const slice = links.slice(0, titlesPerPage);
      let credits: Awaited<ReturnType<ActorCrawler['detailCredits']>> = [];
      const chunkSize = 6;
      for (let i = 0; i < slice.length; i += chunkSize) {
        const chunk = slice.slice(i, i + chunkSize);
        const results = await Promise.all(chunk.map((url) => this.detailCredits(url)));
        for (const r of results) credits = credits.concat(r);
      }

      const saved = await this.saveCredits(credits, 'jsonld');
      await this.setCursor(list.label, page + 1);
      reports.push({ label: list.label, page, titles: slice.length, credits: saved });
      logger.info(`credit crawl ${list.label} page ${page}: ${slice.length} titles, ${saved} credits`);
    }

    return reports;
  }

  /** Number of distinct people and credits currently stored. */
  async stats() {
    try {
      const [people, credits, movies, series] = await Promise.all([
        prisma.actorCredit.findMany({ distinct: ['personSlug'], select: { personSlug: true } }),
        prisma.actorCredit.count(),
        prisma.actorCredit.count({ where: { type: 'movie' } }),
        prisma.actorCredit.count({ where: { type: 'series' } })
      ]);
      return { people: people.length, credits, movies, series };
    } catch (error: any) {
      logger.warn(`credit stats failed: ${error?.message}`);
      return { people: 0, credits: 0, movies: 0, series: 0 };
    }
  }
}
