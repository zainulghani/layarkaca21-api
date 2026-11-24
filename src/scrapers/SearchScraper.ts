import { BaseScraper } from './BaseScraper';
import { parseCards, parseTotalPages } from './theme';

export class SearchScraper extends BaseScraper {
  async search(query: string, page: number = 1) {
    const endpoint = page > 1
      ? `/page/${page}/?s=${encodeURIComponent(query)}`
      : `/?s=${encodeURIComponent(query)}`;

    const $ = await this.fetchHtml(endpoint);
    const results = parseCards($, $.root(), this.baseUrl).map((c) => ({
      id: c.id,
      slug: c.slug,
      type: c.type,
      title: c.title,
      year: c.year,
      poster: c.poster,
      rating: c.rating,
      duration: c.duration,
      genre: c.genre,
      url: c.url
    }));

    return { results, totalPages: parseTotalPages($) };
  }
}
