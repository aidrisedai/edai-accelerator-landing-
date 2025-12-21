// Migration: Add interview scheduling fields to applications table
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateDatabase() {
    try {
        console.log('Starting migration: Adding interview scheduling fields...');
        
        // Add new columns for interview scheduling
        await pool.query(`
            ALTER TABLE applications
            ADD COLUMN IF NOT EXISTS interview_status VARCHAR(50) DEFAULT 'not_scheduled',
            ADD COLUMN IF NOT EXISTS proposed_interview_times TEXT,
            ADD COLUMN IF NOT EXISTS confirmed_interview_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS interview_notes TEXT,
            ADD COLUMN IF NOT EXISTS parent_response TEXT,
            ADD COLUMN IF NOT EXISTS parent_response_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS interview_link TEXT;
        `);
        
        console.log('✅ Successfully added interview scheduling fields');
        console.log('   - interview_status: tracks scheduling state (not_scheduled, pending, confirmed, completed)');
        console.log('   - proposed_interview_times: JSON array of proposed times');
        console.log('   - confirmed_interview_date: final confirmed interview date');
        console.log('   - interview_notes: admin notes about interview');
        console.log('   - parent_response: parent\'s response message');
        console.log('   - parent_response_date: when parent responded');
        console.log('   - interview_link: unique link for parent to confirm/request changes');
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

migrateDatabase();
