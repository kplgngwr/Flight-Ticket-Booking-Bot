const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');
const { validateChatMessage } = require('../middleware/validation');
const ChatMessage = require('../models/ChatMessage');

const router = express.Router();

// @desc    Get chat history
// @route   GET /api/chat/history
// @access  Public (with optional auth)
router.get('/history', optionalAuth, async (req, res) => {
  try {
    const { sessionId, limit = 20 } = req.query;
    
    let query = {};
    
    if (req.user) {
      // If user is authenticated, get their chat history
      query.user = req.user.id;
    } else if (sessionId) {
      // If not authenticated but has session ID, get session history
      query.sessionId = sessionId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required for guest users'
      });
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('user', 'name');

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to get chronological order
        total: messages.length
      }
    });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat history'
    });
  }
});

// @desc    Send chat message (via HTTP, also handled via Socket.io)
// @route   POST /api/chat/message
// @access  Public
router.post('/message', chatLimiter, validateChatMessage, optionalAuth, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    // Create user message
    const userMessage = await ChatMessage.create({
      sessionId: sessionId || `session-${Date.now()}`,
      user: req.user ? req.user.id : null,
      message,
      sender: 'user'
    });

    // Process message with chatbot service
    const chatbotService = require('../services/chatbotService');
    const botResponse = await chatbotService.processMessage(message, req.user ? req.user.id : sessionId);

    // Create bot response message
    const botMessage = await ChatMessage.create({
      sessionId: userMessage.sessionId,
      user: req.user ? req.user.id : null,
      message: botResponse.message,
      sender: 'bot',
      intent: botResponse.intent,
      entities: botResponse.entities,
      context: botResponse.context,
      response: botResponse.message,
      responseType: botResponse.responseType || 'text',
      quickReplies: botResponse.quickReplies || [],
      attachments: botResponse.attachments || [],
      metadata: botResponse.metadata || {}
    });

    res.json({
      success: true,
      data: {
        userMessage,
        botResponse: botMessage,
        sessionId: userMessage.sessionId
      }
    });
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing message'
    });
  }
});

// @desc    Get conversation summary
// @route   GET /api/chat/summary/:sessionId
// @access  Public
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 });

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No conversation found'
      });
    }

    // Generate conversation summary
    const summary = {
      sessionId,
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.sender === 'user').length,
      botMessages: messages.filter(m => m.sender === 'bot').length,
      startTime: messages[0].createdAt,
      lastActivity: messages[messages.length - 1].createdAt,
      intents: [...new Set(messages.map(m => m.intent).filter(Boolean))],
      entities: messages.reduce((acc, msg) => {
        if (msg.entities) {
          Object.keys(msg.entities).forEach(key => {
            if (!acc[key]) acc[key] = [];
            if (msg.entities[key] && !acc[key].includes(msg.entities[key])) {
              acc[key].push(msg.entities[key]);
            }
          });
        }
        return acc;
      }, {}),
      conversationFlow: messages.map(m => ({
        sender: m.sender,
        intent: m.intent,
        timestamp: m.createdAt
      }))
    };

    res.json({
      success: true,
      data: {
        summary
      }
    });
  } catch (error) {
    console.error('Conversation summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating conversation summary'
    });
  }
});

// @desc    Clear chat history
// @route   DELETE /api/chat/history
// @access  Public (with optional auth)
router.delete('/history', optionalAuth, async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    let query = {};
    
    if (req.user) {
      query.user = req.user.id;
    } else if (sessionId) {
      query.sessionId = sessionId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required for guest users'
      });
    }

    const result = await ChatMessage.deleteMany(query);
    
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} messages`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing chat history'
    });
  }
});

// @desc    Get chat analytics (for admin or user)
// @route   GET /api/chat/analytics
// @access  Public (with optional auth)
router.get('/analytics', optionalAuth, async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    let query = {
      createdAt: { $gte: startDate }
    };

    // If user is authenticated, filter by user
    if (req.user) {
      query.user = req.user.id;
    }

    const analytics = await ChatMessage.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            sender: "$sender"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Get intent distribution
    const intentAnalytics = await ChatMessage.aggregate([
      { $match: { ...query, intent: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$intent",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        messagesByDay: analytics,
        intentDistribution: intentAnalytics,
        timeRange,
        startDate,
        endDate: now
      }
    });
  } catch (error) {
    console.error('Chat analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat analytics'
    });
  }
});

module.exports = router;
