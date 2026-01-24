-- MAPS AI Builder Lab Applications Table
-- For college students and working professionals

CREATE TABLE IF NOT EXISTS maps_applications (
    id SERIAL PRIMARY KEY,
    
    -- Contact Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    
    -- Background Information
    background VARCHAR(100) NOT NULL, -- 'College Student', 'Working Professional', 'Recent Graduate', 'Career Changer'
    field VARCHAR(255), -- Industry or field of study
    coding_experience VARCHAR(100), -- 'No, completely new', 'A little', 'Some experience', 'Yes, I code regularly'
    
    -- Application Details
    motivation TEXT NOT NULL CHECK (LENGTH(motivation) >= 20),
    has_laptop VARCHAR(50), -- 'Yes, I have a laptop', 'No, I need assistance'
    schedule_confirm VARCHAR(100), -- 'Yes, I can commit', 'I have some conflicts', 'Need to check'
    referral_source VARCHAR(100), -- 'MAPS Redmond', 'Friend/Family', etc.
    
    -- Metadata
    application_status VARCHAR(50) DEFAULT 'pending',
    acceptance_token VARCHAR(255),
    offer_accepted BOOLEAN DEFAULT FALSE,
    offer_accepted_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT maps_valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maps_applications_email ON maps_applications(email);
CREATE INDEX IF NOT EXISTS idx_maps_applications_status ON maps_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_maps_applications_submitted ON maps_applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_maps_applications_acceptance_token ON maps_applications(acceptance_token);

-- Trigger for updated_at
CREATE TRIGGER update_maps_applications_updated_at 
    BEFORE UPDATE ON maps_applications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE maps_applications IS 'Stores MAPS AI Builder Lab applications for adults';
COMMENT ON COLUMN maps_applications.background IS 'Applicant type: College Student, Working Professional, Recent Graduate, Career Changer';
