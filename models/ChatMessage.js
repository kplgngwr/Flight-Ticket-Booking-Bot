const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true
  },
  intent: {
    type: String,
    enum: [
      'greeting',
      'search_flights',
      'book_flight',
      'view_bookings',
      'cancel_booking',
      'modify_booking',
      'check_flight_status',
      'help',
      'goodbye',
      'unknown',
      'complaint',
      'price_inquiry',
      'destination_info'
    ]
  },
  entities: {
    origin: String,
    destination: String,
    departureDate: Date,
    returnDate: Date,
    passengers: Number,
    classType: String,
    airline: String,
    flightNumber: String,
    bookingReference: String,
    priceRange: {
      min: Number,
      max: Number
    }
  },
  context: {
    searchResults: [mongoose.Schema.Types.Mixed],
    selectedFlight: mongoose.Schema.Types.Mixed,
    bookingInProgress: mongoose.Schema.Types.Mixed,
    previousIntent: String,
    conversationState: {
      type: String,
      enum: ['initial', 'searching', 'booking', 'payment', 'confirmation', 'completed']
    }
  },
  response: {
    type: String,
    required: function() {
      return this.sender === 'bot';
    }
  },
  responseType: {
    type: String,
    enum: ['text', 'card', 'list', 'quick_reply', 'form', 'confirmation'],
    default: 'text'
  },
  quickReplies: [String],
  attachments: [{
    type: String,
    url: String,
    title: String,
    description: String
  }],
  metadata: {
    processingTime: Number,
    confidence: Number,
    fallback: Boolean,
    errorHandled: Boolean
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatMessageSchema.index({ sessionId: 1, createdAt: -1 });
chatMessageSchema.index({ user: 1, createdAt: -1 });
chatMessageSchema.index({ intent: 1 });

// Virtual for conversation flow
chatMessageSchema.virtual('isFollowUp').get(function() {
  return this.context && this.context.previousIntent;
});

// Method to extract entities from message
chatMessageSchema.methods.extractEntities = function(message) {
  const entities = {};
  
  // Extract airport codes (3 letter codes)
  const airportRegex = /\b[A-Z]{3}\b/g;
  const airports = message.match(airportRegex) || [];
  if (airports.length >= 1) entities.origin = airports[0];
  if (airports.length >= 2) entities.destination = airports[1];
  
  // Extract dates
  const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(today|tomorrow|next week|next month)\b/gi;
  const dates = message.match(dateRegex);
  if (dates && dates.length > 0) {
    entities.departureDate = dates[0];
    if (dates.length > 1) entities.returnDate = dates[1];
  }
  
  // Extract passenger count
  const passengerRegex = /(\d+)\s*(passenger|person|people|adult|traveler)/gi;
  const passengerMatch = message.match(passengerRegex);
  if (passengerMatch) {
    entities.passengers = parseInt(passengerMatch[0]);
  }
  
  // Extract class type
  const classRegex = /(economy|business|first|premium)/gi;
  const classMatch = message.match(classRegex);
  if (classMatch) {
    entities.classType = classMatch[0].toLowerCase();
  }
  
  // Extract airline
  const airlineRegex = /(american|delta|united|lufthansa|emirates|british airways|air france|klm|southwest)/gi;
  const airlineMatch = message.match(airlineRegex);
  if (airlineMatch) {
    entities.airline = airlineMatch[0];
  }
  
  // Extract booking reference
  const bookingRegex = /\b[A-Z0-9]{6}\b/g;
  const bookingMatch = message.match(bookingRegex);
  if (bookingMatch) {
    entities.bookingReference = bookingMatch[0];
  }
  
  // Extract price range
  const priceRegex = /\$(\d+)(?:\s*to\s*\$(\d+)|\s*-\s*\$(\d+))?|under\s*\$(\d+)|below\s*\$(\d+)/gi;
  const priceMatch = message.match(priceRegex);
  if (priceMatch) {
    const numbers = priceMatch[0].match(/\d+/g);
    if (numbers.length === 1) {
      entities.priceRange = { max: parseInt(numbers[0]) };
    } else if (numbers.length >= 2) {
      entities.priceRange = { 
        min: parseInt(numbers[0]), 
        max: parseInt(numbers[1]) 
      };
    }
  }
  
  return entities;
};

// Static method to get conversation history
chatMessageSchema.statics.getConversationHistory = function(sessionId, limit = 10) {
  return this.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email');
};

// Static method to get user's recent conversations
chatMessageSchema.statics.getUserConversations = function(userId, limit = 5) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Method to determine conversation state
chatMessageSchema.methods.getConversationState = function() {
  if (this.context && this.context.conversationState) {
    return this.context.conversationState;
  }
  
  // Determine state based on intent
  switch (this.intent) {
    case 'search_flights':
      return 'searching';
    case 'book_flight':
      return 'booking';
    case 'greeting':
    case 'help':
      return 'initial';
    default:
      return 'initial';
  }
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
