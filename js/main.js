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
    function handleFormSubmit(e) {
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

        // Simulate form submission (replace with actual API call)
        setTimeout(() => {
            hideLoading();
            showSuccessModal();
            
            // Reset form
            applicationForm.reset();
            
            // In a real application, you would send the data to your server here
            console.log('Form submitted successfully!');
        }, 2000);
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

    // Export functions for testing (if needed)
    window.EdAILandingPage = {
        validateField,
        showSuccessModal,
        closeModal
    };

})();