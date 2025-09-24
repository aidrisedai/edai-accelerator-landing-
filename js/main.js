// EdAI Accelerator Landing Page JavaScript
// Interactive functionality and form validation

(function() {
    'use strict';

    // DOM Elements
    const applicationForm = document.getElementById('applicationForm');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const successModal = document.getElementById('successModal');
    const modalClose = document.getElementById('modalClose');
    const modalOk = document.getElementById('modalOk');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Initialize the application
    function init() {
        setupEventListeners();
        setupSmoothScrolling();
        setupFormValidation();
        setupMobileMenu();
        setupModal();
        setupScrollEffects();
    }

    // Set up all event listeners
    function setupEventListeners() {
        // Form submission
        if (applicationForm) {
            applicationForm.addEventListener('submit', handleFormSubmit);
        }

        // Mobile menu toggle
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', toggleMobileMenu);
        }

        // Modal close events
        if (modalClose) {
            modalClose.addEventListener('click', closeModal);
        }
        if (modalOk) {
            modalOk.addEventListener('click', closeModal);
        }

        // Close modal when clicking outside
        if (successModal) {
            successModal.addEventListener('click', function(e) {
                if (e.target === successModal) {
                    closeModal();
                }
            });
        }

        // Close modal on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && successModal.classList.contains('show')) {
                closeModal();
            }
        });

        // Header scroll effect
        window.addEventListener('scroll', handleScroll);

        // Resize events for responsive behavior
        window.addEventListener('resize', handleResize);
    }

    // Set up smooth scrolling for navigation links
    function setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerOffset = 80;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    // Close mobile menu if open
                    if (navLinks && navLinks.classList.contains('show')) {
                        toggleMobileMenu();
                    }
                }
            });
        });
    }

    // Form validation and submission
    function setupFormValidation() {
        if (!applicationForm) return;

        // Real-time validation for form fields
        const formFields = applicationForm.querySelectorAll('input, select, textarea');
        formFields.forEach(field => {
            field.addEventListener('blur', validateField);
            field.addEventListener('input', clearFieldError);
        });
    }

    // Validate individual form field
    function validateField(e) {
        const field = e.target;
        const fieldGroup = field.closest('.form-group');
        const fieldName = field.name;
        const fieldValue = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Remove existing error
        clearFieldError({ target: field });

        // Required field validation
        if (field.required && !fieldValue) {
            isValid = false;
            errorMessage = 'This field is required.';
        }

        // Email validation
        if (fieldName === 'parentEmail' && fieldValue) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(fieldValue)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address.';
            }
        }

        // Phone validation
        if (fieldName === 'parentPhone' && fieldValue) {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (!phoneRegex.test(fieldValue.replace(/[\s\-\(\)]/g, ''))) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number.';
            }
        }

        // Textarea minimum length
        if ((fieldName === 'teenInterests' || fieldName === 'parentExpectations') && fieldValue) {
            if (fieldValue.length < 20) {
                isValid = false;
                errorMessage = 'Please provide at least 20 characters.';
            }
        }

        // Show error if validation failed
        if (!isValid) {
            showFieldError(field, errorMessage);
        }

        return isValid;
    }

    // Clear field error styling and message
    function clearFieldError(e) {
        const field = e.target;
        const fieldGroup = field.closest('.form-group');
        
        // Remove error styling
        field.style.borderColor = '';
        
        // Remove error message
        const existingError = fieldGroup.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    // Show field error
    function showFieldError(field, message) {
        const fieldGroup = field.closest('.form-group');
        
        // Add error styling
        field.style.borderColor = '#ef4444';
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = '#ef4444';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';
        errorDiv.textContent = message;
        
        fieldGroup.appendChild(errorDiv);
    }

    // Handle form submission
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate all fields
        let isFormValid = true;
        const formFields = applicationForm.querySelectorAll('input, select, textarea');
        
        formFields.forEach(field => {
            if (!validateField({ target: field })) {
                isFormValid = false;
            }
        });

        // Check required checkbox
        const agreeTerms = document.getElementById('agreeTerms');
        if (agreeTerms && !agreeTerms.checked) {
            isFormValid = false;
            showFieldError(agreeTerms, 'You must confirm eligibility requirements.');
        }

        if (!isFormValid) {
            // Scroll to first error
            const firstError = document.querySelector('.error-message');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Show loading overlay
        showLoading();

        // Collect form data
        const formData = new FormData(applicationForm);
        const applicationData = {
            parentName: formData.get('parentName'),
            parentEmail: formData.get('parentEmail'),
            parentPhone: formData.get('parentPhone'),
            teenName: formData.get('teenName'),
            teenAge: formData.get('teenAge'),
            teenGrade: formData.get('teenGrade'),
            teenInterests: formData.get('teenInterests'),
            parentExpectations: formData.get('parentExpectations'),
            agreeTerms: formData.get('agreeTerms') === 'on',
            agreeContact: formData.get('agreeContact') === 'on'
        };

        try {
            // Submit to API
            const response = await fetch('/api/submit-application', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(applicationData)
            });

            const result = await response.json();

            hideLoading();

            if (result.success) {
                // Show success modal
                showSuccessModal();
                
                // Reset form
                applicationForm.reset();
                
                console.log('Application submitted successfully:', result.data);
            } else {
                // Handle validation or other errors
                if (result.details && Array.isArray(result.details)) {
                    // Show specific validation errors
                    result.details.forEach(error => {
                        console.error('Validation error:', error);
                    });
                    alert('Please check your form data: ' + result.details.join(', '));
                } else {
                    alert('Error: ' + (result.error || 'Failed to submit application'));
                }
            }
        } catch (error) {
            hideLoading();
            console.error('Network error:', error);
            alert('Network error. Please check your connection and try again.');
        }
    }

    // Mobile menu functionality
    function setupMobileMenu() {
        // Create mobile nav links if they don't exist
        if (mobileMenuToggle && !document.querySelector('.mobile-nav')) {
            createMobileNavigation();
        }
    }

    // Create mobile navigation
    function createMobileNavigation() {
        const mobileNav = document.createElement('div');
        mobileNav.className = 'mobile-nav';
        mobileNav.innerHTML = `
            <div class="mobile-nav-content">
                <a href="#program" class="mobile-nav-link">Program</a>
                <a href="#apply" class="mobile-nav-link">Apply</a>
                <a href="#contact" class="mobile-nav-link">Contact</a>
            </div>
        `;

        // Add styles for mobile navigation
        mobileNav.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            transform: translateY(-100%);
            transition: transform 0.3s ease;
            z-index: 999;
            padding-top: 80px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        const mobileNavContent = mobileNav.querySelector('.mobile-nav-content');
        mobileNavContent.style.cssText = `
            display: flex;
            flex-direction: column;
            padding: 2rem;
            gap: 1.5rem;
        `;

        const mobileNavLinks = mobileNav.querySelectorAll('.mobile-nav-link');
        mobileNavLinks.forEach(link => {
            link.style.cssText = `
                padding: 1rem;
                text-decoration: none;
                color: #1f2937;
                font-weight: 600;
                border-radius: 0.5rem;
                transition: background-color 0.2s;
                text-align: center;
            `;
            
            link.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#f3f4f6';
            });
            
            link.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'transparent';
            });
        });

        document.body.appendChild(mobileNav);
    }

    // Toggle mobile menu
    function toggleMobileMenu() {
        const mobileNav = document.querySelector('.mobile-nav');
        if (!mobileNav) return;

        const isOpen = mobileNav.style.transform === 'translateY(0%)';
        
        if (isOpen) {
            mobileNav.style.transform = 'translateY(-100%)';
            mobileMenuToggle.classList.remove('open');
        } else {
            mobileNav.style.transform = 'translateY(0%)';
            mobileMenuToggle.classList.add('open');
        }

        // Animate hamburger menu
        const spans = mobileMenuToggle.querySelectorAll('span');
        if (mobileMenuToggle.classList.contains('open')) {
            spans[0].style.transform = 'rotate(45deg) translateY(8px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
        } else {
            spans.forEach(span => {
                span.style.transform = '';
                span.style.opacity = '';
            });
        }
    }

    // Modal functionality
    function setupModal() {
        // Modal is already set up in HTML, just need JavaScript functionality
    }

    // Show success modal
    function showSuccessModal() {
        if (successModal) {
            successModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    // Close modal
    function closeModal() {
        if (successModal) {
            successModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // Show loading overlay
    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('show');
        }
    }

    // Hide loading overlay
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
    }

    // Scroll effects
    function setupScrollEffects() {
        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Add animation to cards and sections
        const animatedElements = document.querySelectorAll(
            '.highlight-card, .info-card, .floating-card, .step'
        );
        
        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }

    // Handle scroll events
    function handleScroll() {
        const header = document.querySelector('.header');
        if (!header) return;

        const scrollY = window.scrollY;
        
        // Add shadow to header on scroll
        if (scrollY > 10) {
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            header.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            header.style.boxShadow = 'none';
            header.style.background = 'rgba(255, 255, 255, 0.95)';
        }
    }

    // Handle resize events
    function handleResize() {
        // Close mobile menu on resize to desktop
        if (window.innerWidth > 768) {
            const mobileNav = document.querySelector('.mobile-nav');
            if (mobileNav && mobileNav.style.transform === 'translateY(0%)') {
                toggleMobileMenu();
            }
        }
    }

    // Utility function to debounce function calls
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Enhanced form field interactions
    function setupEnhancedFormInteractions() {
        const formInputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');
        
        formInputs.forEach(input => {
            // Add focus effect
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', function() {
                this.parentElement.classList.remove('focused');
                if (this.value.trim()) {
                    this.parentElement.classList.add('filled');
                } else {
                    this.parentElement.classList.remove('filled');
                }
            });
            
            // Check if field is pre-filled
            if (input.value.trim()) {
                input.parentElement.classList.add('filled');
            }
        });
    }

    // Preload critical resources
    function preloadCriticalResources() {
        // Preload Google Fonts
        const fontLink = document.createElement('link');
        fontLink.rel = 'preload';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
        fontLink.as = 'style';
        document.head.appendChild(fontLink);
    }

    // Performance optimizations
    function setupPerformanceOptimizations() {
        // Debounce scroll and resize handlers
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        
        window.addEventListener('scroll', debounce(handleScroll, 10));
        window.addEventListener('resize', debounce(handleResize, 250));
    }

    // Initialize everything when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        init();
        setupEnhancedFormInteractions();
        preloadCriticalResources();
        setupPerformanceOptimizations();
        
        // Add a small delay to ensure all elements are rendered
        setTimeout(() => {
            // Mark page as fully loaded
            document.body.classList.add('page-loaded');
        }, 100);
    });

    // Handle page load
    window.addEventListener('load', function() {
        // Hide any loading indicators
        document.body.classList.add('page-fully-loaded');
        
        // Start any delayed animations
        setTimeout(() => {
            const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-subtitle');
            heroElements.forEach((el, index) => {
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }, 200);
    });

    // Chat Application System
    let chatState = {
        step: 0,
        data: {},
        currentChild: 1,
        totalChildren: 1
    };

    const chatQuestions = [
        {
            bot: "Assalamu Alaikum wa Rahmatullahi wa Barakatuh! Welcome to EdAI Accelerator. I'm delighted to help you with your application. May I please have your name?",
            type: 'text',
            field: 'parentName'
        },
        {
            bot: "Barakallahu feeki, {parentName}. Could you please provide your email address so we can keep you updated throughout the process?",
            type: 'email',
            field: 'parentEmail'
        },
        {
            bot: "Jazakallahu khair. And your phone number for any urgent communication?",
            type: 'tel',
            field: 'parentPhone'
        },
        {
            bot: "Perfect! Now, how many children would you like to enroll in our program? We welcome multiple children from the same family.",
            type: 'options',
            options: ['1 child', '2 children', '3 children', '4+ children'],
            field: 'totalChildren'
        },
        {
            bot: "Wonderful! Let's start with your {childNumber} child. What is their name?",
            type: 'text',
            field: 'teenName'
        },
        {
            bot: "Masha'Allah! How old is {teenName}?",
            type: 'options',
            options: ['12 years', '13 years', '14 years', '15 years', '16 years', '17 years', '18 years'],
            field: 'teenAge'
        },
        {
            bot: "And what grade is {teenName} currently in?",
            type: 'options',
            options: ['7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'],
            field: 'teenGrade'
        },
        {
            bot: "Tell me, what excites {teenName} about creating and building? What drives their curiosity?",
            type: 'textarea',
            field: 'teenInterests',
            placeholder: "Share what inspires your teen to create and innovate..."
        },
        {
            bot: "Subhan'Allah! As a parent, what do you hope {teenName} will gain from this program? What are your aspirations for them?",
            type: 'textarea',
            field: 'parentExpectations',
            placeholder: "Tell us about your hopes and expectations..."
        },
        {
            bot: "I need to confirm that {teenName} is Muslim and in 7th grade or above, as this is required for our program. Can you confirm this?",
            type: 'options',
            options: ['Yes, I confirm', 'No, they do not meet these requirements'],
            field: 'agreeTerms'
        },
        {
            bot: "Would you like us to keep you updated about program news and future opportunities?",
            type: 'options',
            options: ['Yes, please keep me updated', 'No, just this application'],
            field: 'agreeContact'
        }
    ];

    function openChatApplication() {
        const modal = document.getElementById('chatApplicationModal');
        const chatMessages = document.getElementById('chatMessages');
        
        // Reset chat state
        chatState = {
            step: 0,
            data: {},
            currentChild: 1,
            totalChildren: 1
        };
        
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // Show modal
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Start conversation
        setTimeout(() => {
            addBotMessage(chatQuestions[0].bot);
            showInputForCurrentStep();
        }, 500);
    }

    function addBotMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message bot';
        
        // Replace placeholders with actual data
        let processedMessage = message;
        Object.keys(chatState.data).forEach(key => {
            processedMessage = processedMessage.replace(new RegExp(`{${key}}`, 'g'), chatState.data[key]);
        });
        processedMessage = processedMessage.replace('{childNumber}', getOrdinalNumber(chatState.currentChild));
        
        messageDiv.innerHTML = `
            <div class="chat-avatar">EdAI</div>
            <div class="chat-bubble">${processedMessage}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addUserMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user';
        
        messageDiv.innerHTML = `
            <div class="chat-avatar">You</div>
            <div class="chat-bubble">${message}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showInputForCurrentStep() {
        const container = document.getElementById('chatInputContainer');
        const question = chatQuestions[chatState.step];
        
        if (!question) {
            // Application complete
            completeApplication();
            return;
        }
        
        let inputHTML = '';
        
        if (question.type === 'text' || question.type === 'email' || question.type === 'tel') {
            inputHTML = `
                <input type="${question.type}" class="chat-input" id="chatInput" 
                       placeholder="Type your answer..." required>
                <button class="chat-send-btn" onclick="handleTextInput()">Send</button>
            `;
        } else if (question.type === 'textarea') {
            inputHTML = `
                <textarea class="chat-input" id="chatInput" rows="3" 
                          placeholder="${question.placeholder || 'Type your answer...'}"></textarea>
                <button class="chat-send-btn" onclick="handleTextInput()">Send</button>
            `;
        } else if (question.type === 'options') {
            const optionsHTML = question.options.map((option, index) => 
                `<button class="chat-option" onclick="handleOptionSelect('${option}')">${option}</button>`
            ).join('');
            
            inputHTML = `
                <div class="chat-options">${optionsHTML}</div>
            `;
        }
        
        container.innerHTML = inputHTML;
        
        // Focus on input if it's a text input
        const input = document.getElementById('chatInput');
        if (input) {
            input.focus();
            
            // Handle Enter key
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextInput();
                }
            });
        }
    }

    window.handleTextInput = function handleTextInput() {
        const input = document.getElementById('chatInput');
        const value = input.value.trim();
        
        if (!value) return;
        
        const question = chatQuestions[chatState.step];
        
        // Validate input
        if (question.type === 'email' && !isValidEmail(value)) {
            alert('Please enter a valid email address.');
            return;
        }
        
        if (question.type === 'tel' && !isValidPhone(value)) {
            alert('Please enter a valid phone number.');
            return;
        }
        
        // Add user message
        addUserMessage(value);
        
        // Store data
        if (question.field.includes('teen') && chatState.totalChildren > 1) {
            // Handle multiple children
            if (!chatState.data.children) chatState.data.children = [];
            if (!chatState.data.children[chatState.currentChild - 1]) {
                chatState.data.children[chatState.currentChild - 1] = {};
            }
            chatState.data.children[chatState.currentChild - 1][question.field] = value;
        } else {
            chatState.data[question.field] = value;
        }
        
        proceedToNextStep();
    }

    window.handleOptionSelect = function handleOptionSelect(option) {
        const question = chatQuestions[chatState.step];
        
        // Add user message
        addUserMessage(option);
        
        // Store data
        let value = option;
        if (question.field === 'totalChildren') {
            chatState.totalChildren = parseInt(option.split(' ')[0]);
            value = chatState.totalChildren;
        } else if (question.field === 'teenAge') {
            value = parseInt(option.split(' ')[0]);
        } else if (question.field === 'agreeTerms') {
            value = option.includes('Yes');
        } else if (question.field === 'agreeContact') {
            value = option.includes('Yes');
        }
        
        // Store data
        if (question.field.includes('teen') && chatState.totalChildren > 1) {
            if (!chatState.data.children) chatState.data.children = [];
            if (!chatState.data.children[chatState.currentChild - 1]) {
                chatState.data.children[chatState.currentChild - 1] = {};
            }
            chatState.data.children[chatState.currentChild - 1][question.field] = value;
        } else {
            chatState.data[question.field] = value;
        }
        
        proceedToNextStep();
    }

    function proceedToNextStep() {
        // Show typing indicator
        showTypingIndicator();
        
        setTimeout(() => {
            hideTypingIndicator();
            
            // Check if we need to repeat questions for multiple children
            const currentQuestion = chatQuestions[chatState.step];
            if (currentQuestion && currentQuestion.field === 'agreeContact' && chatState.currentChild < chatState.totalChildren) {
                // Move to next child
                chatState.currentChild++;
                chatState.step = 4; // Go back to teen name question
                
                addBotMessage(`Now let's get information about your ${getOrdinalNumber(chatState.currentChild)} child.`);
                setTimeout(() => {
                    addBotMessage(chatQuestions[chatState.step].bot);
                    showInputForCurrentStep();
                }, 1000);
            } else {
                // Move to next question
                chatState.step++;
                
                if (chatState.step < chatQuestions.length) {
                    addBotMessage(chatQuestions[chatState.step].bot);
                    showInputForCurrentStep();
                } else {
                    completeApplication();
                }
            }
        }, 1000);
    }

    function completeApplication() {
        addBotMessage("Barakallahu feekum! I have all the information needed. Let me submit your application now...");
        
        setTimeout(() => {
            // Prepare data for submission
            const applicationData = {
                ...chatState.data,
                multipleChildren: chatState.totalChildren > 1,
                childrenData: chatState.data.children || []
            };
            
            // Submit application (same logic as before)
            submitChatApplication(applicationData);
        }, 2000);
    }

    async function submitChatApplication(data) {
        try {
            const response = await fetch('/api/submit-application', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                closeChatModal();
                showSuccessModal();
            } else {
                addBotMessage(`I apologize, there was an issue submitting your application: ${result.error || 'Please try again.'}`);
            }
        } catch (error) {
            addBotMessage('There was a network issue. Please check your connection and try again.');
        }
    }

    function showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <span>EdAI is typing</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(indicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function closeChatModal() {
        const modal = document.getElementById('chatApplicationModal');
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    function getOrdinalNumber(num) {
        const ordinals = ['', 'first', 'second', 'third', 'fourth', 'fifth'];
        return ordinals[num] || `${num}th`;
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        return /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
    }

    // Add event listeners when DOM is ready
    function setupChatEventListeners() {
        // Chat modal close button
        const chatModalClose = document.getElementById('chatModalClose');
        if (chatModalClose) {
            chatModalClose.addEventListener('click', function() {
                closeChatModal();
            });
        }

        // Start chat application button
        const startChatBtn = document.getElementById('startChatApplication');
        if (startChatBtn) {
            startChatBtn.addEventListener('click', function(e) {
                e.preventDefault();
                openChatApplication();
            });
        }

        // Hero Apply Now button
        const heroApplyBtn = document.getElementById('heroApplyBtn');
        if (heroApplyBtn) {
            heroApplyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                openChatApplication();
            });
        }

        // Any other Apply Now buttons with onclick attributes
        const applyButtons = document.querySelectorAll('button[onclick*="openChatApplication"]');
        applyButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                openChatApplication();
            });
        });
        
        // Close modal when clicking outside
        const chatModal = document.getElementById('chatApplicationModal');
        if (chatModal) {
            chatModal.addEventListener('click', function(e) {
                if (e.target === chatModal) {
                    closeChatModal();
                }
            });
        }
    }

    // Set up chat event listeners
    document.addEventListener('DOMContentLoaded', setupChatEventListeners);

    // Make openChatApplication globally available
    window.openChatApplication = openChatApplication;

    // Export functions for testing (if needed)
    window.EdAILandingPage = {
        validateField,
        showSuccessModal,
        closeModal,
        openChatApplication,
        closeChatModal
    };

});
