const mongoose = require('mongoose');
require('dotenv').config();

// Test MongoDB Atlas connection
async function testConnection() {
    try {
        console.log('Testing MongoDB Atlas connection...');
        console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set ✓' : 'Not set ✗');
        
        if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<your-username>')) {
            console.log('❌ Please update your MONGODB_URI in .env file');
            return;
        }
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Atlas connected successfully!');
        
        // Test other environment variables
        console.log('\n📋 Environment Variables Status:');
        console.log('PORT:', process.env.PORT || '3000');
        console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
        console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set ✓' : 'Not set ✗');
        console.log('AMADEUS_API_KEY:', process.env.AMADEUS_API_KEY ? 'Set ✓' : 'Not set ✗');
        console.log('AMADEUS_API_SECRET:', process.env.AMADEUS_API_SECRET ? 'Set ✓' : 'Not set ✗');
        
        await mongoose.disconnect();
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.log('\n💡 Tips:');
        console.log('1. Check your MongoDB Atlas connection string');
        console.log('2. Ensure your IP is whitelisted (0.0.0.0/0 for development)');
        console.log('3. Verify username and password in connection string');
    }
}

testConnection();
