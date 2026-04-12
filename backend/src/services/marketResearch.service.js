// backend/src/services/marketResearch.service.js
// VERSION FINALE — Fix longueur + classification explicite

const Competitor     = require('../models/Competitor.model');
const MarketResearch = require('../models/MarketResearch.model');
const Project        = require('../models/Project.model');
const chromaService  = require('./chroma.service');
const searchService  = require('./search.service');

class MarketResearchService {

  constructor() {
    this.ollamaUrl = 'http://localhost:11434/api/generate';
    this.model     = 'mistral';

    this.countryNames = {
      'TN':'Tunisie','MA':'Maroc','DZ':'Algérie','LY':'Libye','EG':'Égypte',
      'SN':'Sénégal','CI':"Côte d'Ivoire",'CM':'Cameroun','GH':'Ghana',
      'NG':'Nigeria','KE':'Kenya','ET':'Éthiopie','TZ':'Tanzanie',
      'ZA':'Afrique du Sud','RW':'Rwanda','UG':'Ouganda','ML':'Mali',
      'BF':'Burkina Faso','NE':'Niger','GA':'Gabon','CD':'Congo RDC',
      'FR':'France','DE':'Allemagne','IT':'Italie','ES':'Espagne',
      'PT':'Portugal','UK':'Royaume-Uni','NL':'Pays-Bas','BE':'Belgique',
      'CH':'Suisse','SE':'Suède','NO':'Norvège','DK':'Danemark',
      'PL':'Pologne','GR':'Grèce','TR':'Turquie','RU':'Russie',
      'SA':'Arabie Saoudite','AE':'Émirats Arabes Unis','QA':'Qatar',
      'JO':'Jordanie','LB':'Liban','IN':'Inde','PK':'Pakistan',
      'CN':'Chine','JP':'Japon','KR':'Corée du Sud','SG':'Singapour',
      'MY':'Malaisie','TH':'Thaïlande','VN':'Vietnam','ID':'Indonésie',
      'US':'États-Unis','CA':'Canada','MX':'Mexique','BR':'Brésil',
      'AR':'Argentine','CO':'Colombie','CL':'Chili','AU':'Australie',
      'NZ':'Nouvelle-Zélande'
    };
  }

  async generateMarketResearch(projectId) {
    console.log(`\n📊 Génération Market Research pour projet ${projectId}...`);

    const project     = await Project.findById(projectId);
    const competitors = await Competitor.find({
      projectId,
      isActive      : true,
      classification: { $in: ['leader','startup','local','international'] }
    });

    if (!project)            throw new Error('Projet non trouvé');
    if (!competitors.length) throw new Error('Aucun concurrent classifié');

    const countryName = this.countryNames[project.targetCountry] || project.targetCountry;

    console.log(`   📋 Projet     : ${project.name}`);
    console.log(`   📋 Secteur    : ${project.industry}`);
    console.log(`   📋 Pays       : ${countryName}`);
    console.log(`   📋 Langue     : ${this._getLanguage(project)}`);
    console.log(`   📋 Concurrents: ${competitors.length}`);

    const marketResearch  = await MarketResearch.findOrCreate(projectId);
    marketResearch.status = 'in_progress';
    await marketResearch.save();

    try {

      console.log(`\n🔍 Recherche articles marché via Tavily...`);
      const marketArticles = await this._searchMarketArticles(
        project.industry, project.targetCountry, countryName
      );
      console.log(`   ✅ ${marketArticles.length} articles marché trouvés`);

      if (marketArticles.length > 0) {
        await chromaService.storeArticles(marketArticles, projectId);
        console.log(`   📦 Articles marché stockés dans ChromaDB`);
      }

      console.log(`\n📖 Récupération contexte RAG...`);
      const ragContext = await this._retrieveMarketContext(
        project.industry, countryName, projectId
      );
      console.log(`   ${ragContext ? '✅ Contexte RAG récupéré' : '⚠️ Pas de contexte RAG'}`);

      const stats = this._calculateStats(competitors);
      console.log(`   📈 Stats calculées`);

      console.log(`\n🤖 Génération Market Summary avec Mistral...`);
      const summary = await this._generateWithMistral(
        project, competitors, stats, ragContext, countryName
      );
      console.log(`   ✅ Market Summary généré (${summary.length} chars)`);

      await marketResearch.updateMarketSummary(summary, competitors.length);
      await marketResearch.updateMarketOverview(stats);
      marketResearch.classificationSummary = this._buildClassificationSummary(competitors);
      marketResearch.aiModelUsed           = this.model;
      await marketResearch.markAsCompleted();

      console.log(`\n✅ Market Research terminé avec succès`);
      return marketResearch;

    } catch (error) {
      await marketResearch.markAsFailed(error.message);
      throw error;
    }
  }

  _getLanguage(project) {
    const languages = project.languages || ['fr'];
    if (languages.includes('fr')) return 'français';
    if (languages.includes('en')) return 'anglais';
    if (languages.includes('ar')) return 'arabe';
    return 'français';
  }

  async _searchMarketArticles(industry, targetCountry, countryName) {
    const year = new Date().getFullYear();
    const marketQueries = [
      `${industry} ${countryName}`,
      `${industry} ${countryName} ${year}`,
      `${industry} ${countryName} marché concurrence`
    ];
    console.log(`   🔍 Requêtes marché:`);
    marketQueries.forEach(q => console.log(`      → "${q}"`));
    try {
      return await searchService.search(marketQueries, targetCountry, 15);
    } catch (error) {
      console.warn(`   ⚠️  Tavily marché échoué: ${error.message}`);
      return [];
    }
  }

  async _retrieveMarketContext(industry, countryName, projectId) {
    try {
      const query = `${industry} ${countryName} market analysis trends`;
      return await chromaService.retrieveContext(query, String(projectId), '', 5);
    } catch { return ''; }
  }

  _calculateStats(competitors) {
    const leaderCount        = competitors.filter(c => c.classification === 'leader').length;
    const startupCount       = competitors.filter(c => c.classification === 'startup').length;
    const localCount         = competitors.filter(c => c.classification === 'local').length;
    const internationalCount = competitors.filter(c => c.classification === 'international').length;

    const withSocial = competitors.filter(c =>
      c.socialMedia?.instagram?.username ||
      c.socialMedia?.facebook?.username  ||
      c.socialMedia?.linkedin?.username  ||
      c.socialMedia?.tiktok?.username
    ).length;

    const platformCounts = { instagram: 0, facebook: 0, linkedin: 0, tiktok: 0 };
    for (const c of competitors) {
      if (c.socialMedia?.instagram?.username) platformCounts.instagram++;
      if (c.socialMedia?.facebook?.username)  platformCounts.facebook++;
      if (c.socialMedia?.linkedin?.username)  platformCounts.linkedin++;
      if (c.socialMedia?.tiktok?.username)    platformCounts.tiktok++;
    }
    const dominantPlatform = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    let marketMaturity = 'growing';
    if (internationalCount >= 2)  marketMaturity = 'mature';
    else if (leaderCount >= 2)    marketMaturity = 'growing';
    else if (startupCount >= 2)   marketMaturity = 'emerging';

    return {
      totalCompetitors  : competitors.length,
      leaderCount, startupCount, localCount, internationalCount,
      withSocial, dominantPlatform, marketMaturity
    };
  }

  async _generateWithMistral(project, competitors, stats, ragContext, countryName) {
    const prompt = this._buildPrompt(project, competitors, stats, ragContext, countryName);
    const response = await fetch(this.ollamaUrl, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model  : this.model,
        prompt : prompt,
        stream : false,
        options: { temperature: 0.2, num_predict: 1500 }
      })
    });
    if (!response.ok) throw new Error(`Mistral error: ${response.status}`);
    const data = await response.json();
    const text = (data.response || '').trim();
    if (!text || text.length < 200) throw new Error('Market Summary trop court ou vide');
    return text;
  }

  _buildPrompt(project, competitors, stats, ragContext, countryName) {

    const lang = this._getLanguage(project);

    // ✅ FIX B — Liste concurrents avec classification TRÈS explicite
    const competitorNames = competitors.map(c => c.companyName).join(', ');

    const competitorsList = competitors.map(c => {
      const socialPlatforms = ['instagram','facebook','linkedin','tiktok']
        .filter(p => c.socialMedia?.[p]?.username)
        .join(', ') || 'aucun';

      const desc = (c.description || 'Non disponible')
        .replace(/\*{1,2}/g, '').replace(/#{1,6}\s/g, '')
        .replace(/\s+/g, ' ').trim().substring(0, 200);

      // ✅ Type très explicite pour éviter confusion Mistral
      const typeLabel = {
        leader       : `LEADER (dominant UNIQUEMENT dans ${countryName}, PAS international)`,
        international: `INTERNATIONAL (présent dans PLUSIEURS pays, PAS seulement ${countryName})`,
        startup      : `STARTUP (entreprise récente et innovante)`,
        local        : `LOCAL (petite entreprise locale)`
      }[c.classification] || c.classification.toUpperCase();

      return `• ${c.companyName}
  ⚠️ TYPE EXACT   : ${typeLabel}
  Site web        : ${c.website || 'N/A'}
  Description     : ${desc}
  Réseaux sociaux : ${socialPlatforms}`;
    }).join('\n\n');

    const ragSection = ragContext
      ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTE MARCHÉ (articles web) :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ragContext.substring(0, 1200)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      : `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTE MARCHÉ : Non disponible.
Utilise uniquement les données concurrents.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return `Tu es un expert en analyse de marché.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Idée           : ${project.businessIdea}
Secteur        : ${project.industry}
Pays           : ${countryName}
Audience       : ${project.targetAudience || 'Non définie'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MARCHÉ — STATISTIQUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total concurrents    : ${stats.totalCompetitors}
Leaders locaux       : ${stats.leaderCount}
Internationaux       : ${stats.internationalCount}
Startups             : ${stats.startupCount}
Locaux               : ${stats.localCount}
Maturité             : ${stats.marketMaturity}
Actifs sur réseaux   : ${stats.withSocial}/${stats.totalCompetitors}
Réseau dominant      : ${stats.dominantPlatform}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONCURRENTS — LISTE EXACTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${competitorsList}

${ragSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TÂCHE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rédige un résumé professionnel du marché en ${lang}.

Structure OBLIGATOIRE — 5 sections :

## 1. Vue d'ensemble du marché
Rédige au minimum 100 mots sur la taille, le nombre d'acteurs et la maturité du marché.

## 2. Acteurs clés identifiés
Rédige au minimum 150 mots. Décris chaque concurrent avec son TYPE EXACT.
Utilise UNIQUEMENT ces concurrents : ${competitorNames}

## 3. Analyse de la présence digitale
Rédige au minimum 100 mots sur la présence sociale et la maturité digitale.

## 4. Opportunités pour le projet
Rédige au minimum 120 mots sur les gaps du marché et le positionnement possible.

## 5. Risques et recommandations
Rédige au minimum 100 mots sur les menaces et les conseils stratégiques.

RÈGLES ABSOLUES :
→ Langue : ${lang} uniquement
→ Total : minimum 500 mots — maximum 600 mots
→ Chaque section : minimum 80 mots
→ Ne mentionner QUE ces concurrents : ${competitorNames}
→ Ne PAS inventer d'autres acteurs ou chiffres
→ Respecter le TYPE EXACT de chaque concurrent
→ Un LEADER est dominant UNIQUEMENT dans ${countryName}
→ Un INTERNATIONAL est présent dans PLUSIEURS pays`;
  }

  _buildClassificationSummary(competitors) {
    return ['leader','startup','local','international']
      .map(cat => ({
        classification: cat,
        count         : competitors.filter(c => c.classification === cat).length,
        competitors   : competitors
          .filter(c => c.classification === cat)
          .map(c => c.companyName)
      }))
      .filter(item => item.count > 0);
  }
}

module.exports = new MarketResearchService();
