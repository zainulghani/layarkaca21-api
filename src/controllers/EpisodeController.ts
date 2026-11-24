import { Request, Response, NextFunction } from 'express';
import { SeriesScraper } from '../scrapers/SeriesScraper';

const scraper = new SeriesScraper();

/**
 * Resolve the playable embed for a single episode.
 * The slug follows the upstream convention: <series-slug>-s<season>e<episode>
 * (e.g. against-the-current-s1e1).
 */
export const getEpisode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await scraper.scrapeEpisodeBySlug(id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
