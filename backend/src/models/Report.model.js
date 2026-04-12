// src/models/Report.model.js

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({

  // ===== RELATION AVEC LE PROJET =====
  
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Projet requis'],
    index: true
  },

  // ===== RELATION AVEC L'UTILISATEUR =====

  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Utilisateur générateur requis'],
    index: true
  },

  // ===== INFORMATIONS DU RAPPORT =====

  title: {
    type: String,
    required: [true, 'Titre du rapport requis'],
    minlength: [3, 'Minimum 3 caractères'],
    maxlength: [150, 'Maximum 150 caractères'],
    trim: true
  },

  type: {
    type: String,
    enum: {
      values: ['analysis', 'competitor', 'campaign', 'performance', 'summary'],
      message: '{VALUE} n\'est pas un type valide'
    },
    required: [true, 'Type de rapport requis']
  },

  periodStart: {
    type: Date,
    required: [true, 'Date de début requise']
  },

  periodEnd: {
    type: Date,
    required: [true, 'Date de fin requise'],
    validate: {
      validator: function(value) {
        return this.periodStart <= value;
      },
      message: 'La date de fin doit être après la date de début'
    }
  },

  content: {
    type: String,
    required: [true, 'Contenu du rapport requis'],
    minlength: [20, 'Contenu trop court']
  },

  format: {
    type: String,
    enum: {
      values: ['pdf', 'excel', 'dashboard'],
      message: '{VALUE} n\'est pas un format valide'
    },
    default: 'pdf'
  },

  fileUrl: {
    type: String,
    trim: true
  },

  // ===== STATUT =====
  
  status: {
    type: String,
    enum: {
      values: ['draft', 'generated', 'archived'],
      message: '{VALUE} n\'est pas un statut valide'
    },
    default: 'draft'
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

reportSchema.index({ projectId: 1, type: 1 });
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ createdAt: -1 });


// ===== CHAMPS VIRTUELS =====

/**
 * Nom d'affichage du rapport
 */
reportSchema.virtual('displayName').get(function() {
  return `${this.title} (${this.type})`;
});

/**
 * Durée du rapport en jours
 */
reportSchema.virtual('durationDays').get(function() {
  const diffTime = this.periodEnd - this.periodStart;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});


// ===== MÉTHODES D'INSTANCE =====

/**
 * Marquer comme généré
 */
reportSchema.methods.markAsGenerated = function(fileUrl) {
  this.status = 'generated';
  this.generatedAt = new Date();
  if (fileUrl) this.fileUrl = fileUrl;
  return this.save();
};

/**
 * Archiver le rapport
 */
reportSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};


// ===== MÉTHODES STATIQUES =====

/**
 * Trouver les rapports d'un projet
 */
reportSchema.statics.findByProject = function(projectId) {
  return this.find({ projectId }).sort({ createdAt: -1 });
};

/**
 * Trouver les rapports générés par un utilisateur
 */
reportSchema.statics.findByUser = function(userId) {
  return this.find({ generatedBy: userId }).sort({ createdAt: -1 });
};

/**
 * Compter les rapports par statut pour un projet
 */
reportSchema.statics.countByStatus = async function(projectId) {
  const reports = await this.find({ projectId });
  return {
    total: reports.length,
    draft: reports.filter(r => r.status === 'draft').length,
    generated: reports.filter(r => r.status === 'generated').length,
    archived: reports.filter(r => r.status === 'archived').length
  };
};


// ===== HOOKS (MIDDLEWARE MONGOOSE) =====

/**
 * Avant sauvegarde : vérifier cohérence des dates
 */
reportSchema.pre('save', function(next) {
  if (this.periodStart > this.periodEnd) {
    return next(new Error('La date de fin doit être après la date de début'));
  }
  next();
});


module.exports = mongoose.model('Report', reportSchema);
