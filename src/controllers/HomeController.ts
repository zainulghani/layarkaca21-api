import { Request, Response, NextFunction } from 'express';
import { HomeScraper } from '../scrapers/HomeScraper';

const scraper = new HomeScraper();

// Helper to fetch details for a slice of movies (max 10 items)
const appendExtraDetails = async (items: any[]) => {
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

export const getHome = async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (error) {
    next(error);
  }
};

export const getLatestMovies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.latestMovies) });
  } catch (error) {
    next(error);
  }
};

export const getLatestSeries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.latestSeries) });
  } catch (error) {
    next(error);
  }
};

export const getTopMonth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.topMonth) });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.recommendations) });
  } catch (error) {
    next(error);
  }
};

export const getFamily = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.family) });
  } catch (error) {
    next(error);
  }
};

export const getAction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.action) });
  } catch (error) {
    next(error);
  }
};

export const getDrakor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.drakor) });
  } catch (error) {
    next(error);
  }
};

export const getHorror = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.horror) });
  } catch (error) {
    next(error);
  }
};

export const getRomance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.romance) });
  } catch (error) {
    next(error);
  }
};

export const getKorea = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.korea) });
  } catch (error) {
    next(error);
  }
};

export const getThailand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.thailand) });
  } catch (error) {
    next(error);
  }
};

export const getIndia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.india) });
  } catch (error) {
    next(error);
  }
};

export const getFilmUnggulan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.filmUnggulan) });
  } catch (error) {
    next(error);
  }
};

export const getSeriesUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.seriesUpdate) });
  } catch (error) {
    next(error);
  }
};

export const getComedy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await scraper.scrapeHome();
    res.json({ success: true, data: await appendExtraDetails(data.comedy) });
  } catch (error) {
    next(error);
  }
};
