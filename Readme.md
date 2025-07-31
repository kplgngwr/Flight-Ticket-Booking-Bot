# FlightBot - AI-Powered Flight Booking Assistant 🛫

A modern, intelligent flight booking chatbot that revolutionizes how users search for and book flights through natural conversation. Built with cutting-edge web technologies and featuring a beautiful, responsive interface.

![FlightBot Demo](https://img.shields.io/badge/Status-Active-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![MongoDB](https://img.shields.io/badge/MongoDB-6.x-blue)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-orange)

## ✨ Key Features

### 🤖 **Intelligent Conversational Interface**
- **Natural Language Processing**: Understands complex flight requests in plain English
- **Context-Aware Conversations**: Maintains conversation context throughout the booking process
- **Smart Quick Replies**: Context-sensitive buttons for faster interactions
- **Real-time Typing Indicators**: Professional chat experience with typing animations

### ✈️ **Advanced Flight Search**
- **Multi-Parameter Search**: Origin, destination, dates, passengers, preferences
- **Real-time Flight Data**: Live flight information from multiple sources
- **Beautiful Flight Cards**: Modern, interactive flight display with airline logos
- **Price Comparison**: Easy comparison across multiple airlines and routes
- **Duration & Stop Information**: Clear display of flight duration and connections

### 🎨 **Modern User Interface**
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Professional Flight Cards**: Beautiful cards with airline logos, times, and prices
- **Smooth Animations**: Elegant transitions and hover effects
- **Dark/Light Theme Support**: Comfortable viewing in any lighting
- **Progressive Web App**: Installable and works offline

### 🔐 **Secure User Management**
- **JWT Authentication**: Secure login and session management
- **User Profiles**: Personalized experience with booking history
- **Booking Management**: View, modify, and cancel bookings
- **Session Persistence**: Seamless experience across browser sessions

### 💬 **Real-time Communication**
- **Socket.io Integration**: Instant message delivery
- **Live Chat Status**: Connection status and typing indicators
- **Message History**: Persistent chat conversations
- **Quick Reply System**: Streamlined interaction flow

## 🚀 Tech Stack

### Backend
- **Node.js** (v18+) - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Document database
- **Mongoose** - MongoDB ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox/Grid
- **JavaScript ES6+** - Client-side logic
- **Socket.io Client** - Real-time communication
- **Font Awesome** - Icons
- **Google Fonts** - Typography

### Development Tools
- **Nodemon** - Development server
- **ESLint** - Code linting
- **Git** - Version control

## 📦 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (v6.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Flight-Ticket-Booking-Bot.git
   cd Flight-Ticket-Booking-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/flight-booking-bot

   # JWT Authentication
   JWT_SECRET=your-super-secret-jwt-key-here

   # External APIs (Optional - uses mock data if not provided)
   FLIGHT_API_KEY=your-flight-api-key
   FLIGHT_API_URL=https://api.flight-data.com

   # Email Configuration (Optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-email-password
   ```

4. **Start MongoDB**
   ```bash
   # Windows
   net start MongoDB

   # macOS (Homebrew)
   brew services start mongodb/brew/mongodb-community

   # Linux
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode (with auto-restart)
   npm run dev

   # Production mode
   npm start
   ```

6. **Access the application**
   
   Open your browser and navigate to: `http://localhost:3000`

## 📁 Project Structure

```
Flight-Ticket-Booking-Bot/
├── config/
│   ├── database.js          # Database configuration
│   └── config.js            # Application configuration
├── models/
│   ├── User.js              # User model with authentication
│   ├── Flight.js            # Flight data model
│   ├── Booking.js           # Booking model
│   └── ChatMessage.js       # Chat message model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── flights.js           # Flight search routes
│   ├── bookings.js          # Booking management routes
│   └── chat.js              # Chat API routes
├── services/
│   ├── flightService.js     # Flight search and data processing
│   ├── bookingService.js    # Booking logic and management
│   ├── chatbotService.js    # AI conversation handling
│   └── emailService.js      # Email notifications
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   ├── validation.js        # Input validation
│   ├── rateLimiter.js       # Rate limiting protection
│   └── errorHandler.js      # Global error handling
├── utils/
│   ├── helpers.js           # Utility functions
│   ├── constants.js         # Application constants
│   └── validators.js        # Validation schemas
├── public/
│   ├── index.html           # Main application page
│   ├── css/
│   │   └── style.css        # Modern responsive styles
│   ├── js/
│   │   └── app.js           # Client-side application logic
│   ├── sw.js                # Service Worker for PWA
│   └── images/              # Static assets
├── server.js                # Main server entry point
├── package.json             # Dependencies and scripts
├── nodemon.json             # Development configuration
├── .env                     # Environment variables
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🎯 Usage Guide

### Starting a Conversation

1. **Open the application** in your browser
2. **Register or login** to access personalized features
3. **Start chatting** with the bot using natural language

### Example Conversations

#### Searching for Flights
```
User: "I want to fly from Delhi to Bangalore next week"
Bot: "Great! I'll search for flights from DEL to BLR. When would you like to travel?"
User: "August 20th"
Bot: "Perfect! I found 10 flights from DEL to BLR. Here are the best options..."
```

#### Booking a Flight
```
User: "Book the cheapest flight"
Bot: "I'll help you book the cheapest option. Please provide passenger details..."
User: "1 passenger, economy class"
Bot: "Booking confirmed! Your e-ticket has been sent to your email."
```

#### Managing Bookings
```
User: "Show my bookings"
Bot: "Here are your current bookings:
     1. DEL → BLR on Aug 20, 2024 (Confirmed)
     2. BLR → DEL on Aug 25, 2024 (Confirmed)"
```

### Quick Reply Buttons

The bot provides context-sensitive quick reply buttons:
- **"Book cheapest flight"** - Automatically selects the lowest-priced option
- **"Show more flights"** - Displays additional flight options
- **"Filter by time"** - Filters flights by departure time
- **"Try different dates"** - Searches for alternative travel dates

## 🔧 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | User login |
| `GET` | `/api/auth/profile` | Get user profile |
| `PUT` | `/api/auth/profile` | Update user profile |
| `POST` | `/api/auth/logout` | User logout |

### Flights
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/flights/search` | Search flights |
| `GET` | `/api/flights/popular` | Get popular destinations |
| `GET` | `/api/flights/airports` | Get airport codes |
| `GET` | `/api/flights/status/:id` | Get flight status |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/bookings` | Create new booking |
| `GET` | `/api/bookings` | Get user bookings |
| `GET` | `/api/bookings/:id` | Get specific booking |
| `PUT` | `/api/bookings/:id` | Update booking |
| `DELETE` | `/api/bookings/:id` | Cancel booking |
| `POST` | `/api/bookings/view` | View booking by reference |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/chat/history` | Get chat history |
| `POST` | `/api/chat/message` | Send chat message |

## 🎨 UI Features

### Modern Flight Cards
- **Airline Logos**: Display airline branding
- **Price Highlighting**: Clear pricing with color coding
- **Time Formatting**: Human-readable departure/arrival times
- **Duration Display**: Formatted flight duration (e.g., "2h 50m")
- **Stop Information**: Clear indication of direct flights vs connections
- **Interactive Buttons**: Details and booking actions

### Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Touch-Friendly**: Large buttons and touch targets
- **Smooth Animations**: Elegant transitions and hover effects
- **Loading States**: Professional loading indicators

### Chat Interface
- **Real-time Messaging**: Instant message delivery
- **Typing Indicators**: Shows when bot is responding
- **Message Timestamps**: Time stamps for all messages
- **Quick Reply Buttons**: Context-sensitive action buttons
- **Message Status**: Read receipts and delivery confirmation

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Protection against abuse
- **CORS Protection**: Cross-origin request security
- **Helmet.js**: Security headers and protection

## 🚀 Performance Optimizations

- **Service Worker**: Offline functionality and caching
- **Lazy Loading**: Optimized resource loading
- **Image Optimization**: Compressed and optimized images
- **Minification**: CSS and JS minification for production
- **CDN Integration**: Fast content delivery

## 🧪 Development

### Running Tests
```bash
npm test
```

### Code Linting
```bash
npm run lint
```

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment | No | development |
| `MONGODB_URI` | MongoDB connection | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `FLIGHT_API_KEY` | Flight API key | No | - |
| `FLIGHT_API_URL` | Flight API URL | No | - |
| `EMAIL_HOST` | SMTP host | No | - |
| `EMAIL_PORT` | SMTP port | No | 587 |
| `EMAIL_USER` | SMTP username | No | - |
| `EMAIL_PASS` | SMTP password | No | - |

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error**
```bash
# Ensure MongoDB is running
sudo systemctl start mongod

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/flight-booking-bot
```

**Port Already in Use**
```bash
# Kill process using port 3000
npx kill-port 3000

# Or change port in .env
PORT=3001
```

**JWT Authentication Error**
```bash
# Verify JWT_SECRET in .env
JWT_SECRET=your-super-secret-jwt-key-here

# Clear browser storage
localStorage.clear()
```

**Flight Search Issues**
- Verify API credentials in `.env`
- Check network connectivity
- Review server logs for errors

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Email**: support@flightbot.com
- **Discord**: [Join our community](https://discord.gg/flightbot)
- **Issues**: [GitHub Issues](https://github.com/yourusername/Flight-Ticket-Booking-Bot/issues)

## 🗺️ Roadmap

### Upcoming Features
- [ ] **Voice Interaction**: Speech-to-text and text-to-speech
- [ ] **Multi-language Support**: Internationalization (i18n)
- [ ] **Advanced AI**: Machine learning for better recommendations
- [ ] **Social Features**: Share trips with friends
- [ ] **Mobile App**: Native iOS and Android apps
- [ ] **Real Payment Gateway**: Stripe/PayPal integration
- [ ] **Flight Tracking**: Real-time flight status updates
- [ ] **Loyalty Program**: Points and rewards system

### Recent Updates
- ✅ **Enhanced Flight Cards**: Beautiful, interactive flight display
- ✅ **Improved Chat Context**: Better conversation flow management
- ✅ **Service Worker**: PWA functionality and offline support
- ✅ **Responsive Design**: Mobile-optimized interface
- ✅ **Quick Reply System**: Streamlined user interactions

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Fast, unopinionated web framework
- [Socket.io](https://socket.io/) - Real-time bidirectional communication
- [MongoDB](https://www.mongodb.com/) - Document-based database
- [Font Awesome](https://fontawesome.com/) - Beautiful icons
- [Google Fonts](https://fonts.google.com/) - Typography

---

**Made with ❤️ by the FlightBot Team**

*Happy Traveling! ✈️*
