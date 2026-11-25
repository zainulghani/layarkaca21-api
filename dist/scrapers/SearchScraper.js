"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchScraper = void 0;
const BaseScraper_1 = require("./BaseScraper");
const theme_1 = require("./theme");
class SearchScraper extends BaseScraper_1.BaseScraper {
    async search(query, page = 1) {
        const endpoint = page > 1
            ? `/page/${page}/?s=${encodeURIComponent(query)}`
            : `/?s=${encodeURIComponent(query)}`;
        const $ = await this.fetchHtml(endpoint);
        const results = (0, theme_1.parseCards)($, $.root(), this.baseUrl).map((c) => ({
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
        return { results, totalPages: (0, theme_1.parseTotalPages)($) };
    }
}
exports.SearchScraper = SearchScraper;
