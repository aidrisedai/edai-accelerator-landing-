ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS enrollment_type VARCHAR(50) DEFAULT 'parent';
ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS maps_application_id INTEGER REFERENCES maps_applications(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS program_tasks (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES program_classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resources TEXT, -- JSON string or simple text
    sequence_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_task_submissions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES enrolled_students(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES program_tasks(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'completed'
    submission_text TEXT,
    submission_link TEXT,
    instructor_feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (setting_key, setting_value) VALUES
('motivational_quotes', '["Seek knowledge from the cradle to the grave.", "Allah loves those who are persistent in their work.", "The best of you are those who learn the Quran and teach it.", "Knowledge is light.", "Indeed, with hardship comes ease."]')
ON CONFLICT (setting_key) DO NOTHING;
