"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeriesScraper = void 0;
const DetailScraper_1 = require("./DetailScraper");
const theme_1 = require("./theme");
class SeriesScraper extends DetailScraper_1.DetailScraper {
    async scrapeDetail(slug) {
        const detail = await this.loadDetail([`/series/${slug}/`, `/${slug}/`]);
        if (!detail)
            throw new Error('Series not found');
        if (detail.json['@type'] === 'Movie') {
            const { MovieScraper } = require('./MovieScraper');
            return new MovieScraper().scrapeDetail(slug);
        }
        const $ = detail.$;
        const d = this.buildDetail($, detail.json);
        const poster = d.poster;
        // ---- seasons & episodes --------------------------------------------
        const seasons = [];
        const loSeasonGrids = $('[data-season]');
        if (loSeasonGrids.length > 0) {
            loSeasonGrids.each((_, el) => {
                const grid = $(el);
                const seasonNumber = parseInt(grid.attr('data-season') || '1', 10) || 1;
                const episodes = [];
                grid.find('a.lo-eps-kotak').each((__, a) => {
                    const href = $(a).attr('href') || '';
                    const num = parseInt($(a).text().trim(), 10);
                    const epMatch = href.match(/-s(\d+)e(\d+)/i);
                    const season = epMatch ? parseInt(epMatch[1], 10) : seasonNumber;
                    const epNum = epMatch ? parseInt(epMatch[2], 10) : (isNaN(num) ? episodes.length + 1 : num);
                    episodes.push({
                        id: `${slug}-s${season}e${epNum}`,
                        slug: `${slug}-s${season}e${epNum}`,
                        episodeNumber: epNum,
                        seasonNumber: season,
                        title: `Episode ${epNum}`,
                        rating: null,
                        thumbnail: poster,
                        airDate: null,
                        url: href,
                        embedUrl: null
                    });
                });
                if (episodes.length === 0)
                    return;
                seasons.push({
                    id: `season_${seasonNumber}`,
                    seasonNumber,
                    name: `Season ${seasonNumber}`,
                    episodeCount: episodes.length,
                    poster,
                    episodes
                });
            });
        }
        else {
            // Fallback: derive episodes from any "-s1eN" style links on the page.
            const episodes = [];
            $('a').each((_, el) => {
                const href = $(el).attr('href') || '';
                const m = href.match(/-s(\d+)e(\d+)/i);
                if (!m)
                    return;
                episodes.push({
                    id: `${slug}-s${m[1]}e${m[2]}`,
                    slug: `${slug}-s${m[1]}e${m[2]}`,
                    episodeNumber: parseInt(m[2], 10),
                    seasonNumber: parseInt(m[1], 10),
                    title: `Episode ${m[2]}`,
                    rating: null,
                    thumbnail: poster,
                    airDate: null,
                    url: href,
                    embedUrl: null
                });
            });
            if (episodes.length) {
                const bySeason = {};
                episodes.forEach((e) => {
                    (bySeason[e.seasonNumber] = bySeason[e.seasonNumber] || []).push(e);
                });
                Object.keys(bySeason).forEach((s) => {
                    const list = bySeason[Number(s)];
                    seasons.push({
                        id: `season_${s}`,
                        seasonNumber: Number(s),
                        name: `Season ${s}`,
                        episodeCount: list.length,
                        poster,
                        episodes: list
                    });
                });
            }
        }
        // ---- streaming for the newest episode ------------------------------
        const streamembed = [];
        const latestHref = $('.lo-terbaru-link').first().attr('href') || '';
        if (latestHref) {
            try {
                const ep$ = await this.fetchHtml(latestHref);
                const video = (0, theme_1.findJsonLd)((0, theme_1.parseJsonLd)(ep$), ['VideoObject']);
                if (video?.embedUrl)
                    streamembed.push({ provider: 'EMBED', url: String(video.embedUrl) });
            }
            catch {
                /* streaming link is best-effort */
            }
        }
        if (streamembed.length === 0) {
            const btn = $('.lo-btn-abu').first().attr('href');
            if (btn)
                streamembed.push({ provider: 'EMBED', url: btn });
        }
        const allEpisodes = seasons.flatMap((s) => s.episodes);
        const response = {
            id: slug,
            slug,
            title: d.title,
            description: d.description,
            rating: d.rating,
            year: d.year,
            runtime: d.runtime,
            poster,
            backdrop: poster,
            trailer: d.trailer,
            genres: d.genres,
            countries: d.countries,
            cast: d.cast,
            crew: d.crew,
            totalSeasons: seasons.length || 1,
            totalEpisodes: allEpisodes.length,
            seasons,
            streamembed,
            instructions: "Pilih episode pada daftar di bawah ini, lalu buka halaman episode tersebut untuk memutar video."
        };
        if (d.votes)
            response.votes = d.votes;
        if (d.releaseDate)
            response.releaseDate = d.releaseDate;
        return response;
    }
    /** Resolve an episode by its <series>-s<season>e<episode> slug. */
    async scrapeEpisodeBySlug(slug) {
        const url = `/nonton/${slug}/`;
        const result = await this.scrapeEpisode(url);
        return { id: slug, slug, url: `${this.baseUrl}${url}`, ...result };
    }
    /** Resolve the playable embed for a single episode page. */
    async scrapeEpisode(url) {
        const $ = await this.fetchHtml(url);
        const blocks = (0, theme_1.parseJsonLd)($);
        const episode = (0, theme_1.findJsonLd)(blocks, ['TVEpisode']);
        const video = (0, theme_1.findJsonLd)(blocks, ['VideoObject']);
        return {
            title: episode?.name || video?.name || '',
            description: video?.description || episode?.description || '',
            episodeNumber: episode?.episodeNumber ?? null,
            seasonNumber: episode?.partOfSeason?.seasonNumber ?? null,
            seriesName: episode?.partOfSeries?.name ?? null,
            thumbnail: video?.thumbnailUrl || episode?.image || null,
            uploadDate: video?.uploadDate || null,
            embedUrl: video?.embedUrl || null
        };
    }
}
exports.SeriesScraper = SeriesScraper;
