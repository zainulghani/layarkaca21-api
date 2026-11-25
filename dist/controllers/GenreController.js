"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMoviesByGenre = exports.getGenres = void 0;
const CategoryScraper_1 = require("../scrapers/CategoryScraper");
const scraper = new CategoryScraper_1.CategoryScraper();
const getGenres = async (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'action', name: 'Action', slug: 'action' },
            { id: 'adventure', name: 'Adventure', slug: 'adventure' },
            { id: 'animation', name: 'Animation', slug: 'animation' },
            { id: 'biography', name: 'Biography', slug: 'biography' },
            { id: 'comedy', name: 'Comedy', slug: 'comedy' },
            { id: 'crime', name: 'Crime', slug: 'crime' },
            { id: 'documentary', name: 'Documentary', slug: 'documentary' },
            { id: 'drama', name: 'Drama', slug: 'drama' },
            { id: 'family', name: 'Family', slug: 'family' },
            { id: 'fantasy', name: 'Fantasy', slug: 'fantasy' },
            { id: 'history', name: 'History', slug: 'history' },
            { id: 'horror', name: 'Horror', slug: 'horror' },
            { id: 'musical', name: 'Musical', slug: 'musical' },
            { id: 'mystery', name: 'Mystery', slug: 'mystery' },
            { id: 'romance', name: 'Romance', slug: 'romance' },
            { id: 'sci-fi', name: 'Sci-Fi', slug: 'sci-fi' },
            { id: 'sport', name: 'Sport', slug: 'sport' },
            { id: 'thriller', name: 'Thriller', slug: 'thriller' },
            { id: 'war', name: 'War', slug: 'war' },
            { id: 'western', name: 'Western', slug: 'western' }
        ]
    });
};
exports.getGenres = getGenres;
/** Legacy alias: /genre/:slug/movies -> same payload as /home/genre/:slug. */
const getMoviesByGenre = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const page = parseInt(req.query.page) || 1;
        const data = await scraper.scrapeCategory(`genre/${slug}`, page);
        res.json({
            success: true,
            page: data.page,
            totalPages: data.totalPages,
            total: data.items.length,
            data: data.items
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMoviesByGenre = getMoviesByGenre;
