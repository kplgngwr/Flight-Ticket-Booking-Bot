const axios = require('axios');
const Flight = require('../models/Flight');
const moment = require('moment');

const Amadeus = require('amadeus');

class FlightService {
  // Helper to get Amadeus access token (for direct axios calls)
  async getAmadeusAccessToken() {
    const tokenUrl = 'https://test.api.amadeus.com/v1/security/oauth2/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.AMADEUS_API_KEY);
    params.append('client_secret', process.env.AMADEUS_API_SECRET);

    try {
      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Failed to fetch Amadeus access token:', error.response?.data || error.message);
      throw new Error('Unable to get Amadeus access token');
    }
  }
  constructor() {
    this.amadeus = new Amadeus({
      clientId: process.env.AMADEUS_API_KEY,
      clientSecret: process.env.AMADEUS_API_SECRET,
      hostname: process.env.AMADEUS_ENVIRONMENT === 'test' ? 'test.api.amadeus.com' : 'production.api.amadeus.com'
    });
  }

  // Search flights using external API or database
  async searchFlights(searchParams) {
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
      } = searchParams;

      // First, try to get flights from database (cached/stored flights)
      let dbFlights = await this.searchDatabaseFlights(searchParams);
      
      // If no flights in database or need fresh data, call external API
      if (dbFlights.length === 0) {
        try {
          const apiFlights = await this.searchExternalAPI(searchParams);
          dbFlights = apiFlights;
        } catch (apiError) {
          console.warn('External API failed, using mock data:', apiError.message);
          // Fall back to mock data if API fails
          dbFlights = await this.generateMockFlights(searchParams);
        }
      }

      // Sort flights based on sortBy parameter
      const sortedFlights = this.sortFlights(dbFlights, sortBy);

      return {
        flights: sortedFlights,
        total: sortedFlights.length
      };
    } catch (error) {
      console.error('Flight search error:', error);
      throw new Error('Unable to search flights at this time');
    }
  }

  // Search flights in database
  async searchDatabaseFlights(searchParams) {
    const {
      origin,
      destination,
      departureDate,
      passengers,
      classType,
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

    return await Flight.find(query);
  }


  // Search flights using Amadeus API
  async searchExternalAPI(searchParams) {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = 1,
      classType = 'ECONOMY'
    } = searchParams;

    // If using Amadeus SDK, it handles token automatically
    try {
      const response = await this.amadeus.shopping.flightOffersSearch.get({
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: departureDate,
        returnDate: returnDate,
        adults: passengers,
        travelClass: classType.toUpperCase(),
        currencyCode: 'USD',
        max: 10
      });

      if (response.data && Array.isArray(response.data)) {
        return this.transformAmadeusResponse(response.data, searchParams);
      } else {
        return [];
      }
    } catch (sdkError) {
      // If SDK fails, try direct axios call as fallback
      console.warn('Amadeus SDK failed, trying direct API:', sdkError.message);
      try {
        const accessToken = await this.getAmadeusAccessToken();
        const apiUrl = 'https://test.api.amadeus.com/v2/shopping/flight-offers';
        const params = {
          originLocationCode: origin,
          destinationLocationCode: destination,
          departureDate: departureDate,
          returnDate: returnDate,
          adults: passengers,
          travelClass: classType.toUpperCase(),
          currencyCode: 'USD',
          max: 10
        };
        const response = await axios.get(apiUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params
        });
        if (response.data && Array.isArray(response.data.data)) {
          return this.transformAmadeusResponse(response.data.data, searchParams);
        } else {
          return [];
        }
      } catch (error) {
        console.error('Amadeus API error (direct):', error.response?.data || error.message);
        throw new Error('Amadeus API flight search failed');
      }
    }
  }

  // Transform Amadeus API response to our flight format
  transformAmadeusResponse(apiData, searchParams) {
    return apiData.map((offer, idx) => {
      const itinerary = offer.itineraries[0];
      const segment = itinerary.segments[0];
      return {
        flightNumber: segment.flightNumber,
        airline: {
          code: segment.carrierCode,
          name: segment.carrierCode,
          logo: `https://content.airhex.com/content/logos/airlines_${segment.carrierCode}_200_200_s.png`
        },
        aircraft: segment.aircraft?.code || 'N/A',
        origin: {
          code: segment.departure.iataCode,
          name: segment.departure.iataCode,
          city: '',
          country: ''
        },
        destination: {
          code: segment.arrival.iataCode,
          name: segment.arrival.iataCode,
          city: '',
          country: ''
        },
        departure: {
          date: segment.departure.at,
          time: segment.departure.at
        },
        arrival: {
          date: segment.arrival.at,
          time: segment.arrival.at
        },
        duration: itinerary.duration,
        stops: itinerary.segments.length - 1,
        price: {
          economy: offer.price.total
        },
        status: 'scheduled',
        availability: {
          economy: searchParams.passengers
        }
      };
    });
  }

  // Transform external API response to our flight format
  transformAPIResponse(apiData, searchParams) {
    const flights = [];
    
    if (apiData.Quotes) {
      apiData.Quotes.forEach((quote, index) => {
        const carriers = apiData.Carriers || [];
        const places = apiData.Places || [];
        const currencies = apiData.Currencies || [];
        
        const carrier = carriers.find(c => c.CarrierId === quote.OutboundLeg.CarrierIds[0]);
        const originPlace = places.find(p => p.PlaceId === quote.OutboundLeg.OriginId);
        const destPlace = places.find(p => p.PlaceId === quote.OutboundLeg.DestinationId);
        
        const flight = {
          flightNumber: `${carrier?.Name?.substring(0, 2).toUpperCase() || 'AI'}${1000 + index}`,
          airline: {
            code: carrier?.Name?.substring(0, 2).toUpperCase() || 'AI',
            name: carrier?.Name || 'Airline',
            logo: `https://images.kiwi.com/airlines/64/${carrier?.Name?.substring(0, 2).toUpperCase() || 'AI'}.png`
          },
          aircraft: 'Boeing 737',
          origin: {
            code: searchParams.origin,
            name: originPlace?.Name || searchParams.origin,
            city: originPlace?.CityName || searchParams.origin,
            country: originPlace?.CountryName || 'Country'
          },
          destination: {
            code: searchParams.destination,
            name: destPlace?.Name || searchParams.destination,
            city: destPlace?.CityName || searchParams.destination,
            country: destPlace?.CountryName || 'Country'
          },
          departure: {
            date: new Date(searchParams.departureDate),
            time: this.generateRandomTime(),
            timezone: 'UTC'
          },
          arrival: {
            date: new Date(new Date(searchParams.departureDate).getTime() + this.generateRandomDuration() * 60000),
            time: this.generateRandomTime(),
            timezone: 'UTC'
          },
          duration: {
            total: this.generateRandomDuration(),
            formatted: this.formatDuration(this.generateRandomDuration())
          },
          price: {
            economy: quote.MinPrice || this.generateRandomPrice(),
            premium: (quote.MinPrice || this.generateRandomPrice()) * 1.5,
            business: (quote.MinPrice || this.generateRandomPrice()) * 2.5,
            first: (quote.MinPrice || this.generateRandomPrice()) * 4,
            currency: 'USD'
          },
          availability: {
            economy: Math.floor(Math.random() * 50) + 10,
            premium: Math.floor(Math.random() * 20) + 5,
            business: Math.floor(Math.random() * 10) + 2,
            first: Math.floor(Math.random() * 5) + 1
          },
          stops: {
            count: quote.Direct ? 0 : Math.floor(Math.random() * 2) + 1,
            airports: quote.Direct ? [] : ['LAX'],
            duration: quote.Direct ? 0 : Math.floor(Math.random() * 120) + 30
          },
          amenities: {
            wifi: Math.random() > 0.5,
            entertainment: Math.random() > 0.3,
            meals: Math.random() > 0.4,
            powerOutlets: Math.random() > 0.6
          },
          status: 'scheduled'
        };
        
        flights.push(flight);
      });
    }
    
    return flights;
  }

  // Generate mock flights when external API is not available
  async generateMockFlights(searchParams) {
    const {
      origin,
      destination,
      departureDate,
      passengers,
      classType
    } = searchParams;

    const mockAirlines = [
      { code: 'AA', name: 'American Airlines' },
      { code: 'DL', name: 'Delta Air Lines' },
      { code: 'UA', name: 'United Airlines' },
      { code: 'SW', name: 'Southwest Airlines' },
      { code: 'BA', name: 'British Airways' },
      { code: 'LH', name: 'Lufthansa' },
      { code: 'EK', name: 'Emirates' },
      { code: 'AF', name: 'Air France' }
    ];

    const flights = [];
    const numFlights = Math.floor(Math.random() * 8) + 3; // 3-10 flights

    for (let i = 0; i < numFlights; i++) {
      const airline = mockAirlines[Math.floor(Math.random() * mockAirlines.length)];
      const basePrice = this.generateRandomPrice();
      const duration = this.generateRandomDuration();
      const departureTime = this.generateRandomTime();
      const arrivalTime = this.addTimeToTime(departureTime, duration);

      const flight = {
        _id: `mock_${Date.now()}_${i}`,
        flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
        airline: {
          code: airline.code,
          name: airline.name,
          logo: `https://images.kiwi.com/airlines/64/${airline.code}.png`
        },
        aircraft: this.getRandomAircraft(),
        origin: {
          code: origin,
          name: this.getAirportName(origin),
          city: this.getCityName(origin),
          country: this.getCountryName(origin),
          terminal: Math.random() > 0.5 ? `Terminal ${Math.floor(Math.random() * 4) + 1}` : undefined,
          gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 10))}${Math.floor(Math.random() * 50) + 1}`
        },
        destination: {
          code: destination,
          name: this.getAirportName(destination),
          city: this.getCityName(destination),
          country: this.getCountryName(destination),
          terminal: Math.random() > 0.5 ? `Terminal ${Math.floor(Math.random() * 4) + 1}` : undefined,
          gate: `${String.fromCharCode(65 + Math.floor(Math.random() * 10))}${Math.floor(Math.random() * 50) + 1}`
        },
        departure: {
          date: new Date(departureDate),
          time: departureTime,
          timezone: 'UTC'
        },
        arrival: {
          date: new Date(new Date(departureDate).getTime() + duration * 60000),
          time: arrivalTime,
          timezone: 'UTC'
        },
        duration: {
          total: duration,
          formatted: this.formatDuration(duration)
        },
        price: {
          economy: Math.round(basePrice),
          premium: Math.round(basePrice * 1.6),
          business: Math.round(basePrice * 2.8),
          first: Math.round(basePrice * 4.5),
          currency: 'USD'
        },
        availability: {
          economy: Math.floor(Math.random() * 80) + 20,
          premium: Math.floor(Math.random() * 30) + 10,
          business: Math.floor(Math.random() * 15) + 5,
          first: Math.floor(Math.random() * 8) + 2
        },
        stops: {
          count: Math.random() > 0.7 ? 0 : (Math.random() > 0.8 ? 2 : 1),
          airports: Math.random() > 0.7 ? [] : ['ORD', 'DFW', 'ATL'][Math.floor(Math.random() * 3)],
          duration: Math.random() > 0.7 ? 0 : Math.floor(Math.random() * 180) + 45
        },
        amenities: {
          wifi: Math.random() > 0.3,
          entertainment: Math.random() > 0.2,
          meals: Math.random() > 0.4,
          powerOutlets: Math.random() > 0.5
        },
        status: 'scheduled',
        restrictions: {
          baggagePolicy: 'Standard baggage allowance applies',
          cancellationPolicy: '24-hour free cancellation',
          changePolicy: 'Changes allowed with fee'
        }
      };

      flights.push(flight);
    }

    return flights;
  }

  // Helper methods
  generateRandomTime() {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  generateRandomDuration() {
    return Math.floor(Math.random() * 480) + 60; // 1-8 hours in minutes
  }

  generateRandomPrice() {
    return Math.floor(Math.random() * 800) + 100; // $100-$900
  }

  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  addTimeToTime(time, additionalMinutes) {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + additionalMinutes;
    const newHours = Math.floor((totalMinutes / 60) % 24);
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }

  getRandomAircraft() {
    const aircraft = ['Boeing 737', 'Boeing 787', 'Airbus A320', 'Airbus A350', 'Boeing 777', 'Airbus A380'];
    return aircraft[Math.floor(Math.random() * aircraft.length)];
  }

  getAirportName(code) {
    const airports = {
      'JFK': 'John F. Kennedy International Airport',
      'LAX': 'Los Angeles International Airport',
      'ORD': 'Chicago O\'Hare International Airport',
      'LHR': 'London Heathrow Airport',
      'CDG': 'Charles de Gaulle Airport',
      'NRT': 'Narita International Airport',
      'DXB': 'Dubai International Airport',
      'SIN': 'Singapore Changi Airport'
    };
    return airports[code] || `${code} Airport`;
  }

  getCityName(code) {
    const cities = {
      'JFK': 'New York', 'NYC': 'New York',
      'LAX': 'Los Angeles',
      'ORD': 'Chicago',
      'LHR': 'London',
      'CDG': 'Paris',
      'NRT': 'Tokyo',
      'DXB': 'Dubai',
      'SIN': 'Singapore'
    };
    return cities[code] || code;
  }

  getCountryName(code) {
    const countries = {
      'JFK': 'United States', 'NYC': 'United States',
      'LAX': 'United States',
      'ORD': 'United States',
      'LHR': 'United Kingdom',
      'CDG': 'France',
      'NRT': 'Japan',
      'DXB': 'United Arab Emirates',
      'SIN': 'Singapore'
    };
    return countries[code] || 'Country';
  }

  // Sort flights by different criteria
  sortFlights(flights, sortBy) {
    switch (sortBy) {
      case 'price':
        return flights.sort((a, b) => a.price.economy - b.price.economy);
      case 'duration':
        return flights.sort((a, b) => a.duration.total - b.duration.total);
      case 'departure':
        return flights.sort((a, b) => new Date(a.departure.date) - new Date(b.departure.date));
      case 'airline':
        return flights.sort((a, b) => a.airline.name.localeCompare(b.airline.name));
      default:
        return flights;
    }
  }

  // Get popular destinations
  async getPopularDestinations() {
    const popularDestinations = [
      { code: 'NYC', name: 'New York', country: 'United States', image: 'https://example.com/nyc.jpg' },
      { code: 'LAX', name: 'Los Angeles', country: 'United States', image: 'https://example.com/la.jpg' },
      { code: 'LHR', name: 'London', country: 'United Kingdom', image: 'https://example.com/london.jpg' },
      { code: 'CDG', name: 'Paris', country: 'France', image: 'https://example.com/paris.jpg' },
      { code: 'NRT', name: 'Tokyo', country: 'Japan', image: 'https://example.com/tokyo.jpg' },
      { code: 'DXB', name: 'Dubai', country: 'UAE', image: 'https://example.com/dubai.jpg' }
    ];

    return popularDestinations;
  }

  // Get airports list
  async getAirports(filters = {}) {
    const { search, country, city } = filters;
    
    const airports = [
      { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
      { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States' },
      { code: 'ORD', name: 'Chicago O\'Hare International Airport', city: 'Chicago', country: 'United States' },
      { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom' },
      { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
      { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
      { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates' },
      { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' }
    ];

    let filteredAirports = airports;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredAirports = airports.filter(airport => 
        airport.code.toLowerCase().includes(searchLower) ||
        airport.name.toLowerCase().includes(searchLower) ||
        airport.city.toLowerCase().includes(searchLower)
      );
    }

    if (country) {
      filteredAirports = filteredAirports.filter(airport => 
        airport.country.toLowerCase().includes(country.toLowerCase())
      );
    }

    if (city) {
      filteredAirports = filteredAirports.filter(airport => 
        airport.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    return filteredAirports;
  }

  // Get airlines list
  async getAirlines() {
    return [
      { code: 'AA', name: 'American Airlines', logo: 'https://images.kiwi.com/airlines/64/AA.png' },
      { code: 'DL', name: 'Delta Air Lines', logo: 'https://images.kiwi.com/airlines/64/DL.png' },
      { code: 'UA', name: 'United Airlines', logo: 'https://images.kiwi.com/airlines/64/UA.png' },
      { code: 'SW', name: 'Southwest Airlines', logo: 'https://images.kiwi.com/airlines/64/WN.png' },
      { code: 'BA', name: 'British Airways', logo: 'https://images.kiwi.com/airlines/64/BA.png' },
      { code: 'LH', name: 'Lufthansa', logo: 'https://images.kiwi.com/airlines/64/LH.png' },
      { code: 'EK', name: 'Emirates', logo: 'https://images.kiwi.com/airlines/64/EK.png' },
      { code: 'AF', name: 'Air France', logo: 'https://images.kiwi.com/airlines/64/AF.png' }
    ];
  }

  // Get flight status
  async getFlightStatus(flightNumber, date) {
    // This would typically query an external flight status API
    // For demo purposes, return mock status
    return {
      flightNumber,
      date,
      status: 'On Time',
      departure: {
        scheduled: '10:30',
        estimated: '10:30',
        actual: null,
        gate: 'A12',
        terminal: 'Terminal 1'
      },
      arrival: {
        scheduled: '14:45',
        estimated: '14:45',
        actual: null,
        gate: 'B8',
        terminal: 'Terminal 2'
      },
      aircraft: 'Boeing 737-800',
      delay: null
    };
  }

  // Get price alerts for a route
  async getPriceAlerts(origin, destination) {
    // Mock price trend data
    const last30Days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      last30Days.push({
        date: date.toISOString().split('T')[0],
        price: Math.floor(Math.random() * 300) + 200 // $200-$500
      });
    }

    return {
      route: `${origin}-${destination}`,
      currentPrice: last30Days[last30Days.length - 1].price,
      averagePrice: Math.round(last30Days.reduce((sum, day) => sum + day.price, 0) / last30Days.length),
      lowestPrice: Math.min(...last30Days.map(day => day.price)),
      highestPrice: Math.max(...last30Days.map(day => day.price)),
      priceHistory: last30Days,
      recommendation: 'Wait' // or 'Buy now' based on price trends
    };
  }
}

module.exports = new FlightService();
