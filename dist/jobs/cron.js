"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../config/logger");
const HomeScraper_1 = require("../scrapers/HomeScraper");
const ActorCrawler_1 = require("../scrapers/ActorCrawler");
const startCronJobs = () => {
    const scraper = new HomeScraper_1.HomeScraper();
    const crawler = new ActorCrawler_1.ActorCrawler();
    // Run every 30 minutes
    node_cron_1.default.schedule('*/30 * * * *', async () => {
        logger_1.logger.info('Running background refresh for home metadata');
        try {
            await scraper.scrapeHome();
            // Logic to upsert into Prisma DB would go here
        }
        catch (error) {
            logger_1.logger.error('Cron job error', error);
        }
    });
    // Grow the cast-credit index. One list page per source per run keeps the
    // upstream load low while the index accumulates over days.
    node_cron_1.default.schedule('17 * * * *', async () => {
        logger_1.logger.info('Running incremental cast-credit crawl');
        try {
            const reports = await crawler.crawlPage(24);
            const stats = await crawler.stats();
            logger_1.logger.info(`Credit crawl done: ${JSON.stringify({ reports, stats })}`);
        }
        catch (error) {
            logger_1.logger.error('Credit crawl error', error);
        }
    });
    logger_1.logger.info('Cron jobs initialized');
};
exports.startCronJobs = startCronJobs;
