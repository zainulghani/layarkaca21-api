"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = void 0;
const SearchScraper_1 = require("../scrapers/SearchScraper");
const scraper = new SearchScraper_1.SearchScraper();
const search = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ success: false, error: 'Query parameter q is required' });
        }
        const page = parseInt(req.query.page) || 1;
        const { results, totalPages } = await scraper.search(q, page);
        res.json({
            success: true,
            query: q,
            page,
            totalPages,
            total: results.length,
            results
        });
    }
    catch (error) {
        next(error);
    }
};
exports.search = search;
