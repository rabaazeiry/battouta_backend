// backend/src/services/enrichment.service.js
// VERSION FINALE — followers + foundedYear + ChromaDB re-stockage

const { chromium }   = require('playwright');
const { tavily }     = require('@tavily/core');
const Competitor     = require('../models/Competitor.model');
const chromaService  = require('./chroma.service');

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

const FAKE_SOCIAL_PATTERNS = [
  'sharer.php', 'shareArticle', 'share?',
  'intent/tweet', 'javascript:', 'mailto:',
  'logout', 'login', 'signup'
];

const GENERIC_LINKEDIN_URLS = [
  'https://www.linkedin.com/', 'https://linkedin.com/',
  'http://www.linkedin.com/', 'http://linkedin.com/'
];

class EnrichmentService {

  async enrichCompetitors(projectId) {
    console.log(`🔍 Enrichissement pour projet ${projectId}...`);

    const competitors = await Competitor.find({
      projectId,
      scrapingStatus: 'pending',
      isActive      : true
    });

    if (competitors.length === 0) {
      console.log('ℹ️  Aucun concurrent à enrichir');
      return [];
    }

    console.log(`📋 ${competitors.length} concurrent(s) à enrichir`);

    const browser = await chromium.launch({
      headless: true,
      args    : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const results = [];

    for (const competitor of competitors) {
      console.log(`\n🌐 Enrichissement: ${competitor.companyName}`);

      try {
        // STEP 1 — Tavily description
        const description  = await this._getDescriptionFromTavily(competitor.website);
        const existingDesc = description || competitor.description || '';

        // STEP 2 — Playwright social + foundedYear
        const { socialMedia, foundedYear } = await this._scrapeWithPlaywright(
          browser,
          competitor.website,
          existingDesc
        );

        // STEP 3 — Followers Instagram + Facebook + TikTok
        const followersData = await this._scrapeFollowers(browser, socialMedia);

        // STEP 4 — Sauvegarder
        await this._updateCompetitor(competitor, {
          description,
          socialMedia,
          foundedYear,
          followersData
        }, null);

        results.push({ companyName: competitor.companyName, success: true });

        const socialCount    = Object.values(socialMedia).filter(s => s.url).length;
        const totalFollowers = Object.values(followersData).reduce((sum, f) => sum + f, 0);
        console.log(`   ✅ Enrichi`);
        console.log(`      description : ${description ? '✅ ' + description.substring(0, 60) + '...' : '❌ vide'}`);
        console.log(`      social      : ${socialCount} plateforme(s)`);
        console.log(`      followers   : ${totalFollowers.toLocaleString()} total`);
        console.log(`      foundedYear : ${foundedYear || 'non trouvé'}`);

      } catch (error) {
        console.error(`   ❌ Erreur: ${error.message}`);
        await this._updateCompetitor(competitor, null, error.message);
        results.push({ companyName: competitor.companyName, success: false });
      }

      await this._sleep(1000);
    }

    await browser.close();

    const success = results.filter(r => r.success).length;
    const failed  = results.filter(r => !r.success).length;
    console.log(`\n✅ Terminé: ${success} succès, ${failed} échecs`);

    return results;
  }

  // ═══════════════════════════════════════════════════════════
  // SCRAPE FOLLOWERS
  // ═══════════════════════════════════════════════════════════
  async _scrapeFollowers(browser, socialMedia) {
    const followers = { instagram: 0, facebook: 0, linkedin: 0, tiktok: 0 };

    if (socialMedia.instagram?.url) {
      try {
        const count = await this._getInstagramFollowers(browser, socialMedia.instagram.url);
        followers.instagram = count;
        if (count > 0) console.log(`   📊 Instagram: ${count.toLocaleString()} followers`);
      } catch (e) {
        console.warn(`   ⚠️  Instagram followers échoué: ${e.message}`);
      }
    }

    if (socialMedia.tiktok?.url) {
      try {
        const count = await this._getTikTokFollowers(browser, socialMedia.tiktok.url);
        followers.tiktok = count;
        if (count > 0) console.log(`   📊 TikTok: ${count.toLocaleString()} followers`);
      } catch (e) {
        console.warn(`   ⚠️  TikTok followers échoué: ${e.message}`);
      }
    }

    if (socialMedia.facebook?.url) {
      try {
        const count = await this._getFacebookFollowers(browser, socialMedia.facebook.url);
        followers.facebook = count;
        if (count > 0) console.log(`   📊 Facebook: ${count.toLocaleString()} followers`);
      } catch (e) {
        console.warn(`   ⚠️  Facebook followers échoué: ${e.message}`);
      }
    }

    return followers;
  }

  async _getInstagramFollowers(browser, url) {
    const page = await browser.newPage();
    try {
      await page.setExtraHTTPHeaders({
        'User-Agent'     : USER_AGENTS[0],
        'Accept-Language': 'en-US,en;q=0.9'
      });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await this._sleep(2000);

      const followers = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="description"]');
        if (meta) {
          const content = meta.getAttribute('content') || '';
          const match   = content.match(/([\d.,]+[KkMm]?)\s*[Ff]ollowers/);
          if (match) return match[1];
        }
        const title      = document.title || '';
        const matchTitle = title.match(/([\d.,]+[KkMm]?)\s*[Ff]ollowers/);
        if (matchTitle) return matchTitle[1];
        return null;
      });

      return followers ? this._parseFollowerCount(followers) : 0;
    } catch { return 0; }
    finally { await page.close(); }
  }

  async _getTikTokFollowers(browser, url) {
    const page = await browser.newPage();
    try {
      await page.setExtraHTTPHeaders({
        'User-Agent'     : USER_AGENTS[2],
        'Accept-Language': 'en-US,en;q=0.9'
      });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await this._sleep(2000);

      const followers = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="description"]');
        if (meta) {
          const content = meta.getAttribute('content') || '';
          const match   = content.match(/([\d.,]+[KkMm]?)\s*[Ff]ollowers/);
          if (match) return match[1];
        }
        const el = document.querySelector('[data-e2e="followers-count"]');
        if (el) return el.textContent?.trim();
        return null;
      });

      return followers ? this._parseFollowerCount(followers) : 0;
    } catch { return 0; }
    finally { await page.close(); }
  }

  async _getFacebookFollowers(browser, url) {
    const page = await browser.newPage();
    try {
      await page.setExtraHTTPHeaders({
        'User-Agent'     : USER_AGENTS[0],
        'Accept-Language': 'en-US,en;q=0.9'
      });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await this._sleep(2000);

      const followers = await page.evaluate(() => {
        const allText = document.body?.innerText || '';
        const match   = allText.match(/([\d.,]+[KkMm]?)\s*[Ff]ollowers/);
        if (match) return match[1];
        const meta = document.querySelector('meta[name="description"]');
        if (meta) {
          const content    = meta.getAttribute('content') || '';
          const matchMeta  = content.match(/([\d.,]+[KkMm]?)\s*[Ff]ollowers/);
          if (matchMeta) return matchMeta[1];
        }
        return null;
      });

      return followers ? this._parseFollowerCount(followers) : 0;
    } catch { return 0; }
    finally { await page.close(); }
  }

  _parseFollowerCount(str) {
    if (!str) return 0;
    const clean = str.replace(/,/g, '').trim();
    if (/[Mm]$/.test(clean)) return Math.round(parseFloat(clean) * 1_000_000);
    if (/[Kk]$/.test(clean)) return Math.round(parseFloat(clean) * 1_000);
    const num = parseInt(clean.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  // ═══════════════════════════════════════════════════════════
  // TAVILY DESCRIPTION
  // ═══════════════════════════════════════════════════════════
  async _getDescriptionFromTavily(url) {
    try {
      console.log(`   📄 Tavily Extract: ${url}`);

      const response = await tavilyClient.extract({ urls: [url] });

      if (response?.results?.[0]?.raw_content) {
        const raw     = response.results[0].raw_content;
        const cleaned = raw
          .replace(/<[^>]*>/g, ' ')
          .replace(/https?:\/\/\S+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 500);

        if (cleaned.length > 20) {
          console.log(`   ✅ Tavily: ${cleaned.substring(0, 80)}...`);
          return cleaned;
        }
      }

      console.log(`   ⚠️  Tavily: contenu vide`);
      return '';

    } catch (error) {
      console.warn(`   ⚠️  Tavily échoué → fallback meta description`);
      return await this._fallbackMetaDescription(url);
    }
  }

  async _fallbackMetaDescription(url) {
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal : controller.signal,
        headers: { 'User-Agent': USER_AGENTS[0] }
      });

      clearTimeout(timeout);
      const html = await response.text();

      const metaMatch =
        html.match(/<meta\s+name=["']description["']\s+content=["']([^"']{20,500})["']/i) ||
        html.match(/<meta\s+content=["']([^"']{20,500})["']\s+name=["']description["']/i) ||
        html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']{20,500})["']/i);

      if (metaMatch?.[1]) {
        console.log(`   ✅ Fallback meta: ${metaMatch[1].substring(0, 60)}...`);
        return metaMatch[1].trim().substring(0, 500);
      }

      return '';
    } catch { return ''; }
  }

  // ═══════════════════════════════════════════════════════════
  // PLAYWRIGHT — Social + foundedYear
  // ═══════════════════════════════════════════════════════════
  async _scrapeWithPlaywright(browser, url, existingDescription = '') {
    const result = {
      socialMedia: {
        instagram: { url: '', username: '', verified: false },
        facebook : { url: '', username: '', verified: false },
        linkedin : { url: '', username: '', verified: false },
        tiktok   : { url: '', username: '', verified: false }
      },
      foundedYear: ''
    };

    const page = await browser.newPage();

    try {
      const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      await page.setExtraHTTPHeaders({
        'User-Agent'     : randomUA,
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7,ar;q=0.6'
      });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await this._sleep(800);

      const pageData = await page.evaluate(() => {
        const selectors = 'footer a, header a, nav a, [class*="social"] a, [class*="footer"] a';
        const links     = Array.from(document.querySelectorAll(selectors))
          .map(a => a.href)
          .filter(h => h && h.startsWith('http'));

        const social = { instagram: '', facebook: '', linkedin: '', tiktok: '' };

        for (const link of links) {
          const l = link.toLowerCase();
          if (l.includes('instagram.com') && !social.instagram) social.instagram = link;
          if (l.includes('facebook.com')  && !social.facebook)  social.facebook  = link;
          if (l.includes('linkedin.com')  && !social.linkedin)  social.linkedin  = link;
          if (l.includes('tiktok.com')    && !social.tiktok)    social.tiktok    = link;
        }

        const footerText = document.querySelector('footer')?.textContent || '';
        return { social, footerText };
      });

      // foundedYear depuis footer
      result.foundedYear = this._extractFoundedYear(pageData.footerText);

      // foundedYear depuis description si pas trouvé dans footer
      if (!result.foundedYear && existingDescription) {
        result.foundedYear = this._extractFoundedYear(existingDescription);
        if (result.foundedYear) {
          console.log(`   📅 foundedYear depuis description: ${result.foundedYear}`);
        }
      }

      const platforms = ['instagram', 'facebook', 'linkedin', 'tiktok'];
      for (const platform of platforms) {
        const rawUrl = pageData.social[platform] || '';
        const clean  = this._validateSocialUrl(rawUrl, platform);
        if (clean) {
          result.socialMedia[platform].url      = clean;
          result.socialMedia[platform].username = this._extractUsername(clean);
        }
      }

    } catch (error) {
      console.warn(`   ⚠️  Playwright échoué: ${error.message}`);
      if (existingDescription) {
        result.foundedYear = this._extractFoundedYear(existingDescription);
        if (result.foundedYear) {
          console.log(`   📅 foundedYear depuis description (Playwright échoué): ${result.foundedYear}`);
        }
      }
    } finally {
      await page.close();
    }

    return result;
  }

  _validateSocialUrl(url, platform) {
    if (!url) return '';
    if (platform === 'linkedin' && GENERIC_LINKEDIN_URLS.includes(url)) return '';
    const isFake = FAKE_SOCIAL_PATTERNS.some(p => url.toLowerCase().includes(p));
    if (isFake) return '';
    const expectedDomains = {
      instagram: 'instagram.com',
      facebook : 'facebook.com',
      linkedin : 'linkedin.com',
      tiktok   : 'tiktok.com'
    };
    if (!url.includes(expectedDomains[platform])) return '';
    return url;
  }

  _extractUsername(url) {
    if (!url) return '';
    try {
      const parsed  = new URL(url);
      const ignored = [
        'company', 'in', 'pub', 'pages', 'groups',
        'channel', 'user', 'home', 'about', 'posts',
        'search', 'hashtag', 'explore', 'profile.php'
      ];
      const segments = parsed.pathname.split('/').filter(s => s.length > 1);
      const username = segments.find(s => !ignored.includes(s.toLowerCase())) || '';
      return username.replace(/^@/, '');
    } catch { return ''; }
  }

  _extractFoundedYear(text) {
    if (!text) return '';

    const currentYear = new Date().getFullYear();
    const patterns = [
      /founded\s+in\s+(\d{4})/i,
      /established\s+in\s+(\d{4})/i,
      /since\s+(\d{4})/i,
      /créé\s+en\s+(\d{4})/i,
      /fondé\s+en\s+(\d{4})/i,
      /depuis\s+(\d{4})/i,
      /depuis\s+plus\s+de\s+(\d+)\s+ans/i,
      /for\s+over\s+(\d+)\s+years/i,
      /©\s*(\d{4})/,
      /(\d{4})\s*[-–]\s*\d{4}/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let year = parseInt(match[1]);
        if (pattern.source.includes('plus\\s+de') || pattern.source.includes('over')) {
          year = currentYear - year;
        }
        if (year >= 1900 && year < currentYear) {
          return String(year);
        }
      }
    }
    return '';
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE COMPETITOR — avec followers
  // ═══════════════════════════════════════════════════════════
  async _updateCompetitor(competitor, data, errorMessage) {
    if (errorMessage) {
      competitor.scrapingStatus = 'failed';
      competitor.scrapingError  = errorMessage;
      await competitor.save();
      return;
    }

    if (data.description && data.description.trim().length > 20) {
      competitor.description = data.description.trim().substring(0, 500);
    }

    if (data.foundedYear) {
      competitor.notes = `Founded: ${data.foundedYear}`;
    }

    const platforms = ['instagram', 'facebook', 'linkedin', 'tiktok'];
    for (const platform of platforms) {
      const social = data.socialMedia[platform];
      if (social) {
        competitor.socialMedia[platform].url      = social.url      || '';
        competitor.socialMedia[platform].username = social.username || '';
        competitor.socialMedia[platform].verified = false;
      }
    }

    // ✅ Sauvegarder followers
    if (data.followersData) {
      const total = Object.values(data.followersData).reduce((sum, f) => sum + f, 0);
      competitor.metrics.totalFollowers = total;
      competitor.metrics.platformsCount = Object.values(data.socialMedia).filter(s => s.url).length;

      const followersNote = Object.entries(data.followersData)
        .filter(([, count]) => count > 0)
        .map(([platform, count]) => `${platform}:${count}`)
        .join(',');

      if (followersNote) {
        const existingNotes  = competitor.notes || '';
        competitor.notes     = existingNotes
          ? `${existingNotes} | Followers: ${followersNote}`
          : `Followers: ${followersNote}`;
      }
    }

    competitor.scrapingStatus = 'completed';
    competitor.scrapingError  = '';
    await competitor.save();

    // ✅ Re-stocker dans ChromaDB avec followers
    if (competitor.description && competitor.description.length > 20) {
      const followersInfo = data.followersData
        ? Object.entries(data.followersData)
            .filter(([, count]) => count > 0)
            .map(([p, c]) => `${p}: ${c.toLocaleString()} followers`)
            .join(', ')
        : '';

      const enrichedSnippet = followersInfo
        ? `${competitor.description} | Social: ${followersInfo}`
        : competitor.description;

      await chromaService.storeArticles([{
        title  : competitor.companyName,
        snippet: enrichedSnippet,
        domain : competitor.website?.replace(/https?:\/\//, '').replace(/\/$/, '') || '',
        url    : competitor.website || ''
      }], String(competitor.projectId));

      console.log(`   📦 ChromaDB: description + followers stockés pour ${competitor.companyName}`);
    }
  }

  async enrichOne(competitorId) {
    const competitor = await Competitor.findById(competitorId);
    if (!competitor) throw new Error('Concurrent non trouvé');

    competitor.scrapingStatus = 'pending';
    await competitor.save();

    const browser = await chromium.launch({
      headless: true,
      args    : ['--no-sandbox', '--disable-setuid-sandbox',
                 '--disable-blink-features=AutomationControlled']
    });

    try {
      const description  = await this._getDescriptionFromTavily(competitor.website);
      const existingDesc = description || competitor.description || '';

      const { socialMedia, foundedYear } = await this._scrapeWithPlaywright(
        browser,
        competitor.website,
        existingDesc
      );

      const followersData = await this._scrapeFollowers(browser, socialMedia);

      await this._updateCompetitor(competitor, {
        description,
        socialMedia,
        foundedYear,
        followersData
      }, null);

      return competitor;
    } catch (error) {
      await this._updateCompetitor(competitor, null, error.message);
      throw error;
    } finally {
      await browser.close();
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new EnrichmentService();
