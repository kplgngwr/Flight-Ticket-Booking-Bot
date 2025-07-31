const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimiter');
const { validateFlightSearch } = require('../middleware/validation');
const flightService = require('../services/flightService');
const Flight = require('../models/Flight');

const router = express.Router();

// @desc    Search flights
// @route   GET /api/flights/search
// @access  Public
router.get('/search', searchLimiter, optionalAuth, async (req, res) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = 1,
      classType = 'economy',
      stops,
      maxPrice,
      airlines,
      sortBy = 'price'
    } = req.query;

    // Validate required parameters
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        success: false,
        message: 'Origin, destination, and departure date are required'
      });
    }

    // Search for flights
    const searchResults = await flightService.searchFlights({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate,
      returnDate,
      passengers: parseInt(passengers),
      classType,
      stops: stops ? parseInt(stops) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      airlines: airlines ? airlines.split(',') : undefined,
      sortBy
    });

    // If user is logged in, save search to their history
    if (req.user) {
      // You can implement search history saving here
    }

    res.json({
      success: true,
      data: {
        flights: searchResults.flights,
        searchParams: {
          origin,
          destination,
          departureDate,
          returnDate,
          passengers,
          classType,
          stops,
          maxPrice,
          airlines
        },
        total: searchResults.total,
        message: searchResults.flights.length > 0 
          ? `Found ${searchResults.flights.length} flights`
          : 'No flights found for your search criteria'
      }
    });
  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching for flights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get popular destinations
// @route   GET /api/flights/popular
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const popularDestinations = await flightService.getPopularDestinations();
    
    res.json({
      success: true,
      data: {
        destinations: popularDestinations
      }
    });
  } catch (error) {
    console.error('Popular destinations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular destinations'
    });
  }
});

// @desc    Get airports list
// @route   GET /api/flights/airports
// @access  Public
router.get('/airports', async (req, res) => {
  try {
    const { search, country, city } = req.query;
    const airports = await flightService.getAirports({ search, country, city });
    
    res.json({
      success: true,
      data: {
        airports
      }
    });
  } catch (error) {
    console.error('Airports fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching airports'
    });
  }
});

// @desc    Get flight details
// @route   GET /api/flights/:flightId
// @access  Public
router.get('/:flightId', async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.flightId);
    
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    res.json({
      success: true,
      data: {
        flight
      }
    });
  } catch (error) {
    console.error('Flight details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flight details'
    });
  }
});

// @desc    Get flight status
// @route   GET /api/flights/status/:flightNumber
// @access  Public
router.get('/status/:flightNumber', async (req, res) => {
  try {
    const { flightNumber } = req.params;
    const { date } = req.query;

    const flightStatus = await flightService.getFlightStatus(flightNumber, date);
    
    if (!flightStatus) {
      return res.status(404).json({
        success: false,
        message: 'Flight status not found'
      });
    }

    res.json({
      success: true,
      data: {
        status: flightStatus
      }
    });
  } catch (error) {
    console.error('Flight status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flight status'
    });
  }
});

// @desc    Get price alerts for a route
// @route   GET /api/flights/price-alerts
// @access  Public
router.get('/price-alerts', async (req, res) => {
  try {
    const { origin, destination } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }

    const priceData = await flightService.getPriceAlerts(origin, destination);
    
    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    console.error('Price alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching price alerts'
    });
  }
});

// @desc    Get airlines list
// @route   GET /api/flights/airlines
// @access  Public
router.get('/airlines', async (req, res) => {
  try {
    const airlines = await flightService.getAirlines();
    
    res.json({
      success: true,
      data: {
        airlines
      }
    });
  } catch (error) {
    console.error('Airlines fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching airlines'
    });
  }
});

module.exports = router;
