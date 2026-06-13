const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'partner', 'admin'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String
  },
  civicPoints: {
    type: Number,
    default: 150
  },
  badge: {
    type: String,
    default: 'Silver'
  },
  otpExpires: {
    type: Date
  },
  // Partner specific fields
  partnerCategory: {
    type: String,
    enum: ['garbage', 'water', 'electricity', 'roads', 'other']
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  phone: {
    type: String,
    default: ''
  },
  violationCount: {
    type: Number,
    default: 0
  },
  upiAddress: {
    type: String
  },
  emergencyContact: {
    type: String
  },
  walletBalance: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
