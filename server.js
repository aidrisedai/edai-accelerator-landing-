// EdAI Accelerator Landing Page - Express Server for Render
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint for form submission
app.post('/api/submit-application', async (req, res) => {
    try {
        const {
            parentName,
            parentEmail,
            parentPhone,
            teenName,
            teenAge,
            teenGrade,
            teenInterests,
            parentExpectations,
            agreeTerms,
            agreeContact
        } = req.body;

        // Validation
        const validationErrors = [];

        if (!parentName?.trim()) validationErrors.push('Parent name is required');
        if (!parentEmail?.trim()) validationErrors.push('Parent email is required');
        if (!parentPhone?.trim()) validationErrors.push('Parent phone is required');
        if (!teenName?.trim()) validationErrors.push('Teen name is required');
        if (!teenAge || teenAge < 12 || teenAge > 18) validationErrors.push('Teen age must be between 12 and 18');
        if (!teenGrade || teenGrade < 7 || teenGrade > 12) validationErrors.push('Teen grade must be between 7 and 12');
        if (!teenInterests?.trim() || teenInterests.trim().length < 20) {
            validationErrors.push('Teen interests must be at least 20 characters');
        }
        if (!parentExpectations?.trim() || parentExpectations.trim().length < 20) {
            validationErrors.push('Parent expectations must be at least 20 characters');
        }
        if (!agreeTerms) validationErrors.push('Must agree to eligibility requirements');

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (parentEmail && !emailRegex.test(parentEmail.trim())) {
            validationErrors.push('Invalid email format');
        }

        // Phone validation
        const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
        if (parentPhone && !phoneRegex.test(parentPhone.replace(/[\s\-\(\)]/g, ''))) {
            validationErrors.push('Invalid phone number format');
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
        }

        // Check for duplicate email
        const existingApplication = await pool.query(
            'SELECT id FROM applications WHERE parent_email = $1',
            [parentEmail.trim().toLowerCase()]
        );

        if (existingApplication.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'An application with this email address already exists'
            });
        }

        // Insert application into database
        const result = await pool.query(`
            INSERT INTO applications (
                parent_name,
                parent_email,
                parent_phone,
                teen_name,
                teen_age,
                teen_grade,
                teen_interests,
                parent_expectations,
                agrees_terms,
                agrees_contact
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, submitted_at
        `, [
            parentName.trim(),
            parentEmail.trim().toLowerCase(),
            parentPhone.trim(),
            teenName.trim(),
            parseInt(teenAge),
            parseInt(teenGrade),
            teenInterests.trim(),
            parentExpectations.trim(),
            Boolean(agreeTerms),
            Boolean(agreeContact)
        ]);

        const applicationId = result.rows[0].id;
        const submittedAt = result.rows[0].submitted_at;

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Application submitted successfully!',
            data: {
                id: applicationId,
                submittedAt: submittedAt,
                parentEmail: parentEmail.trim().toLowerCase()
            }
        });

    } catch (error) {
        console.error('Database error:', error);
        
        // Check if it's a constraint violation
        if (error.code === '23514') {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: ['Invalid data format or constraints violation']
            });
        }

        // Generic error response
        res.status(500).json({
            success: false,
            error: 'Internal server error. Please try again later.'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(port, () => {
    console.log(`EdAI Accelerator server running on port ${port}`);
});

module.exports = app;