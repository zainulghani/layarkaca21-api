import cron from 'node-cron';
import { logger } from '../config/logger';
import { HomeScraper } from '../scrapers/HomeScraper';
import { ActorCrawler } from '../scrapers/ActorCrawler';

export const startCronJobs = () => {
  const scraper = new HomeScraper();
  const crawler = new ActorCrawler();

  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.info('Running background refresh for home metadata');
    try {
      await scraper.scrapeHome();
      // Logic to upsert into Prisma DB would go here
    } catch (error) {
      logger.error('Cron job error', error);
    }
  });

  // Grow the cast-credit index. One list page per source per run keeps the
  // upstream load low while the index accumulates over days.
  cron.schedule('17 * * * *', async () => {
    logger.info('Running incremental cast-credit crawl');
    try {
      const reports = await crawler.crawlPage(24);
      const stats = await crawler.stats();
      logger.info(`Credit crawl done: ${JSON.stringify({ reports, stats })}`);
    } catch (error) {
      logger.error('Credit crawl error', error);
    }
  });

  logger.info('Cron jobs initialized');
};
