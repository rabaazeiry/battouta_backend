// backend/src/jobs/scraping.cron.js
// SCRAPING AUTOMATIQUE - Tous les jours à 2h du matin

const cron = require('node-cron');
const ScrapingService = require('../services/scraping.unified');
const Project = require('../models/Project.model');

class ScrapingCronJob {
  
  start() {
    // ✅ Scraping quotidien à 2h du matin (heure creuse)
    cron.schedule('0 2 * * *', async () => {
      console.log('\n🕐 [CRON] Scraping automatique démarré...');
      
      try {
        // Récupérer tous les projets actifs
        const projects = await Project.find({ 
          status: 'active',
          pipelineStatus: { $in: ['step3_in_progress', 'step3_complete'] }
        });

        console.log(`📊 ${projects.length} projet(s) à scraper`);

        for (const project of projects) {
          console.log(`\n🏨 Projet: ${project.businessIdea}`);
          
          // Récupérer tous les concurrents du projet
          const Competitor = require('../models/Competitor.model');
          const competitors = await Competitor.find({ 
            projectId: project._id 
          });

          const competitorIds = competitors.map(c => c._id);

          if (competitorIds.length > 0) {
            // Lancer le scraping
            await ScrapingService.scrapeAllCompetitors(
              project._id,
              competitorIds
            );
            
            console.log(`✅ Scraping terminé pour ${project.businessIdea}`);
          }
        }

        console.log('\n✅ [CRON] Scraping automatique terminé');
        
      } catch (error) {
        console.error('❌ [CRON] Erreur:', error.message);
      }
    });

    console.log('✅ Cron job scraping démarré (quotidien à 2h)');
  }

  // ✅ Scraping hebdomadaire (tous les lundis à 3h)
  startWeekly() {
    cron.schedule('0 3 * * 1', async () => {
      console.log('\n📅 [CRON] Scraping hebdomadaire démarré...');
      // Même logique que daily
    });
  }
}

module.exports = new ScrapingCronJob();