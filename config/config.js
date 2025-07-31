module.exports = {
  // Server configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/flight-booking-bot',
  
  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // Flight API configuration
  FLIGHT_API: {
    KEY: process.env.FLIGHT_API_KEY,
    URL: process.env.FLIGHT_API_URL,
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
    RAPIDAPI_HOST: process.env.RAPIDAPI_HOST
  },
  
  // Bot configuration
  BOT_CONFIG: {
    MAX_SEARCH_RESULTS: 10,
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    MAX_PASSENGERS: 9,
    MAX_BOOKING_DURATION_HOURS: 24
  },
  
  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  }
};
