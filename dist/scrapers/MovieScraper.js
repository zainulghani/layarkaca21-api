"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovieScraper = void 0;
const DetailScraper_1 = require("./DetailScraper");
class MovieScraper extends DetailScraper_1.DetailScraper {
    async scrapeDetail(slug) {
        // Movies live at /{slug}/; on the `lo-*` theme a series lives at /series/{slug}/,
        // so fall back to that path when the plain slug does not resolve.
        const detail = await this.loadDetail([`/${slug}/`, `/series/${slug}/`]);
        if (!detail)
            throw new Error('Movie not found');
        if (detail.json['@type'] === 'TVSeries') {
            const { SeriesScraper } = require('./SeriesScraper');
            return new SeriesScraper().scrapeDetail(slug);
        }
        const d = this.buildDetail(detail.$, detail.json);
        const response = {
            id: slug,
            slug,
            title: d.title,
            originalTitle: d.originalTitle,
            description: d.description,
            year: d.year,
            rating: d.rating,
            runtime: d.runtime,
            status: 'released',
            poster: d.poster,
            backdrop: d.backdrop,
            trailer: d.trailer,
            genres: d.genres,
            countries: d.countries,
            cast: d.cast,
            crew: d.crew,
            streamembed: d.streamembed,
            instructions: "Jika video tidak bisa diputar atau muncul error, coba langkah berikut:\n\nKlik tombol GANTI PLAYER di bawah player untuk pilih sumber pemutar lain.\nJika masih error, tekan tombol Refresh di browser atau tekan F5.\nHapus cache/perbarui halaman dengan Ctrl+F5 (Windows) atau Cmd+Shift+R (macOS).\nPastikan koneksi internet stabil — coba turunkan kualitas pemutaran jika tersedia.\nJika suara bermasalah, klik GANTI PLAYER untuk beralih ke player lain dengan kualitas lebih bagus."
        };
        if (d.votes)
            response.votes = d.votes;
        if (d.releaseDate)
            response.releaseDate = d.releaseDate;
        return response;
    }
}
exports.MovieScraper = MovieScraper;
