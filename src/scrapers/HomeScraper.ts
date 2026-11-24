import { BaseScraper } from './BaseScraper';
import * as cheerio from 'cheerio';
import { parseCards, parseLoCards } from './theme';

const SECTION_MAP: Array<{ key: string; patterns: RegExp[] }> = [
  { key: 'filmUnggulan', patterns: [/film\s+unggulan/i, /^terpopuler$/i, /top\s+rating/i] },
  { key: 'latestMovies', patterns: [/film\s+terbaru/i, /^upload\s+terbaru$/i] },
  { key: 'latestSeries', patterns: [/series\s+unggulan/i, /series\s+terbaru/i] },
  { key: 'seriesUpdate', patterns: [/series\s+update/i] },
  { key: 'topMonth', patterns: [/top\s+bulan\s+ini/i] },
  { key: 'recommendations', patterns: [/rekomendasi/i] },
  { key: 'family', patterns: [/bareng\s+keluarga/i, /keluarga/i] },
  { key: 'action', patterns: [/action\s+terbaru/i, /^action$/i] },
  { key: 'drakor', patterns: [/drakor/i] },
  { key: 'horror', patterns: [/horror\s+terbaru/i, /^horror$/i] },
  { key: 'romance', patterns: [/romance\s+terbaru/i, /^romance$/i] },
  { key: 'comedy', patterns: [/comedy\s+terbaru/i, /^comedy$/i] },
  { key: 'korea', patterns: [/korea\s+terbaru/i, /^korea$/i] },
  { key: 'thailand', patterns: [/thailand\s+terbaru/i, /^thailand$/i] },
  { key: 'india', patterns: [/india\s+terbaru/i, /^india$/i] },
];

export class HomeScraper extends BaseScraper {
  async scrapeHome() {
    const $ = await this.fetchHtml('/');
    const base = this.baseUrl;

    const sections: any = {
      filmUnggulan: [],
      latestMovies: [],
      latestSeries: [],
      seriesUpdate: [],
      topMonth: [],
      recommendations: [],
      family: [],
      action: [],
      drakor: [],
      horror: [],
      romance: [],
      comedy: [],
      korea: [],
      thailand: [],
      india: []
    };

    const loSections = $('section.lo-sek');
    if (loSections.length > 0) {
      loSections.each((_, el) => {
        const sec = $(el);
        const title = sec.find('.lo-sek-judul').first().text().trim();
        const cards = parseLoCards($, sec, base).slice(0, 12);
        if (!title || cards.length === 0) return;
        const key = this.matchSection(title);
        if (key && sections[key].length === 0) sections[key] = cards;
      });

      // The hero rail ("lo-pita") holds the site's featured titles.
      const hero = parseLoCards($, $('section.lo-pita').first(), base).slice(0, 12);
      if (hero.length && sections.filmUnggulan.length === 0) sections.filmUnggulan = hero;

      return sections;
    }

    // Legacy "grid-poster" theme: each row is a titled section.
    const rows = $('div.row');
    rows.each((_, el) => {
      const row = $(el);
      const header = row.find('header').first();
      if (header.length === 0) return;
      const title = header.find('h2').first().text().trim();
      const cards = parseCards($, row, base).slice(0, 12);
      if (!title || cards.length === 0) return;
      const key = this.matchSection(title);
      if (key && sections[key].length === 0) sections[key] = cards;
    });

    return sections;
  }

  private matchSection(title: string): string | null {
    for (const entry of SECTION_MAP) {
      if (entry.patterns.some((p) => p.test(title))) return entry.key;
    }
    return null;
  }
}
