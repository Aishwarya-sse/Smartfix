const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String, // 'user', 'ai', 'admin'
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'escalated', 'closed'],
    default: 'active'
  },
  messages: [messageSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
