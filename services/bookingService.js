const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

class BookingService {
  // Create a new booking
  async createBooking(bookingData) {
    try {
      const {
        flightId,
        classType,
        passengers,
        contactInfo,
        paymentInfo,
        user,
        tripType = 'one-way'
      } = bookingData;

      // Get flight details
      const flight = await Flight.findById(flightId);
      if (!flight) {
        throw new Error('Flight not found');
      }

      // Check flight availability
      if (!flight.isBookable(classType, passengers.length)) {
        throw new Error(`Flight not available for ${passengers.length} passengers in ${classType} class`);
      }

      // Calculate pricing
      const pricing = this.calculatePricing(flight, classType, passengers.length);

      // Create booking
      const booking = new Booking({
        user,
        flights: [{
          flight: flightId,
          classType,
          passengers: passengers.map(passenger => ({
            ...passenger,
            seatNumber: this.generateSeatNumber(classType),
            mealPreference: passenger.mealPreference || 'regular'
          })),
          price: pricing
        }],
        contactInfo,
        paymentInfo: {
          ...paymentInfo,
          transactionId: uuidv4(),
          amount: pricing.total,
          status: 'pending'
        },
        tripType,
        totalAmount: pricing.total,
        bookingStatus: 'pending'
      });

      await booking.save();

      // Update flight availability
      await this.updateFlightAvailability(flightId, classType, passengers.length, 'decrease');

      // Process payment (mock implementation)
      const paymentResult = await this.processPayment(booking);
      
      if (paymentResult.success) {
        booking.paymentInfo.status = 'completed';
        booking.paymentInfo.paidAt = new Date();
        booking.bookingStatus = 'confirmed';
        await booking.save();
      }

      return await Booking.findById(booking._id).populate('flights.flight');
    } catch (error) {
      console.error('Booking creation error:', error);
      throw error;
    }
  }

  // Calculate pricing for booking
  calculatePricing(flight, classType, passengerCount) {
    const basePrice = flight.price[classType];
    const taxes = Math.round(basePrice * 0.15); // 15% taxes
    const fees = 25; // $25 booking fee
    const subtotal = basePrice * passengerCount;
    const totalTaxes = taxes * passengerCount;
    const total = subtotal + totalTaxes + fees;

    return {
      base: basePrice,
      taxes,
      fees,
      total: Math.round(total)
    };
  }

  // Generate seat number
  generateSeatNumber(classType) {
    const classRanges = {
      first: { start: 1, end: 4, letters: 'ABEF' },
      business: { start: 5, end: 12, letters: 'ABCDEF' },
      premium: { start: 13, end: 20, letters: 'ABCDEF' },
      economy: { start: 21, end: 50, letters: 'ABCDEF' }
    };

    const range = classRanges[classType] || classRanges.economy;
    const row = Math.floor(Math.random() * (range.end - range.start + 1)) + range.start;
    const seat = range.letters[Math.floor(Math.random() * range.letters.length)];
    
    return `${row}${seat}`;
  }

  // Update flight availability
  async updateFlightAvailability(flightId, classType, passengerCount, operation) {
    const flight = await Flight.findById(flightId);
    if (flight) {
      if (operation === 'decrease') {
        flight.availability[classType] = Math.max(0, flight.availability[classType] - passengerCount);
      } else if (operation === 'increase') {
        flight.availability[classType] += passengerCount;
      }
      await flight.save();
    }
  }

  // Mock payment processing
  async processPayment(booking) {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock payment success (90% success rate)
    const success = Math.random() > 0.1;
    
    return {
      success,
      transactionId: booking.paymentInfo.transactionId,
      message: success ? 'Payment processed successfully' : 'Payment failed'
    };
  }

  // Get user bookings
  async getUserBookings(userId, options = {}) {
    const { status, limit = 10, page = 1 } = options;
    
    let query = { user: userId };
    if (status) {
      query.bookingStatus = status;
    }

    const skip = (page - 1) * limit;
    
    const bookings = await Booking.find(query)
      .populate('flights.flight')
      .sort({ bookingDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    return {
      bookings,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  // Update booking
  async updateBooking(bookingId, updateData) {
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') {
      throw new Error('Cannot update this booking');
    }

    // Allow updating certain fields
    const allowedUpdates = ['contactInfo', 'flights.passengers'];
    const updates = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.some(allowed => key.includes(allowed))) {
        updates[key] = updateData[key];
      }
    });

    // Add modification record
    booking.modifications.push({
      type: 'passenger_info', // or determine type based on updates
      description: 'Booking information updated',
      fee: 0, // Could add modification fees
      modifiedAt: new Date(),
      modifiedBy: 'user'
    });

    Object.assign(booking, updates);
    await booking.save();

    return await Booking.findById(bookingId).populate('flights.flight');
  }

  // Cancel booking
  async cancelBooking(bookingId, reason) {
    const booking = await Booking.findById(bookingId).populate('flights.flight');
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (!booking.canCancel()) {
      throw new Error('This booking cannot be cancelled');
    }

    const refundAmount = booking.calculateRefund();
    
    // Update booking status
    booking.bookingStatus = 'cancelled';
    booking.cancellation = {
      reason: reason || 'Cancelled by user',
      cancelledAt: new Date(),
      refundAmount,
      refundStatus: 'pending'
    };

    // Add modification record
    booking.modifications.push({
      type: 'cancellation',
      description: `Booking cancelled: ${reason || 'Cancelled by user'}`,
      fee: booking.totalAmount - refundAmount,
      modifiedAt: new Date(),
      modifiedBy: 'user'
    });

    await booking.save();

    // Restore flight availability
    for (const flightBooking of booking.flights) {
      await this.updateFlightAvailability(
        flightBooking.flight._id,
        flightBooking.classType,
        flightBooking.passengers.length,
        'increase'
      );
    }

    // Process refund (mock implementation)
    await this.processRefund(booking, refundAmount);

    return {
      booking,
      refundAmount
    };
  }

  // Mock refund processing
  async processRefund(booking, amount) {
    // Simulate refund processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    booking.cancellation.refundStatus = 'processed';
    await booking.save();
    
    return {
      success: true,
      refundId: uuidv4(),
      amount
    };
  }

  // Check-in for flight
  async checkInFlight(bookingId, flightType = 'outbound') {
    const booking = await Booking.findById(bookingId).populate('flights.flight');
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.bookingStatus !== 'confirmed') {
      throw new Error('Check-in not available for this booking');
    }

    const checkInField = flightType === 'return' ? 'return' : 'outbound';
    
    if (booking.checkInStatus[checkInField]) {
      throw new Error('Already checked in for this flight');
    }

    // Check if check-in window is open (24 hours before departure)
    const flight = booking.flights[0].flight; // Assuming single flight for simplicity
    const departureTime = new Date(flight.departure.date);
    const now = new Date();
    const timeDiff = departureTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff > 24) {
      throw new Error('Check-in not yet available');
    }

    if (hoursDiff < 0) {
      throw new Error('Flight has already departed');
    }

    // Update check-in status
    booking.checkInStatus[checkInField] = true;
    await booking.save();

    // Generate boarding pass
    const boardingPass = this.generateBoardingPass(booking, flightType);

    return {
      booking,
      boardingPass
    };
  }

  // Generate boarding pass
  generateBoardingPass(booking, flightType) {
    const flight = booking.flights[0].flight;
    const passenger = booking.flights[0].passengers[0]; // First passenger for simplicity
    
    return {
      bookingReference: booking.bookingReference,
      flightNumber: flight.flightNumber,
      passenger: {
        name: `${passenger.firstName} ${passenger.lastName}`,
        seatNumber: passenger.seatNumber
      },
      departure: {
        airport: `${flight.origin.name} (${flight.origin.code})`,
        date: flight.departure.date,
        time: flight.departure.time,
        gate: flight.origin.gate,
        terminal: flight.origin.terminal
      },
      arrival: {
        airport: `${flight.destination.name} (${flight.destination.code})`,
        time: flight.arrival.time
      },
      barcode: this.generateBarcode(),
      qrCode: this.generateQRCode(booking.bookingReference)
    };
  }

  // Generate barcode
  generateBarcode() {
    return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  }

  // Generate QR code data
  generateQRCode(bookingReference) {
    return `BOOKING:${bookingReference}:${Date.now()}`;
  }

  // Get user booking statistics
  async getUserBookingStats(userId) {
    const bookings = await Booking.find({ user: userId });
    
    const stats = {
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.bookingStatus === 'confirmed').length,
      cancelledBookings: bookings.filter(b => b.bookingStatus === 'cancelled').length,
      totalSpent: bookings
        .filter(b => b.bookingStatus === 'confirmed')
        .reduce((sum, b) => sum + b.totalAmount, 0),
      upcomingTrips: bookings.filter(b => {
        return b.bookingStatus === 'confirmed' && 
               b.flights.some(f => new Date(f.flight.departure.date) > new Date());
      }).length,
      pastTrips: bookings.filter(b => {
        return b.bookingStatus === 'confirmed' && 
               b.flights.every(f => new Date(f.flight.departure.date) < new Date());
      }).length,
      frequentDestinations: this.getFrequentDestinations(bookings),
      averageBookingValue: bookings.length > 0 ? 
        Math.round(bookings.reduce((sum, b) => sum + b.totalAmount, 0) / bookings.length) : 0
    };

    return stats;
  }

  // Get frequent destinations from bookings
  getFrequentDestinations(bookings) {
    const destinations = {};
    
    bookings.forEach(booking => {
      booking.flights.forEach(flight => {
        if (flight.flight && flight.flight.destination) {
          const dest = flight.flight.destination.code;
          destinations[dest] = (destinations[dest] || 0) + 1;
        }
      });
    });

    return Object.entries(destinations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([destination, count]) => ({ destination, count }));
  }

  // Find booking by reference
  async findBookingByReference(reference, email) {
    return await Booking.findOne({
      bookingReference: reference.toUpperCase(),
      'contactInfo.email': email.toLowerCase()
    }).populate('flights.flight');
  }

  // Get booking reminders (for scheduled notifications)
  async getBookingReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    return await Booking.find({
      bookingStatus: 'confirmed',
      'flights.flight.departure.date': {
        $gte: tomorrow,
        $lt: dayAfterTomorrow
      },
      'notifications.reminder.sent': false
    }).populate('flights.flight user');
  }
}

module.exports = new BookingService();
