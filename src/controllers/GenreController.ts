import { Request, Response, NextFunction } from 'express';
import { CategoryScraper } from '../scrapers/CategoryScraper';

const scraper = new CategoryScraper();

export const getGenres = async (req: Request, res: Response) => {
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

/** Legacy alias: /genre/:slug/movies -> same payload as /home/genre/:slug. */
export const getMoviesByGenre = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const data = await scraper.scrapeCategory(`genre/${slug}`, page);
    res.json({
      success: true,
      page: data.page,
      totalPages: data.totalPages,
      total: data.items.length,
      data: data.items
    });
  } catch (error) {
    next(error);
  }
};
