// backend/src/controllers/marketResearch.controller.js
// ✅ Ajout generateMarketResearch

const MarketResearch        = require('../models/MarketResearch.model');
const Competitor            = require('../models/Competitor.model');
const marketResearchService = require('../services/marketResearch.service'); // ✅ nouveau

exports.getMarketResearch = async (req, res, next) => {
  try {
    const marketResearch = await MarketResearch.findOne({
      projectId: req.params.projectId
    });

    if (!marketResearch) {
      return res.status(404).json({
        success: false,
        message: 'Market research non trouvé pour ce projet'
      });
    }

    res.status(200).json({
      success: true,
      data   : marketResearch
    });
  } catch (error) { next(error); }
};

exports.createMarketResearch = async (req, res, next) => {
  try {
    const existing = await MarketResearch.findOne({
      projectId: req.params.projectId
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Market research déjà existant',
        data   : existing
      });
    }

    const marketResearch = await MarketResearch.create({
      projectId: req.params.projectId
    });

    res.status(201).json({
      success: true,
      message: 'Market research initialisé',
      data   : marketResearch
    });
  } catch (error) { next(error); }
};

exports.updateMarketSummary = async (req, res, next) => {
  try {
    const { content, competitorsAnalyzed } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Contenu du market summary requis'
      });
    }

    let marketResearch = await MarketResearch.findOne({
      projectId: req.params.projectId
    });

    if (!marketResearch) {
      marketResearch = await MarketResearch.create({
        projectId: req.params.projectId
      });
    }

    await marketResearch.updateMarketSummary(content, competitorsAnalyzed || 0);

    res.status(200).json({
      success: true,
      message: 'Market summary mis à jour',
      data   : { marketSummary: marketResearch.marketSummary }
    });
  } catch (error) { next(error); }
};

exports.updateMarketOverview = async (req, res, next) => {
  try {
    let marketResearch = await MarketResearch.findOne({
      projectId: req.params.projectId
    });

    if (!marketResearch) {
      marketResearch = await MarketResearch.create({
        projectId: req.params.projectId
      });
    }

    const competitors = await Competitor.find({
      projectId: req.params.projectId,
      isActive : true
    });

    const overviewData = {
      totalCompetitors  : competitors.length,
      leaderCount       : competitors.filter(c => c.classification === 'leader').length,
      startupCount      : competitors.filter(c => c.classification === 'startup').length,
      localCount        : competitors.filter(c => c.classification === 'local').length,
      internationalCount: competitors.filter(c => c.classification === 'international').length,
      dominantPlatform  : req.body.dominantPlatform || '',
      marketMaturity    : req.body.marketMaturity   || 'unknown'
    };

    marketResearch.classificationSummary = [
      {
        classification: 'leader',
        count         : overviewData.leaderCount,
        competitors   : competitors.filter(c => c.classification === 'leader').map(c => c.companyName)
      },
      {
        classification: 'startup',
        count         : overviewData.startupCount,
        competitors   : competitors.filter(c => c.classification === 'startup').map(c => c.companyName)
      },
      {
        classification: 'local',
        count         : overviewData.localCount,
        competitors   : competitors.filter(c => c.classification === 'local').map(c => c.companyName)
      },
      {
        classification: 'international',
        count         : overviewData.internationalCount,
        competitors   : competitors.filter(c => c.classification === 'international').map(c => c.companyName)
      }
    ].filter(item => item.count > 0);

    await marketResearch.updateMarketOverview(overviewData);

    res.status(200).json({
      success: true,
      message: 'Market overview mis à jour',
      data   : {
        marketOverview       : marketResearch.marketOverview,
        classificationSummary: marketResearch.classificationSummary
      }
    });
  } catch (error) { next(error); }
};

exports.completeMarketResearch = async (req, res, next) => {
  try {
    const marketResearch = await MarketResearch.findOne({
      projectId: req.params.projectId
    });

    if (!marketResearch) {
      return res.status(404).json({
        success: false,
        message: 'Market research non trouvé'
      });
    }

    await marketResearch.markAsCompleted();

    res.status(200).json({
      success: true,
      message: 'Market research complété',
      data   : marketResearch
    });
  } catch (error) { next(error); }
};

// ✅ NOUVEAU — Génération automatique Market Research
exports.generateMarketResearch = async (req, res, next) => {
  try {
    console.log(`\n🚀 Génération Market Research: ${req.params.projectId}`);

    const marketResearch = await marketResearchService.generateMarketResearch(
      req.params.projectId
    );

    res.status(200).json({
      success: true,
      message: 'Market Research généré avec succès',
      data   : {
        marketSummary        : marketResearch.marketSummary,
        marketOverview       : marketResearch.marketOverview,
        classificationSummary: marketResearch.classificationSummary,
        status               : marketResearch.status,
        generatedAt          : marketResearch.generatedAt
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur génération Market Research',
      error  : error.message
    });
  }
};