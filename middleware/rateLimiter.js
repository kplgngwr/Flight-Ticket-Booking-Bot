const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiter (more generous for search operations)
const searchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // limit each IP to 50 search requests per windowMs
  message: {
    success: false,
    message: 'Too many search requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking rate limiter (strict for booking operations)
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 booking requests per hour
  message: {
    success: false,
    message: 'Too many booking attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat rate limiter
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 messages per minute
  message: {
    success: false,
    message: 'Too many messages, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  searchLimiter,
  bookingLimiter,
  chatLimiter
};
