// src/models/User.model.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  
  email: {
    type: String,
    required: [true, 'Email requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
    index: true
  },
  
  password: {
    type: String,
    required: [true, 'Mot de passe requis'],
    minlength: [6, 'Minimum 6 caractères'],
    select: false
  },
  
  firstName: {
    type: String,
    required: [true, 'Prénom requis'],
    trim: true
  },
  
  lastName: {
    type: String,
    required: [true, 'Nom requis'],
    trim: true
  },
  
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  
  role: {
    type: String,
    enum: {
      values: ['user', 'admin'],
      message: '{VALUE} n\'est pas un rôle valide'
    },
    default: 'user'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  resetPasswordToken: {
    type: String,
    select: false
  },
  
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  
  lastLogin: {
    type: Date
  }
  
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Index
userSchema.index({ isActive: 1 });
userSchema.index({ role: 1 });

// Virtuals
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('initials').get(function() {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

// 🔥 HOOKS CRITIQUES
userSchema.pre('save', async function(next) {
  // Hash password
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Normaliser email
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  
  // Capitaliser noms
  if (this.isModified('firstName')) {
    this.firstName = this.firstName.charAt(0).toUpperCase() + this.firstName.slice(1).toLowerCase();
  }
  
  if (this.isModified('lastName')) {
    this.lastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();
  }
  
  next();
});

// Cascade delete
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const projects = await mongoose.model('Project').find({ userId: this._id });
    for (const project of projects) {
      await project.deleteOne();
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Méthodes
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isResetTokenValid = function() {
  if (!this.resetPasswordToken || !this.resetPasswordExpires) {
    return false;
  }
  return this.resetPasswordExpires > Date.now();
};

userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email }).select('+password');
};

userSchema.statics.countActive = function() {
  return this.countDocuments({ isActive: true });
};

userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

module.exports = mongoose.model('User', userSchema);