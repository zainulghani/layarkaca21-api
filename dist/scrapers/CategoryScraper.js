"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryScraper = void 0;
const BaseScraper_1 = require("./BaseScraper");
const theme_1 = require("./theme");
const logger_1 = require("../config/logger");
class CategoryScraper extends BaseScraper_1.BaseScraper {
    async scrapeCategory(path, page = 1) {
        // path examples: 'populer', 'rating', 'release', 'latest', 'series-terbaru',
        // 'genre/action', 'country/korea', 'year/2025'
        const endpoint = page > 1 ? `/${path}/page/${page}/` : `/${path}/`;
        try {
            const $ = await this.fetchHtml(endpoint);
            let totalPages = (0, theme_1.parseTotalPages)($);
            // The theme reports "dari 1" on the first page even when more pages exist,
            // so read the real total from page 2 when that happens.
            if (page === 1 && totalPages <= 1 && (0, theme_1.parseHasNextPage)($)) {
                try {
                    const second = await this.fetchHtml(`/${path}/page/2/`);
                    const secondTotal = (0, theme_1.parseTotalPages)(second);
                    if (secondTotal > 1)
                        totalPages = secondTotal;
                }
                catch {
                    /* keep the fallback total */
                }
            }
            const items = (0, theme_1.parseCards)($, $.root(), this.baseUrl).map((c) => ({
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
        }
        catch (error) {
            logger_1.logger.error(`Category scrape failed for ${endpoint}: ${error?.message}`, error?.status);
            // A page beyond the last one is not an error for the caller.
            return { page, totalPages: page, items: [] };
        }
    }
}
exports.CategoryScraper = CategoryScraper;
