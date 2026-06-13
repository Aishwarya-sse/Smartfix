const getModels = () => require('../models');
const { generateResponse } = require('../services/geminiService');

// Handles chat dialogue and executes Agentic flows
exports.chat = async (req, res) => {
  try {
    const { message, conversationId, contextData, botType } = req.body;
    const userId = req.user.id;
    const { Conversation, Request, User } = getModels();

    // Hard-fetch live user data and requests from Database for true backend-side context
    const userDetails = await User.findById(userId).select('civicPoints badge');
    const userRequests = await Request.find({ user: userId }).sort({ createdAt: -1 }).limit(10);
    
    const dbContext = {
      myCivicPoints: userDetails?.civicPoints || 150,
      myBadge: userDetails?.badge || 'Silver',
      userZone: contextData?.userZone || 'Unknown',
      myRequests: userRequests
    };

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    let conversation = null;

    // Load or create conversation
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    if (!conversation) {
      conversation = await Conversation.create({
        user: userId,
        messages: []
      });
    }

    // Append user message
    conversation.messages.push({
      sender: 'user',
      text: message,
      timestamp: new Date()
    });

    // Bypasses Gemini if the conversation is actively escalated to human support
    if (conversation.isEscalated && conversation.escalatedStatus === 'active') {
      await conversation.save();
      return res.status(200).json({
        conversationId: conversation._id,
        reply: "⏳ Connecting to a Human Support Executive... Please wait.",
        action: { action: "ESCALATE_TO_HUMAN" },
        messages: conversation.messages
      });
    }

    await conversation.save();

    // Map conversation logs to standard format for Gemini SDK
    const history = conversation.messages.map(m => ({
      sender: m.sender,
      text: m.text
    }));

    // Invoke Google Gemini API (or stateful Mock fallback) with botType routing
    const aiOutput = await generateResponse(history, dbContext, botType || 'smartfix');

    // If AI triggered an escalation or active bot is support, mark escalated
    if ((aiOutput.action && aiOutput.action.action === 'ESCALATE_TO_HUMAN') || botType === 'human') {
      conversation.isEscalated = true;
      conversation.escalatedStatus = 'active';
    }

    // Save AI response
    conversation.messages.push({
      sender: 'ai',
      text: aiOutput.text,
      timestamp: new Date(),
      actionMetadata: aiOutput.action || null
    });
    await conversation.save();

    res.status(200).json({
      conversationId: conversation._id,
      reply: aiOutput.text,
      action: aiOutput.action || null,
      messages: conversation.messages
    });
  } catch (error) {
    console.error('❌ [Agent Controller Chat Error]:', error);
    res.status(500).json({ error: 'Server error during chat dialogue.' });
  }
};

// Retrieve conversation history
exports.getHistory = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { Conversation } = getModels();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation history not found.' });
    }

    // Security check
    if (conversation.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this history.' });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error('❌ [Get History Error]:', error);
    res.status(500).json({ error: 'Server error retrieving history.' });
  }
};

// Retrieve list of recent conversations for the sidebar
exports.getUserConversations = async (req, res) => {
  try {
    const { Conversation } = getModels();
    const conversations = await Conversation.find({ user: req.user.id })
      .select('_id messages createdAt updatedAt')
      .sort({ updatedAt: -1 });

    const formattedList = conversations.map(c => {
      const lastMsg = c.messages[c.messages.length - 1];
      return {
        id: c._id,
        preview: lastMsg ? lastMsg.text.substring(0, 45) + '...' : 'New Chat',
        updatedAt: c.updatedAt
      };
    });

    res.status(200).json(formattedList);
  } catch (error) {
    console.error('❌ [Get User Conversations Error]:', error);
    res.status(500).json({ error: 'Server error retrieving active conversations.' });
  }
};

// Transcribe audio base64 payload using Gemini service
exports.transcribe = async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required.' });
    }

    const { transcribeAudio } = require('../services/geminiService');
    const transcription = await transcribeAudio(audioBase64, mimeType);

    res.status(200).json({ text: transcription });
  } catch (error) {
    console.error('❌ [Agent Controller Transcribe Error]:', error);
    res.status(500).json({ error: 'Server error during audio transcription.' });
  }
};

// Citizen marks support session as resolved
exports.resolveSupport = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const { Conversation } = getModels();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    conversation.isEscalated = false;
    conversation.escalatedStatus = 'resolved';
    conversation.messages.push({
      sender: 'system',
      text: 'Support session marked as RESOLVED and CLOSED by citizen.',
      timestamp: new Date()
    });
    await conversation.save();

    res.status(200).json({
      message: 'Support session successfully resolved and closed.',
      conversation
    });
  } catch (error) {
    console.error('❌ [Resolve Support Error]:', error);
    res.status(500).json({ error: 'Server error closing support session.' });
  }
};

// Admin retrieves all active escalated chats
exports.adminGetEscalations = async (req, res) => {
  try {
    const { Conversation } = getModels();
    
    // Find all conversations escalated to human and active
    const conversations = await Conversation.find({
      isEscalated: true,
      escalatedStatus: 'active'
    }).populate('user', 'name email').sort({ updatedAt: -1 });

    res.status(200).json(conversations);
  } catch (error) {
    console.error('❌ [Admin Get Escalations Error]:', error);
    res.status(500).json({ error: 'Server error fetching active escalations.' });
  }
};

// Admin replies to an escalated chat
exports.adminReply = async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const { Conversation } = getModels();

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    conversation.messages.push({
      sender: 'admin',
      text: text.trim(),
      timestamp: new Date()
    });
    await conversation.save();

    res.status(200).json({
      message: 'Admin response registered successfully.',
      conversation
    });
  } catch (error) {
    console.error('❌ [Admin Reply Error]:', error);
    res.status(500).json({ error: 'Server error registering admin reply.' });
  }
};
