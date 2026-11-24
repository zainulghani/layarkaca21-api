import { BaseScraper } from './BaseScraper';
import { parseCards, parseHasNextPage, parseTotalPages } from './theme';
import { logger } from '../config/logger';

export class CategoryScraper extends BaseScraper {
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
      // A page beyond the last one is not an error for the caller.
      return { page, totalPages: page, items: [] };
    }
  }
}
