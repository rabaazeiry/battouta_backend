// scraping.unified.COMPLETE.js
// Service unifié avec scraping Instagram COMPLET

const { scrapeInstagramComplete } = require('./scraping.instagram.complete');
const { scrapeFacebookGraphAPI } = require('./scraping.facebook');
const Competitor = require('../models/Competitor.model');

// ═══════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE : Scraper tous les concurrents d'un projet
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeProjectSocialMedia(projectId, competitorIds = null, platforms = ['instagram', 'facebook']) {
  try {
    console.log(`\n🚀 Scraping ${platforms.join(' + ')} pour projet ${projectId}...\n`);

    // Récupérer les concurrents
    const query = { projectId, isActive: true };
    if (competitorIds && competitorIds.length > 0) {
      query._id = { $in: competitorIds };
    }

    const competitors = await Competitor.find(query);
    console.log(`📊 ${competitors.length} concurrent(s) à scraper\n`);

    const results = [];

    for (let i = 0; i < competitors.length; i++) {
      const competitor = competitors[i];
      console.log(`[${i + 1}/${competitors.length}] 🏨 ${competitor.companyName}`);

      const result = {
        competitorId: competitor._id,
        companyName: competitor.companyName,
        instagram: false,
        facebook: false,
        error: null
      };

      // Instagram COMPLET
      if (platforms.includes('instagram') && competitor.socialMedia?.instagram?.username) {
        try {
          await scrapeInstagramComplete(competitor);
          result.instagram = true;
        } catch (error) {
          console.error(`   ❌ Instagram: ${error.message}`);
          result.error = error.message;
          
          // Marquer comme failed
          await Competitor.findByIdAndUpdate(competitor._id, {
            scrapingStatus: 'failed',
            scrapingError: error.message
          });
        }
      }

      // Facebook
      if (platforms.includes('facebook') && competitor.socialMedia?.facebook?.url) {
        try {
          await scrapeFacebook(competitor);
          result.facebook = true;
        } catch (error) {
          console.error(`   ❌ Facebook: ${error.message}`);
          if (!result.error) result.error = error.message;
        }
      }

      results.push(result);
      
      // Délai entre chaque concurrent (éviter rate limit)
      if (i < competitors.length - 1) {
        console.log('   ⏳ Pause 5 secondes...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Résumé
    const successCount = results.filter(r => r.instagram || r.facebook).length;
    const failedCount = results.length - successCount;

    console.log(`\n✅ Scraping terminé:`);
    console.log(`   Succès : ${successCount}/${results.length}`);
    console.log(`   Échecs : ${failedCount}/${results.length}\n`);

    return {
      success: true,
      total: results.length,
      successCount,
      failedCount,
      results
    };

  } catch (error) {
    console.error('❌ Erreur globale scraping:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACEBOOK (garde l'ancien code)
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeFacebook(competitor) {
  try {
    const result = await scrapeFacebookGraphAPI(competitor);
    
    await Competitor.findByIdAndUpdate(competitor._id, {
      'socialMedia.facebook.followers': result.followers,
      'socialMedia.facebook.postsCount': result.posts.length,
      lastScrapedAt: new Date(),
      scrapingStatus: 'completed'
    });

    console.log(`      ✅ Facebook sauvegardé`);

  } catch (error) {
    console.error(`      ❌ ${error.message}`);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  scrapeProjectSocialMedia
};