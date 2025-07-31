const ChatMessage = require('../models/ChatMessage');
const flightService = require('./flightService');
const bookingService = require('./bookingService');
const moment = require('moment');

class ChatbotService {
  constructor() {
    this.conversations = new Map(); // Store conversation context
  }

  // Main message processing function
  async processMessage(message, userId) {
    try {
      const sessionId = userId || `guest-${Date.now()}`;
      
      // Get or create conversation context
      let context = this.conversations.get(sessionId) || { state: 'initial', data: {} };
      
      // Clean and normalize the message
      const normalizedMessage = message.trim().toLowerCase();
      
      // Determine intent and extract entities
      const intent = this.determineIntent(normalizedMessage);
      const entities = this.extractEntities(normalizedMessage);
      
      // Process based on intent and current state
      const response = await this.generateResponse(intent, entities, context, message);
      
      // Update conversation context
      context.previousIntent = intent;
      context.lastMessage = message;
      context.timestamp = new Date();
      this.conversations.set(sessionId, context);
      
      // Save to database if needed
      if (userId) {
        await this.saveChatMessage(sessionId, userId, message, response, intent, entities, context);
      }
      
      return {
        message: response.text,
        intent,
        entities,
        context,
        responseType: response.type || 'text',
        quickReplies: response.quickReplies || [],
        attachments: response.attachments || [],
        data: response.data || null,
        metadata: {
          processingTime: Date.now() - context.timestamp,
          confidence: this.calculateConfidence(intent, entities),
          fallback: response.fallback || false
        }
      };
    } catch (error) {
      console.error('Chatbot processing error:', error);
      return {
        message: "I'm sorry, I encountered an error. Please try again or contact support if the problem persists.",
        intent: 'error',
        responseType: 'text',
        metadata: { errorHandled: true }
      };
    }
  }

  // Determine user intent from message
  determineIntent(message) {
    const intents = {
        greeting: /\b(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i,
        search_flights: /\b(search|find|look for|book|flight|flights|ticket|tickets|travel|fly)\b/i,
        book_flight: /\b(book|reserve|purchase|buy|confirm)\b.*\b(flight|ticket)\b/i,
        view_bookings: /\b(show|view|see|check|my)\b.*\b(booking|bookings|reservation|reservations|trip|trips)\b/i,
        cancel_booking: /\b(cancel|delete|remove)\b.*\b(booking|reservation|trip)\b/i,
        modify_booking: /\b(change|modify|update|edit)\b.*\b(booking|reservation|flight)\b/i,
        check_flight_status: /\b(status|delay|delayed|on time)\b.*\b(flight)\b/i,
        price_inquiry: /\b(price|cost|how much|cheap|expensive|deal)\b/i,
        destination_info: /\b(tell me about|information|weather|attractions|visit|popular destinations)\b/i,
        help: /\b(help|assist|support|what can you do|commands)\b/i,
        goodbye: /\b(bye|goodbye|thanks|thank you|see you|exit|quit)\b/i,
        complaint: /\b(problem|issue|complain|terrible|awful|bad|worst)\b/i
    };

    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(message)) {
        return intent;
      }
    }

    // Check for specific patterns
    if (/\b[A-Z]{3}\b/i.test(message.toUpperCase())) {
      return 'search_flights'; // Airport codes detected
    }

    if (/(?=.*[A-Z])(?=.*[0-9])\b[A-Z0-9]{6}\b/.test(message.toUpperCase())) {
      return 'view_bookings'; // Booking reference detected
    }

    return 'unknown';
  }

  // Extract entities from message
  extractEntities(message) {
    const entities = {};
    
    // Extract airport codes (3 letter codes)
    const airportRegex = /\b[A-Z]{3}\b/g;
    const airports = message.toUpperCase().match(airportRegex) || [];
    if (airports.length >= 1) entities.origin = airports[0];
    if (airports.length >= 2) entities.destination = airports[1];
    
    // Extract dates (improved to handle single date-only messages and ISO date strings)
    const datePatterns = [
      /\b(today|tomorrow|next week|next month)\b/gi,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\b/gi,
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g
    ];

    let foundDate = false;
    for (const pattern of datePatterns) {
      const matches = message.match(pattern);
      if (matches) {
        entities.departureDate = matches[0];
        if (matches.length > 1) entities.returnDate = matches[1];
        foundDate = true;
        break;
      }
    }

    // If the message is just a date phrase (e.g. 'next week'), treat it as a departureDate
    if (!foundDate && message.trim().match(/^today$|^tomorrow$|^next week$|^next month$/i)) {
      entities.departureDate = message.trim();
      foundDate = true;
    }

    // If the message is a valid ISO date string (YYYY-MM-DD), treat it as departureDate
    if (!foundDate && message.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
      entities.departureDate = message.trim();
      foundDate = true;
    }

    // If the message is a generic request to change or see other dates, set a flag
    if (message.trim().match(/^(different dates|other dates|change date|show more options)$/i)) {
      entities.requestedOtherDates = true;
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
    
    // Extract booking reference
    const bookingRegex = /(?=.*[A-Z])(?=.*[0-9])\b[A-Z0-9]{6}\b/g;
    const bookingMatch = message.toUpperCase().match(bookingRegex);
    if (bookingMatch) {
      entities.bookingReference = bookingMatch[0];
    }
    
    // Extract cities/destinations (expanded list with major Indian cities)
    const cities = [
      'new york', 'los angeles', 'chicago', 'london', 'paris', 'tokyo', 'dubai', 'singapore',
      'delhi', 'mumbai', 'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune'
    ];
    cities.forEach(city => {
      if (message.toLowerCase().includes(city)) {
        if (!entities.origin) entities.origin = this.cityToAirportCode(city);
        else if (!entities.destination) entities.destination = this.cityToAirportCode(city);
      }
    });

    // Extract price range
    const priceRegex = /\$(\d+)(?:\s*to\s*\$(\d+)|\s*-\s*\$(\d+))?|under\s*\$(\d+)|below\s*\$(\d+)/gi;
    const priceMatch = message.match(priceRegex);
    if (priceMatch) {
      const numbers = priceMatch[0].match(/\d+/g);
      if (numbers.length === 1) {
        entities.maxPrice = parseInt(numbers[0]);
      } else if (numbers.length >= 2) {
        entities.priceRange = { 
          min: parseInt(numbers[0]), 
          max: parseInt(numbers[1]) 
        };
      }
    }
    
    return entities;
  }

  // Generate response based on intent and context
  async generateResponse(intent, entities, context, originalMessage) {
    // If intent is unknown but context is collecting_date and a valid departureDate is present, continue flight search
    if (
      intent === 'unknown' &&
      context.state === 'collecting_date' &&
      entities.departureDate
    ) {
      // Use previous searchParams for route info
      const mergedEntities = { ...context.data.searchParams, ...entities };
      return await this.handleFlightSearch(mergedEntities, context);
    }

    switch (intent) {
      case 'greeting':
        return this.handleGreeting(context);
      case 'search_flights':
        return await this.handleFlightSearch(entities, context);
      case 'book_flight':
        return await this.handleBookFlight(entities, context);
      case 'view_bookings':
        return await this.handleViewBookings(entities, context);
      case 'cancel_booking':
        return await this.handleCancelBooking(entities, context);
      case 'modify_booking':
        return await this.handleModifyBooking(entities, context);
      case 'check_flight_status':
        return await this.handleFlightStatus(entities, context);
      case 'price_inquiry':
        return await this.handlePriceInquiry(entities, context);
      case 'destination_info':
        return this.handleDestinationInfo(entities, context);
      case 'help':
        return this.handleHelp();
      case 'goodbye':
        return this.handleGoodbye();
      case 'complaint':
        return this.handleComplaint(originalMessage);
      case 'unknown':
      default:
        return this.handleUnknown(originalMessage, context);
    }
  }

  // Intent handlers
  handleGreeting(context) {
    const greetings = [
      "Hello! I'm your flight booking assistant. How can I help you today?",
      "Hi there! I can help you search for flights, manage bookings, and answer travel questions. What would you like to do?",
      "Welcome! I'm here to make your flight booking experience smooth and easy. How may I assist you?"
    ];
    
    return {
      text: greetings[Math.floor(Math.random() * greetings.length)],
      type: 'text',
      quickReplies: [
        'Search flights',
        'View my bookings',
        'Flight status',
        'Help'
      ]
    };
  }

  async handleFlightSearch(entities, context) {
    try {
      // Merge previous searchParams with new entities for context continuity
      if (context.data && context.data.searchParams) {
        entities = { ...context.data.searchParams, ...entities };
      }

      // Check if we have minimum required information
      if (!entities.origin || !entities.destination) {
        context.state = 'collecting_search_info';
        context.data.searchParams = entities;
        return {
          text: "I'd be happy to help you search for flights! I need some information first. " +
                (entities.origin ? `I see you want to fly from ${entities.origin}.` : 'Where would you like to fly from?') +
                (entities.destination ? ` And to ${entities.destination}.` : ' Where would you like to go?') +
                (!entities.departureDate ? ' When would you like to travel?' : ''),
          type: 'text',
          quickReplies: ['Popular destinations', 'Help with airport codes']
        };
      }

      // If user requested other dates, prompt for a new date
      if (entities.requestedOtherDates) {
        context.state = 'collecting_date';
        return {
          text: `Sure! Please tell me the new date you want to travel from ${entities.origin} to ${entities.destination}.`,
          type: 'text',
          quickReplies: ['Today', 'Tomorrow', 'Next week', 'Choose date']
        };
      }

      if (!entities.departureDate) {
        context.state = 'collecting_date';
        context.data.searchParams = entities;
        return {
          text: `Great! I'll search for flights from ${entities.origin} to ${entities.destination}. When would you like to travel?`,
          type: 'text',
          quickReplies: ['Today', 'Tomorrow', 'Next week', 'Choose date']
        };
      }

      // We have enough info to search
      const searchParams = {
        origin: entities.origin,
        destination: entities.destination,
        departureDate: this.parseDate(entities.departureDate),
        passengers: entities.passengers || 1,
        classType: entities.classType || 'economy'
      };

      const searchResults = await flightService.searchFlights(searchParams);

      context.state = 'showing_results';
      context.data.searchResults = searchResults;
      context.data.searchParams = searchParams;

      if (searchResults.flights.length === 0) {
        return {
          text: `I couldn't find any flights from ${entities.origin} to ${entities.destination} on ${entities.departureDate}. ` +
                "Would you like to try different dates or destinations?",
          type: 'text',
          quickReplies: ['Try different dates', 'Change destination', 'Popular routes']
        };
      }

      const flightSummary = searchResults.flights.slice(0, 3).map((flight, index) =>
        `${index + 1}. ${flight.airline.name} ${flight.flightNumber} - $${flight.price[searchParams.classType]} ` +
        `(${flight.departure.time} - ${flight.arrival.time}, ${flight.duration.formatted})`
      ).join('\n');

      return {
        text: `Great! I found ${searchResults.flights.length} flights from ${entities.origin} to ${entities.destination}:\n\n` +
              flightSummary +
              (searchResults.flights.length > 3 ? `\n\n... and ${searchResults.flights.length - 3} more options.` : '') +
              "\n\nWould you like to book one of these flights or see more details?",
        type: 'list',
        data: searchResults.flights,
        quickReplies: ['Book flight 1', 'See all options', 'Filter by price', 'New search']
      };
    } catch (error) {
      console.error('Flight search error:', error);
      return {
        text: "I'm sorry, I encountered an error while searching for flights. Please try again.",
        type: 'text',
        fallback: true
      };
    }
  }

  async handleBookFlight(entities, context) {
    if (!context.data || !context.data.searchResults) {
      return {
        text: "To book a flight, I need you to search for flights first. What route would you like to search?",
        type: 'text',
        quickReplies: ['Search flights', 'Popular destinations']
      };
    }

    context.state = 'booking_process';
    
    return {
      text: "To complete your booking, I'll need some additional information:\n\n" +
            "• Passenger details (name, date of birth)\n" +
            "• Contact information\n" +
            "• Payment details\n\n" +
            "For security reasons, I recommend completing the booking through our secure booking page. " +
            "Would you like me to prepare your booking details?",
      type: 'text',
      quickReplies: ['Yes, prepare booking', 'More flight options', 'Help with booking']
    };
  }

  async handleViewBookings(entities, context) {
    context.action = 'openViewBookingModal';
    
    if (entities.bookingReference) {
      return {
        text: `I can help you check your booking ${entities.bookingReference}. ` +
              "For security, I'll need to verify your email address. " +
              "Please click the 'View Booking' button at the top of the page or use the button below to enter your booking reference and email.",
        type: 'text',
        action: 'openViewBookingModal',
        data: { reference: entities.bookingReference },
        quickReplies: ['View My Booking', 'Search new flights', 'Help']
      };
    }

    return {
      text: "To view your bookings, please click the 'View Booking' button at the top of the page or use the button below. " +
            "You'll need your booking reference number (a 6-character code like 'ABC123') and the email you used for booking.",
      type: 'text',
      action: 'openViewBookingModal',
      quickReplies: ['View My Booking', 'Help finding reference', 'Contact support']
    };
  }

  async handleCancelBooking(entities, context) {
    return {
      text: "I understand you want to cancel a booking. For security and to ensure proper processing, " +
            "booking cancellations must be done through:\n\n" +
            "• Our website's 'Manage Booking' section\n" +
            "• Customer service at 1-800-FLIGHTS\n\n" +
            "You'll need your booking reference and email address. " +
            "Please note that cancellation fees may apply depending on your ticket type.",
      type: 'text',
      quickReplies: ['Check cancellation policy', 'Contact support', 'Search new flights']
    };
  }

  async handleModifyBooking(entities, context) {
    return {
      text: "To modify your booking (change dates, passenger details, etc.), please visit our website's " +
            "'Manage Booking' section or call customer service.\n\n" +
            "You'll need:\n" +
            "• Your booking reference\n" +
            "• Email address used for booking\n\n" +
            "Note: Change fees may apply depending on your ticket type and fare rules.",
      type: 'text',
      quickReplies: ['Check change policy', 'Contact support', 'Search new flights']
    };
  }

  async handleFlightStatus(entities, context) {
    if (entities.flightNumber) {
      const status = await flightService.getFlightStatus(entities.flightNumber);
      if (status) {
        return {
          text: `Flight ${entities.flightNumber} Status:\n\n` +
                `Status: ${status.status}\n` +
                `Departure: ${status.departure.scheduled} (Gate ${status.departure.gate})\n` +
                `Arrival: ${status.arrival.scheduled}\n` +
                `Aircraft: ${status.aircraft}`,
          type: 'text',
          quickReplies: ['Check another flight', 'Search flights', 'Help']
        };
      }
    }

    return {
      text: "I can check flight status for you. Please provide the flight number (e.g., AA1234, DL567).",
      type: 'text',
      quickReplies: ['I have flight number', 'Check by route', 'Help']
    };
  }

  async handlePriceInquiry(entities, context) {
    if (entities.origin && entities.destination) {
      try {
        const priceData = await flightService.getPriceAlerts(entities.origin, entities.destination);
        return {
          text: `Price information for ${entities.origin} to ${entities.destination}:\n\n` +
                `Current average price: $${priceData.averagePrice}\n` +
                `Lowest price (last 30 days): $${priceData.lowestPrice}\n` +
                `Recommendation: ${priceData.recommendation}\n\n` +
                "Would you like me to search for current flights?",
          type: 'text',
          data: priceData,
          quickReplies: ['Search flights', 'Price alerts', 'Try different route']
        };
      } catch (error) {
        return {
          text: "I'm sorry, I couldn't retrieve price information right now. " +
                "Would you like me to search for current flights instead?",
          type: 'text',
          quickReplies: ['Search flights', 'Try again', 'Help']
        };
      }
    }

    return {
      text: "I can help you with pricing information. Which route are you interested in? " +
            "Please tell me your departure and destination cities or airport codes.",
      type: 'text',
      quickReplies: ['Popular routes', 'Airport codes', 'Help']
    };
  }

  handleDestinationInfo(entities, context) {
    return {
      text: "I'd love to help with destination information! However, I specialize in flight booking. " +
            "For detailed destination guides, weather, and attractions, I recommend checking travel websites like:\n\n" +
            "• TripAdvisor\n• Lonely Planet\n• Local tourism boards\n\n" +
            "I can help you find flights to your destination though!",
      type: 'text',
      quickReplies: ['Search flights', 'Popular destinations', 'Help']
    };
  }

  handleHelp() {
    return {
      text: "I'm your flight booking assistant! Here's what I can help you with:\n\n" +
            "✈️ **Flight Search**: Find flights by saying 'Search flights from NYC to LAX'\n" +
            "📋 **Bookings**: View or manage your existing bookings\n" +
            "📊 **Flight Status**: Check if flights are on time or delayed\n" +
            "💰 **Prices**: Get pricing information for routes\n" +
            "🎯 **Popular Destinations**: Discover trending travel spots\n\n" +
            "Just tell me what you need in natural language, and I'll help you out!",
      type: 'text',
      quickReplies: ['Search flights', 'Flight status', 'View bookings', 'Popular destinations']
    };
  }

  handleGoodbye() {
    const goodbyes = [
      "Thank you for using our flight booking service! Have a wonderful trip! ✈️",
      "Safe travels! Feel free to come back anytime you need help with flights.",
      "Goodbye! Wishing you smooth flights and great adventures!"
    ];

    return {
      text: goodbyes[Math.floor(Math.random() * goodbyes.length)],
      type: 'text'
    };
  }

  handleComplaint(message) {
    return {
      text: "I'm sorry to hear you're having a problem. Your feedback is important to us. " +
            "For immediate assistance with issues, please:\n\n" +
            "• Contact our customer service at 1-800-FLIGHTS\n" +
            "• Use the 'Contact Us' form on our website\n" +
            "• Email support@flightbot.com\n\n" +
            "Is there anything specific I can help you with regarding flights or bookings?",
      type: 'text',
      quickReplies: ['Contact support', 'Search flights', 'Check booking', 'Help']
    };
  }

  handleUnknown(message, context) {
    const suggestions = [
      "I'm not sure I understood that. Could you try asking about:",
      "I didn't quite catch that. Here are some things I can help with:",
      "Let me help you with that. I can assist with:"
    ];

    return {
      text: suggestions[Math.floor(Math.random() * suggestions.length)],
      type: 'text',
      quickReplies: [
        'Search flights',
        'Check flight status',
        'View bookings',
        'Help'
      ],
      fallback: true
    };
  }

  // Utility methods
  cityToAirportCode(city) {
    const cityToCode = {
      'new york': 'JFK',
      'los angeles': 'LAX',
      'chicago': 'ORD',
      'london': 'LHR',
      'paris': 'CDG',
      'tokyo': 'NRT',
      'dubai': 'DXB',
      'singapore': 'SIN',
      'delhi': 'DEL',
      'mumbai': 'BOM',
      'bengaluru': 'BLR',
      'bangalore': 'BLR',
      'hyderabad': 'HYD',
      'chennai': 'MAA',
      'kolkata': 'CCU',
      'pune': 'PNQ'
    };
    return cityToCode[city.toLowerCase()] || city.toUpperCase();
  }

  parseDate(dateString) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (dateString.toLowerCase()) {
      case 'today':
        return today.toISOString().split('T')[0];
      case 'tomorrow':
        return tomorrow.toISOString().split('T')[0];
      case 'next week':
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.toISOString().split('T')[0];
      default:
        // Try to parse the date string
        const parsed = moment(dateString);
        return parsed.isValid() ? parsed.format('YYYY-MM-DD') : dateString;
    }
  }

  calculateConfidence(intent, entities) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on intent certainty
    if (intent !== 'unknown') confidence += 0.3;
    
    // Increase confidence based on extracted entities
    const entityCount = Object.keys(entities).length;
    confidence += Math.min(entityCount * 0.05, 0.2);

    return Math.min(confidence, 1.0);
  }

  async saveChatMessage(sessionId, userId, message, response, intent, entities, context) {
    try {
      // Ensure departureDate is always a valid date string before saving
      const entitiesToSave = { ...entities };
      if (entitiesToSave.departureDate) {
        entitiesToSave.departureDate = this.parseDate(entitiesToSave.departureDate);
      }

      await ChatMessage.create({
        sessionId,
        user: userId,
        message,
        sender: 'user',
        intent,
        entities: entitiesToSave,
        context
      });

      await ChatMessage.create({
        sessionId,
        user: userId,
        message: response.text,
        sender: 'bot',
        response: response.text,
        responseType: response.type,
        quickReplies: response.quickReplies,
        attachments: response.attachments,
        metadata: response.metadata
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  // Clear conversation context (for privacy)
  clearConversation(sessionId) {
    this.conversations.delete(sessionId);
  }

  // Get conversation context
  getConversationContext(sessionId) {
    return this.conversations.get(sessionId);
  }
}

module.exports = new ChatbotService();
