// MAPS AI Builder Lab Application Submission API
// Handles applications from college students and working professionals

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
        console.log('=== MAPS APPLICATION API ===');
        console.log('Received data:', JSON.stringify(req.body, null, 2));
        
        const {
            name,
            email,
            phone,
            background,
            field,
            codingExperience,
            motivation,
            hasLaptop,
            scheduleConfirm,
            referralSource,
            program,
            submittedAt
        } = req.body;

        // Validation
        const validationErrors = [];

        if (!name?.trim()) validationErrors.push('Name is required');
        if (!email?.trim()) validationErrors.push('Email is required');
        if (!phone?.trim()) validationErrors.push('Phone is required');
        if (!background?.trim()) validationErrors.push('Background is required');
        if (!motivation?.trim() || motivation.trim().length < 20) {
            validationErrors.push('Motivation must be at least 20 characters');
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email.trim())) {
            validationErrors.push('Invalid email format');
        }

        // Phone validation
        const phoneRegex = /[\d\s\-\+\(\)]{7,}/;
        if (phone && !phoneRegex.test(phone.trim())) {
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
            SELECT id FROM maps_applications WHERE email = ${email.trim().toLowerCase()}
        `;
        
        if (existingApplication.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'An application with this email already exists. Please contact us if you need to update your application.'
            });
        }

        // Insert application
        const result = await sql`
            INSERT INTO maps_applications (
                name,
                email,
                phone,
                background,
                field,
                coding_experience,
                motivation,
                has_laptop,
                schedule_confirm,
                referral_source,
                application_status
            ) VALUES (
                ${name.trim()},
                ${email.trim().toLowerCase()},
                ${phone.trim()},
                ${background},
                ${field?.trim() || null},
                ${codingExperience || null},
                ${motivation.trim()},
                ${hasLaptop || null},
                ${scheduleConfirm || null},
                ${referralSource || null},
                'pending'
            )
            RETURNING id, submitted_at
        `;

        console.log('Application inserted:', result.rows[0]);

        return res.status(200).json({
            success: true,
            message: 'Application submitted successfully',
            applicationId: result.rows[0].id,
            submittedAt: result.rows[0].submitted_at
        });

    } catch (error) {
        console.error('Error submitting MAPS application:', error);
        
        // Check for specific database errors
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'An application with this email already exists.'
            });
        }
        
        if (error.code === '42P01') {
            // Table doesn't exist - create it
            console.log('Table does not exist, attempting to create...');
            try {
                await sql`
                    CREATE TABLE IF NOT EXISTS maps_applications (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        email VARCHAR(255) NOT NULL UNIQUE,
                        phone VARCHAR(50) NOT NULL,
                        background VARCHAR(100) NOT NULL,
                        field VARCHAR(255),
                        coding_experience VARCHAR(100),
                        motivation TEXT NOT NULL,
                        has_laptop VARCHAR(50),
                        schedule_confirm VARCHAR(100),
                        referral_source VARCHAR(100),
                        application_status VARCHAR(50) DEFAULT 'pending',
                        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                
                // Retry the insert
                const { name, email, phone, background, field, codingExperience, motivation, hasLaptop, scheduleConfirm, referralSource } = req.body;
                const result = await sql`
                    INSERT INTO maps_applications (
                        name, email, phone, background, field, coding_experience,
                        motivation, has_laptop, schedule_confirm, referral_source
                    ) VALUES (
                        ${name.trim()}, ${email.trim().toLowerCase()}, ${phone.trim()},
                        ${background}, ${field?.trim() || null}, ${codingExperience || null},
                        ${motivation.trim()}, ${hasLaptop || null}, ${scheduleConfirm || null},
                        ${referralSource || null}
                    )
                    RETURNING id, submitted_at
                `;
                
                return res.status(200).json({
                    success: true,
                    message: 'Application submitted successfully',
                    applicationId: result.rows[0].id
                });
            } catch (createError) {
                console.error('Error creating table:', createError);
            }
        }

        return res.status(500).json({
            success: false,
            error: 'An error occurred while submitting your application. Please try again or contact us directly.'
        });
    }
}
