// EdAI Accelerator - Get Applications API
// Vercel serverless function to retrieve all applications for admin dashboard

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use GET.' 
        });
    }

    try {
        // Fetch all applications, ordered by submission date (newest first)
        const result = await sql`
            SELECT 
                id,
                parent_name,
                parent_email,
                parent_phone,
                teen_name,
                teen_age,
                teen_grade,
                teen_interests,
                parent_expectations,
                agrees_terms,
                agrees_contact,
                application_status,
                submitted_at
            FROM applications
            ORDER BY submitted_at DESC
        `;

        // Return success response with applications
        res.status(200).json({
            success: true,
            count: result.rows.length,
            applications: result.rows
        });

    } catch (error) {
        console.error('Database error:', error);
        
        // Return error response
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve applications. Please try again later.'
        });
    }
}
