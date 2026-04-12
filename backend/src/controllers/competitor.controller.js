// backend/src/controllers/competitor.controller.js
// VERSION 5 — Ajout injectKnownHotels

const Competitor = require('../models/Competitor.model');
const Project = require('../models/Project.model');
const discoverService = require('../services/discover.service');
const enrichmentService = require('../services/enrichment.service');

// ═══════════════════════════════════════════════════════════
// SECTION 1 : CRUD DE BASE
// ═══════════════════════════════════════════════════════════

exports.createCompetitor = async (req, res, next) => {
  try {
    const {
      projectId, companyName, website, description,
      classification, country, socialMedia, logo,
      classificationScore, classificationJustification, rank, notes
    } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const competitor = await Competitor.create({
      projectId, companyName, website,
      description                 : description                || '',
      classification              : classification             || 'startup',
      classificationMaturity      : classification             || 'startup',
      country,
      socialMedia,
      logo                        : logo                       || { url: '', source: '' },
      classificationScore         : classificationScore        || 0,
      classificationJustification : classificationJustification || '',
      rank                        : rank                       || 0,
      isManuallyAdded             : true,
      notes                       : notes                      || ''
    });

    await Project.findByIdAndUpdate(projectId, { $inc: { competitorsCount: 1 } });
    res.status(201).json({ success: true, message: 'Concurrent créé avec succès', data: competitor });
  } catch (error) { next(error); }
};

exports.getCompetitorsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const filter = { projectId };
    if (req.query.maturity) filter.classificationMaturity = req.query.maturity;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const competitors = await Competitor.find(filter)
      .sort({ rank: 1, 'metrics.overallScore': -1, createdAt: -1 });

    res.status(200).json({ success: true, count: competitors.length, data: competitors });
  } catch (error) { next(error); }
};

exports.getCompetitor = async (req, res, next) => {
  try {
    const competitor = await Competitor.findById(req.params.id).populate('projectId', 'name userId');
    if (!competitor) return res.status(404).json({ success: false, message: 'Concurrent non trouvé' });
    if (competitor.projectId.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });
    res.status(200).json({ success: true, data: competitor });
  } catch (error) { next(error); }
};

exports.updateCompetitor = async (req, res, next) => {
  try {
    let competitor = await Competitor.findById(req.params.id).populate('projectId', 'userId');
    if (!competitor) return res.status(404).json({ success: false, message: 'Concurrent non trouvé' });
    if (competitor.projectId.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const allowedFields = [
      'companyName', 'website', 'description', 'classificationMaturity',
      'classification', 'country', 'socialMedia', 'logo',
      'classificationScore', 'classificationJustification',
      'rank', 'swotAnalysis', 'isActive', 'notes'
    ];
    const updateData = {};
    allowedFields.forEach(field => { if (req.body[field] !== undefined) updateData[field] = req.body[field]; });

    competitor = await Competitor.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Concurrent mis à jour', data: competitor });
  } catch (error) { next(error); }
};

exports.deleteCompetitor = async (req, res, next) => {
  try {
    const competitor = await Competitor.findById(req.params.id).populate('projectId', 'userId');
    if (!competitor) return res.status(404).json({ success: false, message: 'Concurrent non trouvé' });
    if (competitor.projectId.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const projectId = competitor.projectId._id;
    await competitor.deleteOne();
    await Project.findByIdAndUpdate(projectId, { $inc: { competitorsCount: -1 } });
    res.status(200).json({ success: true, message: 'Concurrent supprimé avec succès' });
  } catch (error) { next(error); }
};

exports.getCompetitorStats = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const stats         = await Competitor.getStatsByClassification(projectId);
    const scrapingStats = await Competitor.countByScrapingStatus(projectId);
    const manualCount   = await Competitor.countDocuments({ projectId, isManuallyAdded: true });
    const autoCount     = await Competitor.countDocuments({ projectId, isManuallyAdded: false });

    res.status(200).json({
      success: true,
      data: { ...stats, scrapingStats, manualCount, autoCount }
    });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════
// SECTION 2 : DÉCOUVERTE AUTOMATIQUE
// ═══════════════════════════════════════════════════════════

exports.discoverCompetitors = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { maxResults = 50 } = req.body;

    console.log(`🔍 Découverte automatique pour projet ${projectId}...`);

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });
    if (!project.keywords || project.keywords.length === 0) return res.status(400).json({ success: false, message: 'Le projet doit avoir au moins un mot-clé' });

    const competitors = await discoverService.discoverCompetitors(project, {
      maxResults: Math.min(maxResults, 50)
    });

    const totalCompetitors = await Competitor.countDocuments({ projectId });
    await Project.findByIdAndUpdate(projectId, { competitorsCount: totalCompetitors });

    res.status(200).json({
      success: true,
      message: `${competitors.length} concurrent(s) découvert(s) automatiquement`,
      data   : competitors
    });
  } catch (error) {
    console.error('❌ Erreur découverte automatique:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la découverte automatique', error: error.message });
  }
};

// ✅ NOUVEAU — Injection manuelle des hôtels connus après analyse des résultats
exports.injectKnownHotels = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const result = await discoverService.injectKnownHotels(projectId);

    res.status(200).json({
      success: true,
      message: `${result.injected} hôtels injectés, ${result.skipped} déjà présents`,
      data   : result
    });
  } catch (error) {
    console.error('❌ Erreur injection hôtels:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'injection', error: error.message });
  }
};

exports.getDiscoveryStatus = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const totalCompetitors = await Competitor.countDocuments({ projectId });
    const autoDiscovered   = await Competitor.countDocuments({ projectId, isManuallyAdded: false });
    const manuallyAdded    = await Competitor.countDocuments({ projectId, isManuallyAdded: true });

    res.status(200).json({
      success: true,
      data: {
        total: totalCompetitors, autoDiscovered, manuallyAdded,
        hasKeywords: project.keywords && project.keywords.length > 0,
        canDiscover: project.keywords && project.keywords.length > 0
      }
    });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════
// SECTION 3 : ENRICHISSEMENT
// ═══════════════════════════════════════════════════════════

exports.enrichCompetitors = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const results = await enrichmentService.enrichCompetitors(projectId);
    const success = results.filter(r => r.success).length;
    const failed  = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      message: `${success} concurrent(s) enrichi(s), ${failed} échec(s)`,
      data   : { total: results.length, success, failed, results }
    });
  } catch (error) { next(error); }
};

exports.enrichOne = async (req, res, next) => {
  try {
    const competitor = await Competitor.findById(req.params.id).populate('projectId', 'userId');
    if (!competitor) return res.status(404).json({ success: false, message: 'Concurrent non trouvé' });
    if (competitor.projectId.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const result = await enrichmentService.enrichOne(req.params.id);
    res.status(200).json({ success: true, message: `${result.companyName} enrichi avec succès`, data: result });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════
// SECTION 4 : CLASSIFICATION
// ═══════════════════════════════════════════════════════════

exports.updateClassification = async (req, res, next) => {
  try {
    const { maturity, score, justification } = req.body;
    const competitor = await Competitor.findById(req.params.id).populate('projectId', 'userId');
    if (!competitor) return res.status(404).json({ success: false, message: 'Concurrent non trouvé' });
    if (competitor.projectId.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    await competitor.updateClassification({ maturity, score, justification });

    res.status(200).json({
      success: true,
      message: 'Classification mise à jour',
      data: {
        classificationMaturity      : competitor.classificationMaturity,
        classificationScore         : competitor.classificationScore,
        classificationJustification : competitor.classificationJustification
      }
    });
  } catch (error) { next(error); }
};

exports.cleanupFalsePositives = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Projet non trouvé' });
    if (project.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    const removed = await discoverService.cleanupFalsePositives(projectId);
    const totalCount = await Competitor.countDocuments({ projectId });
    await Project.findByIdAndUpdate(projectId, { competitorsCount: totalCount });

    res.status(200).json({
      success: true,
      message: `${removed} faux positif(s) supprimé(s)`,
      data   : { removed, totalRemaining: totalCount }
    });
  } catch (error) { next(error); }
};

exports.updateLogo = async (req, res, next) => {
  try {
    const { url, source } = req.body;
    const competitor = await Competitor.findById(req.params.id).populate('projectId', 'userId');
    if (!competitor) return res.status(404).json({ success: false, message: 'Concurrent non trouvé' });
    if (competitor.projectId.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Accès refusé' });

    await competitor.updateLogo(url, source);
    res.status(200).json({ success: true, message: 'Logo mis à jour', data: { logo: competitor.logo } });
  } catch (error) { next(error); }
};