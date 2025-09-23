// EdAI Accelerator Application Submission API
// Vercel serverless function to handle form submissions

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

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
        const existingApplication = await sql`
            SELECT id FROM applications WHERE parent_email = ${parentEmail.trim().toLowerCase()}
        `;

        if (existingApplication.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'An application with this email address already exists'
            });
        }

        // Insert application into database
        const result = await sql`
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
            ) VALUES (
                ${parentName.trim()},
                ${parentEmail.trim().toLowerCase()},
                ${parentPhone.trim()},
                ${teenName.trim()},
                ${parseInt(teenAge)},
                ${parseInt(teenGrade)},
                ${teenInterests.trim()},
                ${parentExpectations.trim()},
                ${Boolean(agreeTerms)},
                ${Boolean(agreeContact)}
            )
            RETURNING id, submitted_at
        `;

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
}