"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavigationScraper = void 0;
const BaseScraper_1 = require("./BaseScraper");
class NavigationScraper extends BaseScraper_1.BaseScraper {
    async scrapeMenu(menuName) {
        const $ = await this.fetchHtml('/');
        const items = [];
        const push = (link, title) => {
            if (!link || !title)
                return;
            const parts = link.split('?')[0].split('#')[0].split('/').filter(Boolean);
            const slug = parts.length ? parts[parts.length - 1] : '';
            if (!slug)
                return;
            items.push({ id: slug, name: title, slug });
        };
        if (menuName === 'Genre') {
            $('.lo-panel-grid a.lo-panel-link, .lo-drop-panel a.lo-drop-link').each((_, el) => {
                const href = $(el).attr('href') || '';
                if (!/\/genre\//.test(href))
                    return;
                push(href, $(el).text().trim());
            });
            return items;
        }
        if (menuName === 'Negara') {
            $('.lo-panel-grid a.lo-panel-link, .lo-drop-panel a.lo-drop-link').each((_, el) => {
                const href = $(el).attr('href') || '';
                if (!/\/country\//.test(href))
                    return;
                push(href, $(el).text().trim());
            });
            return items;
        }
        if (menuName === 'Tahun') {
            $('.lo-panel-grid a.lo-panel-link, .lo-drop-panel a.lo-drop-link').each((_, el) => {
                const href = $(el).attr('href') || '';
                if (!/\/year\//.test(href))
                    return;
                push(href, $(el).text().trim());
            });
            return items;
        }
        if (menuName === 'Series') {
            // The `lo-*` theme exposes series through /series-terbaru/ rather than a menu.
            const list = await this.fetchHtml('/series-terbaru/');
            list('.lo-kartu').each((_, el) => {
                const href = $(el).find('a.lo-kartu-tautan').first().attr('href') || '';
                const title = $(el).find('.lo-kartu-judul').first().text().trim();
                push(href, title);
            });
            return items;
        }
        if (menuName === 'Populer') {
            const list = await this.fetchHtml('/populer/');
            list('.lo-kartu').each((_, el) => {
                const href = $(el).find('a.lo-kartu-tautan').first().attr('href') || '';
                const title = $(el).find('.lo-kartu-judul').first().text().trim();
                push(href, title);
            });
            return items;
        }
        // Legacy markup: a nav dropdown containing the requested menu.
        const menuLink = $(`nav ul li a:contains("${menuName}")`).first();
        if (menuLink.length > 0) {
            menuLink.parent().find('ul li a').each((_, el) => {
                push($(el).attr('href') || '', $(el).text().trim());
            });
        }
        return items;
    }
}
exports.NavigationScraper = NavigationScraper;
