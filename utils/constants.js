// Constants for the Flight Booking Bot application

// API Endpoints
const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        PROFILE: '/api/auth/profile',
        LOGOUT: '/api/auth/logout',
        CHANGE_PASSWORD: '/api/auth/change-password'
    },
    FLIGHTS: {
        SEARCH: '/api/flights/search',
        POPULAR: '/api/flights/popular',
        AIRPORTS: '/api/flights/airports',
        AIRLINES: '/api/flights/airlines',
        STATUS: '/api/flights/status',
        PRICE_ALERTS: '/api/flights/price-alerts'
    },
    BOOKINGS: {
        CREATE: '/api/bookings',
        LIST: '/api/bookings',
        GET: '/api/bookings',
        UPDATE: '/api/bookings',
        CANCEL: '/api/bookings',
        CHECKIN: '/api/bookings',
        STATS: '/api/bookings/stats'
    },
    CHAT: {
        HISTORY: '/api/chat/history',
        MESSAGE: '/api/chat/message',
        SUMMARY: '/api/chat/summary',
        ANALYTICS: '/api/chat/analytics'
    }
};

// Flight Classes
const FLIGHT_CLASSES = {
    ECONOMY: 'economy',
    PREMIUM: 'premium',
    BUSINESS: 'business',
    FIRST: 'first'
};

// Flight Classes Display Names
const FLIGHT_CLASS_NAMES = {
    [FLIGHT_CLASSES.ECONOMY]: 'Economy',
    [FLIGHT_CLASSES.PREMIUM]: 'Premium Economy',
    [FLIGHT_CLASSES.BUSINESS]: 'Business',
    [FLIGHT_CLASSES.FIRST]: 'First Class'
};

// Booking Status
const BOOKING_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    NO_SHOW: 'no-show'
};

// Flight Status
const FLIGHT_STATUS = {
    SCHEDULED: 'scheduled',
    DELAYED: 'delayed',
    CANCELLED: 'cancelled',
    BOARDING: 'boarding',
    DEPARTED: 'departed',
    ARRIVED: 'arrived'
};

// Payment Methods
const PAYMENT_METHODS = {
    CREDIT_CARD: 'credit_card',
    DEBIT_CARD: 'debit_card',
    PAYPAL: 'paypal',
    BANK_TRANSFER: 'bank_transfer'
};

// Currency Codes
const CURRENCIES = {
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    CAD: 'CAD',
    AUD: 'AUD',
    JPY: 'JPY'
};

// Popular Airport Codes
const POPULAR_AIRPORTS = {
    // North America
    'JFK': { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
    'LAX': { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
    'ORD': { code: 'ORD', name: 'Chicago O\'Hare International Airport', city: 'Chicago', country: 'United States' },
    'MIA': { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States' },
    'YYZ': { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada' },
    
    // Europe
    'LHR': { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom' },
    'CDG': { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
    'FRA': { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany' },
    'AMS': { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands' },
    'FCO': { code: 'FCO', name: 'Leonardo da Vinci International Airport', city: 'Rome', country: 'Italy' },
    
    // Asia Pacific
    'NRT': { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
    'SIN': { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
    'HKG': { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong' },
    'SYD': { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia' },
    'ICN': { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea' },
    
    // Middle East & Africa
    'DXB': { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates' },
    'DOH': { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar' },
    'CAI': { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt' },
    'JNB': { code: 'JNB', name: 'O.R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa' }
};

// Major Airlines
const AIRLINES = {
    'AA': { code: 'AA', name: 'American Airlines', country: 'United States' },
    'DL': { code: 'DL', name: 'Delta Air Lines', country: 'United States' },
    'UA': { code: 'UA', name: 'United Airlines', country: 'United States' },
    'WN': { code: 'WN', name: 'Southwest Airlines', country: 'United States' },
    'BA': { code: 'BA', name: 'British Airways', country: 'United Kingdom' },
    'LH': { code: 'LH', name: 'Lufthansa', country: 'Germany' },
    'AF': { code: 'AF', name: 'Air France', country: 'France' },
    'KL': { code: 'KL', name: 'KLM Royal Dutch Airlines', country: 'Netherlands' },
    'EK': { code: 'EK', name: 'Emirates', country: 'United Arab Emirates' },
    'QR': { code: 'QR', name: 'Qatar Airways', country: 'Qatar' },
    'SQ': { code: 'SQ', name: 'Singapore Airlines', country: 'Singapore' },
    'CX': { code: 'CX', name: 'Cathay Pacific', country: 'Hong Kong' },
    'JL': { code: 'JL', name: 'Japan Airlines', country: 'Japan' },
    'NH': { code: 'NH', name: 'All Nippon Airways', country: 'Japan' }
};

// Chat Bot Intents
const CHAT_INTENTS = {
    GREETING: 'greeting',
    SEARCH_FLIGHTS: 'search_flights',
    BOOK_FLIGHT: 'book_flight',
    VIEW_BOOKINGS: 'view_bookings',
    CANCEL_BOOKING: 'cancel_booking',
    MODIFY_BOOKING: 'modify_booking',
    CHECK_FLIGHT_STATUS: 'check_flight_status',
    PRICE_INQUIRY: 'price_inquiry',
    DESTINATION_INFO: 'destination_info',
    HELP: 'help',
    GOODBYE: 'goodbye',
    COMPLAINT: 'complaint',
    UNKNOWN: 'unknown'
};

// Response Types
const RESPONSE_TYPES = {
    TEXT: 'text',
    CARD: 'card',
    LIST: 'list',
    QUICK_REPLY: 'quick_reply',
    FORM: 'form',
    CONFIRMATION: 'confirmation'
};

// Trip Types
const TRIP_TYPES = {
    ONE_WAY: 'one-way',
    ROUND_TRIP: 'round-trip',
    MULTI_CITY: 'multi-city'
};

// Meal Preferences
const MEAL_PREFERENCES = {
    REGULAR: 'regular',
    VEGETARIAN: 'vegetarian',
    VEGAN: 'vegan',
    HALAL: 'halal',
    KOSHER: 'kosher'
};

// Seat Preferences
const SEAT_PREFERENCES = {
    WINDOW: 'window',
    AISLE: 'aisle',
    MIDDLE: 'middle',
    NO_PREFERENCE: 'no-preference'
};

// Default Configuration
const DEFAULT_CONFIG = {
    MAX_PASSENGERS: 9,
    MIN_PASSENGERS: 1,
    MAX_SEARCH_RESULTS: 50,
    DEFAULT_CURRENCY: CURRENCIES.USD,
    DEFAULT_CLASS: FLIGHT_CLASSES.ECONOMY,
    SEARCH_TIMEOUT: 30000, // 30 seconds
    BOOKING_TIMEOUT: 300000, // 5 minutes
    SESSION_TIMEOUT: 3600000, // 1 hour
    MAX_MESSAGE_LENGTH: 1000,
    TYPING_INDICATOR_DELAY: 1000,
    NOTIFICATION_TIMEOUT: 5000
};

// Error Messages
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    AUTHENTICATION_ERROR: 'Authentication failed. Please log in again.',
    AUTHORIZATION_ERROR: 'You are not authorized to perform this action.',
    NOT_FOUND_ERROR: 'The requested resource was not found.',
    RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
    BOOKING_ERROR: 'Booking failed. Please try again or contact support.',
    PAYMENT_ERROR: 'Payment processing failed. Please check your payment details.',
    GENERIC_ERROR: 'Something went wrong. Please try again.'
};

// Success Messages
const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'Login successful! Welcome back.',
    REGISTRATION_SUCCESS: 'Account created successfully! Welcome to FlightBot.',
    BOOKING_SUCCESS: 'Booking confirmed! Your confirmation details have been sent to your email.',
    PAYMENT_SUCCESS: 'Payment processed successfully.',
    PROFILE_UPDATE_SUCCESS: 'Profile updated successfully.',
    PASSWORD_CHANGE_SUCCESS: 'Password changed successfully.',
    LOGOUT_SUCCESS: 'Logged out successfully.',
    CANCELLATION_SUCCESS: 'Booking cancelled successfully. Refund details will be sent to your email.'
};

// Validation Rules
const VALIDATION_RULES = {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^\+?[\d\s\-\(\)]{10,}$/,
    AIRPORT_CODE_REGEX: /^[A-Z]{3}$/,
    BOOKING_REFERENCE_REGEX: /^[A-Z0-9]{6}$/,
    PASSWORD_MIN_LENGTH: 6,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50
};

// LocalStorage Keys
const STORAGE_KEYS = {
    AUTH_TOKEN: 'token',
    USER_DATA: 'user',
    SEARCH_HISTORY: 'searchHistory',
    CHAT_HISTORY: 'chatHistory',
    USER_PREFERENCES: 'userPreferences',
    CART_DATA: 'cartData'
};

// Event Names
const EVENTS = {
    USER_LOGIN: 'userLogin',
    USER_LOGOUT: 'userLogout',
    FLIGHT_SEARCH: 'flightSearch',
    BOOKING_START: 'bookingStart',
    BOOKING_COMPLETE: 'bookingComplete',
    MESSAGE_SENT: 'messageSent',
    MESSAGE_RECEIVED: 'messageReceived'
};

// Export constants if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_ENDPOINTS,
        FLIGHT_CLASSES,
        FLIGHT_CLASS_NAMES,
        BOOKING_STATUS,
        FLIGHT_STATUS,
        PAYMENT_METHODS,
        CURRENCIES,
        POPULAR_AIRPORTS,
        AIRLINES,
        CHAT_INTENTS,
        RESPONSE_TYPES,
        TRIP_TYPES,
        MEAL_PREFERENCES,
        SEAT_PREFERENCES,
        DEFAULT_CONFIG,
        ERROR_MESSAGES,
        SUCCESS_MESSAGES,
        VALIDATION_RULES,
        STORAGE_KEYS,
        EVENTS
    };
}
