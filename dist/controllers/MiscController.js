"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDebugUpstream = exports.getHealth = exports.getRecommendations = exports.getTrailers = exports.getNews = exports.getComingSoon = exports.getTopBoxOffice = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../config/prisma");
const redis_1 = require("../config/redis");
const env_1 = require("../config/env");
const MiscScraper_1 = require("../scrapers/MiscScraper");
const scraper = new MiscScraper_1.MiscScraper();
const getTopBoxOffice = async (req, res, next) => {
    try {
        res.json({ success: true, data: await scraper.scrapeTopBoxOffice() });
    }
    catch (error) {
        next(error);
    }
};
exports.getTopBoxOffice = getTopBoxOffice;
const getComingSoon = async (req, res, next) => {
    try {
        res.json({ success: true, data: await scraper.scrapeComingSoon() });
    }
    catch (error) {
        next(error);
    }
};
exports.getComingSoon = getComingSoon;
const getNews = async (req, res, next) => {
    try {
        res.json({ success: true, data: await scraper.scrapeNews() });
    }
    catch (error) {
        next(error);
    }
};
exports.getNews = getNews;
const getTrailers = async (req, res, next) => {
    try {
        res.json({ success: true, data: await scraper.scrapeTrailers() });
    }
    catch (error) {
        next(error);
    }
};
exports.getTrailers = getTrailers;
const getRecommendations = async (req, res) => {
    res.json({ success: true, data: [] });
};
exports.getRecommendations = getRecommendations;
const getHealth = async (req, res) => {
    let dbStatus = 'disconnected';
    let cacheStatus = 'disconnected';
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        dbStatus = 'connected';
    }
    catch (e) { }
    try {
        if (redis_1.redis.status === 'ready')
            cacheStatus = 'connected';
    }
    catch (e) { }
    res.json({
        success: true,
        status: 'healthy',
        database: dbStatus,
        cache: cacheStatus,
        uptime: process.uptime()
    });
};
exports.getHealth = getHealth;
const getDebugUpstream = async (req, res) => {
    const bases = env_1.config.lk21BaseUrls?.length ? env_1.config.lk21BaseUrls : [env_1.config.lk21BaseUrl];
    const results = [];
    for (const base of bases) {
        try {
            const r = await axios_1.default.get(`${base}/`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0' },
                timeout: 15000,
                validateStatus: () => true,
            });
            const html = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
            results.push({ base, status: r.status, bytes: html.length, sample: html.slice(0, 200) });
        }
        catch (e) {
            results.push({ base, error: e?.message || String(e) });
        }
    }
    res.json({ success: true, proxy: env_1.config.proxyUrl ? 'configured' : 'none', results });
};
exports.getDebugUpstream = getDebugUpstream;
