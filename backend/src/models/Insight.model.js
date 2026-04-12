// src/models/Insight.model.js

const mongoose = require('mongoose');

/**
 * Sous-schéma pour un moment optimal de publication
 */
const bestTimeSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  hour: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, { _id: false });

/**
 * Sous-schéma pour un hashtag avec ses métriques
 */
const hashtagAnalysisSchema = new mongoose.Schema({
  tag: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  frequency: { type: Number, default: 0, min: 0 },
  avgEngagement: { type: Number, default: 0, min: 0 },
  relevanceScore: { type: Number, default: 0, min: 0, max: 100 }
}, { _id: false });

/**
 * Sous-schéma pour l'analyse par format de contenu
 */
const formatAnalysisSchema = new mongoose.Schema({
  format: {
    type: String,
    enum: ['photo', 'video', 'reel', 'carousel', 'story'],
    required: true
  },
  count: { type: Number, default: 0, min: 0 },
  avgEngagement: { type: Number, default: 0, min: 0 },
  avgEngagementRate: { type: Number, default: 0, min: 0, max: 100 },
  performanceIndex: { type: Number, default: 100, min: 0 }
}, { _id: false });

/**
 * Schéma principal pour les insights
 */
const insightSchema = new mongoose.Schema({

  // ===== RELATION AVEC LE PROJET =====

  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Projet requis'],
    unique: true,
    index: true
  },

  // ===== ANALYSE TEMPORELLE =====

  bestPostingTimes: {
    type: [bestTimeSchema],
    validate: {
      validator: function(arr) {
        return arr.length <= 10;
      },
      message: 'Maximum 10 meilleurs moments'
    },
    default: []
  },

  bestDays: {
    type: [{
      day: {
        type: String,
        enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
      },
      score: { type: Number, min: 0, max: 100 }
    }],
    default: []
  },

  worstPostingTimes: { type: [String], default: [] },

  // ===== ANALYSE DES HASHTAGS =====

  topHashtags: {
    type: [hashtagAnalysisSchema],
    validate: {
      validator: function(arr) {
        return arr.length <= 30;
      },
      message: 'Maximum 30 hashtags'
    },
    default: []
  },

  recommendedHashtags: {
    type: [String],
    validate: {
      validator: function(arr) {
        return arr.length <= 15;
      },
      message: 'Maximum 15 hashtags recommandés'
    },
    default: []
  },

  hashtagsToAvoid: { type: [String], default: [] },

  // ===== ANALYSE DES FORMATS =====

  formatAnalysis: { type: [formatAnalysisSchema], default: [] },

  bestPerformingFormat: {
    type: String,
    enum: ['photo','video','reel','carousel','story',''],
    default: ''
  },

  recommendedFrequency: {
    photo: { type: Number, default: 0, min: 0 },
    video: { type: Number, default: 0, min: 0 },
    reel: { type: Number, default: 0, min: 0 },
    carousel: { type: Number, default: 0, min: 0 },
    story: { type: Number, default: 0, min: 0 }
  },

  // ===== THÈMES ET CONTENU =====

  contentThemes: {
    type: [{
      theme: { type: String, required: true },
      frequency: { type: Number, default: 0 },
      avgEngagement: { type: Number, default: 0 }
    }],
    default: []
  },

  contentTypesToFocus: { type: [String], default: [] },

  optimalCaptionLength: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    avg: { type: Number, default: 0 }
  },

  // ===== PATTERNS DÉTECTÉS =====

  patterns: { type: [String], default: [] },

  trends: {
    type: [{
      trend: String,
      confidence: { type: Number, min: 0, max: 100, default: 0 }
    }],
    default: []
  },

  commonSuccessFactors: { type: [String], default: [] },
  commonMistakes: { type: [String], default: [] },

  // ===== RECOMMANDATIONS STRATÉGIQUES =====

  recommendations: {
    type: [{
      category: {
        type: String,
        enum: ['content','timing','engagement','format','hashtags','general'],
        required: true
      },
      title: { type: String, required: true },
      description: { type: String, required: true },
      priority: { type: String, enum: ['high','medium','low'], default: 'medium' },
      expectedImpact: { type: String, enum: ['high','medium','low'], default: 'medium' }
    }],
    default: []
  },

  quickWins: { type: [String], default: [] },

  longTermStrategy: {
    type: String,
    maxlength: [1000, 'Maximum 1000 caractères'],
    default: ''
  },

  // ===== ANALYSE CONCURRENTIELLE =====

  competitorStrengths: { type: [String], default: [] },
  competitorWeaknesses: { type: [String], default: [] },
  opportunities: { type: [String], default: [] },
  threats: { type: [String], default: [] },

  // ===== RÉSUMÉ GLOBAL (AJOUTÉ) =====

  summary: {
    type: String,
    maxlength: [2000, 'Maximum 2000 caractères'],
    trim: true,
    default: ''
  },

  marketPosition: {
    type: String,
    enum: ['leader', 'challenger', 'follower', 'niche', 'unknown'],
    default: 'unknown'
  },

  aiModelUsed: {
    type: String,
    trim: true,
    default: ''
  },

  // ===== MÉTADONNÉES =====

  competitorsAnalyzed: { type: Number, default: 0, min: 0 },
  postsAnalyzed: { type: Number, default: 0, min: 0 },
  confidenceScore: { type: Number, default: 0, min: 0, max: 100 },
  analysisVersion: { type: String, default: '1.0.0' },

  generatedAt: {
    type: Date,
    default: Date.now
  },

  status: {
    type: String,
    enum: {
      values: ['draft', 'completed', 'outdated'],
      message: '{VALUE} n\'est pas un statut valide'
    },
    default: 'draft'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== INDEX =====
insightSchema.index({ projectId: 1 }, { unique: true });
insightSchema.index({ generatedAt: -1 });
insightSchema.index({ status: 1 });

// (tout le reste de ton fichier : virtuals, méthodes, hooks… reste EXACTEMENT pareil)

module.exports = mongoose.model('Insight', insightSchema);
