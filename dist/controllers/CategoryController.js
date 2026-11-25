"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRootCategoryMovies = exports.getCategoryMovies = void 0;
const CategoryScraper_1 = require("../scrapers/CategoryScraper");
const scraper = new CategoryScraper_1.CategoryScraper();
// Handles genre, country, year
const getCategoryMovies = async (req, res, next) => {
    try {
        let { category, slug } = req.params; // category can be 'genre', 'country', 'years'
        const page = parseInt(req.query.page) || 1;
        // Routes are declared as '/home/genre/:slug', so the category segment is part of
        // the path, not a named param. Recover it from the matched route.
        if (!category) {
            const matched = String(req.route?.path || req.path || '');
            const m = matched.match(/\/(genre|country|years|year)\//);
            category = m ? m[1] : '';
        }
        // LK21 uses 'year' not 'years'
        if (category === 'years')
            category = 'year';
        // Construct path for LK21. e.g., 'genre/action' or 'country/indonesia'
        const path = `${category}/${slug}`;
        const data = await scraper.scrapeCategory(path, page);
        res.json({ success: true, ...data });
    }
    catch (error) {
        next(error);
    }
};
exports.getCategoryMovies = getCategoryMovies;
// Handles root categories like popular, rating, release, etc.
const getRootCategoryMovies = async (req, res, next) => {
    try {
        const { slug } = req.params; // e.g., 'populer', 'rating', 'komen-terbanyak'
        const page = parseInt(req.query.page) || 1;
        const data = await scraper.scrapeCategory(slug, page);
        res.json({ success: true, ...data });
    }
    catch (error) {
        next(error);
    }
};
exports.getRootCategoryMovies = getRootCategoryMovies;
