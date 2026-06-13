const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [
    {
      sender: {
        type: String,
        enum: ['user', 'ai', 'system', 'admin'],
        required: true
      },
      text: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      actionMetadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      }
    }
  ],
  active: {
    type: Boolean,
    default: true
  },
  isEscalated: {
    type: Boolean,
    default: false
  },
  escalatedStatus: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'resolved'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Conversation', conversationSchema);
