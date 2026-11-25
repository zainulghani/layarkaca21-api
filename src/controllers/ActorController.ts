import { Request, Response, NextFunction } from 'express';
import { ActorCrawler } from '../scrapers/ActorCrawler';

const crawler = new ActorCrawler();

/**
 * Advance the incremental cast-credit crawler by one page per list and
 * return what was harvested. Cheap enough to call on a schedule.
 */
export const crawlCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '24'), 10) || 24, 60);
    const reports = await crawler.crawlPage(limit);
    const stats = await crawler.stats();
    res.json({ success: true, data: { reports, stats } });
  } catch (error) {
    next(error);
  }
};

/** Size of the local cast-credit index. */
export const getCreditStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await crawler.stats() });
  } catch (error) {
    next(error);
  }
};
