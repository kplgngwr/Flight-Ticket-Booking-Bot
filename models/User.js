const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  dateOfBirth: {
    type: Date
  },
  preferences: {
    currency: {
      type: String,
      default: 'USD'
    },
    seatPreference: {
      type: String,
      enum: ['window', 'aisle', 'middle', 'no-preference'],
      default: 'no-preference'
    },
    mealPreference: {
      type: String,
      enum: ['vegetarian', 'vegan', 'halal', 'kosher', 'no-preference'],
      default: 'no-preference'
    },
    frequentDestinations: [String],
    homeAirport: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  chatHistory: [{
    message: String,
    timestamp: { type: Date, default: Date.now },
    isUser: Boolean
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save();
};

module.exports = mongoose.model('User', userSchema);
