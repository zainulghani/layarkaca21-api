import { BaseScraper } from './BaseScraper';
import { parseCards, parseHasNextPage, parseTotalPages } from './theme';
import { logger } from '../config/logger';

export class CategoryScraper extends BaseScraper {
  /**
   * Root categories that the upstream theme publishes as plain top-level
   * lists. Used by the API to tell a client that a slug is not a category at
   * all, rather than silently returning an empty page.
   */
  static readonly ROOT_CATEGORIES = [
    'latest',
    'populer',
    'rating',
    'release',
    'series-terbaru',
    'abjad'
  ];

  async scrapeCategory(path: string, page: number = 1) {
    // path examples: 'populer', 'rating', 'release', 'latest', 'series-terbaru',
    // 'genre/action', 'country/korea', 'year/2025'
    const endpoint = page > 1 ? `/${path}/page/${page}/` : `/${path}/`;

    try {
      const $ = await this.fetchHtml(endpoint);
      let totalPages = parseTotalPages($);

      // The theme reports "dari 1" on the first page even when more pages exist,
      // so read the real total from page 2 when that happens.
      if (page === 1 && totalPages <= 1 && parseHasNextPage($)) {
        try {
          const second = await this.fetchHtml(`/${path}/page/2/`);
          const secondTotal = parseTotalPages(second);
          if (secondTotal > 1) totalPages = secondTotal;
        } catch {
          /* keep the fallback total */
        }
      }

      const items = parseCards($, $.root(), this.baseUrl).map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        year: c.year,
        poster: c.poster,
        rating: c.rating,
        duration: c.duration,
        genre: c.genre,
        type: c.type,
        url: c.url
      }));

      return {
        page,
        totalPages,
        items
      };
    } catch (error: any) {
      logger.error(`Category scrape failed for ${endpoint}: ${error?.message}`, error?.status);
      // A 404 means the category does not exist upstream. Propagate it so the
      // client gets a 404 instead of an empty list that looks like a valid
      // category with no titles.
      if (error?.status === 404) throw error;
      // A page beyond the last one is not an error for the caller.
      return { page, totalPages: page, items: [] };
    }
  }
}
