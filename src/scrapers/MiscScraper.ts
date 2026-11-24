import { BaseScraper } from './BaseScraper';
import { findJsonLd, parseJsonLd, parseCards } from './theme';
import { config } from '../config/env';

interface ExtrasItem {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  poster: string;
  rating: number | null;
  type: 'movie' | 'series';
  url: string;
  [k: string]: any;
}

/**
 * Feeds for the "misc" endpoints (top box office, coming soon, news, trailers).
 * The upstream sites expose these as ordinary list pages, so they are scraped
 * from the same theme-aware card parser as the rest of the API.
 */
export class MiscScraper extends BaseScraper {
  private async listCards(path: string, page = 1): Promise<ExtrasItem[]> {
    const endpoint = page > 1 ? `${path}/page/${page}/` : `${path}/`;
    const $ = await this.fetchHtml(endpoint);
    return parseCards($, $.root(), this.baseUrl).map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      year: c.year,
      poster: c.poster,
      rating: c.rating,
      type: c.type,
      url: c.url
    }));
  }

  /** Popular titles, used for /api/top-box-office. */
  async scrapeTopBoxOffice(limit = 20) {
    const items = await this.listCards('/populer');
    return items.slice(0, limit);
  }

  /** Titles published for the next calendar year, used for /api/coming-soon. */
  async scrapeComingSoon(limit = 20) {
    const nextYear = new Date().getFullYear() + 1;
    try {
      const items = await this.listCards(`/year/${nextYear}`);
      if (items.length) return items.slice(0, limit);
    } catch {
      /* fall through to the current-year list */
    }
    const current = await this.listCards(`/year/${new Date().getFullYear()}`);
    return current.slice(0, limit);
  }

  /**
   * YouTube trailers harvested from the detail pages of recent titles.
   * The `lo-*` theme on lk21official.fun publishes no trailer link, so every
   * configured base is tried and the first one that yields trailers wins.
   */
  async scrapeTrailers(limit = 12) {
    const bases = config.lk21BaseUrls?.length ? config.lk21BaseUrls : [config.lk21BaseUrl];

    for (const base of bases) {
      const out: ExtrasItem[] = [];

      let candidates: ExtrasItem[] = [];
      try {
        const $ = await this.fetchHtml(`${base.replace(/\/$/, '')}/latest/`);
        candidates = parseCards($, $.root(), base).map((c) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
          year: c.year,
          poster: c.poster,
          rating: c.rating,
          type: c.type,
          url: c.url
        }));
      } catch {
        continue;
      }

      const chunkSize = 4;
      const pool = candidates.slice(0, limit);
      for (let i = 0; i < pool.length; i += chunkSize) {
        const chunk = pool.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (item) => {
            try {
              const $ = await this.fetchHtml(item.url);
              const raw = this.extractTrailer($);
              if (!raw) return;
              const json = findJsonLd(parseJsonLd($), ['Movie', 'TVSeries']) || {};
              out.push({
                ...item,
                title: String(json.name || item.title),
                year: json.dateCreated ? parseInt(String(json.dateCreated).slice(0, 4), 10) || item.year : item.year,
                poster: String(json.image || item.poster),
                trailer: raw
              });
            } catch {
              /* skip titles without a detail page */
            }
          })
        );
      }

      if (out.length) return out.slice(0, limit);
    }

    return [];
  }

  /**
   * Recent posts from the WordPress REST API, used for /api/news.
   * Each post is a title card on LK21, so this doubles as a "latest updates" feed.
   */
  async scrapeNews(limit = 20) {
    const posts: any[] = await this.fetchJson(`/wp-json/wp/v2/posts?per_page=${limit}&_fields=id,slug,link,title,date,excerpt,categories`);
    return posts.map((p) => ({
      id: String(p.id),
      slug: p.slug,
      title: String(p.title?.rendered || '').replace(/<[^>]+>/g, '').trim(),
      url: p.link,
      publishedAt: p.date,
      excerpt: String(p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').trim(),
      categories: p.categories || []
    }));
  }
}
