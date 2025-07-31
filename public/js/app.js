// Flight Booking Bot - Main Application
class FlightBookingBot {
    constructor() {
        this.socket = null;
        this.user = null;
        this.sessionId = this.generateSessionId();
        this.isTyping = false;
        this.typingTimeout = null;
        
        this.init();
    }

    init() {
        this.initializeSocket();
        this.setupEventListeners();
        this.loadUserSession();
        this.setupSmoothScrolling();
        this.setupNavigation();
    }

    // Socket.io initialization
    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to FlightBot server');
            this.updateChatStatus('Connected - Ready to help!');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateChatStatus('Reconnecting...');
        });

        this.socket.on('bot response', (data) => {
            this.hideTypingIndicator();
            this.addMessage('bot', data.message, data.data);
            
            // Handle different response types
            // Debug log: show full bot response data
            console.log('[DEBUG] Received bot response:', JSON.stringify(data, null, 2));
            if (data.data && data.data.flights) {
                console.log('[DEBUG] Displaying flight results:', data.data.flights);
                this.displayFlightResults(data.data.flights);
            }
            
            // Handle view booking modal action
            if (data.action === 'openViewBookingModal') {
                setTimeout(() => {
                    this.showModal('viewBookingModal');
                    // Pre-fill reference if provided
                    if (data.data && data.data.reference) {
                        document.getElementById('bookingReference').value = data.data.reference;
                    }
                }, 500);
            }
        });

        this.socket.on('user typing', (data) => {
            this.showTypingIndicator();
        });

        this.socket.on('user stop typing', () => {
            this.hideTypingIndicator();
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showToast('Connection error. Please try again.', 'error');
        });
    }

    // Event listeners setup
    setupEventListeners() {
        // Chat functionality
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        const clearChatBtn = document.getElementById('clearChatBtn');

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            chatInput.addEventListener('input', () => {
                this.handleTyping();
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => this.clearChat());
        }

        // Start chat button
        const startChatBtn = document.getElementById('startChatBtn');
        const demoBtn = document.getElementById('demoBtn');

        if (startChatBtn) {
            startChatBtn.addEventListener('click', () => {
                document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
                document.getElementById('chatInput').focus();
            });
        }

        // Authentication buttons
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const viewBookingBtn = document.getElementById('viewBookingBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                console.log('Login button clicked');
                this.showModal('loginModal');
            });
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                console.log('Signup button clicked');
                this.showModal('signupModal');
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        if (viewBookingBtn) {
            viewBookingBtn.addEventListener('click', () => {
                console.log('View Booking button clicked');
                this.showModal('viewBookingModal');
            });
        }

        // Modal functionality
        this.setupModalEvents();

        // View Booking modal events
        const viewBookingModal = document.getElementById('viewBookingModal');
        const closeViewBookingModal = document.getElementById('closeViewBookingModal');
        const viewBookingForm = document.getElementById('viewBookingForm');

        if (closeViewBookingModal) {
            closeViewBookingModal.addEventListener('click', () => this.hideModal('viewBookingModal'));
        }
        if (viewBookingModal) {
            viewBookingModal.addEventListener('click', (e) => {
                if (e.target === viewBookingModal) {
                    this.hideModal('viewBookingModal');
                }
            });
        }
        if (viewBookingForm) {
            viewBookingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleViewBooking();
            });
        }

        // Auth forms
        this.setupAuthForms();

        // Quick replies
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-reply')) {
                const reply = e.target.getAttribute('data-reply');
                
                // Handle specific quick reply actions
                if (reply.toLowerCase().includes('book cheapest')) {
                    this.sendMessage('I want to book the cheapest flight from the available options. Please proceed with the booking.');
                } else if (reply.toLowerCase().includes('show more flights')) {
                    this.sendMessage('Please show me all available flight options for this route.');
                } else if (reply.toLowerCase().includes('filter by time')) {
                    this.sendMessage('Please filter the flights by departure time. I prefer morning flights.');
                } else if (reply.toLowerCase().includes('try different dates')) {
                    this.sendMessage('Please search for flights on different dates. I am flexible with my travel dates.');
                } else if (reply.toLowerCase().includes('confirm booking')) {
                    this.sendMessage('Yes, please confirm and complete the booking for the selected flight.');
                } else if (reply.toLowerCase().includes('add passengers')) {
                    this.sendMessage('I need to add passenger information for the booking.');
                } else if (reply.toLowerCase().includes('select seats')) {
                    this.sendMessage('I would like to select seats for my flight booking.');
                } else if (reply.toLowerCase().includes('cancel')) {
                    this.sendMessage('I want to cancel this booking process and start over.');
                } else if (reply.toLowerCase().includes('view my booking') || reply.toLowerCase().includes('check booking') || reply.toLowerCase().includes('my booking')) {
                    this.showModal('viewBookingModal');
                } else {
                    // Default behavior for other quick replies
                    this.sendMessage(reply);
                }
            }
        });
    }

    // Authentication modals setup
    setupModalEvents() {
        const loginModal = document.getElementById('loginModal');
        const signupModal = document.getElementById('signupModal');
        const closeLoginModal = document.getElementById('closeLoginModal');
        const closeSignupModal = document.getElementById('closeSignupModal');
        const showSignupModal = document.getElementById('showSignupModal');
        const showLoginModal = document.getElementById('showLoginModal');
        const viewBookingModal = document.getElementById('viewBookingModal');

        // Show View Booking modal from quick reply or navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-reply')) {
                const reply = e.target.getAttribute('data-reply').toLowerCase();
                if (reply.includes('view my booking') || reply.includes('check booking') || reply.includes('my booking')) {
                    this.showModal('viewBookingModal');
                }
            }
        });

        if (closeLoginModal) {
            closeLoginModal.addEventListener('click', () => this.hideModal('loginModal'));
        }
        
        if (closeSignupModal) {
            closeSignupModal.addEventListener('click', () => this.hideModal('signupModal'));
        }

        if (showSignupModal) {
            showSignupModal.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('loginModal');
                this.showModal('signupModal');
            });
        }

        if (showLoginModal) {
            showLoginModal.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideModal('signupModal');
                this.showModal('loginModal');
            });
        }

        // Close modal when clicking outside
        [loginModal, signupModal, viewBookingModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hideModal(modal.id);
                    }
                });
            }
        });
    }

    setupAuthForms() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Signup form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }
    }

    // Handle View Booking form submission
    async handleViewBooking() {
        const reference = document.getElementById('bookingReference').value;
        const email = document.getElementById('bookingEmail').value;
        const detailsDiv = document.getElementById('bookingDetails');
        detailsDiv.style.display = 'none';
        detailsDiv.innerHTML = '';

        if (!reference || !email) {
            this.showToast('Please enter both booking reference and email.', 'error');
            return;
        }

        // Show loading spinner
        document.getElementById('loadingSpinner').style.display = 'block';
        try {
            const res = await fetch('/api/bookings/view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference, email })
            });
            const data = await res.json();
            document.getElementById('loadingSpinner').style.display = 'none';
            if (data.success && data.booking) {
                detailsDiv.style.display = 'block';
                detailsDiv.innerHTML = `<h3>Booking Details</h3>
                    <p><strong>Reference:</strong> ${data.booking.reference}</p>
                    <p><strong>Email:</strong> ${data.booking.email}</p>
                    <p><strong>Flight:</strong> ${data.booking.flightNumber}</p>
                    <p><strong>Status:</strong> ${data.booking.status}</p>`;
            } else {
                detailsDiv.style.display = 'block';
                detailsDiv.innerHTML = `<p class='error'>${data.message || 'Booking not found.'}</p>`;
            }
        } catch (err) {
            document.getElementById('loadingSpinner').style.display = 'none';
            detailsDiv.style.display = 'block';
            detailsDiv.innerHTML = `<p class='error'>Error fetching booking. Please try again.</p>`;
        }
    }

    // Navigation and smooth scrolling
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    
                    // Update active nav link
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        });

        // Update active nav on scroll
        window.addEventListener('scroll', () => {
            let current = '';
            const sections = document.querySelectorAll('section[id]');
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (pageYOffset >= sectionTop - 200) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }

    setupSmoothScrolling() {
        // Additional smooth scrolling enhancements can go here
    }

    // Chat functionality
    sendMessage(message = null) {
        const chatInput = document.getElementById('chatInput');
        const messageText = message || chatInput.value.trim();
        
        if (!messageText) return;

        // Add user message to chat
        this.addMessage('user', messageText);
        
        // Clear input
        if (!message) {
            chatInput.value = '';
        }

        // Show typing indicator
        this.showTypingIndicator();

        // Send message to server
        this.socket.emit('chat message', {
            message: messageText,
            userId: this.user ? this.user.id : null,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString()
        });
    }

    addMessage(sender, message, data = null) {
        const chatMessages = document.getElementById('chatMessages');
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}-message fade-in`;
        
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (sender === 'bot') {
            messageElement.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <p>${this.formatMessage(message)}</p>
                    ${this.generateQuickReplies(message, data)}
                </div>
                <div class="message-time">${currentTime}</div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-content">
                    <p>${this.formatMessage(message)}</p>
                </div>
                <div class="message-time">${currentTime}</div>
            `;
        }
        
        chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    formatMessage(message) {
        // Basic message formatting
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/\n/g, '<br>') // Line breaks
            .replace(/\b([A-Z]{3})\b/g, '<code>$1</code>'); // Airport codes
    }

    generateQuickReplies(message, data) {
        const replies = [];
        
        // Check if this is a flight results message
        if (message.toLowerCase().includes('found') && message.toLowerCase().includes('flights')) {
            replies.push('Book cheapest flight', 'Show more flights', 'Filter by time', 'Try different dates');
        } else if (message.toLowerCase().includes('book') || message.toLowerCase().includes('select')) {
            replies.push('Confirm booking', 'Add passengers', 'Select seats', 'Cancel');
        } else if (message.toLowerCase().includes('search') || message.toLowerCase().includes('find')) {
            replies.push('Show more options', 'Filter by price', 'Different dates');
        } else if (message.toLowerCase().includes('help')) {
            replies.push('Search flights', 'Check booking', 'Flight status');
        } else {
            // Default replies
            replies.push('Search flights', 'Help', 'Popular destinations');
        }
        
        if (replies.length === 0) return '';
        
        return `
            <div class="quick-replies">
                ${replies.map(reply => `<button class="quick-reply" data-reply="${reply}">${reply}</button>`).join('')}
            </div>
        `;
    }

    displayFlightResults(flights) {
        if (!flights || flights.length === 0) return;
        
        const chatMessages = document.getElementById('chatMessages');
        const flightResultsElement = document.createElement('div');
        flightResultsElement.className = 'message bot-message fade-in';
        
        // Helper function to format time
        const formatTime = (dateTimeString) => {
            if (!dateTimeString) return '';
            const date = new Date(dateTimeString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };
        
        // Helper function to format duration
        const formatDuration = (durationString) => {
            if (!durationString) return '';
            // Parse ISO 8601 duration (PT2H50M)
            const match = durationString.match(/PT(\d+H)?(\d+M)?/);
            if (!match) return durationString;
            
            const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
            const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;
            
            if (hours > 0 && minutes > 0) {
                return `${hours}h ${minutes}m`;
            } else if (hours > 0) {
                return `${hours}h`;
            } else if (minutes > 0) {
                return `${minutes}m`;
            }
            return durationString;
        };
        
        // Helper function to get flight number
        const getFlightNumber = (flight) => {
            return flight.airline?.code + flight.aircraft || 'N/A';
        };
        
        const flightCards = flights.slice(0, 3).map((flight, index) => {
            const departureTime = formatTime(flight.departure?.time);
            const arrivalTime = formatTime(flight.arrival?.time);
            const duration = formatDuration(flight.duration);
            const flightNumber = getFlightNumber(flight);
            const price = flight.price?.economy || 'N/A';
            const stops = flight.stops || 0;
            
            return `
                <div class="flight-card" data-flight-id="${flight._id || index}">
                    <div class="flight-header">
                        <div class="airline-info">
                            <img src="${flight.airline?.logo || ''}" alt="${flight.airline?.name || 'Airline'}" class="airline-logo" onerror="this.style.display='none'">
                            <div class="airline-details">
                                <span class="airline-name">${flight.airline?.name || 'Air India'}</span>
                                <span class="flight-number">${flightNumber}</span>
                            </div>
                        </div>
                        <div class="flight-price">
                            <span class="price">$${price}</span>
                            <span class="price-label">per person</span>
                        </div>
                    </div>
                    <div class="flight-details">
                        <div class="flight-route">
                            <div class="airport departure">
                                <span class="airport-code">${flight.origin?.code || 'N/A'}</span>
                                <span class="airport-time">${departureTime}</span>
                            </div>
                            <div class="flight-duration">
                                <div class="duration-line">
                                    <span class="duration-text">${duration}</span>
                                    ${stops > 0 ? `<span class="stops">${stops} stop${stops > 1 ? 's' : ''}</span>` : '<span class="direct">Direct</span>'}
                                </div>
                            </div>
                            <div class="airport arrival">
                                <span class="airport-code">${flight.destination?.code || 'N/A'}</span>
                                <span class="airport-time">${arrivalTime}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flight-actions">
                        <button class="btn btn-outline btn-small" onclick="app.viewFlightDetails('${flight._id || index}')">Details</button>
                        <button class="btn btn-primary btn-small" onclick="app.selectFlight('${flight._id || index}')">Select</button>
                    </div>
                </div>
            `;
        }).join('');
        
        flightResultsElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>Here are the best flight options I found:</p>
                <div class="flight-results">
                    ${flightCards}
                </div>
                ${flights.length > 3 ? `<p class="results-summary">Showing 3 of ${flights.length} results. <button class="link-btn" onclick="app.showAllFlights()">View all flights</button></p>` : ''}
                <div class="quick-replies">
                    <button class="quick-reply" data-reply="Book cheapest flight">Book cheapest</button>
                    <button class="quick-reply" data-reply="Show more flights">Show more flights</button>
                    <button class="quick-reply" data-reply="Filter by time">Filter by time</button>
                    <button class="quick-reply" data-reply="Try different dates">Try different dates</button>
                </div>
            </div>
            <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        
        chatMessages.appendChild(flightResultsElement);
        this.scrollToBottom();
    }

    viewFlightDetails(flightId) {
        this.sendMessage(`Show me detailed information for flight ${flightId}`);
    }

    selectFlight(flightId) {
        this.sendMessage(`I want to book flight ${flightId}. Please proceed with the booking.`);
    }

    showAllFlights() {
        this.sendMessage('Show me all available flight options for this route');
    }

    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing', { userId: this.user ? this.user.id : this.sessionId });
        }

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            this.socket.emit('stop typing');
        }, 1000);
    }

    showTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }

    updateChatStatus(status) {
        const chatStatus = document.getElementById('chatStatus');
        if (chatStatus) {
            chatStatus.textContent = status;
        }
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    clearChat() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            // Keep the initial welcome message
            const welcomeMessage = chatMessages.querySelector('.message');
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
        }
        this.showToast('Chat cleared', 'info');
    }

    // Authentication
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.user = data.user;  // Fixed: backend returns data.user, not data.data.user
                localStorage.setItem('token', data.token);  // Fixed: backend returns data.token
                localStorage.setItem('user', JSON.stringify(this.user));
                
                this.hideModal('loginModal');
                this.updateAuthUI();
                this.showToast(`Welcome back, ${this.user.name}!`, 'success');
                
                // Send welcome message in chat
                this.addMessage('bot', `Welcome back, ${this.user.name}! How can I help you with your travel plans today?`);
            } else {
                this.showToast(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const phone = document.getElementById('signupPhone').value;

        if (!name || !email || !password) {
            this.showToast('Please fill in required fields', 'error');
            return;
        }

        // Client-side password validation
        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters long', 'error');
            return;
        }

        // Optional: You can add these back if you want stricter passwords
        // const hasUpperCase = /[A-Z]/.test(password);
        // const hasLowerCase = /[a-z]/.test(password);
        // const hasNumber = /\d/.test(password);
        // if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        //     this.showToast('Password must contain at least one uppercase letter, one lowercase letter, and one number', 'error');
        //     return;
        // }

        this.showLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password, phone })
            });

            const data = await response.json();

            if (data.success) {
                this.user = data.user;  // Fixed: backend returns data.user, not data.data.user
                localStorage.setItem('token', data.token);  // Fixed: backend returns data.token
                localStorage.setItem('user', JSON.stringify(this.user));
                
                this.hideModal('signupModal');
                this.updateAuthUI();
                this.showToast(`Welcome, ${this.user.name}! Account created successfully.`, 'success');
                
                // Send welcome message in chat
                this.addMessage('bot', `Hello ${this.user.name}! Welcome to FlightBot. I'm here to help you find and book the perfect flights. Where would you like to travel?`);
            } else {
                // Handle validation errors properly
                if (data.errors && Array.isArray(data.errors)) {
                    const errorMessages = data.errors.map(err => err.msg || err.message).join(', ');
                    this.showToast(errorMessages, 'error');
                } else {
                    this.showToast(data.message || 'Registration failed', 'error');
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast('Registration failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    loadUserSession() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
            try {
                this.user = JSON.parse(user);
                this.updateAuthUI();
            } catch (error) {
                console.error('Error loading user session:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const authButtons = document.querySelector('.auth-buttons');

        if (this.user && authButtons) {
            authButtons.innerHTML = `
                <div class="user-menu">
                    <span class="user-name">Hello, ${this.user.name}</span>
                    <button class="btn btn-outline" id="logoutBtn">Logout</button>
                </div>
            `;
            // Re-setup logout button event listener
            setTimeout(() => {
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => this.logout());
                }
            }, 0);
        }
    }
    logout() {
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Reset auth UI
        const authButtons = document.querySelector('.auth-buttons');
        if (authButtons) {
            authButtons.innerHTML = `
                <button class="btn btn-outline" id="loginBtn">Login</button>
                <button class="btn btn-primary" id="signupBtn">Sign Up</button>
            `;
            
            // Re-setup authentication button event listeners with timeout to ensure DOM is ready
            setTimeout(() => {
                const newLoginBtn = document.getElementById('loginBtn');
                const newSignupBtn = document.getElementById('signupBtn');
                const viewBookingBtn = document.getElementById('viewBookingBtn');
                
                if (newLoginBtn) {
                    newLoginBtn.addEventListener('click', () => {
                        console.log('Login button clicked');
                        this.showModal('loginModal');
                    });
                }
                
                if (newSignupBtn) {
                    newSignupBtn.addEventListener('click', () => {
                        console.log('Signup button clicked');
                        this.showModal('signupModal');
                    });
                }
                
                if (viewBookingBtn) {
                    viewBookingBtn.addEventListener('click', () => {
                        console.log('View Booking button clicked');
                        this.showModal('viewBookingModal');
                    });
                }
            }, 0);
        }
        
        this.showToast('Logged out successfully', 'info');
        this.addMessage('bot', 'You have been logged out. You can continue using FlightBot as a guest, or log in again for a personalized experience.');
    }

    // Demo functionality
    startDemo() {
        const demoMessages = [
            { sender: 'user', message: 'I want to fly from New York to London next week', delay: 1000 },
            { sender: 'bot', message: 'Great! I\'ll search for flights from NYC to London for next week. How many passengers?', delay: 2000 },
            { sender: 'user', message: 'Just me, 1 passenger', delay: 3500 },
            { sender: 'bot', message: 'Perfect! Let me find the best flights for you. Searching over 500 airlines...', delay: 5000 },
            { sender: 'bot', message: 'Found 12 flights! The best deal is British Airways for $420. Would you like to see all options or book this one?', delay: 7000 }
        ];

        // Clear chat first
        this.clearChat();

        // Show demo messages
        demoMessages.forEach((msg, index) => {
            setTimeout(() => {
                if (msg.sender === 'bot') {
                    this.showTypingIndicator();
                    setTimeout(() => {
                        this.hideTypingIndicator();
                        this.addMessage(msg.sender, msg.message);
                    }, 1000);
                } else {
                    this.addMessage(msg.sender, msg.message);
                }
            }, msg.delay);
        });

        // Scroll to chat section
        setTimeout(() => {
            document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
        }, 1000);
    }

    // Utility functions
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    showModal(modalId) {
        console.log('Attempting to show modal:', modalId);
        const modal = document.getElementById(modalId);
        console.log('Modal element found:', modal);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('Modal should now be visible');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Clear form fields
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        }[type] || 'fas fa-info-circle';

        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
            <button class="btn-icon" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // API helper functions
    async apiRequest(endpoint, options = {}) {
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

        if (response.status === 401) {
            // Token expired or invalid
            this.logout();
            throw new Error('Session expired. Please log in again.');
        }

        return response;
    }
}

// Initialize the application
const app = new FlightBookingBot();

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    app.showToast('An unexpected error occurred. Please refresh the page.', 'error');
});

// Online/offline status
window.addEventListener('online', () => {
    app.showToast('Connection restored', 'success');
    app.updateChatStatus('Connected - Ready to help!');
});

window.addEventListener('offline', () => {
    app.showToast('Connection lost. Please check your internet.', 'warning');
    app.updateChatStatus('Offline - Reconnecting...');
});

// Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
