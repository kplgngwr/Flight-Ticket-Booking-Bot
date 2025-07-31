// Utility functions and constants for the Flight Booking Bot

// Date and time utilities
const DateUtils = {
    // Format date for display
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format time for display
    formatTime(time) {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    },

    // Get relative time (e.g., "2 hours ago")
    getRelativeTime(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) {
            return `${diffMins} minutes ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hours ago`;
        } else {
            return `${diffDays} days ago`;
        }
    },

    // Check if date is today
    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        return checkDate.toDateString() === today.toDateString();
    },

    // Add days to date
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
};

// Flight data utilities
const FlightUtils = {
    // Format flight duration
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    },

    // Get flight status color
    getStatusColor(status) {
        const colors = {
            'on-time': '#10b981',
            'delayed': '#f59e0b',
            'cancelled': '#ef4444',
            'boarding': '#3b82f6',
            'departed': '#6b7280',
            'arrived': '#10b981'
        };
        return colors[status.toLowerCase()] || '#6b7280';
    },

    // Format price
    formatPrice(price, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(price);
    },

    // Calculate layover time
    calculateLayover(flight1Arrival, flight2Departure) {
        const arrival = new Date(`2000-01-01T${flight1Arrival}`);
        const departure = new Date(`2000-01-01T${flight2Departure}`);
        const diffMs = departure - arrival;
        const diffMins = Math.floor(diffMs / 60000);
        return this.formatDuration(diffMins);
    },

    // Get airline logo URL
    getAirlineLogo(airlineCode) {
        return `https://images.kiwi.com/airlines/64/${airlineCode}.png`;
    }
};

// Validation utilities
const ValidationUtils = {
    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate phone number
    isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    },

    // Validate airport code
    isValidAirportCode(code) {
        return /^[A-Z]{3}$/.test(code);
    },

    // Validate date
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    },

    // Validate future date
    isFutureDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
    },

    // Validate passenger count
    isValidPassengerCount(count) {
        return Number.isInteger(count) && count >= 1 && count <= 9;
    }
};

// Storage utilities
const StorageUtils = {
    // Set item in localStorage with expiration
    setWithExpiry(key, value, ttl) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    },

    // Get item from localStorage with expiration check
    getWithExpiry(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) {
            return null;
        }

        const item = JSON.parse(itemStr);
        const now = new Date();

        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }

        return item.value;
    },

    // Clear expired items
    clearExpired() {
        const now = new Date();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            try {
                const itemStr = localStorage.getItem(key);
                const item = JSON.parse(itemStr);
                if (item.expiry && now.getTime() > item.expiry) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Skip invalid JSON items
            }
        }
    }
};

// API utilities
const ApiUtils = {
    // Create API request with authentication
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(endpoint, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    },

    // Handle API errors
    handleError(error) {
        console.error('API Error:', error);
        
        if (error.message.includes('401')) {
            // Unauthorized - redirect to login
            app.logout();
            app.showToast('Please log in to continue', 'warning');
        } else if (error.message.includes('429')) {
            // Rate limited
            app.showToast('Too many requests. Please wait a moment.', 'warning');
        } else if (error.message.includes('500')) {
            // Server error
            app.showToast('Server error. Please try again later.', 'error');
        } else {
            // Generic error
            app.showToast('Something went wrong. Please try again.', 'error');
        }
    }
};

// Animation utilities
const AnimationUtils = {
    // Fade in element
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = Math.min(progress, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    },

    // Fade out element
    fadeOut(element, duration = 300) {
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            element.style.opacity = 1 - Math.min(progress, 1);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    },

    // Slide down element
    slideDown(element, duration = 300) {
        element.style.height = '0px';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const targetHeight = element.scrollHeight + 'px';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) / duration;
            
            const currentHeight = Math.min(progress, 1) * element.scrollHeight;
            element.style.height = currentHeight + 'px';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.height = '';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }
};

// Export utilities if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DateUtils,
        FlightUtils,
        ValidationUtils,
        StorageUtils,
        ApiUtils,
        AnimationUtils
    };
}
