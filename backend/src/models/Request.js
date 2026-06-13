const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  category: {
    type: String,
    enum: ['garbage', 'water', 'electricity', 'roads', 'other'],
    required: true
  },
  title: {
    type: String,
    required: true,
    default: 'Civic Issue Report'
  },
  description: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'Scheduled', 'In Progress', 'Resolved', 'Done', 'Escalated'],
    default: 'Pending'
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  assignedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  escalatedAt: {
    type: Date
  },
  escalationNotes: {
    type: String
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  scheduledTime: {
    type: String,
    default: null
  },
  resolutionImage: {
    type: String,
    default: null
  },
  citizenImage: {
    type: String,
    default: null
  },
  rating: {
    type: Number,
    default: null
  },
  feedback: {
    type: String,
    default: null
  },
  resolutionLatitude: {
    type: Number,
    default: null
  },
  resolutionLongitude: {
    type: Number,
    default: null
  },
  resolutionLocationName: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Request', requestSchema);
