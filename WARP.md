# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a static landing page for the EdAI Accelerator program - a specialized accelerator for Muslim teenagers (7th grade and above) focused on product creation using their patent-pending ForgeFlow Orchestrator. The site features a responsive design, interactive application form, and modern UI/UX optimized for conversion.

## Architecture and Structure

### Core Components
- **Static HTML/CSS/JS Architecture**: Classic three-layer web architecture with modern responsive design
- **Single Page Application**: All content on one page with smooth scrolling navigation
- **Form-Centric Design**: The primary conversion goal is the parent application form

### File Organization
```
├── index.html          # Main landing page with semantic HTML5 structure
├── css/styles.css      # Comprehensive CSS with custom properties system
├── js/main.js          # Interactive functionality with modular architecture
├── assets/             # Static assets (favicon, images)
└── images/             # Additional image assets
```

### CSS Architecture
The stylesheets use a robust custom properties system (CSS variables) for:
- **Color Palette**: Primary blue (#2563eb), accent orange (#f97316), semantic grays
- **Typography Scale**: Inter font with systematic sizing from --font-size-xs to --font-size-6xl  
- **Spacing System**: Consistent spacing scale from --spacing-xs to --spacing-6xl
- **Component-Based Styles**: Modular CSS with clear separation of concerns

### JavaScript Architecture
`main.js` uses an IIFE pattern with modular functionality:
- **Form Validation**: Real-time validation with custom error handling
- **Mobile Navigation**: Dynamically generated responsive menu
- **Scroll Effects**: Intersection Observer for animations and header effects
- **Modal System**: Success feedback and loading states
- **Performance Optimizations**: Debounced event handlers and lazy loading
- **API Integration**: Fetch-based form submission to serverless backend

### Backend Architecture
- **Vercel Serverless Functions**: API endpoints in `/api` directory
- **PostgreSQL Database**: Vercel Postgres with automated schema management
- **Data Validation**: Server-side validation with comprehensive error handling
- **CORS Support**: Cross-origin request handling for form submissions

## Common Development Tasks

### Local Development
```bash
# Install dependencies
npm install

# Serve locally with database connectivity
vercel dev

# Alternative: Static serving (without database)
python -m http.server 8000
# or
npx serve .
```

### Database Operations
```bash
# Pull environment variables from Vercel
vercel env pull .env.local

# Deploy to production
npm run deploy
```

### Testing Changes
```bash
# Open in browser and test all interactive elements:
# - Form validation and submission
# - Mobile menu functionality
# - Smooth scrolling navigation
# - Modal interactions
# - Responsive breakpoints (768px, 480px)
```

### Form Testing
The application form includes comprehensive validation:
- Email format validation
- Phone number validation  
- Text area minimum lengths (20+ characters)
- Required field checking
- Checkbox validation for eligibility

### Styling Modifications
When modifying styles, leverage the CSS custom properties system:
```css
/* Use existing variables */
color: var(--primary-blue);
padding: var(--spacing-lg);
font-size: var(--font-size-xl);
border-radius: var(--radius-lg);
```

### Adding New Sections
Follow the established patterns:
- Use semantic HTML5 elements
- Apply consistent spacing with CSS variables
- Add to the smooth scrolling navigation system
- Include responsive breakpoints at 768px and 480px
- Consider intersection observer animations for new elements

## Design System

### Color Usage
- **Primary Blue**: Main CTAs, navigation highlights, form focus states
- **Accent Orange**: Secondary highlights, badges, form submit buttons
- **Semantic Grays**: Text hierarchy (primary, secondary, muted)

### Typography Hierarchy
- **Hero Title**: --font-size-5xl (3rem) with gradient text treatment
- **Section Titles**: --font-size-4xl (2.25rem)
- **Subsections**: --font-size-2xl (1.5rem)
- **Body Text**: --font-size-base (1rem) and --font-size-lg (1.125rem)

### Responsive Behavior
- **Desktop First**: Base styles target desktop, media queries handle smaller screens
- **Mobile Breakpoint**: 768px - converts to single column, shows mobile menu
- **Small Mobile**: 480px - further compacts spacing and typography

## Key Interactive Features

### Form Submission Flow
1. Real-time field validation on blur
2. Full form validation on submit
3. Loading overlay during submission
4. Success modal with confirmation
5. Form reset after successful submission

### Mobile Navigation
- Hamburger menu auto-generates at 768px breakpoint  
- Animated menu icon transformation
- Backdrop blur overlay
- Smooth scroll integration

### Performance Features
- Intersection Observer for scroll animations
- Debounced scroll and resize handlers
- Preloaded critical fonts
- CSS-based animations with hardware acceleration

## Content Management

The site content is primarily in `index.html`. Key sections:
- **Hero Section**: Main value proposition and statistics
- **Program Overview**: Three highlight cards plus journey steps
- **Application Section**: Split layout with info cards and form
- **Footer**: Contact information and links

Form submission connects to a Vercel serverless API endpoint at `/api/submit-application` which stores data in a PostgreSQL database. The form includes comprehensive validation both client-side and server-side.

## Browser Compatibility

Designed for modern browsers with:
- CSS Grid and Flexbox layouts
- Custom properties (CSS variables)
- Intersection Observer API
- Modern JavaScript (ES6+)
- Backdrop-filter support for modern blur effects