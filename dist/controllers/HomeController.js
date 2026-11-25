"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComedy = exports.getSeriesUpdate = exports.getFilmUnggulan = exports.getIndia = exports.getThailand = exports.getKorea = exports.getRomance = exports.getHorror = exports.getDrakor = exports.getAction = exports.getFamily = exports.getRecommendations = exports.getTopMonth = exports.getLatestSeries = exports.getLatestMovies = exports.getHome = void 0;
const HomeScraper_1 = require("../scrapers/HomeScraper");
const scraper = new HomeScraper_1.HomeScraper();
// Helper to fetch details for a slice of movies (max 10 items)
const appendExtraDetails = async (items) => {
    const chunkSize = 5;
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (item) => {
            const extra = await scraper.fetchExtraDetails(item.path || item.id);
            Object.assign(item, extra);
        }));
    }
    return items;
};
const getHome = async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: {
                filmUnggulan: "/api/home/film-unggulan",
                latestMovies: "/api/home/latest-movies",
                latestSeries: "/api/home/latest-series",
                seriesUpdate: "/api/home/series-update",
                topMonth: "/api/home/top-month",
                recommendations: "/api/home/recommendations",
                family: "/api/home/family",
                action: "/api/home/action",
                drakor: "/api/home/drakor",
                horror: "/api/home/horror",
                comedy: "/api/home/comedy",
                korea: "/api/home/korea",
                thailand: "/api/home/thailand",
                india: "/api/home/india",
                navigation: {
                    genre: "/api/home/genre",
                    country: "/api/home/country",
                    years: "/api/home/years",
                    series: "/api/home/series",
                    populer: "/api/home/populer"
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getHome = getHome;
const getLatestMovies = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.latestMovies) });
    }
    catch (error) {
        next(error);
    }
};
exports.getLatestMovies = getLatestMovies;
const getLatestSeries = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.latestSeries) });
    }
    catch (error) {
        next(error);
    }
};
exports.getLatestSeries = getLatestSeries;
const getTopMonth = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.topMonth) });
    }
    catch (error) {
        next(error);
    }
};
exports.getTopMonth = getTopMonth;
const getRecommendations = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.recommendations) });
    }
    catch (error) {
        next(error);
    }
};
exports.getRecommendations = getRecommendations;
const getFamily = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.family) });
    }
    catch (error) {
        next(error);
    }
};
exports.getFamily = getFamily;
const getAction = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.action) });
    }
    catch (error) {
        next(error);
    }
};
exports.getAction = getAction;
const getDrakor = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.drakor) });
    }
    catch (error) {
        next(error);
    }
};
exports.getDrakor = getDrakor;
const getHorror = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.horror) });
    }
    catch (error) {
        next(error);
    }
};
exports.getHorror = getHorror;
const getRomance = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.romance) });
    }
    catch (error) {
        next(error);
    }
};
exports.getRomance = getRomance;
const getKorea = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.korea) });
    }
    catch (error) {
        next(error);
    }
};
exports.getKorea = getKorea;
const getThailand = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.thailand) });
    }
    catch (error) {
        next(error);
    }
};
exports.getThailand = getThailand;
const getIndia = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.india) });
    }
    catch (error) {
        next(error);
    }
};
exports.getIndia = getIndia;
const getFilmUnggulan = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.filmUnggulan) });
    }
    catch (error) {
        next(error);
    }
};
exports.getFilmUnggulan = getFilmUnggulan;
const getSeriesUpdate = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.seriesUpdate) });
    }
    catch (error) {
        next(error);
    }
};
exports.getSeriesUpdate = getSeriesUpdate;
const getComedy = async (req, res, next) => {
    try {
        const data = await scraper.scrapeHome();
        res.json({ success: true, data: await appendExtraDetails(data.comedy) });
    }
    catch (error) {
        next(error);
    }
};
exports.getComedy = getComedy;
