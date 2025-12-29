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

// Helper function to get settings from database
async function getSettings() {
    try {
        const result = await pool.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        // Return defaults if settings table doesn't exist yet
        return {
            resend_api_key: process.env.RESEND_API_KEY || '',
            email_from_address: 'EdAI Accelerator <noreply@edaiaccelerator.com>',
            welcome_email_subject: 'Application Received - Thank You! | EdAI Accelerator',
            waitlist_email_subject: 'Application Received - 2026 Waitlist | EdAI Accelerator',
            welcome_email_body: '',
            waitlist_email_body: ''
        };
    }
}

// Helper function to replace template variables
function replaceTemplateVars(template, vars) {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve settings page
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

// Serve interview confirmation page
app.get('/interview-confirm', (req, res) => {
    res.sendFile(path.join(__dirname, 'interview-confirm.html'));
});

// Serve programs page
app.get('/programs', (req, res) => {
    res.sendFile(path.join(__dirname, 'programs.html'));
});

// API endpoint for form submission
app.post('/api/submit-application', async (req, res) => {
    try {
        console.log('=== RENDER API DEBUGGING - RECEIVED DATA ===');
        console.log('Raw req.body:', JSON.stringify(req.body, null, 2));
        
        const {
            parentName,
            parentEmail,
            parentPhone,
            totalChildren,
            agreeContact,
            applicationMethod,
            ...childrenData
        } = req.body;
        
        console.log('Extracted parent data:', { parentName, parentEmail, parentPhone, totalChildren, agreeContact });
        console.log('Extracted children data object:', childrenData);
        
        // Extract children data
        const children = [];
        console.log('Extracting children data for totalChildren:', totalChildren);
        for (let i = 1; i <= totalChildren; i++) {
            console.log(`Looking for child${i} in childrenData`);
            const child = childrenData[`child${i}`];
            console.log(`child${i} data:`, child);
            if (child) {
                const extractedChild = {
                    name: child.name,
                    age: child.age,
                    grade: child.grade,
                    interests: child.interests,
                    parentExpectations: child.parentExpectations,
                    agreeTerms: child.agreeTerms
                };
                console.log(`Extracted child ${i}:`, extractedChild);
                children.push(extractedChild);
            } else {
                console.log(`No child${i} found in childrenData`);
            }
        }
        console.log('Final children array:', children);

        // Validation
        const validationErrors = [];

        // Parent validation
        if (!parentName?.trim()) validationErrors.push('Parent name is required');
        if (!parentEmail?.trim()) validationErrors.push('Parent email is required');
        if (!parentPhone?.trim()) validationErrors.push('Parent phone is required');
        if (!totalChildren || totalChildren < 1 || totalChildren > 10) {
            validationErrors.push('Total children must be between 1 and 10');
        }
        if (children.length !== totalChildren) {
            validationErrors.push('Number of children data does not match total children');
        }
        
        // Children validation
        children.forEach((child, index) => {
            const childNum = index + 1;
            if (!child.name?.trim()) {
                validationErrors.push(`Child ${childNum} name is required`);
            }
            
            // Parse age from string like "13 years"
            let age = child.age;
            if (typeof age === 'string') {
                const ageMatch = age.match(/\d+/);
                age = ageMatch ? parseInt(ageMatch[0]) : null;
            }
            if (!age || age < 10 || age > 18) {
                validationErrors.push(`Child ${childNum} age must be between 10 and 18`);
            }
            
            // Parse grade from string like "8th Grade"
            let grade = child.grade;
            if (typeof grade === 'string') {
                const gradeMatch = grade.match(/\d+/);
                grade = gradeMatch ? parseInt(gradeMatch[0]) : null;
            }
            if (!grade || grade < 5 || grade > 12) {
                validationErrors.push(`Child ${childNum} grade must be between 5 and 12`);
            }
            
            if (!child.interests?.trim() || child.interests.trim().length < 20) {
                validationErrors.push(`Child ${childNum} interests must be at least 20 characters`);
            }
            if (!child.parentExpectations?.trim() || child.parentExpectations.trim().length < 20) {
                validationErrors.push(`Child ${childNum} parent expectations must be at least 20 characters`);
            }
            if (!child.agreeTerms || child.agreeTerms !== 'Yes, I confirm') {
                validationErrors.push(`Must agree to eligibility requirements for child ${childNum}`);
            }
        });

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

        // Check for duplicate email only if trying to register the same child
        // Allow multiple children from same parent
        const childNames = children.map(child => child.name.trim().toLowerCase());
        const existingApplications = await pool.query(
            'SELECT teen_name FROM applications WHERE parent_email = $1',
            [parentEmail.trim().toLowerCase()]
        );
        
        const existingChildNames = existingApplications.rows.map(row => row.teen_name.toLowerCase());
        const duplicateChildren = childNames.filter(name => existingChildNames.includes(name));
        
        if (duplicateChildren.length > 0) {
            return res.status(409).json({
                success: false,
                error: `Application already exists for child(ren): ${duplicateChildren.join(', ')}`
            });
        }

        // Insert applications for each child
        const insertedApplications = [];
        const applicationStatus = (applicationMethod === 'waitlist' || req.body.applicationStatus === 'waitlist') ? 'waitlist' : 'pending';
        
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            
            // Parse age and grade from strings
            let age = child.age;
            if (typeof age === 'string') {
                const ageMatch = age.match(/\d+/);
                age = ageMatch ? parseInt(ageMatch[0]) : null;
            }
            
            let grade = child.grade;
            if (typeof grade === 'string') {
                const gradeMatch = grade.match(/\d+/);
                grade = gradeMatch ? parseInt(gradeMatch[0]) : null;
            }
            
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
                    agrees_contact,
                    application_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id, submitted_at
            `, [
                parentName.trim(),
                parentEmail.trim().toLowerCase(),
                parentPhone.trim(),
                child.name.trim(),
                age,
                grade,
                child.interests.trim(),
                child.parentExpectations.trim(),
                child.agreeTerms === 'Yes, I confirm',
                Boolean(agreeContact),
                applicationStatus
            ]);
            
            insertedApplications.push({
                id: result.rows[0].id,
                submittedAt: result.rows[0].submitted_at,
                childName: child.name.trim(),
                childGrade: grade
            });
        }

        // Send welcome email to parent
        try {
            const settings = await getSettings();
            const { Resend } = require('resend');
            const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
            
            const childrenList = insertedApplications.map(app => 
                `${app.childName} (${app.childGrade}th Grade)`
            ).join(', ');
            
            const isWaitlist = applicationStatus === 'waitlist';
            
            // Template variables
            const templateVars = {
                parent_name: parentName,
                children_list: childrenList,
                total_children: totalChildren,
                application_id: insertedApplications[0].id,
                submitted_date: new Date(insertedApplications[0].submittedAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                parent_email: parentEmail.trim().toLowerCase()
            };
            
            // Get custom email body or use default
            const customEmailBody = isWaitlist ? settings.waitlist_email_body : settings.welcome_email_body;
            let emailHtml;
            
            if (customEmailBody && customEmailBody.trim()) {
                // Use custom email template
                emailHtml = replaceTemplateVars(customEmailBody, templateVars);
            } else {
                // Use default template
                emailHtml = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                line-height: 1.6;
                                color: #333;
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 20px;
                            }
                            .header {
                                background: linear-gradient(135deg, #2563eb, #3b82f6);
                                color: white;
                                padding: 30px;
                                border-radius: 12px 12px 0 0;
                                text-align: center;
                            }
                            .content {
                                background: #f9fafb;
                                padding: 30px;
                                border-radius: 0 0 12px 12px;
                            }
                            .info-box {
                                background: white;
                                border-left: 4px solid #2563eb;
                                padding: 20px;
                                margin: 20px 0;
                                border-radius: 8px;
                            }
                            .child-name {
                                color: #2563eb;
                                font-weight: bold;
                                font-size: 18px;
                            }
                            .next-steps {
                                background: #eff6ff;
                                border: 2px solid #3b82f6;
                                padding: 20px;
                                margin: 20px 0;
                                border-radius: 8px;
                            }
                            .next-steps h3 {
                                color: #1e40af;
                                margin-top: 0;
                            }
                            .next-steps ul {
                                margin: 10px 0;
                                padding-left: 20px;
                            }
                            .next-steps li {
                                margin: 8px 0;
                            }
                            .footer {
                                text-align: center;
                                padding: 20px;
                                color: #6b7280;
                                font-size: 14px;
                            }
                            .badge {
                                display: inline-block;
                                padding: 6px 12px;
                                background: #fbbf24;
                                color: #92400e;
                                border-radius: 6px;
                                font-weight: bold;
                                font-size: 14px;
                                margin: 10px 0;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>🎓 EdAI Accelerator</h1>
                            <p style="margin: 0; font-size: 18px;">${isWaitlist ? '2026 Waitlist Application Received' : 'Application Received!'}</p>
                        </div>
                        
                        <div class="content">
                            <p style="font-size: 16px;"><strong>Assalamu Alaikum ${parentName},</strong></p>
                            
                            <p>Jazakallahu Khairan for your interest in the EdAI Accelerator program! We have successfully received your application${totalChildren > 1 ? 's' : ''} for:</p>
                            
                            <div class="info-box">
                                <p class="child-name">${childrenList}</p>
                            </div>
                            
                            ${isWaitlist ? `
                                <div class="badge">⏰ 2026 Waitlist</div>
                                <p>Since the December 2025 cohort has closed, your application has been added to our 2026 waitlist. We will contact you early next year with program details, dates, and pricing, in shaa Allah.</p>
                            ` : `
                                <div class="next-steps">
                                    <h3>📋 What Happens Next?</h3>
                                    <ul>
                                        <li><strong>Review Period:</strong> Our team will carefully review ${totalChildren > 1 ? 'the applications' : 'the application'} within 3-5 business days</li>
                                        <li><strong>Interview Invitation:</strong> If selected, you'll receive an email with available interview times</li>
                                        <li><strong>Program Details:</strong> We'll share more information about the curriculum, schedule, and next steps</li>
                                    </ul>
                                </div>
                            `}
                            
                            <div class="info-box">
                                <p><strong>📧 Application ID:</strong> #${insertedApplications[0].id}</p>
                                <p><strong>📅 Submitted:</strong> ${new Date(insertedApplications[0].submittedAt).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</p>
                            </div>
                            
                            <p>If you have any questions in the meantime, please don't hesitate to reach out to us at <a href="mailto:contact@edaiaccelerator.com" style="color: #2563eb;">contact@edaiaccelerator.com</a></p>
                            
                            <p style="margin-top: 30px;">Jazakallahu Khairan,<br>
                            <strong>The EdAI Accelerator Team</strong></p>
                        </div>
                        
                        <div class="footer">
                            <p>© 2025 EdAI Accelerator | Empowering Muslim youth through product innovation</p>
                            <p style="font-size: 12px; color: #9ca3af;">This email was sent to ${parentEmail.trim().toLowerCase()} because you submitted an application to EdAI Accelerator.</p>
                        </div>
                    </body>
                    </html>
                `;
            }
            
            await resend.emails.send({
                from: settings.email_from_address || 'EdAI Accelerator <noreply@edaiaccelerator.com>',
                to: parentEmail.trim().toLowerCase(),
                subject: replaceTemplateVars(
                    isWaitlist ? settings.waitlist_email_subject : settings.welcome_email_subject,
                    templateVars
                ),
                html: emailHtml
            });
            
            console.log(`Welcome email sent to ${parentEmail}`);
        } catch (emailError) {
            // Log error but don't fail the application submission
            console.error('Failed to send welcome email:', emailError);
        }

        // Return success response
        res.status(200).json({
            success: true,
            message: `Application${totalChildren > 1 ? 's' : ''} submitted successfully for ${totalChildren} child${totalChildren > 1 ? 'ren' : ''}!`,
            data: {
                totalApplications: insertedApplications.length,
                applications: insertedApplications,
                parentEmail: parentEmail.trim().toLowerCase(),
                totalChildren: totalChildren
            }
        });

    } catch (error) {
        console.error('Database error:', error);
        
        // Check if it's a constraint violation
        if (error.code === '23514') {
            const constraint = error.constraint || '';
            const constraintMap = {
                applications_teen_age_check: 'Child age must be between 10 and 18',
                applications_teen_grade_check: 'Child grade must be between 5 and 12',
                must_agree_terms: 'Must agree to eligibility requirements',
                valid_email: 'Invalid email format',
                valid_phone: 'Invalid phone number format'
            };
            const friendly = constraintMap[constraint] || 'Invalid data format or constraints violation';
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: [friendly]
            });
        }

        // Generic error response
        res.status(500).json({
            success: false,
            error: 'Internal server error. Please try again later.'
        });
    }
});

// API endpoint to run database migrations (admin only - call once after deployment)
app.post('/api/migrate-database', async (req, res) => {
    try {
        // Add interview scheduling and pipeline fields
        await pool.query(`
            ALTER TABLE applications
            ADD COLUMN IF NOT EXISTS interview_status VARCHAR(50) DEFAULT 'not_scheduled',
            ADD COLUMN IF NOT EXISTS proposed_interview_times TEXT,
            ADD COLUMN IF NOT EXISTS confirmed_interview_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS interview_notes TEXT,
            ADD COLUMN IF NOT EXISTS parent_response TEXT,
            ADD COLUMN IF NOT EXISTS parent_response_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS interview_link TEXT,
            ADD COLUMN IF NOT EXISTS interview_meeting_link TEXT,
            ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
            ADD COLUMN IF NOT EXISTS program_start_date DATE,
            ADD COLUMN IF NOT EXISTS decision_date TIMESTAMP;
        `);
        
        // Create programs table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS programs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                program_type VARCHAR(100),
                description TEXT,
                start_date DATE,
                end_date DATE,
                schedule_info TEXT,
                status VARCHAR(50) DEFAULT 'upcoming',
                max_students INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        // Create enrolled_students table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS enrolled_students (
                id SERIAL PRIMARY KEY,
                program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
                application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
                student_name VARCHAR(255) NOT NULL,
                student_age INTEGER,
                student_grade INTEGER,
                parent_name VARCHAR(255) NOT NULL,
                parent_email VARCHAR(255) NOT NULL,
                parent_phone VARCHAR(50),
                enrollment_date DATE DEFAULT CURRENT_DATE,
                enrollment_source VARCHAR(50) DEFAULT 'manual',
                status VARCHAR(50) DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
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
            ('openai_api_key', ''),
            ('email_from_address', 'EdAI Accelerator <noreply@edaiaccelerator.com>'),
            ('welcome_email_subject', 'Application Received - Thank You! | EdAI Accelerator'),
            ('welcome_email_body', ''),
            ('waitlist_email_subject', 'Application Received - 2026 Waitlist | EdAI Accelerator'),
            ('waitlist_email_body', ''),
            ('interview_invite_subject', 'Interview Invitation for {{student_name}} - EdAI Accelerator'),
            ('interview_invite_body', ''),
            ('interview_confirmed_subject', 'Interview Confirmed for {{student_name}} - EdAI Accelerator'),
            ('interview_confirmed_body', ''),
            ('acceptance_email_subject', 'Congratulations! You''re Accepted to EdAI Accelerator'),
            ('acceptance_email_body', ''),
            ('rejection_email_subject', 'Update on Your EdAI Accelerator Application'),
            ('rejection_email_body', '')
            ON CONFLICT (setting_key) DO NOTHING;
        `);
        
        res.status(200).json({
            success: true,
            message: 'Database migration completed successfully'
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to get all settings
app.get('/api/get-settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT setting_key, setting_value FROM settings ORDER BY setting_key');
        
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        
        res.status(200).json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load settings'
        });
    }
});

// API endpoint to update settings
app.post('/api/update-settings', async (req, res) => {
    try {
        console.log('=== UPDATE SETTINGS REQUEST ===');
        const { settings } = req.body;
        console.log('Settings to update:', Object.keys(settings));
        
        // Use UPSERT (INSERT ON CONFLICT UPDATE) to ensure settings are saved even if row doesn't exist
        for (const [key, value] of Object.entries(settings)) {
            console.log(`Upserting ${key}: ${value ? (value.substring(0, 20) + '...') : 'empty'}`);
            
            const result = await pool.query(
                `INSERT INTO settings (setting_key, setting_value, updated_at) 
                 VALUES ($1, $2, NOW()) 
                 ON CONFLICT (setting_key) 
                 DO UPDATE SET setting_value = $2, updated_at = NOW()
                 RETURNING setting_key, setting_value`,
                [key, value]
            );
            
            console.log(`✓ Upserted ${key}:`, result.rows[0] ? 'success' : 'no rows returned');
        }
        
        // Verify the save by reading back
        const verification = await pool.query(
            'SELECT setting_key, setting_value FROM settings WHERE setting_key = $1',
            ['openai_api_key']
        );
        console.log('OpenAI key verification after save:', {
            found: verification.rows.length > 0,
            valueLength: verification.rows[0]?.setting_value?.length || 0,
            valuePrefix: verification.rows[0]?.setting_value?.substring(0, 7) || 'none'
        });
        
        res.status(200).json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        console.error('Error details:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to update settings: ' + error.message
        });
    }
});

// API endpoint to get all applications
app.get('/api/get-applications', async (req, res) => {
    try {
        const result = await pool.query(`
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
                submitted_at,
                interview_status,
                proposed_interview_times,
                confirmed_interview_date,
                interview_notes,
                parent_response,
                parent_response_date,
                interview_link,
                interview_meeting_link,
                rejection_reason,
                program_start_date,
                decision_date
            FROM applications
            ORDER BY submitted_at DESC
        `);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            applications: result.rows
        });
    } catch (error) {
        console.error('Database error fetching applications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve applications. Please try again later.'
        });
    }
});

// API endpoint to improve email with AI
app.post('/api/improve-email-with-ai', async (req, res) => {
    try {
        console.log('=== AI IMPROVE EMAIL REQUEST ===');
        const { emailTemplate, userPrompt, emailType } = req.body;
        
        console.log('Request body received:', {
            emailTemplateLength: emailTemplate?.length || 0,
            userPromptLength: userPrompt?.length || 0,
            emailType
        });
        
        if (!emailTemplate || !userPrompt) {
            console.error('Missing required fields');
            return res.status(400).json({
                success: false,
                error: 'Email template and user prompt are required'
            });
        }
        
        // Get OpenAI API key from settings
        const settings = await getSettings();
        const apiKey = settings.openai_api_key || process.env.OPENAI_API_KEY;
        
        console.log('API key check:', {
            hasApiKeyInSettings: !!settings.openai_api_key,
            hasApiKeyInEnv: !!process.env.OPENAI_API_KEY,
            apiKeyPrefix: apiKey ? apiKey.substring(0, 7) : 'none'
        });
        
        if (!apiKey) {
            console.error('No OpenAI API key found');
            return res.status(400).json({
                success: false,
                error: 'OpenAI API key not configured. Please add it in settings.'
            });
        }
        
        if (!apiKey.startsWith('sk-')) {
            console.error('Invalid OpenAI API key format');
            return res.status(400).json({
                success: false,
                error: 'Invalid OpenAI API key format. Key should start with "sk-"'
            });
        }
        
        console.log('Initializing OpenAI client...');
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey });
        
        const systemPrompt = `You are an expert email copywriter specializing in educational programs for Muslim youth. 
Your task is to improve HTML email templates while:
1. Maintaining all {{template_variables}} exactly as they are
2. Keeping the HTML structure and styling intact
3. Using professional, warm, and Islamic-friendly language
4. Including Islamic greetings (Assalamu Alaikum, Jazakallahu Khairan, in shaa Allah)
5. Making the email clear, concise, and engaging

Email Type: ${emailType === 'waitlist' ? 'Waitlist notification for 2026 cohort' : 'Welcome email for accepted applicants'}`;
        
        console.log('Calling OpenAI API...');
        console.log('System prompt length:', systemPrompt.length);
        console.log('User prompt length:', userPrompt.length);
        console.log('Template length:', emailTemplate.length);
        
        // Create a promise with timeout
        const timeoutMs = 30000; // 30 seconds timeout
        const startTime = Date.now();
        
        const completionPromise = openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Current email template:\n${emailTemplate}\n\nImprovement instructions: ${userPrompt}\n\nIMPORTANT: Return ONLY the improved HTML code. Do NOT wrap it in markdown code blocks or backticks.` }
            ],
            temperature: 0.7,
            max_tokens: 4096  // Increased from 2000 to allow full email templates
        });
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OpenAI API request timed out after 30 seconds')), timeoutMs);
        });
        
        console.log('Waiting for OpenAI response (30s timeout)...');
        const completion = await Promise.race([completionPromise, timeoutPromise]);
        
        const elapsedTime = Date.now() - startTime;
        console.log(`OpenAI API responded in ${elapsedTime}ms (${(elapsedTime/1000).toFixed(2)}s)`);
        
        console.log('OpenAI API response received successfully');
        console.log('Response choices:', completion.choices?.length || 0);
        
        if (!completion.choices || completion.choices.length === 0) {
            throw new Error('No response from OpenAI API');
        }
        
        let improvedTemplate = completion.choices[0].message.content;
        console.log('Raw improved template length:', improvedTemplate.length);
        
        // Strip markdown code blocks if present
        improvedTemplate = improvedTemplate.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
        console.log('Cleaned improved template length:', improvedTemplate.length);
        
        res.status(200).json({
            success: true,
            improvedTemplate: improvedTemplate
        });
        
    } catch (error) {
        console.error('=== AI IMPROVEMENT ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // Check for specific OpenAI errors
        let errorMessage = error.message || 'Failed to improve email with AI';
        
        if (error.status === 401) {
            errorMessage = 'Invalid OpenAI API key. Please check your API key in settings.';
        } else if (error.status === 429) {
            errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
        } else if (error.status === 500) {
            errorMessage = 'OpenAI API error. Please try again later.';
        }
        
        res.status(error.status || 500).json({
            success: false,
            error: errorMessage
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API endpoint to send interview invitation
app.post('/api/send-interview-invite', async (req, res) => {
    try {
        const { applicantId, proposedTimes, message } = req.body;
        
        // Get applicant details
        const applicant = await pool.query(
            'SELECT * FROM applications WHERE id = $1',
            [applicantId]
        );
        
        if (applicant.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Applicant not found'
            });
        }
        
        const app = applicant.rows[0];
        
        // Generate unique confirmation link
        const confirmationToken = Buffer.from(`${applicantId}-${Date.now()}`).toString('base64');
        const confirmationLink = `${req.protocol}://${req.get('host')}/interview-confirm?token=${confirmationToken}`;
        
        // Update database with proposed times and link
        await pool.query(`
            UPDATE applications 
            SET interview_status = 'pending',
                proposed_interview_times = $1,
                interview_link = $2
            WHERE id = $3
        `, [JSON.stringify(proposedTimes), confirmationToken, applicantId]);
        
        // Get settings for email
        const settings = await getSettings();
        
        console.log('=== INTERVIEW INVITE EMAIL DEBUG ===');
        console.log('Resend API key available:', !!settings.resend_api_key);
        console.log('Resend API key prefix:', settings.resend_api_key ? settings.resend_api_key.substring(0, 7) : 'none');
        console.log('Parent email:', app.parent_email);
        console.log('Student name:', app.teen_name);
        
        // Send email using Resend
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        const emailHtml = `
            <h2>Interview Invitation - EdAI Accelerator</h2>
            <p>Assalamu Alaikum ${app.parent_name},</p>
            <p>We're excited to move forward with ${app.teen_name}'s application to the EdAI Accelerator program!</p>
            
            ${message ? `<p><em>${message}</em></p>` : ''}
            
            <h3>Proposed Interview Times:</h3>
            <ul>
                ${proposedTimes.map(time => `<li>${new Date(time).toLocaleString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: 'numeric', 
                    minute: '2-digit', 
                    timeZoneName: 'short' 
                })}</li>`).join('')}
            </ul>
            
            <p><strong>Please click the link below to confirm one of these times or request an alternative:</strong></p>
            <p><a href="${confirmationLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirm Interview Time</a></p>
            
            <p>If you have any questions, please don't hesitate to reach out to us.</p>
            
            <p>Jazakallahu Khairan,<br>
            EdAI Accelerator Team</p>
        `;
        
        console.log('Attempting to send email via Resend...');
        const emailResult = await resend.emails.send({
            from: settings.email_from_address || 'EdAI Accelerator <noreply@edaiaccelerator.com>',
            to: app.parent_email,
            subject: `Interview Invitation for ${app.teen_name} - EdAI Accelerator`,
            html: emailHtml
        });
        
        console.log('Email sent successfully:', emailResult);
        console.log('Email ID:', emailResult.id);
        
        res.status(200).json({
            success: true,
            message: 'Interview invitation sent successfully',
            emailId: emailResult.id
        });
        
    } catch (error) {
        console.error('Error sending interview invite:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send invitation'
        });
    }
});

// API endpoint to get interview details for confirmation page
app.get('/api/get-interview-details', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }
        
        // Get applicant by interview link token
        const result = await pool.query(
            'SELECT * FROM applications WHERE interview_link = $1',
            [token]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invalid or expired confirmation link'
            });
        }
        
        const applicant = result.rows[0];
        const proposedTimes = JSON.parse(applicant.proposed_interview_times || '[]');
        
        res.status(200).json({
            success: true,
            applicant: {
                parent_name: applicant.parent_name,
                teen_name: applicant.teen_name,
                teen_grade: applicant.teen_grade
            },
            proposedTimes
        });
        
    } catch (error) {
        console.error('Error getting interview details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load interview details'
        });
    }
});

// API endpoint to confirm interview or request alternative
app.post('/api/confirm-interview', async (req, res) => {
    try {
        const { token, confirmedTime, alternativeTimes, responseType } = req.body;
        
        // Get applicant by token
        const result = await pool.query(
            'SELECT * FROM applications WHERE interview_link = $1',
            [token]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Invalid confirmation link'
            });
        }
        
        const applicant = result.rows[0];
        
        if (responseType === 'confirmed') {
            // Generate unique Jitsi meeting link
            const meetingId = `edai-interview-${applicant.id}-${Date.now()}`;
            const jitsiLink = `https://meet.jit.si/${meetingId}`;
            
            // Parent confirmed one of the proposed times
            await pool.query(`
                UPDATE applications 
                SET interview_status = 'confirmed',
                    confirmed_interview_date = $1,
                    parent_response = 'Confirmed',
                    parent_response_date = NOW(),
                    interview_meeting_link = $3
                WHERE id = $2
            `, [confirmedTime, applicant.id, jitsiLink]);
            
            // Get settings for email
            const settings = await getSettings();
            
            // Send confirmation email to parent
            const { Resend } = require('resend');
            const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
            
            await resend.emails.send({
                from: settings.email_from_address || 'EdAI Accelerator <noreply@edaiaccelerator.com>',
                to: applicant.parent_email,
                subject: `Interview Confirmed for ${applicant.teen_name} - EdAI Accelerator`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                        <style>
                            body {
                                font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
                                line-height: 1.6;
                                max-width: 600px;
                                margin: 0 auto;
                                padding: 20px;
                            }
                            .header {
                                background: linear-gradient(135deg, #10b981, #34d399);
                                color: white;
                                padding: 30px;
                                border-radius: 12px 12px 0 0;
                                text-align: center;
                            }
                            .content {
                                background: #f9fafb;
                                padding: 30px;
                                border-radius: 0 0 12px 12px;
                            }
                            .meeting-box {
                                background: white;
                                border: 3px solid #10b981;
                                padding: 20px;
                                border-radius: 12px;
                                margin: 20px 0;
                                text-align: center;
                            }
                            .meeting-link {
                                display: inline-block;
                                padding: 15px 30px;
                                background: linear-gradient(135deg, #2563eb, #3b82f6);
                                color: white;
                                text-decoration: none;
                                border-radius: 8px;
                                font-weight: bold;
                                font-size: 16px;
                                margin-top: 10px;
                            }
                            .info-box {
                                background: #dbeafe;
                                border-left: 4px solid #2563eb;
                                padding: 15px;
                                margin: 15px 0;
                                border-radius: 8px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1 style="margin: 0; font-size: 2rem;">✅ Interview Confirmed!</h1>
                        </div>
                        <div class="content">
                            <p style="font-size: 16px;"><strong>Assalamu Alaikum ${applicant.parent_name},</strong></p>
                            <p>Jazakallahu Khairan! Your interview time for <strong>${applicant.teen_name}</strong> has been confirmed.</p>
                            
                            <div class="info-box">
                                <p style="margin: 0;"><strong>📅 Date & Time:</strong></p>
                                <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold; color: #1e40af;">
                                    ${new Date(confirmedTime).toLocaleString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        timeZoneName: 'short'
                                    })}
                                </p>
                            </div>
                            
                            <div class="meeting-box">
                                <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #1f2937;">🎥 Join Your Interview</p>
                                <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">Click the button below at your scheduled time:</p>
                                <a href="${jitsiLink}" class="meeting-link">Join Video Interview</a>
                                <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">
                                    Meeting Link: <a href="${jitsiLink}" style="color: #2563eb;">${jitsiLink}</a>
                                </p>
                            </div>
                            
                            <div class="info-box">
                                <p style="margin: 0;"><strong>💡 Tips for Your Interview:</strong></p>
                                <ul style="margin: 10px 0 0 20px; padding: 0;">
                                    <li>Test your camera and microphone beforehand</li>
                                    <li>Find a quiet space with good lighting</li>
                                    <li>Join 5 minutes early</li>
                                    <li>Have a pen and paper ready for notes</li>
                                </ul>
                            </div>
                            
                            <p>If you need to reschedule, please contact us at <a href="mailto:contact@edaiaccelerator.com" style="color: #2563eb;">contact@edaiaccelerator.com</a> as soon as possible.</p>
                            
                            <p style="margin-top: 30px;">We look forward to meeting you, in shaa Allah!</p>
                            <p style="margin-top: 20px;">Jazakallahu Khairan,<br><strong>The EdAI Accelerator Team</strong></p>
                        </div>
                    </body>
                    </html>
                `
            });
            
        } else if (responseType === 'alternative') {
            // Parent requested alternative times
            await pool.query(`
                UPDATE applications 
                SET parent_response = $1,
                    parent_response_date = NOW()
                WHERE id = $2
            `, [alternativeTimes, applicant.id]);
            
            // Get settings for email
            const settings = await getSettings();
            
            // Notify admin via email
            const { Resend } = require('resend');
            const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
            
            await resend.emails.send({
                from: settings.email_from_address || 'EdAI Accelerator <noreply@edaiaccelerator.com>',
                to: 'contact@edaiaccelerator.com',
                subject: `Alternative Interview Times Requested - ${applicant.teen_name}`,
                html: `
                    <h2>Alternative Interview Times Requested</h2>
                    <p><strong>Student:</strong> ${applicant.teen_name}</p>
                    <p><strong>Parent:</strong> ${applicant.parent_name} (${applicant.parent_email})</p>
                    <h3>Parent's Response:</h3>
                    <p>${alternativeTimes}</p>
                    <p>Please review and send new proposed times via the admin dashboard.</p>
                `
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Response recorded successfully'
        });
        
    } catch (error) {
        console.error('Error confirming interview:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process response'
        });
    }
});

// API endpoint to update interview status
app.post('/api/update-interview-status', async (req, res) => {
    try {
        const { applicantId, status } = req.body;
        
        await pool.query(
            'UPDATE applications SET interview_status = $1 WHERE id = $2',
            [status, applicantId]
        );
        
        res.status(200).json({
            success: true,
            message: 'Interview status updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating interview status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update status'
        });
    }
});

// API endpoint to save interview meeting link
app.post('/api/save-meeting-link', async (req, res) => {
    try {
        const { applicantId, meetingLink } = req.body;
        
        if (!applicantId || !meetingLink) {
            return res.status(400).json({
                success: false,
                error: 'Applicant ID and meeting link are required'
            });
        }
        
        await pool.query(
            'UPDATE applications SET interview_meeting_link = $1 WHERE id = $2',
            [meetingLink, applicantId]
        );
        
        res.status(200).json({
            success: true,
            message: 'Meeting link saved successfully'
        });
        
    } catch (error) {
        console.error('Error saving meeting link:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save meeting link'
        });
    }
});

// API endpoint to save interview notes
app.post('/api/save-interview-notes', async (req, res) => {
    try {
        const { applicantId, notes } = req.body;
        
        if (!applicantId || !notes) {
            return res.status(400).json({
                success: false,
                error: 'Applicant ID and notes are required'
            });
        }
        
        await pool.query(
            'UPDATE applications SET interview_notes = $1, application_status = $2 WHERE id = $3',
            [notes, 'interview_completed', applicantId]
        );
        
        res.status(200).json({
            success: true,
            message: 'Interview notes saved successfully'
        });
        
    } catch (error) {
        console.error('Error saving interview notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save interview notes'
        });
    }
});

// API endpoint to accept applicant
app.post('/api/accept-applicant', async (req, res) => {
    try {
        const { applicantId, programStartDate } = req.body;
        
        if (!applicantId || !programStartDate) {
            return res.status(400).json({
                success: false,
                error: 'Applicant ID and program start date are required'
            });
        }
        
        // Get applicant details
        const result = await pool.query(
            'SELECT * FROM applications WHERE id = $1',
            [applicantId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Applicant not found'
            });
        }
        
        const applicant = result.rows[0];
        
        // Update database
        await pool.query(
            'UPDATE applications SET application_status = $1, program_start_date = $2, decision_date = NOW() WHERE id = $3',
            ['accepted', programStartDate, applicantId]
        );
        
        // Get settings for email template
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        // Template variables
        const templateVars = {
            parent_name: applicant.parent_name,
            student_name: applicant.teen_name,
            program_start_date: new Date(programStartDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };
        
        // Default acceptance email template
        const defaultAcceptanceEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
                        line-height: 1.6;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #10b981, #34d399);
                        color: white;
                        padding: 40px 30px;
                        border-radius: 12px 12px 0 0;
                        text-align: center;
                    }
                    .content {
                        background: #f9fafb;
                        padding: 30px;
                        border-radius: 0 0 12px 12px;
                    }
                    .highlight {
                        background: #d1fae5;
                        border-left: 4px solid #10b981;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin: 0; font-size: 2rem;">🎉 Congratulations!</h1>
                    <p style="margin: 10px 0 0 0; font-size: 1.2rem;">You're Accepted to EdAI Accelerator</p>
                </div>
                <div class="content">
                    <p style="font-size: 16px;"><strong>Assalamu Alaikum {{parent_name}},</strong></p>
                    <p>We are thrilled to inform you that <strong>{{student_name}}</strong> has been accepted into the EdAI Accelerator program!</p>
                    <div class="highlight">
                        <p style="margin: 0;"><strong>📅 Program Start Date:</strong> {{program_start_date}}</p>
                    </div>
                    <h3>What Happens Next?</h3>
                    <ul>
                        <li>You will receive detailed program information via email within 48 hours</li>
                        <li>Program schedule, curriculum, and logistics</li>
                        <li>Payment information and instructions</li>
                        <li>Required materials and preparation</li>
                    </ul>
                    <p>If you have any questions, please contact us at contact@edaiaccelerator.com</p>
                    <p style="margin-top: 30px;">Jazakallahu Khairan,<br><strong>The EdAI Accelerator Team</strong></p>
                </div>
            </body>
            </html>
        `;
        
        // Use custom template or default
        let emailHtml = settings.acceptance_email_body || defaultAcceptanceEmail;
        emailHtml = replaceTemplateVars(emailHtml, templateVars);
        
        // Send acceptance email
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI Accelerator <noreply@edaiaccelerator.com>',
            to: applicant.parent_email,
            subject: replaceTemplateVars(
                settings.acceptance_email_subject || 'Congratulations! You\'re Accepted to EdAI Accelerator',
                templateVars
            ),
            html: emailHtml
        });
        
        res.status(200).json({
            success: true,
            message: 'Applicant accepted and email sent successfully'
        });
        
    } catch (error) {
        console.error('Error accepting applicant:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to accept applicant: ' + error.message
        });
    }
});

// API endpoint to reject applicant
app.post('/api/reject-applicant', async (req, res) => {
    try {
        const { applicantId, rejectionReason } = req.body;
        
        if (!applicantId || !rejectionReason) {
            return res.status(400).json({
                success: false,
                error: 'Applicant ID and rejection reason are required'
            });
        }
        
        // Get applicant details
        const result = await pool.query(
            'SELECT * FROM applications WHERE id = $1',
            [applicantId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Applicant not found'
            });
        }
        
        const applicant = result.rows[0];
        
        // Update database
        await pool.query(
            'UPDATE applications SET application_status = $1, rejection_reason = $2, decision_date = NOW() WHERE id = $3',
            ['rejected', rejectionReason, applicantId]
        );
        
        // Get settings for email template
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        // Template variables
        const templateVars = {
            parent_name: applicant.parent_name,
            student_name: applicant.teen_name,
            rejection_reason: rejectionReason
        };
        
        // Default rejection email template
        const defaultRejectionEmail = `
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
                        line-height: 1.6;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #2563eb, #3b82f6);
                        color: white;
                        padding: 30px;
                        border-radius: 12px 12px 0 0;
                        text-align: center;
                    }
                    .content {
                        background: #f9fafb;
                        padding: 30px;
                        border-radius: 0 0 12px 12px;
                    }
                    .info-box {
                        background: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin: 0;">📝 Update on Your Application</h1>
                    <p style="margin: 10px 0 0 0;">EdAI Accelerator</p>
                </div>
                <div class="content">
                    <p style="font-size: 16px;"><strong>Assalamu Alaikum {{parent_name}},</strong></p>
                    <p>Thank you for your interest in the EdAI Accelerator program for <strong>{{student_name}}</strong>.</p>
                    <p>After careful review of all applications, we regret to inform you that we are unable to offer a spot in this cohort.</p>
                    <div class="info-box">
                        <p style="margin: 0;"><strong>Feedback:</strong></p>
                        <p style="margin: 10px 0 0 0;">{{rejection_reason}}</p>
                    </div>
                    <p>We encourage you to apply again in the future. Many successful applicants have applied multiple times as they developed their skills and experience.</p>
                    <p>If you have any questions, please contact us at contact@edaiaccelerator.com</p>
                    <p style="margin-top: 30px;">Jazakallahu Khairan,<br><strong>The EdAI Accelerator Team</strong></p>
                </div>
            </body>
            </html>
        `;
        
        // Use custom template or default
        let emailHtml = settings.rejection_email_body || defaultRejectionEmail;
        emailHtml = replaceTemplateVars(emailHtml, templateVars);
        
        // Send rejection email
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI Accelerator <noreply@edaiaccelerator.com>',
            to: applicant.parent_email,
            subject: replaceTemplateVars(
                settings.rejection_email_subject || 'Update on Your EdAI Accelerator Application',
                templateVars
            ),
            html: emailHtml
        });
        
        res.status(200).json({
            success: true,
            message: 'Applicant rejected and email sent successfully'
        });
        
    } catch (error) {
        console.error('Error rejecting applicant:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject applicant: ' + error.message
        });
    }
});

// ============= PROGRAMS MANAGEMENT API ENDPOINTS =============

// API endpoint to create a new program
app.post('/api/create-program', async (req, res) => {
    try {
        const {
            name,
            programType,
            description,
            startDate,
            endDate,
            scheduleInfo,
            maxStudents
        } = req.body;
        
        // Validation
        if (!name || !programType || !startDate) {
            return res.status(400).json({
                success: false,
                error: 'Program name, type, and start date are required'
            });
        }
        
        const result = await pool.query(`
            INSERT INTO programs (
                name,
                program_type,
                description,
                start_date,
                end_date,
                schedule_info,
                max_students,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            name,
            programType,
            description,
            startDate,
            endDate,
            scheduleInfo,
            maxStudents,
            new Date(startDate) > new Date() ? 'upcoming' : 'active'
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Program created successfully',
            program: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating program:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create program: ' + error.message
        });
    }
});

// API endpoint to get all programs
app.get('/api/get-programs', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM programs
            ORDER BY created_at DESC
        `);
        
        res.status(200).json({
            success: true,
            count: result.rows.length,
            programs: result.rows
        });
        
    } catch (error) {
        console.error('Error getting programs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve programs'
        });
    }
});

// API endpoint to get a single program by ID
app.get('/api/get-program/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM programs WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Program not found'
            });
        }
        
        res.status(200).json({
            success: true,
            program: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error getting program:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve program'
        });
    }
});

// API endpoint to update a program
app.put('/api/update-program/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            programType,
            description,
            startDate,
            endDate,
            scheduleInfo,
            maxStudents,
            status
        } = req.body;
        
        const result = await pool.query(`
            UPDATE programs
            SET name = $1,
                program_type = $2,
                description = $3,
                start_date = $4,
                end_date = $5,
                schedule_info = $6,
                max_students = $7,
                status = $8,
                updated_at = NOW()
            WHERE id = $9
            RETURNING *
        `, [
            name,
            programType,
            description,
            startDate,
            endDate,
            scheduleInfo,
            maxStudents,
            status,
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Program not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Program updated successfully',
            program: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating program:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update program: ' + error.message
        });
    }
});

// API endpoint to delete a program
app.delete('/api/delete-program/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM programs WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Program not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Program deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting program:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete program: ' + error.message
        });
    }
});

// ============= STUDENT ENROLLMENT API ENDPOINTS =============

// API endpoint to enroll a student manually
app.post('/api/enroll-student', async (req, res) => {
    try {
        const {
            programId,
            studentName,
            studentAge,
            studentGrade,
            parentName,
            parentEmail,
            parentPhone,
            notes
        } = req.body;
        
        // Validation
        if (!programId || !studentName || !parentName || !parentEmail) {
            return res.status(400).json({
                success: false,
                error: 'Program ID, student name, parent name, and parent email are required'
            });
        }
        
        const result = await pool.query(`
            INSERT INTO enrolled_students (
                program_id,
                student_name,
                student_age,
                student_grade,
                parent_name,
                parent_email,
                parent_phone,
                enrollment_source,
                notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            programId,
            studentName,
            studentAge,
            studentGrade,
            parentName,
            parentEmail,
            parentPhone,
            'manual',
            notes
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Student enrolled successfully',
            student: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error enrolling student:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to enroll student: ' + error.message
        });
    }
});

// API endpoint to enroll student from application
app.post('/api/enroll-from-application', async (req, res) => {
    try {
        const { applicationId, programId } = req.body;
        
        if (!applicationId || !programId) {
            return res.status(400).json({
                success: false,
                error: 'Application ID and Program ID are required'
            });
        }
        
        // Get application details
        const appResult = await pool.query(
            'SELECT * FROM applications WHERE id = $1',
            [applicationId]
        );
        
        if (appResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }
        
        const app = appResult.rows[0];
        
        // Check if already enrolled
        const existingResult = await pool.query(
            'SELECT * FROM enrolled_students WHERE application_id = $1 AND program_id = $2',
            [applicationId, programId]
        );
        
        if (existingResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Student is already enrolled in this program'
            });
        }
        
        // Enroll student
        const result = await pool.query(`
            INSERT INTO enrolled_students (
                program_id,
                application_id,
                student_name,
                student_age,
                student_grade,
                parent_name,
                parent_email,
                parent_phone,
                enrollment_source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            programId,
            applicationId,
            app.teen_name,
            app.teen_age,
            app.teen_grade,
            app.parent_name,
            app.parent_email,
            app.parent_phone,
            'application'
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Student enrolled successfully',
            student: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error enrolling from application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to enroll student: ' + error.message
        });
    }
});

// API endpoint to get all enrolled students
app.get('/api/get-enrolled-students', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT es.*, p.name as program_name, p.program_type
            FROM enrolled_students es
            JOIN programs p ON es.program_id = p.id
            ORDER BY es.created_at DESC
        `);
        
        res.status(200).json({
            success: true,
            count: result.rows.length,
            students: result.rows
        });
        
    } catch (error) {
        console.error('Error getting enrolled students:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve enrolled students'
        });
    }
});

// API endpoint to get students for a specific program
app.get('/api/get-program-students/:programId', async (req, res) => {
    try {
        const { programId } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM enrolled_students
            WHERE program_id = $1
            ORDER BY student_name ASC
        `, [programId]);
        
        res.status(200).json({
            success: true,
            count: result.rows.length,
            students: result.rows
        });
        
    } catch (error) {
        console.error('Error getting program students:', error);
        
        // Check if it's a missing table error
        if (error.message && error.message.includes('relation "enrolled_students" does not exist')) {
            // Table doesn't exist yet - return empty array
            return res.status(200).json({
                success: true,
                count: 0,
                students: [],
                message: 'No students enrolled yet. Run database migration if needed.'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve students: ' + error.message
        });
    }
});

// API endpoint to update student
app.put('/api/update-student/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            studentName,
            studentAge,
            studentGrade,
            parentName,
            parentEmail,
            parentPhone,
            status,
            notes
        } = req.body;
        
        const result = await pool.query(`
            UPDATE enrolled_students
            SET student_name = $1,
                student_age = $2,
                student_grade = $3,
                parent_name = $4,
                parent_email = $5,
                parent_phone = $6,
                status = $7,
                notes = $8,
                updated_at = NOW()
            WHERE id = $9
            RETURNING *
        `, [
            studentName,
            studentAge,
            studentGrade,
            parentName,
            parentEmail,
            parentPhone,
            status,
            notes,
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Student updated successfully',
            student: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update student: ' + error.message
        });
    }
});

// API endpoint to remove student from program
app.delete('/api/remove-student/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM enrolled_students WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Student removed from program successfully'
        });
        
    } catch (error) {
        console.error('Error removing student:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove student: ' + error.message
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`EdAI Accelerator server running on port ${port}`);
});

module.exports = app;
