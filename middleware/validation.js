const { body, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    // Removed strict complexity requirement for better user experience
    // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    // .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
];

// User login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Flight search validation
const validateFlightSearch = [
  body('origin')
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .withMessage('Origin must be a valid 3-letter airport code'),
  
  body('destination')
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .withMessage('Destination must be a valid 3-letter airport code'),
  
  body('departureDate')
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value < new Date()) {
        throw new Error('Departure date cannot be in the past');
      }
      return true;
    }),
  
  body('returnDate')
    .optional()
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (value && req.body.departureDate && value <= new Date(req.body.departureDate)) {
        throw new Error('Return date must be after departure date');
      }
      return true;
    }),
  
  body('passengers')
    .optional()
    .isInt({ min: 1, max: 9 })
    .withMessage('Passengers must be between 1 and 9'),
  
  body('classType')
    .optional()
    .isIn(['economy', 'premium', 'business', 'first'])
    .withMessage('Class type must be economy, premium, business, or first'),
  
  handleValidationErrors
];

// Booking validation
const validateBooking = [
  body('flightId')
    .isMongoId()
    .withMessage('Invalid flight ID'),
  
  body('passengers')
    .isArray({ min: 1, max: 9 })
    .withMessage('Passengers array must contain 1-9 passengers'),
  
  body('passengers.*.title')
    .isIn(['Mr', 'Mrs', 'Ms', 'Dr'])
    .withMessage('Title must be Mr, Mrs, Ms, or Dr'),
  
  body('passengers.*.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('passengers.*.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('passengers.*.dateOfBirth')
    .isISO8601()
    .toDate()
    .custom((value) => {
      const age = (new Date() - new Date(value)) / (1000 * 60 * 60 * 24 * 365);
      if (age > 120 || age < 0) {
        throw new Error('Invalid date of birth');
      }
      return true;
    }),
  
  body('contactInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('contactInfo.phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('paymentInfo.method')
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer'])
    .withMessage('Invalid payment method'),
  
  handleValidationErrors
];

// Chat message validation
const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  
  body('sessionId')
    .optional()
    .isUUID()
    .withMessage('Invalid session ID'),
  
  handleValidationErrors
];

// Booking reference validation
const validateBookingReference = [
  body('bookingReference')
    .isLength({ min: 6, max: 6 })
    .isAlphanumeric()
    .withMessage('Booking reference must be 6 alphanumeric characters'),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateFlightSearch,
  validateBooking,
  validateChatMessage,
  validateBookingReference,
  handleValidationErrors
};
