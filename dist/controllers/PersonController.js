"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPopularActors = exports.getPerson = void 0;
const PersonScraper_1 = require("../scrapers/PersonScraper");
const scraper = new PersonScraper_1.PersonScraper();
const getPerson = async (req, res, next) => {
    try {
        res.json({ success: true, data: await scraper.getPerson(req.params.id) });
    }
    catch (error) {
        next(error);
    }
};
exports.getPerson = getPerson;
const getPopularActors = async (req, res, next) => {
    try {
        res.json({ success: true, data: await scraper.getPopularActors() });
    }
    catch (error) {
        next(error);
    }
};
exports.getPopularActors = getPopularActors;
