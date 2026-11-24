import { Request, Response, NextFunction } from 'express';
import { SearchScraper } from '../scrapers/SearchScraper';

const scraper = new SearchScraper();

export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: 'Query parameter q is required' });
    }
    const page = parseInt(req.query.page as string) || 1;
    const { results, totalPages } = await scraper.search(q, page);
    res.json({
      success: true,
      query: q,
      page,
      totalPages,
      total: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
};
