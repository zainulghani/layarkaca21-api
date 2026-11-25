import { Router } from 'express';
import { 
  getHome, 
  getFilmUnggulan,
  getLatestMovies, 
  getLatestSeries, 
  getSeriesUpdate,
  getTopMonth, 
  getRecommendations,
  getFamily,
  getAction,
  getDrakor,
  getHorror,
  getRomance,
  getComedy,
  getKorea,
  getThailand,
  getIndia
} from '../controllers/HomeController';
import { search } from '../controllers/SearchController';
import { getMovie, getMovieCast } from '../controllers/MovieController';
import { getSeries, getSeriesSeasons, getSeriesEpisodes } from '../controllers/SeriesController';
import { getEpisode } from '../controllers/EpisodeController';
import { getPerson, getPopularActors } from '../controllers/PersonController';
import { crawlCredits, getCreditStats } from '../controllers/ActorController';
import { getMoviesByGenre } from '../controllers/GenreController';
import { 
  getCountries, 
  getYears, 
  getSeriesMenu, 
  getPopularMenu, 
  getAllNavigation,
  getGenres
} from '../controllers/NavigationController';
import { getCategoryMovies, getRootCategoryMovies } from '../controllers/CategoryController';
import { getTopBoxOffice, getComingSoon, getNews, getTrailers, getHealth, getDebugUpstream } from '../controllers/MiscController';
import { cache } from '../middlewares/cache';
import { runCron } from '../controllers/CronController';

const router = Router();

router.get('/cron', runCron);

router.get('/home', getHome);
router.get('/home/film-unggulan', getFilmUnggulan);
router.get('/home/latest-movies', getLatestMovies);
router.get('/home/latest-series', getLatestSeries);
router.get('/home/series-update', getSeriesUpdate);
router.get('/home/top-month', getTopMonth);
router.get('/home/recommendations', getRecommendations);
router.get('/home/family', getFamily);
router.get('/home/action', getAction);
router.get('/home/drakor', getDrakor);
router.get('/home/horror', getHorror);
router.get('/home/romance', getRomance);
router.get('/home/comedy', getComedy);
router.get('/home/korea', getKorea);
router.get('/home/thailand', getThailand);
router.get('/home/india', getIndia);

router.get('/search', cache(3600), search);

router.get('/movie/:id', cache(86400), getMovie);
router.get('/movie/:id/cast', cache(86400), getMovieCast);

router.get('/series/:id', cache(86400), getSeries);
router.get('/series/:id/seasons', cache(86400), getSeriesSeasons);
router.get('/series/:id/episodes', cache(86400), getSeriesEpisodes);

router.get('/episode/:id', cache(3600), getEpisode);

router.get('/person/:id', cache(86400), getPerson);
router.get('/actors/popular', cache(86400), getPopularActors);
router.get('/actors/crawl', crawlCredits);
router.get('/actors/stats', getCreditStats);

// Navigation & Menus
router.get('/home/navigation', cache(86400), getAllNavigation);
router.get('/home/genre', cache(86400), getGenres);
router.get('/home/country', cache(86400), getCountries);
router.get('/home/years', cache(86400), getYears);
router.get('/home/series', cache(86400), getSeriesMenu);
router.get('/home/populer', cache(86400), getPopularMenu);

// Category Movies
router.get('/home/genre/:slug', getCategoryMovies);
router.get('/home/country/:slug', getCategoryMovies);
router.get('/home/years/:slug', getCategoryMovies);
router.get('/home/series/:slug', getRootCategoryMovies);
router.get('/home/populer/:slug', getRootCategoryMovies);

// Legacy backward compatibility if needed, but the above are the main ones now
router.get('/genre/:slug/movies', cache(3600), getMoviesByGenre);

router.get('/top-box-office', cache(3600), getTopBoxOffice);
router.get('/coming-soon', cache(3600), getComingSoon);
router.get('/news', cache(3600), getNews);
router.get('/trailers', cache(3600), getTrailers);

router.get('/health', getHealth);
router.get('/debug/upstream', getDebugUpstream);

export default router;
