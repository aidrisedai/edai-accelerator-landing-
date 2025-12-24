// Migration: Create settings table for email configuration
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateDatabase() {
    try {
        console.log('Starting migration: Creating settings table...');
        
        // Create settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(255) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        // Insert default settings
        await pool.query(`
            INSERT INTO settings (setting_key, setting_value) VALUES
            ('resend_api_key', ''),
            ('email_from_address', 'EdAI Accelerator <noreply@edaiaccelerator.com>'),
            ('welcome_email_subject', 'Application Received - Thank You! | EdAI Accelerator'),
            ('welcome_email_body', ''),
            ('waitlist_email_subject', 'Application Received - 2026 Waitlist | EdAI Accelerator'),
            ('waitlist_email_body', ''),
            ('interview_invite_subject', 'Interview Invitation for {{student_name}} - EdAI Accelerator'),
            ('interview_invite_body', ''),
            ('interview_confirmed_subject', 'Interview Confirmed for {{student_name}} - EdAI Accelerator'),
            ('interview_confirmed_body', '')
            ON CONFLICT (setting_key) DO NOTHING;
        `);
        
        console.log('✅ Successfully created settings table with default values');
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

migrateDatabase();
