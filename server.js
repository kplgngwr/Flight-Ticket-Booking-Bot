const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const bookingRoutes = require('./routes/bookings');
const chatRoutes = require('./routes/chat');

// Import database connection
const connectDB = require('./config/database');

// Import socket handlers
const chatHandler = require('./services/chatbotService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS middleware
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chat', chatRoutes);

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Handle chat messages
  socket.on('chat message', async (data) => {
    try {
      const response = await chatHandler.processMessage(data.message, data.userId || socket.id);
      
      // Send bot response back to the user
      socket.emit('bot response', {
        message: response.message,
        data: response.data || null,
        timestamp: new Date().toISOString()
      });
      
      // Optionally broadcast to all connected users (for admin features)
      // io.emit('chat message', { user: 'Bot', message: response.message });
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('bot response', {
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle user typing
  socket.on('typing', (data) => {
    socket.broadcast.emit('user typing', data);
  });

  // Handle user stop typing
  socket.on('stop typing', () => {
    socket.broadcast.emit('user stop typing');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Flight Booking Bot server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} to access the application`);
});
