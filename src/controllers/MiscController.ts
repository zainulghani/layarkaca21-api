import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { config } from '../config/env';
import { MiscScraper } from '../scrapers/MiscScraper';

const scraper = new MiscScraper();

export const getTopBoxOffice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await scraper.scrapeTopBoxOffice() });
  } catch (error) {
    next(error);
  }
};

export const getComingSoon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await scraper.scrapeComingSoon() });
  } catch (error) {
    next(error);
  }
};

export const getNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await scraper.scrapeNews() });
  } catch (error) {
    next(error);
  }
};

export const getTrailers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await scraper.scrapeTrailers() });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
};

export const getHealth = async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  let cacheStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e) {}

  try {
    if (redis.status === 'ready') cacheStatus = 'connected';
  } catch (e) {}

  const payload = {
    status: 'healthy',
    database: dbStatus,
    cache: cacheStatus,
    uptime: process.uptime()
  };
  res.json({
    success: true,
    ...payload,
    data: payload
  });
};

export const getDebugUpstream = async (req: Request, res: Response) => {
  const bases = config.lk21BaseUrls?.length ? config.lk21BaseUrls : [config.lk21BaseUrl];
  const results: any[] = [];
  for (const base of bases) {
    try {
      const r = await axios.get(`${base}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0' },
        timeout: 15000,
        validateStatus: () => true,
      });
      const html: string = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      results.push({ base, status: r.status, bytes: html.length, sample: html.slice(0, 200) });
    } catch (e: any) {
      results.push({ base, error: e?.message || String(e) });
    }
  }
  res.json({ success: true, proxy: config.proxyUrl ? 'configured' : 'none', results });
};
