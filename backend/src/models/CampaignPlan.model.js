// src/models/CampaignPlan.model.js

const mongoose = require('mongoose');

// ✅ AJOUTÉ : Sous-schéma complet pour chaque jour du calendrier
// (scope → "30-day content calendar + captions + hashtags + hooks")
const calendarDaySchema = new mongoose.Schema({

  // Numéro du jour (1 à 30)
  day: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },

  // Plateforme cible
  platform: {
    type: String,
    enum: ['instagram', 'facebook', 'linkedin', 'tiktok'],
    required: true
  },

  // Type de contenu (scope → "Day 1 → Reel → Behind the scenes")
  contentType: {
    type: String,
    enum: ['reel', 'carousel', 'photo', 'video', 'story'],
    required: true
  },

  // Thème du post (scope → "Behind the scenes / Tips / Promo")
  theme: {
    type: String,
    default: '',
    maxlength: [200, 'Maximum 200 caractères']
  },

  // Caption / texte suggéré (scope → "Captions")
  caption: {
    type: String,
    default: '',
    maxlength: [2000, 'Maximum 2000 caractères']
  },

  // Accroche pour les 3 premières secondes (scope → "Hooks")
  hook: {
    type: String,
    default: '',
    maxlength: [300, 'Maximum 300 caractères']
  },

  // Hashtags recommandés (scope → "Hashtags")
  hashtags: {
    type: [String],
    default: []
  },

  // Call to action (scope → "Ad angles")
  callToAction: {
    type: String,
    default: '',
    maxlength: [200, 'Maximum 200 caractères']
  },

  // Heure optimale de publication
  bestTimeToPost: {
    type: String,
    default: ''
  },

  // Objectif du post
  objective: {
    type: String,
    enum: ['awareness', 'engagement', 'conversion', 'retention'],
    default: 'engagement'
  },

  // Description du visuel à créer
  visualDescription: {
    type: String,
    default: '',
    maxlength: [500, 'Maximum 500 caractères']
  }

}, { _id: false });

const campaignPlanSchema = new mongoose.Schema({

  // ===== RELATION AVEC LE PROJET =====
  
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Projet requis'],
    index: true
  },

  // ===== INFORMATIONS DE LA CAMPAGNE =====
  
  title: {
    type: String,
    required: [true, 'Titre de la campagne requis'],
    minlength: [3, 'Minimum 3 caractères'],
    maxlength: [150, 'Maximum 150 caractères'],
    trim: true
  },

  objective: {
    type: String,
    required: [true, 'Objectif requis'],
    minlength: [10, 'Minimum 10 caractères'],
    maxlength: [500, 'Maximum 500 caractères'],
    trim: true
  },

  targetAudience: {
    type: String,
    required: [true, 'Audience cible requise'],
    maxlength: [300, 'Maximum 300 caractères'],
    trim: true
  },

  platforms: {
    type: [String],
    required: [true, 'Au moins 1 plateforme requise'],
    validate: {
      validator: function(arr) {
        return arr && arr.length >= 1;
      },
      message: 'Au moins 1 plateforme est requise'
    }
  },

  durationDays: {
    type: Number,
    required: [true, 'Durée requise'],
    min: [1, 'Minimum 1 jour'],
    max: [365, 'Maximum 365 jours']
  },

  // ✅ CORRIGÉ : Calendar complet avec tous les attributs du scope
  calendar: {
    type: [calendarDaySchema],
    default: []
  },

  // ===== STATUT DE LA CAMPAGNE =====
  
  status: {
    type: String,
    enum: {
      values: ['draft', 'generated', 'active', 'completed'],
      message: '{VALUE} n\'est pas un statut valide'
    },
    default: 'draft'
  },

  // ✅ AJOUTÉ : Modèle IA utilisé pour génération
  aiModelUsed: {
    type: String,
    default: 'llama'
  },

  // ===== MÉTADONNÉES =====
  
  generatedAt: {
    type: Date
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== INDEX POUR PERFORMANCES =====

campaignPlanSchema.index({ projectId: 1, status: 1 });
campaignPlanSchema.index({ createdAt: -1 });

// ===== CHAMPS VIRTUELS =====

campaignPlanSchema.virtual('displayName').get(function() {
  return `${this.title} (${this.status})`;
});

campaignPlanSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// ✅ AJOUTÉ : Nombre de jours générés
campaignPlanSchema.virtual('calendarDaysCount').get(function() {
  return this.calendar.length;
});

// ===== MÉTHODES D'INSTANCE =====

campaignPlanSchema.methods.markAsGenerated = function() {
  this.status = 'generated';
  this.generatedAt = new Date();
  return this.save();
};

campaignPlanSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

campaignPlanSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

// ===== MÉTHODES STATIQUES =====

campaignPlanSchema.statics.findByProject = function(projectId) {
  return this.find({ projectId }).sort({ createdAt: -1 });
};

campaignPlanSchema.statics.findActiveByProject = function(projectId) {
  return this.find({ projectId, status: 'active' }).sort({ updatedAt: -1 });
};

campaignPlanSchema.statics.countByStatus = async function(projectId) {
  const campaigns = await this.find({ projectId });
  return {
    total: campaigns.length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    generated: campaigns.filter(c => c.status === 'generated').length,
    active: campaigns.filter(c => c.status === 'active').length,
    completed: campaigns.filter(c => c.status === 'completed').length
  };
};

// ===== HOOKS =====

campaignPlanSchema.pre('save', function(next) {
  if (this.isModified('platforms')) {
    this.platforms = [...new Set(
      this.platforms
        .map(p => p.trim().toLowerCase())
        .filter(p => p.length > 0)
    )];

    if (this.platforms.length === 0) {
      return next(new Error('Au moins 1 plateforme valide requise'));
    }
  }
  next();
});

module.exports = mongoose.model('CampaignPlan', campaignPlanSchema);