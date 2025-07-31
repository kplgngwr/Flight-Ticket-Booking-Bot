const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  flightNumber: {
    type: String,
    required: true,
    unique: true
  },
  airline: {
    code: { type: String, required: true },
    name: { type: String, required: true },
    logo: String
  },
  aircraft: {
    type: String,
    required: true
  },
  origin: {
    code: { type: String, required: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    terminal: String,
    gate: String
  },
  destination: {
    code: { type: String, required: true },
    name: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    terminal: String,
    gate: String
  },
  departure: {
    date: { type: Date, required: true },
    time: { type: String, required: true },
    timezone: String
  },
  arrival: {
    date: { type: Date, required: true },
    time: { type: String, required: true },
    timezone: String
  },
  duration: {
    total: { type: Number, required: true }, // in minutes
    formatted: String // "2h 30m"
  },
  price: {
    economy: { type: Number, required: true },
    premium: Number,
    business: Number,
    first: Number,
    currency: { type: String, default: 'USD' }
  },
  availability: {
    economy: { type: Number, default: 0 },
    premium: { type: Number, default: 0 },
    business: { type: Number, default: 0 },
    first: { type: Number, default: 0 }
  },
  stops: {
    count: { type: Number, default: 0 },
    airports: [String],
    duration: Number // stopover duration in minutes
  },
  amenities: {
    wifi: { type: Boolean, default: false },
    entertainment: { type: Boolean, default: false },
    meals: { type: Boolean, default: false },
    powerOutlets: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['scheduled', 'delayed', 'cancelled', 'boarding', 'departed', 'arrived'],
    default: 'scheduled'
  },
  restrictions: {
    baggagePolicy: String,
    cancellationPolicy: String,
    changePolicy: String
  }
}, {
  timestamps: true
});

// Index for efficient searching
flightSchema.index({ 'origin.code': 1, 'destination.code': 1, 'departure.date': 1 });
flightSchema.index({ 'airline.code': 1 });
flightSchema.index({ 'price.economy': 1 });

// Virtual for route
flightSchema.virtual('route').get(function() {
  return `${this.origin.code}-${this.destination.code}`;
});

// Method to check if flight is bookable
flightSchema.methods.isBookable = function(classType = 'economy', passengers = 1) {
  return this.availability[classType] >= passengers && 
         this.status === 'scheduled' &&
         new Date(this.departure.date) > new Date();
};

// Method to calculate total price for multiple passengers
flightSchema.methods.calculateTotalPrice = function(classType = 'economy', passengers = 1) {
  return this.price[classType] * passengers;
};

// Static method to search flights
flightSchema.statics.searchFlights = function(searchParams) {
  const {
    origin,
    destination,
    departureDate,
    returnDate,
    passengers = 1,
    classType = 'economy',
    stops,
    maxPrice,
    airlines
  } = searchParams;

  let query = {
    'origin.code': origin,
    'destination.code': destination,
    'departure.date': {
      $gte: new Date(departureDate),
      $lt: new Date(new Date(departureDate).getTime() + 24 * 60 * 60 * 1000)
    },
    status: 'scheduled'
  };

  // Add availability filter
  query[`availability.${classType}`] = { $gte: passengers };

  // Add optional filters
  if (stops !== undefined) {
    query['stops.count'] = stops;
  }

  if (maxPrice) {
    query[`price.${classType}`] = { $lte: maxPrice };
  }

  if (airlines && airlines.length > 0) {
    query['airline.code'] = { $in: airlines };
  }

  return this.find(query).sort({ [`price.${classType}`]: 1 });
};

module.exports = mongoose.model('Flight', flightSchema);
