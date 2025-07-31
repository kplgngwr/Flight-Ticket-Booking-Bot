const express = require('express');
const { protect } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimiter');
const { validateBooking, validateBookingReference } = require('../middleware/validation');
const bookingService = require('../services/bookingService');
const Booking = require('../models/Booking');

const router = express.Router();

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
router.post('/', protect, bookingLimiter, validateBooking, async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      user: req.user.id
    };

    const booking = await bookingService.createBooking(bookingData);
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    
    if (error.message.includes('not available')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    
    const bookings = await bookingService.getUserBookings(
      req.user.id, 
      { status, limit: parseInt(limit), page: parseInt(page) }
    );
    
    res.json({
      success: true,
      data: {
        bookings: bookings.bookings,
        total: bookings.total,
        page: parseInt(page),
        pages: Math.ceil(bookings.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Bookings fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
});

// @desc    Get specific booking
// @route   GET /api/bookings/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('flights.flight');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Booking fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking'
    });
  }
});

// @desc    Get booking by reference
// @route   GET /api/bookings/reference/:reference
// @access  Public (but requires booking reference)
router.get('/reference/:reference', validateBookingReference, async (req, res) => {
  try {
    const { reference } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required to retrieve booking'
      });
    }

            const booking = await Booking.findOne({
      bookingReference: reference.toUpperCase(),
      'contactInfo.email': email.toLowerCase()
    }).populate('flights.flight');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found with the provided reference and email'
      });
    }

    res.json({
      success: true,
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Booking reference fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking'
    });
  }
});
// @desc    View booking by reference and email (for modal)
// @route   POST /api/bookings/view
// @access  Public
router.post('/view', async (req, res) => {
  try {
    const { reference, email } = req.body;
    if (!reference || !email) {
      return res.status(400).json({
        success: false,
        message: 'Booking reference and email are required.'
      });
    }
    const booking = await Booking.findOne({
      bookingReference: reference.toUpperCase(),
      'contactInfo.email': email.toLowerCase()
    });
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found with the provided reference and email.'
      });
    }
    res.json({
      success: true,
      booking: {
        reference: booking.bookingReference,
        email: booking.contactInfo.email,
        flightNumber: booking.flightNumber || (booking.flights && booking.flights.length > 0 ? booking.flights[0].flightNumber : ''),
        status: booking.bookingStatus || booking.status
      }
    });
  } catch (error) {
    console.error('View booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking.'
    });
  }
});

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be modified
    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify this booking'
      });
    }

    const updatedBooking = await bookingService.updateBooking(booking._id, req.body);
    
    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: {
        booking: updatedBooking
      }
    });
  } catch (error) {
    console.error('Booking update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking'
    });
  }
});

// @desc    Cancel booking
// @route   DELETE /api/bookings/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('flights.flight');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const cancellationResult = await bookingService.cancelBooking(booking._id, req.body.reason);
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking: cancellationResult.booking,
        refundAmount: cancellationResult.refundAmount
      }
    });
  } catch (error) {
    console.error('Booking cancellation error:', error);
    
    if (error.message.includes('cannot be cancelled')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking'
    });
  }
});

// @desc    Check-in for flight
// @route   POST /api/bookings/:id/checkin
// @access  Private
router.post('/:id/checkin', protect, async (req, res) => {
  try {
    const { flightType = 'outbound' } = req.body; // 'outbound' or 'return'
    
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('flights.flight');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const checkinResult = await bookingService.checkInFlight(booking._id, flightType);
    
    res.json({
      success: true,
      message: 'Check-in successful',
      data: {
        booking: checkinResult.booking,
        boardingPass: checkinResult.boardingPass
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    
    if (error.message.includes('not available') || error.message.includes('already')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error during check-in'
    });
  }
});

// @desc    Get booking statistics for user
// @route   GET /api/bookings/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await bookingService.getUserBookingStats(req.user.id);
    
    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking statistics'
    });
  }
});

module.exports = router;
