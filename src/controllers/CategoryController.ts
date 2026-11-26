import { Request, Response, NextFunction } from 'express';
import { CategoryScraper } from '../scrapers/CategoryScraper';
import { isKnownTaxonomySlug } from '../scrapers/TaxonomyValidator';

const scraper = new CategoryScraper();

// Handles genre, country, year
export const getCategoryMovies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { category, slug } = req.params as any; // category can be 'genre', 'country', 'years'
    const page = parseInt(req.query.page as string) || 1;

    // Routes are declared as '/home/genre/:slug', so the category segment is part of
    // the path, not a named param. Recover it from the matched route.
    if (!category) {
      const matched = String(req.route?.path || req.path || '');
      const m = matched.match(/\/(genre|country|years|year)\//);
      category = m ? m[1] : '';
    }

    // LK21 uses 'year' not 'years'
    if (category === 'years') category = 'year';

    // The upstream answers 200 with an empty page for an unknown slug, so a
    // typo would look like an empty category. Check the slug against the
    // published navigation menus and answer 404 when it is not there.
    const kind =
      category === 'genre' ? 'genre' : category === 'country' ? 'country' : category === 'year' ? 'year' : null;
    if (kind && !(await isKnownTaxonomySlug(kind, slug))) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Unknown ${kind} "${slug}"`,
          status: 404
        }
      });
    }

    // Construct path for LK21. e.g., 'genre/action' or 'country/indonesia'
    const path = `${category}/${slug}`;

    const data = await scraper.scrapeCategory(path, page);
    res.json({ success: true, ...data, data });
  } catch (error) {
    next(error);
  }
};

// Handles root categories like popular, rating, release, etc.
//
// The upstream theme publishes a fixed set of root lists: /latest/,
// /populer/, /rating/, /release/, /series-terbaru/ and /abjad/. Any other
// slug is a client error, so it is rejected with the list of valid ones
// instead of silently returning an empty page.
//
// Note: /home/series and /home/populer return the *items* of the series and
// popular lists. Their ids feed /api/series/:id and /api/movie/:id, which are
// the endpoints that return the detail of a single title.
export const getRootCategoryMovies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params; // e.g., 'populer', 'rating', 'release'
    const page = parseInt(req.query.page as string) || 1;

    try {
      const data = await scraper.scrapeCategory(slug, page);
      res.json({ success: true, ...data, data });
    } catch (error: any) {
      // The slug does not exist upstream. Say so plainly and list the root
      // categories that do exist, instead of returning an empty list.
      if (error?.status === 404) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Unknown category "${slug}"`,
            status: 404
          },
          available: CategoryScraper.ROOT_CATEGORIES
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};
