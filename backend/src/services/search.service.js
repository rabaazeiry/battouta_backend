// backend/src/services/search.service.js
// VERSION 7 — Firefox headless (moins détecté que Chromium)

const { firefox } = require('playwright');  // ✅ Firefox au lieu de Chromium
const path = require('path');

class SearchService {

  constructor() {
    this.debug = true; // mettre false quand ça marche
  }

  async search(searchQueries, targetCountry = 'TN', maxResults = 50) {
    console.log(`\n🔍 Recherche DuckDuckGo (Firefox) pour ${searchQueries.length} queries...`);

    let browser = null;

    try {
      // ✅ Firefox — pas d'args Chrome incompatibles
      browser = await firefox.launch({
        headless: true,
      });

      const context = await browser.newContext({
        // ✅ User-Agent Firefox réel
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        locale   : 'fr-FR',
        viewport : { width: 1920, height: 1080 },
        extraHTTPHeaders: {
          'Accept'                   : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language'          : 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding'          : 'gzip, deflate, br',
          'Connection'               : 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      const allResults = [];
      const seenUrls   = new Set();
      const region     = this._getRegionCode(targetCountry);

      for (let i = 0; i < searchQueries.length; i++) {
        const query = searchQueries[i];
        console.log(`   🔎 [${i + 1}/${searchQueries.length}] "${query}"`);

        try {
          const results = await this._searchOneQuery(context, query, region, i);
          let added = 0;

          for (const result of results) {
            if (!result.url || seenUrls.has(result.url)) continue;
            seenUrls.add(result.url);
            allResults.push({ ...result, query });
            added++;
          }

          console.log(`   ✅ ${added} nouveaux résultats`);

        } catch (error) {
          console.warn(`   ⚠️ Query "${query}" échouée: ${error.message}`);
        }

        // Pause aléatoire 2-4 secondes
        const pause = 2000 + Math.random() * 2000;
        await this._sleep(pause);
      }

      await browser.close();

      console.log(`✅ DuckDuckGo total: ${allResults.length} résultats bruts`);

      if (allResults.length === 0) {
        throw new Error('Aucun résultat trouvé sur DuckDuckGo');
      }

      return allResults.slice(0, maxResults);

    } catch (error) {
      if (browser) await browser.close();
      console.error('❌ Erreur recherche:', error.message);
      throw new Error(`Échec de la recherche: ${error.message}`);
    }
  }

  async _searchOneQuery(context, query, region, queryIndex) {
    const page = await context.newPage();

    try {
      // ✅ Anti-détection Firefox
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ['fr-FR', 'fr', 'en-US', 'en'],
        });
      });

      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${region}`;

      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout  : 30000,
      });

      // Attendre les résultats
      try {
        await page.waitForSelector(
          '#links .result, .results_links_deep, .result, [class*="result"]',
          { timeout: 8000 }
        );
      } catch {
        console.warn(`      ⚠️ waitForSelector timeout — tentative quand même`);
      }

      // Screenshot debug première query
      if (this.debug && queryIndex === 0) {
        const screenshotPath = path.join(process.cwd(), `debug-ddg-html-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`   📸 Debug screenshot: ${screenshotPath}`);
      }

      // ✅ Extraction avec plusieurs sélecteurs fallback
      const results = await page.evaluate(() => {
        const items = [];

        const SELECTORS = [
          '#links .result',
          '.results_links_deep',
          '.result',
          '[data-layout="organic"]',
          'article',
        ];

        let resultElements = [];
        for (const sel of SELECTORS) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) {
            resultElements = Array.from(found);
            break;
          }
        }

        resultElements.forEach(el => {
          try {
            const linkEl = el.querySelector('.result__a, h2 a, h3 a, a[href]');
            if (!linkEl) return;

            const rawHref = linkEl.getAttribute('href') || '';
            const title   = linkEl.textContent?.trim() || '';

            if (!title || title.length < 3) return;

            let url = '';

            if (rawHref.includes('uddg=')) {
              try {
                const normalized = rawHref.startsWith('//')
                  ? 'https:' + rawHref
                  : rawHref;
                const urlObj = new URL(normalized);
                const uddg   = urlObj.searchParams.get('uddg');
                if (uddg) url = decodeURIComponent(uddg);
              } catch {
                const match = rawHref.match(/uddg=([^&]+)/);
                if (match) url = decodeURIComponent(match[1]);
              }
            } else if (rawHref.startsWith('http')) {
              url = rawHref;
            } else if (rawHref.startsWith('//')) {
              url = 'https:' + rawHref;
            }

            if (!url || url.includes('duckduckgo.com')) return;
            if (!url.startsWith('http')) return;

            const snippetEl = el.querySelector(
              '.result__snippet, [data-result="snippet"], .snippet, p'
            );

            let domain = '';
            try { domain = new URL(url).hostname.replace('www.', ''); } catch {}

            items.push({
              title  : title,
              url    : url,
              snippet: snippetEl?.textContent?.trim() || '',
              domain : domain,
              source : 'duckduckgo',
            });
          } catch {}
        });

        return items;
      });

      console.log(`      → ${results.length} résultats extraits`);
      return results;

    } catch (error) {
      throw error;
    } finally {
      await page.close();
    }
  }

  _getRegionCode(country) {
    const regions = {
      'TN': 'tn-fr',
      'FR': 'fr-fr',
      'US': 'us-en',
      'UK': 'uk-en',
      'MA': 'ma-fr',
      'DZ': 'dz-fr',
    };
    return regions[country] || 'wt-wt';
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new SearchService();