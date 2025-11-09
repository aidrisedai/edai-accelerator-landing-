-- EdAI Accelerator Application Database Schema
-- This script creates the necessary tables for storing application data

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    
    -- Parent Information
    parent_name VARCHAR(255) NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(50) NOT NULL,
    
    -- Teen Information
    teen_name VARCHAR(255) NOT NULL,
    teen_age INTEGER NOT NULL CHECK (teen_age >= 11 AND teen_age <= 18),
    teen_grade INTEGER NOT NULL CHECK (teen_grade >= 6 AND teen_grade <= 12),
    
    -- Application Details
    teen_interests TEXT NOT NULL CHECK (LENGTH(teen_interests) >= 20),
    parent_expectations TEXT NOT NULL CHECK (LENGTH(parent_expectations) >= 20),
    
    -- Agreements
    agrees_terms BOOLEAN NOT NULL DEFAULT FALSE,
    agrees_contact BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    application_status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (parent_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (parent_phone ~ '^[\+]?[1-9][\d\s\-\(\)]{7,15}$'),
    CONSTRAINT must_agree_terms CHECK (agrees_terms = TRUE)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(parent_email);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(application_status);
CREATE INDEX IF NOT EXISTS idx_applications_submitted ON applications(submitted_at);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE applications IS 'Stores EdAI Accelerator program applications from parents';
COMMENT ON COLUMN applications.application_status IS 'Status: pending, reviewed, accepted, rejected, waitlisted';
COMMENT ON COLUMN applications.teen_age IS 'Teen age (11-18 years)';
COMMENT ON COLUMN applications.teen_grade IS 'Current grade (6-12)';
