import { BaseScraper } from './BaseScraper';
import { findJsonLd, isoDurationToText, parseJsonLd } from './theme';

export interface DetailData {
  title: string;
  originalTitle: string;
  description: string;
  year: number | null;
  rating: number | null;
  runtime: string | null;
  poster: string;
  backdrop: string;
  trailer: string | null;
  genres: string[];
  countries: string[];
  cast: string[];
  crew: any[];
  streamembed: any[];
  votes: string | null;
  releaseDate: string | null;
  isSeries: boolean;
  raw: any;
}

/**
 * Shared detail-page parsing for both the `lo-*` theme (lk21official.fun) and the
 * `grid-poster` theme (lk21official.cloud). JSON-LD is the primary source when the
 * upstream publishes it; the theme-specific markup fills the gaps.
 */
export class DetailScraper extends BaseScraper {
  protected async loadDetail(urls: string[]): Promise<{ $: any; json: any; url: string } | null> {
    let lastError: any = null;
    for (const url of urls) {
      try {
        const $ = await this.fetchHtml(url);
        const blocks = parseJsonLd($);
        const media = findJsonLd(blocks, ['Movie', 'TVSeries', 'TVEpisode', 'VideoObject']);
        return { $, json: media || {}, url };
      } catch (err: any) {
        lastError = err;
        if (err?.status === 404) continue;
        throw err;
      }
    }
    if (lastError) throw lastError;
    return null;
  }

  protected buildDetail($: any, json: any): DetailData {
    const type = String(json['@type'] || '');
    const isSeries = type === 'TVSeries' || type === 'TVEpisode';

    // --- title -----------------------------------------------------------
    const h1 = $('.lo-h1').first().text().trim();
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    let title = (json.name || '').trim();
    if (!title && h1) {
      title = h1
        .replace(/^Nonton\s+/i, '')
        .replace(/\s*\(\d{4}\).*$/, '')
        .replace(/\s+Sub Indo.*$/i, '')
        .trim();
    }
    if (!title && ogTitle) title = ogTitle.split('|')[0].trim();

    // --- description -----------------------------------------------------
    const sinopsis = $('.lo-sinopsis-teks').first().text().trim();
    const description = (json.description || sinopsis || '').trim();

    // --- poster ----------------------------------------------------------
    const poster = json.image || $('img[alt^="Poster"]').first().attr('src') || $('figure.grid-poster img').first().attr('src') || '';

    // --- year ------------------------------------------------------------
    let year: number | null = null;
    if (json.dateCreated) year = parseInt(String(json.dateCreated).slice(0, 4), 10) || null;
    else if (json.startDate) year = parseInt(String(json.startDate).slice(0, 4), 10) || null;
    if (!year) {
      const metaYear = $('.lo-meta-item').toArray().map((e: any) => $(e).text().trim()).find((t: string) => /^\d{4}$/.test(t));
      if (metaYear) year = parseInt(metaYear, 10);
    }
    if (!year) {
      const titleYear = $('.lo-h1').first().text().match(/\((\d{4})\)/);
      if (titleYear) year = parseInt(titleYear[1], 10);
    }

    // --- rating ----------------------------------------------------------
    const ratingRaw = $('.lo-rating-angka').first().text().trim();
    const rating = json.aggregateRating?.ratingValue
      ? parseFloat(String(json.aggregateRating.ratingValue))
      : (parseFloat(ratingRaw) || null);

    // --- runtime ---------------------------------------------------------
    let runtime = isoDurationToText(json.duration);
    if (!runtime) {
      const metaItems = $('.lo-meta-item').toArray().map((e: any) => $(e).text().trim());
      const dur = metaItems.find((t: string) => /\d+h\s*\d*m/i.test(t));
      if (dur) runtime = dur.replace(/\s+/g, ' ').trim();
    }

    // --- genres & countries ----------------------------------------------
    const genres: string[] = [];
    const countries: string[] = [];
    $('.lo-chip-baris .lo-chip').each((_: any, el: any) => {
      const href = $(el).attr('href') || '';
      const label = $(el).text().trim();
      if (!label) return;
      if (/\/genre\//.test(href)) genres.push(label);
      else if (/\/country\//.test(href)) countries.push(label);
    });
    if (genres.length === 0 && json.genre) {
      const raw = Array.isArray(json.genre) ? json.genre : String(json.genre).split(',');
      raw.forEach((g: any) => genres.push(String(g).trim()));
    }
    if (countries.length === 0) {
      const metaItems = $('.lo-meta-item').toArray().map((e: any) => $(e).text().trim());
      const country = metaItems.find((t: string) => t && !/^\d{4}$/.test(t) && !/h\s*\d*m/i.test(t) && !/^(hd|4k|sd)$/i.test(t));
      if (country) countries.push(country);
    }

    // --- cast & crew -----------------------------------------------------
    const cast: string[] = [];
    const crew: any[] = [];
    if (Array.isArray(json.actor)) {
      json.actor.forEach((a: any) => {
        if (a?.name) cast.push(String(a.name));
      });
    }
    if (Array.isArray(json.director)) {
      json.director.forEach((d: any) => {
        if (d?.name) crew.push({ name: String(d.name), role: 'Director' });
      });
    } else if (json.director?.name) {
      crew.push({ name: String(json.director.name), role: 'Director' });
    }

    // --- streaming -------------------------------------------------------
    const streamembed: any[] = [];
    const video = findJsonLd(parseJsonLd($), ['VideoObject']);
    if (video?.embedUrl) {
      streamembed.push({ provider: 'EMBED', url: String(video.embedUrl) });
    }
    if (streamembed.length === 0) {
      const playerSrc = $('[data-lo-player]').first().attr('data-src');
      if (playerSrc) streamembed.push({ provider: 'EMBED', url: playerSrc });
    }
    if (streamembed.length === 0) {
      const dl = $('.lo-btn-dl').first().attr('href');
      if (dl) streamembed.push({ provider: 'EMBED', url: dl });
    }

    return {
      title,
      originalTitle: title,
      description,
      year,
      rating,
      runtime,
      poster,
      backdrop: poster,
      trailer: this.extractTrailer($),
      genres,
      countries,
      cast,
      crew,
      streamembed,
      votes: json.aggregateRating?.ratingCount ? String(json.aggregateRating.ratingCount) : null,
      releaseDate: json.datePublished || json.uploadDate || null,
      isSeries,
      raw: json
    };
  }
}
