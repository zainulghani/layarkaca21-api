import { Request, Response, NextFunction } from 'express';
import { PersonScraper } from '../scrapers/PersonScraper';

const scraper = new PersonScraper();

export const getPerson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await scraper.getPerson(req.params.id) });
  } catch (error) {
    next(error);
  }
};

export const getPopularActors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await scraper.getPopularActors() });
  } catch (error) {
    next(error);
  }
};
