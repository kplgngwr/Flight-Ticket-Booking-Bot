const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingReference: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  flights: [{
    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flight',
      required: true
    },
    classType: {
      type: String,
      enum: ['economy', 'premium', 'business', 'first'],
      required: true
    },
    passengers: [{
      title: { type: String, enum: ['Mr', 'Mrs', 'Ms', 'Dr'], required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      passportNumber: String,
      nationality: String,
      seatNumber: String,
      mealPreference: {
        type: String,
        enum: ['vegetarian', 'vegan', 'halal', 'kosher', 'regular'],
        default: 'regular'
      },
      specialRequests: String
    }],
    price: {
      base: { type: Number, required: true },
      taxes: { type: Number, required: true },
      fees: { type: Number, default: 0 },
      total: { type: Number, required: true }
    }
  }],
  contactInfo: {
    email: { type: String, required: true },
    phone: { type: String, required: true },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  paymentInfo: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer'],
      required: true
    },
    transactionId: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date
  },
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'pending', 'cancelled', 'completed', 'no-show'],
    default: 'pending'
  },
  tripType: {
    type: String,
    enum: ['one-way', 'round-trip', 'multi-city'],
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  bookingDate: {
    type: Date,
    default: Date.now
  },
  checkInStatus: {
    outbound: { type: Boolean, default: false },
    return: { type: Boolean, default: false }
  },
  modifications: [{
    type: {
      type: String,
      enum: ['date_change', 'passenger_info', 'seat_change', 'meal_change', 'cancellation']
    },
    description: String,
    fee: Number,
    modifiedAt: { type: Date, default: Date.now },
    modifiedBy: String
  }],
  cancellation: {
    reason: String,
    cancelledAt: Date,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'denied']
    }
  },
  notifications: {
    booking: { sent: { type: Boolean, default: false }, sentAt: Date },
    payment: { sent: { type: Boolean, default: false }, sentAt: Date },
    reminder: { sent: { type: Boolean, default: false }, sentAt: Date },
    checkIn: { sent: { type: Boolean, default: false }, sentAt: Date }
  }
}, {
  timestamps: true
});

// Generate booking reference
bookingSchema.pre('save', async function(next) {
  if (!this.bookingReference) {
    this.bookingReference = await this.generateBookingReference();
  }
  next();
});

// Generate unique booking reference
bookingSchema.methods.generateBookingReference = async function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Check if reference already exists
  const existing = await this.constructor.findOne({ bookingReference: result });
  if (existing) {
    return await this.generateBookingReference(); // Regenerate if exists
  }
  
  return result;
};

// Method to calculate total passengers
bookingSchema.methods.getTotalPassengers = function() {
  return this.flights.reduce((total, flight) => total + flight.passengers.length, 0);
};

// Method to check if booking can be cancelled
bookingSchema.methods.canCancel = function() {
  if (this.bookingStatus === 'cancelled' || this.bookingStatus === 'completed') {
    return false;
  }
  
  // Check if any flight is within 24 hours
  for (let flightBooking of this.flights) {
    if (flightBooking.flight && flightBooking.flight.departure) {
      const departureTime = new Date(flightBooking.flight.departure.date);
      const now = new Date();
      const timeDiff = departureTime.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);
      
      if (hoursDiff < 24) {
        return false;
      }
    }
  }
  
  return true;
};

// Method to calculate refund amount
bookingSchema.methods.calculateRefund = function() {
  if (!this.canCancel()) {
    return 0;
  }
  
  const now = new Date();
  let refundPercentage = 1.0; // 100% refund by default
  
  // Calculate refund based on time until departure
  for (let flightBooking of this.flights) {
    if (flightBooking.flight && flightBooking.flight.departure) {
      const departureTime = new Date(flightBooking.flight.departure.date);
      const timeDiff = departureTime.getTime() - now.getTime();
      const daysDiff = timeDiff / (1000 * 3600 * 24);
      
      if (daysDiff < 7) {
        refundPercentage = Math.min(refundPercentage, 0.5); // 50% refund
      } else if (daysDiff < 30) {
        refundPercentage = Math.min(refundPercentage, 0.8); // 80% refund
      }
    }
  }
  
  return this.totalAmount * refundPercentage;
};

// Static method to find bookings by user
bookingSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId })
    .populate('flights.flight')
    .sort({ bookingDate: -1 });
};

// Index for efficient searching
bookingSchema.index({ bookingReference: 1 });
bookingSchema.index({ user: 1, bookingDate: -1 });
bookingSchema.index({ 'paymentInfo.status': 1 });

module.exports = mongoose.model('Booking', bookingSchema);
