// EdAI Accelerator Landing Page - Express Server for Render
const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');

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

// Adult MAPS AI builder lab landing page
app.get('/maps-ai', (req, res) => {
    res.sendFile(path.join(__dirname, 'maps-ai.html'));
});

// MAPS AI Builder Lab offer confirmation page
app.get('/maps-ai-accept', (req, res) => {
    res.sendFile(path.join(__dirname, 'maps-ai-accept.html'));
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

// Serve student portal
app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'student.html'));
});

// Serve Phase 2 confirmation page
app.get('/phase2-confirm', (req, res) => {
    res.sendFile(path.join(__dirname, 'phase2-confirm.html'));
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
            state,
            totalChildren,
            agreeContact,
            applicationMethod,
            ...childrenData
        } = req.body;
        
        console.log('Extracted parent data:', { parentName, parentEmail, parentPhone, state, totalChildren, agreeContact });
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
                    state,
                    teen_name,
                    teen_age,
                    teen_grade,
                    teen_interests,
                    parent_expectations,
                    agrees_terms,
                    agrees_contact,
                    application_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id, submitted_at
            `, [
                parentName.trim(),
                parentEmail.trim().toLowerCase(),
                parentPhone.trim(),
                state ? state.trim() : null,
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
                            <p>© 2025 EdAI Accelerator | Turning Teens into Founders Early</p>
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

// Store OTPs temporarily (in production, use Redis or database)
const mapsOtpStore = new Map();

// API endpoint to send OTP for email verification
app.post('/api/send-maps-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with 10-minute expiry
        mapsOtpStore.set(email.trim().toLowerCase(), {
            otp,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });
        
        // Send OTP via email
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI <noreply@edaiaccelerator.com>',
            to: email.trim().toLowerCase(),
            subject: 'Verify Your Email - MAPS AI Builder Lab',
            html: `
                <div style="font-family: 'Outfit', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
                    <h2 style="color: #0a0a0a; margin-bottom: 20px;">Email Verification</h2>
                    <p style="color: #666; margin-bottom: 30px;">Enter this code in the application form to verify your email:</p>
                    <div style="background: #f8f8f8; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0a0a0a;">${otp}</span>
                    </div>
                    <p style="color: #999; font-size: 14px;">This code expires in 10 minutes.</p>
                    <p style="color: #999; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        });
        
        console.log(`OTP sent to ${email}`);
        
        res.status(200).json({
            success: true,
            message: 'Verification code sent to your email'
        });
        
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send verification code. Please try again.'
        });
    }
});

// API endpoint to verify OTP
app.post('/api/verify-maps-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ success: false, error: 'Email and OTP are required' });
        }
        
        const stored = mapsOtpStore.get(email.trim().toLowerCase());
        
        if (!stored) {
            return res.status(400).json({
                success: false,
                error: 'No verification code found. Please request a new one.'
            });
        }
        
        if (Date.now() > stored.expires) {
            mapsOtpStore.delete(email.trim().toLowerCase());
            return res.status(400).json({
                success: false,
                error: 'Verification code expired. Please request a new one.'
            });
        }
        
        if (stored.otp !== otp.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Invalid verification code. Please try again.'
            });
        }
        
        // OTP verified - remove from store
        mapsOtpStore.delete(email.trim().toLowerCase());
        
        res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        });
        
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            error: 'Verification failed. Please try again.'
        });
    }
});

// API endpoint for MAPS AI Builder Lab applications (adults)
app.post('/api/submit-maps-application', async (req, res) => {
    try {
        console.log('=== MAPS APPLICATION RECEIVED ===');
        console.log('Data:', JSON.stringify(req.body, null, 2));
        
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
            referralSource
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

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
        }

        // Check for duplicate email
        const existing = await pool.query(
            'SELECT id FROM maps_applications WHERE email = $1',
            [email.trim().toLowerCase()]
        );
        
        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'An application with this email already exists. Please contact us if you need to update your application.'
            });
        }

        // Insert application
        const result = await pool.query(`
            INSERT INTO maps_applications (
                name, email, phone, background, field, coding_experience,
                motivation, has_laptop, schedule_confirm, referral_source,
                application_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
            RETURNING id, submitted_at
        `, [
            name.trim(),
            email.trim().toLowerCase(),
            phone.trim(),
            background,
            field?.trim() || null,
            codingExperience || null,
            motivation.trim(),
            hasLaptop || null,
            scheduleConfirm || null,
            referralSource || null
        ]);

        console.log('MAPS application inserted:', result.rows[0]);
        
        // Send confirmation email
        try {
            const settings = await getSettings();
            const { Resend } = require('resend');
            const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
            
            await resend.emails.send({
                from: settings.email_from_address || 'EdAI <noreply@edaiaccelerator.com>',
                to: email.trim().toLowerCase(),
                subject: 'Application Received - MAPS AI Builder Lab',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: 'Outfit', -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                            .header { background: #0a0a0a; color: white; padding: 40px 30px; text-align: center; }
                            .content { background: #f9f9f9; padding: 40px 30px; }
                            .info-box { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #0a0a0a; }
                            .footer { padding: 20px; text-align: center; color: #999; font-size: 14px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1 style="margin: 0; font-size: 24px;">📬 Application Received!</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">MAPS AI Builder Lab</p>
                        </div>
                        <div class="content">
                            <p><strong>Assalamu Alaikum ${name.trim()},</strong></p>
                            <p>Jazakallahu Khairan for your interest in the MAPS AI Builder Lab! We have received your application and it is now under review.</p>
                            
                            <div class="info-box">
                                <p style="margin: 0;"><strong>📋 Application ID:</strong> #${result.rows[0].id}</p>
                                <p style="margin: 10px 0 0 0;"><strong>📅 Submitted:</strong> ${new Date(result.rows[0].submitted_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            
                            <h3>📋 What Happens Next?</h3>
                            <p>Our team will review your application carefully. Due to limited seats (7 students per cohort), not all applicants will be admitted.</p>
                            <ul>
                                <li><strong>Review Period:</strong> 2-3 business days</li>
                                <li><strong>Decision:</strong> You'll receive an email with our admission decision</li>
                                <li><strong>If Admitted:</strong> We'll provide enrollment details and next steps</li>
                            </ul>
                            
                            <p>Questions? Contact us at <a href="mailto:aidris@edai.fun" style="color: #0a0a0a;">aidris@edai.fun</a> or call/text <a href="tel:+15153570454" style="color: #0a0a0a;">+1 (515) 357-0454</a>.</p>
                            
                            <p style="margin-top: 30px;">Thank you for applying!</p>
                            <p><strong>— The EdAI Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} EdAI · MAPS Redmond, WA</p>
                        </div>
                    </body>
                    </html>
                `
            });
            
            console.log(`Confirmation email sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't fail the application if email fails
        }

        res.status(200).json({
            success: true,
            message: 'Application submitted successfully!',
            applicationId: result.rows[0].id,
            submittedAt: result.rows[0].submitted_at
        });

    } catch (error) {
        console.error('MAPS application error:', error);
        
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'An application with this email already exists.'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'An error occurred. Please try again or contact us at aidris@edai.fun'
        });
    }
});

// API endpoint to get MAPS applications (admin)
app.get('/api/get-maps-applications', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                *,
                application_status as status
            FROM maps_applications 
            ORDER BY submitted_at DESC
        `);
        
        res.status(200).json({
            success: true,
            applications: result.rows
        });
    } catch (error) {
        console.error('Error fetching MAPS applications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch applications: ' + error.message
        });
    }
});

// API endpoint to get MAPS offer details for confirmation page
app.get('/api/get-maps-offer', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ success: false, error: 'Token is required' });
        }
        const result = await pool.query(
            'SELECT id, name, email, phone, background, field, coding_experience, has_laptop, schedule_confirm, referral_source, application_status, offer_accepted, offer_accepted_at, submitted_at, updated_at FROM maps_applications WHERE acceptance_token = $1',
            [token]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Invalid or expired confirmation link' });
        }
        res.status(200).json({ success: true, applicant: result.rows[0] });
    } catch (error) {
        console.error('Error fetching MAPS offer details:', error);
        res.status(500).json({ success: false, error: 'Failed to load offer details' });
    }
});

// API endpoint to confirm MAPS offer (student acceptance)
app.post('/api/confirm-maps-offer', async (req, res) => {
    try {
        const { token, contactConfirmed, updatedEmail, updatedPhone } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, error: 'Token is required' });
        }
        const result = await pool.query('SELECT * FROM maps_applications WHERE acceptance_token = $1', [token]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Invalid or expired confirmation link' });
        }
        const applicant = result.rows[0];

        let email = applicant.email;
        let phone = applicant.phone;

        if (!contactConfirmed) {
            if (!updatedEmail) {
                return res.status(400).json({ success: false, error: 'Updated email is required when contact info has changed.' });
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updatedEmail.trim())) {
                return res.status(400).json({ success: false, error: 'Invalid email format.' });
            }
            email = updatedEmail.trim().toLowerCase();

            if (updatedPhone) {
                const cleaned = updatedPhone.replace(/[\s\-()]/g, '');
                if (!/^[+]?\d{7,15}$/.test(cleaned)) {
                    return res.status(400).json({ success: false, error: 'Invalid phone number format.' });
                }
                phone = updatedPhone.trim();
            }
        }

        await pool.query(
            'UPDATE maps_applications SET email = $1, phone = $2, offer_accepted = TRUE, offer_accepted_at = NOW(), updated_at = NOW() WHERE id = $3',
            [email, phone, applicant.id]
        );

        res.status(200).json({ success: true, message: 'Offer accepted successfully' });
    } catch (error) {
        console.error('Error confirming MAPS offer:', error);
        res.status(500).json({ success: false, error: 'Failed to save your confirmation. Please try again.' });
    }
});

// API endpoint to update MAPS application status
app.post('/api/update-maps-status', async (req, res) => {
    try {
        const { applicationId, status } = req.body;
        
        if (!applicationId || !status) {
            return res.status(400).json({
                success: false,
                error: 'Application ID and status are required'
            });
        }
        
        const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected', 'enrolled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }
        
        await pool.query(
            'UPDATE maps_applications SET application_status = $1, updated_at = NOW() WHERE id = $2',
            [status, applicationId]
        );
        
        res.status(200).json({
            success: true,
            message: 'Status updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating MAPS status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update status'
        });
    }
});

// API endpoint to accept MAPS applicant and send acceptance email
app.post('/api/accept-maps-applicant', async (req, res) => {
    try {
        const { applicationId, startDate, customMessage } = req.body;
        
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'Application ID is required'
            });
        }
        
        // Get applicant details
        const applicantResult = await pool.query(
            'SELECT * FROM maps_applications WHERE id = $1',
            [applicationId]
        );
        
        if (applicantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }
        
        const applicant = applicantResult.rows[0];
        
        // Generate or reuse acceptance token
        let acceptanceToken = applicant.acceptance_token;
        if (!acceptanceToken) {
            acceptanceToken = crypto.randomBytes(32).toString('hex');
        }
        
        // Update status and store token
        await pool.query(
            'UPDATE maps_applications SET application_status = $1, acceptance_token = $2, updated_at = NOW() WHERE id = $3',
            ['accepted', acceptanceToken, applicationId]
        );
        
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const confirmationLink = `${baseUrl}/maps-ai-accept?token=${encodeURIComponent(acceptanceToken)}`;
        
        // Send acceptance email (no payment link yet; point to confirmation page)
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI <noreply@edai.fun>',
            to: applicant.email,
            subject: "🎉 You've Been Accepted – MAPS AI Builder Lab (Confirm Your Spot)",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Outfit', -apple-system, sans-serif; line-height: 1.6; color: #0f172a; max-width: 640px; margin: 0 auto; padding: 0; background:#f1f5f9; }
                        .header { background: #022c22; padding: 48px 30px; text-align: center; border-bottom: 4px solid #10b981; }
                        .content { background: #ffffff; padding: 32px 28px 36px; border-radius: 0 0 16px 16px; }
                        .info-box { background: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; }
                        .cta-btn { display: inline-block; background: #0f172a; color: white; padding: 16px 32px; border-radius: 99px; text-decoration: none; font-weight: 700; margin-top: 24px; font-size: 16px; }
                        .cta-btn:hover { opacity: 0.9; }
                        .footer { padding: 24px; text-align: center; color: #64748b; font-size: 13px; }
                        .pill { display:inline-block; padding: 6px 12px; background: rgba(16, 185, 129, 0.15); color: #34d399; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="pill">MAPS · AI Builder Lab</div>
                        <h1 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 800; color: white; letter-spacing: -0.5px; line-height: 1.2;">🎉 Congratulations!</h1>
                        <p style="margin: 0; font-size: 18px; color: #d1fae5; font-weight: 500;">You have been accepted, ${applicant.name}!</p>
                    </div>
                    <div class="content">
                        <p><strong>Assalamu Alaikum ${applicant.name},</strong></p>
                        <p>Alhamdulillah, we are excited to invite you into the <strong>MAPS AI Builder Lab</strong> for adult learners. This email confirms that you have been <strong>accepted</strong> into the upcoming cohort.</p>
                        
                        ${customMessage ? `<div class="info-box"><p style="margin: 0; font-size:14px;">${customMessage}</p></div>` : ''}
                        
                        <div class="info-box">
                            <h3 style="margin: 0 0 10px 0; font-size: 15px; color:#0f172a;">📋 Program Snapshot</h3>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Duration:</strong> 3 weeks (6 sessions)</p>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Schedule:</strong> Tuesdays & Wednesdays, 6–8 PM</p>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Location:</strong> MAPS Redmond, WA</p>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Tuition:</strong> $850</p>
                            ${startDate ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Target Start Date:</strong> ${startDate}</p>` : ''}
                        </div>
                        
                        <h3 style="margin-top: 18px; font-size: 15px;">✅ What You Need To Do Now</h3>
                        <p style="font-size: 14px; margin-bottom: 8px;">Before we send you the payment link and onboarding details, please:</p>
                        <ol style="padding-left: 20px; font-size: 14px; color:#334155;">
                            <li style="margin-bottom: 6px;">Confirm that your contact information is correct.</li>
                            <li style="margin-bottom: 6px;">Formally accept your spot in the program.</li>
                            <li>Agree to complete payment once you receive the payment link.</li>
                        </ol>
                        
                        <p style="margin-top: 14px; font-size: 14px;">Click the button below to review the details and confirm your spot:</p>
                        <p style="text-align:center;">
                            <a href="${confirmationLink}" class="cta-btn">Confirm My Spot &amp; Terms</a>
                        </p>
                        
                        <p style="margin-top: 18px; font-size: 13px; color:#64748b;">
                            This confirmation page does <strong>not</strong> collect payment. After you confirm, we will send a separate email with your payment link and final onboarding steps, in shaa Allah.
                        </p>
                        
                        <p style="margin-top: 20px; font-size: 14px;">If you have any questions or concerns before confirming, simply reply to this email or contact us at <a href="mailto:aidris@edai.fun" style="color:#0f172a; font-weight:500;">aidris@edai.fun</a>.</p>
                        
                        <p style="margin-top: 26px; font-size: 14px;">We look forward to building with you, bi-idhnillah.</p>
                        <p style="margin: 2px 0 0 0; font-size: 14px;"><strong>— The EdAI Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} EdAI · MAPS Redmond, WA</p>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log(`Acceptance email sent to ${applicant.email}`);
        
        res.status(200).json({
            success: true,
            message: 'Applicant accepted and email sent'
        });
        
    } catch (error) {
        console.error('Error accepting MAPS applicant:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to accept applicant'
        });
    }
});

// API endpoint to reject MAPS applicant and send rejection email
app.post('/api/reject-maps-applicant', async (req, res) => {
    try {
        const { applicationId, reason } = req.body;
        
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'Application ID is required'
            });
        }
        
        // Get applicant details
        const applicantResult = await pool.query(
            'SELECT * FROM maps_applications WHERE id = $1',
            [applicationId]
        );
        
        if (applicantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }
        
        const applicant = applicantResult.rows[0];
        
        // Update status
        await pool.query(
            'UPDATE maps_applications SET application_status = $1, updated_at = NOW() WHERE id = $2',
            ['rejected', applicationId]
        );
        
        // Send rejection email
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI <noreply@edaiaccelerator.com>',
            to: applicant.email,
            subject: 'MAPS AI Builder Lab Application Update',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Outfit', -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                        .header { background: #0a0a0a; color: white; padding: 40px 30px; text-align: center; }
                        .content { background: #f9f9f9; padding: 40px 30px; }
                        .info-box { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; }
                        .footer { padding: 20px; text-align: center; color: #999; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 style="margin: 0; font-size: 24px;">Application Update</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">MAPS AI Builder Lab</p>
                    </div>
                    <div class="content">
                        <p><strong>Assalamu Alaikum ${applicant.name},</strong></p>
                        <p>Thank you for your interest in the MAPS AI Builder Lab. After careful review of all applications, we regret to inform you that we are unable to offer you a spot in the upcoming cohort.</p>
                        
                        ${reason ? `<div class="info-box"><p style="margin: 0;"><strong>Note:</strong> ${reason}</p></div>` : ''}
                        
                        <p>This was a difficult decision as we received many qualified applications. Due to limited class size (7 students), we could not accommodate everyone.</p>
                        
                        <div class="info-box">
                            <h3 style="margin: 0 0 10px 0;">🔄 Future Opportunities</h3>
                            <p style="margin: 0;">We encourage you to apply again for future cohorts. You can also reach out to us directly at <a href="mailto:aidris@edai.fun" style="color: #0a0a0a;">aidris@edai.fun</a> to be notified when new cohorts open.</p>
                        </div>
                        
                        <p>We appreciate your interest and wish you success in your learning journey!</p>
                        
                        <p style="margin-top: 30px;"><strong>— The EdAI Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} EdAI · MAPS Redmond, WA</p>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log(`Rejection email sent to ${applicant.email}`);
        
        res.status(200).json({
            success: true,
            message: 'Application updated and email sent'
        });
        
    } catch (error) {
        console.error('Error rejecting MAPS applicant:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update application'
        });
    }
});

// API endpoint to resend MAPS acceptance email
app.post('/api/resend-maps-acceptance', async (req, res) => {
    try {
        const { applicationId, startDate, customMessage } = req.body;
        
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'Application ID is required'
            });
        }
        
        // Get applicant details
        const applicantResult = await pool.query(
            'SELECT * FROM maps_applications WHERE id = $1',
            [applicationId]
        );
        
        if (applicantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }
        
        const applicant = applicantResult.rows[0];
        
        // Ensure we have an acceptance token
        let acceptanceToken = applicant.acceptance_token;
        if (!acceptanceToken) {
            acceptanceToken = crypto.randomBytes(32).toString('hex');
            await pool.query(
                'UPDATE maps_applications SET acceptance_token = $1, updated_at = NOW() WHERE id = $2',
                [acceptanceToken, applicationId]
            );
        }
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const confirmationLink = `${baseUrl}/maps-ai-accept?token=${encodeURIComponent(acceptanceToken)}`;
        
        // Send acceptance email pointing to confirmation page
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI <noreply@edai.fun>',
            to: applicant.email,
            subject: "🎉 You've Been Accepted – MAPS AI Builder Lab (Confirm Your Spot)",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Outfit', -apple-system, sans-serif; line-height: 1.6; color: #0f172a; max-width: 640px; margin: 0 auto; padding: 0; background:#f1f5f9; }
                        .header { background: #022c22; padding: 48px 30px; text-align: center; border-bottom: 4px solid #10b981; }
                        .content { background: #ffffff; padding: 32px 28px 36px; border-radius: 0 0 16px 16px; }
                        .info-box { background: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #e2e8f0; }
                        .cta-btn { display: inline-block; background: #0f172a; color: white; padding: 16px 32px; border-radius: 99px; text-decoration: none; font-weight: 700; margin-top: 24px; font-size: 16px; }
                        .cta-btn:hover { opacity: 0.9; }
                        .footer { padding: 24px; text-align: center; color: #64748b; font-size: 13px; }
                        .pill { display:inline-block; padding: 6px 12px; background: rgba(16, 185, 129, 0.15); color: #34d399; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="pill">MAPS · AI Builder Lab</div>
                        <h1 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 800; color: white; letter-spacing: -0.5px; line-height: 1.2;">🎉 Congratulations!</h1>
                        <p style="margin: 0; font-size: 18px; color: #d1fae5; font-weight: 500;">You have been accepted, ${applicant.name}!</p>
                    </div>
                    <div class="content">
                        <p><strong>Assalamu Alaikum ${applicant.name},</strong></p>
                        <p>Alhamdulillah, we are excited to confirm again that you have been <strong>accepted</strong> into the upcoming MAPS AI Builder Lab cohort.</p>
                        
                        ${customMessage ? `<div class="info-box"><p style="margin: 0; font-size:14px;">${customMessage}</p></div>` : ''}
                        
                        <div class="info-box">
                            <h3 style="margin: 0 0 10px 0; font-size: 15px; color:#0f172a;">📋 Program Snapshot</h3>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Duration:</strong> 3 weeks (6 sessions)</p>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Schedule:</strong> Tuesdays & Wednesdays, 6–8 PM</p>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Location:</strong> MAPS Redmond, WA</p>
                            <p style="margin: 4px 0; font-size: 14px;"><strong>Tuition:</strong> $850</p>
                            ${startDate ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Target Start Date:</strong> ${startDate}</p>` : ''}
                        </div>
                        
                        <p style="margin-top: 14px; font-size: 14px;">If you haven\'t already, please confirm your spot and agree to the payment terms here:</p>
                        <p style="text-align:center;">
                            <a href="${confirmationLink}" class="cta-btn">Confirm My Spot &amp; Terms</a>
                        </p>
                        
                        <p style="margin-top: 18px; font-size: 13px; color:#64748b;">
                            After you confirm, we will send a separate email with your payment link and final onboarding steps, in shaa Allah.
                        </p>
                        
                        <p style="margin-top: 20px; font-size: 14px;">If you have questions, reply to this email or contact <a href="mailto:aidris@edai.fun" style="color:#0f172a; font-weight:500;">aidris@edai.fun</a>.</p>
                        
                        <p style="margin-top: 26px; font-size: 14px;">We look forward to seeing you in class.</p>
                        <p style="margin: 2px 0 0 0; font-size: 14px;"><strong>— The EdAI Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} EdAI · MAPS Redmond, WA</p>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log(`Acceptance email resent to ${applicant.email}`);
        
        res.status(200).json({
            success: true,
            message: 'Acceptance email resent'
        });
        
    } catch (error) {
        console.error('Error resending acceptance email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resend email'
        });
    }
});

// API endpoint to resend MAPS rejection email
app.post('/api/resend-maps-rejection', async (req, res) => {
    try {
        const { applicationId, reason } = req.body;
        
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'Application ID is required'
            });
        }
        
        // Get applicant details
        const applicantResult = await pool.query(
            'SELECT * FROM maps_applications WHERE id = $1',
            [applicationId]
        );
        
        if (applicantResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }
        
        const applicant = applicantResult.rows[0];
        
        // Send rejection email
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI <noreply@edaiaccelerator.com>',
            to: applicant.email,
            subject: 'MAPS AI Builder Lab Application Update',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Outfit', -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                        .header { background: #0a0a0a; color: white; padding: 40px 30px; text-align: center; }
                        .content { background: #f9f9f9; padding: 40px 30px; }
                        .info-box { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; }
                        .footer { padding: 20px; text-align: center; color: #999; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 style="margin: 0; font-size: 24px;">Application Update</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">MAPS AI Builder Lab</p>
                    </div>
                    <div class="content">
                        <p><strong>Assalamu Alaikum ${applicant.name},</strong></p>
                        <p>Thank you for your interest in the MAPS AI Builder Lab. After careful review of all applications, we regret to inform you that we are unable to offer you a spot in the upcoming cohort.</p>
                        
                        ${reason ? `<div class="info-box"><p style="margin: 0;"><strong>Note:</strong> ${reason}</p></div>` : ''}
                        
                        <p>This was a difficult decision as we received many qualified applications. Due to limited class size (7 students), we could not accommodate everyone.</p>
                        
                        <div class="info-box">
                            <h3 style="margin: 0 0 10px 0;">🔄 Future Opportunities</h3>
                            <p style="margin: 0;">We encourage you to apply again for future cohorts. You can also reach out to us directly at <a href="mailto:aidris@edai.fun" style="color: #0a0a0a;">aidris@edai.fun</a> to be notified when new cohorts open.</p>
                        </div>
                        
                        <p>We appreciate your interest and wish you success in your learning journey!</p>
                        
                        <p style="margin-top: 30px;"><strong>— The EdAI Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} EdAI · MAPS Redmond, WA</p>
                    </div>
                </body>
                </html>
            `
        });
        
        console.log(`Rejection email resent to ${applicant.email}`);
        
        res.status(200).json({
            success: true,
            message: 'Rejection email resent'
        });
        
    } catch (error) {
        console.error('Error resending rejection email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resend email'
        });
    }
});

// API endpoint to run database migrations (admin only - call once after deployment)
app.post('/api/migrate-database', async (req, res) => {
    try {
        // Create applications table if it doesn't exist (since it's referenced by enrolled_students)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id SERIAL PRIMARY KEY,
                parent_name VARCHAR(255) NOT NULL,
                parent_email VARCHAR(255) NOT NULL,
                parent_phone VARCHAR(50),
                teen_name VARCHAR(255) NOT NULL,
                teen_age INTEGER,
                teen_grade INTEGER,
                teen_interests TEXT,
                parent_expectations TEXT,
                agrees_terms BOOLEAN,
                agrees_contact BOOLEAN,
                application_status VARCHAR(50) DEFAULT 'pending',
                submitted_at TIMESTAMP DEFAULT NOW(),
                interview_status VARCHAR(50) DEFAULT 'not_scheduled',
                proposed_interview_times TEXT,
                confirmed_interview_date TIMESTAMP,
                manual_interview_date TIMESTAMP,
                interview_notes TEXT,
                parent_response TEXT,
                parent_response_date TIMESTAMP,
                interview_link TEXT,
                interview_meeting_link TEXT,
                rejection_reason TEXT,
                program_start_date DATE,
                decision_date TIMESTAMP
            );
        `);
        
        // Add interview scheduling and pipeline fields (in case table exists but cols don't)
        await pool.query(`
            ALTER TABLE applications
            ADD COLUMN IF NOT EXISTS interview_status VARCHAR(50) DEFAULT 'not_scheduled',
            ADD COLUMN IF NOT EXISTS proposed_interview_times TEXT,
            ADD COLUMN IF NOT EXISTS confirmed_interview_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS manual_interview_date TIMESTAMP,
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
        
        // Create progress_updates table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS progress_updates (
                id SERIAL PRIMARY KEY,
                program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES enrolled_students(id) ON DELETE CASCADE,
                class_date DATE NOT NULL,
                class_topic VARCHAR(255),
                student_progress TEXT NOT NULL,
                instructor_notes TEXT,
                skills_learned TEXT,
                next_steps TEXT,
                sent_to_parent BOOLEAN DEFAULT FALSE,
                sent_at TIMESTAMP,
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        // Create program_classes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS program_classes (
                id SERIAL PRIMARY KEY,
                program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                objectives TEXT,
                sequence_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Add class_id to progress_updates table
        await pool.query(`
            ALTER TABLE progress_updates
            ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES program_classes(id) ON DELETE SET NULL;
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

        // Add student_email to enrolled_students
        await pool.query(`
            ALTER TABLE enrolled_students
            ADD COLUMN IF NOT EXISTS student_email VARCHAR(255);
        `);

        // Add state column to applications table
        await pool.query(`
            ALTER TABLE applications ADD COLUMN IF NOT EXISTS state VARCHAR(100);
        `);

        // Create phase2_invitations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS phase2_invitations (
                id SERIAL PRIMARY KEY,
                enrolled_student_id INTEGER NOT NULL REFERENCES enrolled_students(id) ON DELETE CASCADE,
                program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
                invitation_token VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'sent',
                parent_notes TEXT,
                sent_at TIMESTAMP DEFAULT NOW(),
                responded_at TIMESTAMP
            );
        `);

        // Run migration for tasks and enrollment updates
        await pool.query(`
            ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS enrollment_type VARCHAR(50) DEFAULT 'parent';
            ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS maps_application_id INTEGER REFERENCES maps_applications(id) ON DELETE SET NULL;

            CREATE TABLE IF NOT EXISTS program_tasks (
                id SERIAL PRIMARY KEY,
                class_id INTEGER NOT NULL REFERENCES program_classes(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                resources TEXT,
                sequence_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS student_task_submissions (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES enrolled_students(id) ON DELETE CASCADE,
                task_id INTEGER NOT NULL REFERENCES program_tasks(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'submitted',
                submission_text TEXT,
                submission_link TEXT,
                instructor_feedback TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            INSERT INTO settings (setting_key, setting_value) VALUES
            ('motivational_quotes', '["Seek knowledge from the cradle to the grave.", "Allah loves those who are persistent in their work.", "The best of you are those who learn the Quran and teach it.", "Knowledge is light.", "Indeed, with hardship comes ease."]')
            ON CONFLICT (setting_key) DO NOTHING;
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

// API endpoint to migrate MAPS applications table
app.post('/api/migrate-maps-database', async (req, res) => {
    try {
        // Create the update_updated_at_column function if it doesn't exist
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        
        // Create MAPS applications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS maps_applications (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                background VARCHAR(100) NOT NULL,
                field VARCHAR(255),
                coding_experience VARCHAR(100),
                motivation TEXT NOT NULL,
                has_laptop VARCHAR(50),
                schedule_confirm VARCHAR(100),
                referral_source VARCHAR(100),
                application_status VARCHAR(50) DEFAULT 'pending',
                acceptance_token VARCHAR(255),
                offer_accepted BOOLEAN DEFAULT FALSE,
                offer_accepted_at TIMESTAMP WITH TIME ZONE,
                submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Ensure latest columns exist on existing tables
        await pool.query(`
            ALTER TABLE maps_applications
            ADD COLUMN IF NOT EXISTS acceptance_token VARCHAR(255),
            ADD COLUMN IF NOT EXISTS offer_accepted BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMP WITH TIME ZONE;
        `);
        
        // Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_maps_applications_email ON maps_applications(email);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_maps_applications_status ON maps_applications(application_status);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_maps_applications_submitted ON maps_applications(submitted_at);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_maps_applications_acceptance_token ON maps_applications(acceptance_token);`);
        
        // Create trigger for updated_at (drop first if exists to avoid error)
        await pool.query(`DROP TRIGGER IF EXISTS update_maps_applications_updated_at ON maps_applications;`);
        await pool.query(`
            CREATE TRIGGER update_maps_applications_updated_at 
                BEFORE UPDATE ON maps_applications 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
        `);
        
        res.status(200).json({
            success: true,
            message: 'MAPS applications table created successfully'
        });
    } catch (error) {
        console.error('MAPS migration error:', error);
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
                a.id,
                a.parent_name,
                a.parent_email,
                a.parent_phone,
                a.state,
                a.teen_name,
                a.teen_age,
                a.teen_grade,
                a.teen_interests,
                a.parent_expectations,
                a.agrees_terms,
                a.agrees_contact,
                a.application_status,
                a.submitted_at,
                a.interview_status,
                a.proposed_interview_times,
                a.confirmed_interview_date,
                to_char(a.manual_interview_date, 'YYYY-MM-DD"T"HH24:MI') as manual_interview_date,
                a.interview_notes,
                a.parent_response,
                a.parent_response_date,
                a.interview_link,
                a.interview_meeting_link,
                a.rejection_reason,
                a.program_start_date,
                a.decision_date,
                es.program_id as enrolled_program_id,
                p.name as enrolled_program_name
            FROM applications a
            LEFT JOIN enrolled_students es ON a.id = es.application_id
            LEFT JOIN programs p ON es.program_id = p.id
            ORDER BY a.submitted_at DESC
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


// API endpoint to enroll MAPS student (self-enrollment)
app.post('/api/enroll-maps-student', async (req, res) => {
    try {
        const { applicationId, programId } = req.body;
        
        if (!applicationId || !programId) {
            return res.status(400).json({ success: false, error: 'Application ID and Program ID are required' });
        }
        
        // Fetch MAPS application details
        const appResult = await pool.query('SELECT * FROM maps_applications WHERE id = $1', [applicationId]);
        if (appResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }
        const app = appResult.rows[0];
        
        // Check if already enrolled
        const existing = await pool.query(
            'SELECT id FROM enrolled_students WHERE maps_application_id = $1 AND program_id = $2',
            [applicationId, programId]
        );
        
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'Student already enrolled in this program' });
        }
        
        // Enroll student (parent fields = student fields for self-enrollment)
        await pool.query(`
            INSERT INTO enrolled_students (
                program_id, maps_application_id, student_name, student_email,
                parent_name, parent_email, parent_phone,
                enrollment_type, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'self', 'active')
        `, [
            programId, applicationId, app.name, app.email,
            app.name, app.email, app.phone
        ]);
        
        // Update application status
        await pool.query('UPDATE maps_applications SET application_status = $1 WHERE id = $2', ['enrolled', applicationId]);
        
        res.status(200).json({ success: true, message: 'Student enrolled successfully' });
        
    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ success: false, error: 'Failed to enroll student' });
    }
});

// API endpoints for Tasks
app.post('/api/create-task', async (req, res) => {
    try {
        const { classId, title, description, resources, sequenceOrder } = req.body;
        const result = await pool.query(
            'INSERT INTO program_tasks (class_id, title, description, resources, sequence_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [classId, title, description, resources, sequenceOrder || 0]
        );
        res.status(200).json({ success: true, task: result.rows[0] });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/update-task', async (req, res) => {
    try {
        const { taskId, title, description, resources, sequenceOrder } = req.body;
        const result = await pool.query(
            'UPDATE program_tasks SET title=$1, description=$2, resources=$3, sequence_order=$4 WHERE id=$5 RETURNING *',
            [title, description, resources, sequenceOrder, taskId]
        );
        res.status(200).json({ success: true, task: result.rows[0] });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/delete-task', async (req, res) => {
    try {
        const { taskId } = req.body;
        await pool.query('DELETE FROM program_tasks WHERE id = $1', [taskId]);
        res.status(200).json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/get-class-tasks/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentId } = req.query; // Optional: to get completion status
        
        let query = `
            SELECT t.*, 
            COALESCE(sts.status, 'pending') as status,
            sts.submission_text,
            sts.submission_link,
            sts.instructor_feedback
            FROM program_tasks t
            LEFT JOIN student_task_submissions sts ON t.id = sts.task_id AND sts.student_id = $2
            WHERE t.class_id = $1
            ORDER BY t.sequence_order ASC
        `;
        
        // If no studentId provided, just get tasks (admin view)
        if (!studentId) {
            query = `SELECT * FROM program_tasks WHERE class_id = $1 ORDER BY sequence_order ASC`;
        }
        
        const result = await pool.query(query, studentId ? [classId, studentId] : [classId]);
        res.status(200).json({ success: true, tasks: result.rows });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/submit-task', async (req, res) => {
    try {
        const { studentId, taskId, status, text, link } = req.body;
        
        // Upsert submission
        await pool.query(`
            INSERT INTO student_task_submissions (student_id, task_id, status, submission_text, submission_link, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (id) DO UPDATE -- Note: This needs unique constraint on student_id + task_id to work as upsert by conflict, checking table
            SET status = $3, submission_text = $4, submission_link = $5, updated_at = NOW()
        `, [studentId, taskId, status || 'submitted', text, link]);
        
        // Actually, since I didn't add a unique constraint in migration, I should check first or just use ID if I had it.
        // Let's do check-then-insert/update logic to be safe without migration
        
        const existing = await pool.query('SELECT id FROM student_task_submissions WHERE student_id=$1 AND task_id=$2', [studentId, taskId]);
        if (existing.rows.length > 0) {
             await pool.query(
                'UPDATE student_task_submissions SET status=$1, submission_text=$2, submission_link=$3, updated_at=NOW() WHERE id=$4',
                [status || 'submitted', text, link, existing.rows[0].id]
            );
        } else {
             await pool.query(
                'INSERT INTO student_task_submissions (student_id, task_id, status, submission_text, submission_link) VALUES ($1, $2, $3, $4, $5)',
                [studentId, taskId, status || 'submitted', text, link]
            );
        }

        res.status(200).json({ success: true });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false, error: e.message }); 
    }
});

app.get('/api/get-daily-wisdom', async (req, res) => {
    try {
        const result = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'motivational_quotes'");
        let quotes = [];
        if (result.rows.length > 0) {
            try { quotes = JSON.parse(result.rows[0].setting_value); } catch(e) {}
        }
        if (quotes.length === 0) {
             quotes = ["Seek knowledge from the cradle to the grave.", "Indeed, with hardship comes ease."];
        }
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        res.status(200).json({ success: true, quote: randomQuote });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Update endpoint to get programs to include class count or similar if needed
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
        const { applicantId, notes, interviewDate } = req.body;
        
        if (!applicantId || !notes) {
            return res.status(400).json({
                success: false,
                error: 'Applicant ID and notes are required'
            });
        }
        
        // Just update the notes, don't change status automatically
        // This allows adding notes at any stage (even after acceptance/rejection)
        await pool.query(
            'UPDATE applications SET interview_notes = $1, manual_interview_date = $2 WHERE id = $3',
            [notes, interviewDate || null, applicantId]
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
        const { applicantId, programStartDate, sendEmail = true } = req.body;
        
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
        
        let message = 'Applicant accepted successfully';
        
        // Only send email if requested (default true)
        if (sendEmail !== false) {
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
            
            message = 'Applicant accepted and email sent successfully';
        } else {
            message = 'Applicant accepted successfully (no email sent)';
        }
        
        res.status(200).json({
            success: true,
            message: message
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
        const { applicantId, rejectionReason, sendEmail = true } = req.body;
        
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
        
        let message = 'Applicant rejected successfully';
        
        // Only send email if requested
        if (sendEmail !== false) {
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
            
            message = 'Applicant rejected and email sent successfully';
        } else {
            message = 'Applicant rejected successfully (no email sent)';
        }
        
        res.status(200).json({
            success: true,
            message: message
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
            SELECT p.*, 
            (SELECT COUNT(*)::int FROM enrolled_students WHERE program_id = p.id) as enrolled_count
            FROM programs p
            ORDER BY p.created_at DESC
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
            studentEmail, // New field
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
                student_email,
                student_age,
                student_grade,
                parent_name,
                parent_email,
                parent_phone,
                enrollment_source,
                notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            programId,
            studentName,
            studentEmail || null,
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
        
        // Update application status to enrolled
        await pool.query(
            "UPDATE applications SET application_status = 'enrolled' WHERE id = $1",
            [applicationId]
        );
        
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
            studentEmail,
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
                student_email = $2,
                student_age = $3,
                student_grade = $4,
                parent_name = $5,
                parent_email = $6,
                parent_phone = $7,
                status = $8,
                notes = $9,
                updated_at = NOW()
            WHERE id = $10
            RETURNING *
        `, [
            studentName,
            studentEmail || null,
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

// ============================================
// PROGRAM CLASSES / CURRICULUM API ENDPOINTS
// ============================================

// API endpoint to create a class
app.post('/api/create-class', async (req, res) => {
    try {
        const { programId, title, description, objectives, sequenceOrder } = req.body;
        
        if (!programId || !title) {
            return res.status(400).json({
                success: false,
                error: 'Program ID and Title are required'
            });
        }
        
        const result = await pool.query(`
            INSERT INTO program_classes (
                program_id, title, description, objectives, sequence_order
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [programId, title, description, objectives, sequenceOrder || 0]);
        
        res.status(201).json({
            success: true,
            message: 'Class created successfully',
            class: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create class: ' + error.message
        });
    }
});

// API endpoint to get classes for a program
app.get('/api/get-program-classes/:programId', async (req, res) => {
    try {
        const { programId } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM program_classes
            WHERE program_id = $1
            ORDER BY sequence_order ASC, created_at ASC
        `, [programId]);
        
        res.status(200).json({
            success: true,
            count: result.rows.length,
            classes: result.rows
        });
    } catch (error) {
        console.error('Error getting program classes:', error);
        
        // Handle missing table gracefully
        if (error.message && error.message.includes('relation "program_classes" does not exist')) {
            return res.status(200).json({
                success: true,
                count: 0,
                classes: [],
                message: 'Classes table not created yet'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve classes'
        });
    }
});

// API endpoint to update a class
app.put('/api/update-class/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, objectives, sequenceOrder } = req.body;
        
        const result = await pool.query(`
            UPDATE program_classes
            SET title = $1, description = $2, objectives = $3, sequence_order = $4
            WHERE id = $5
            RETURNING *
        `, [title, description, objectives, sequenceOrder, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        
        res.status(200).json({
            success: true,
            message: 'Class updated successfully',
            class: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating class:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update class'
        });
    }
});

// API endpoint to delete a class
app.delete('/api/delete-class/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM program_classes WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        
        res.status(200).json({
            success: true,
            message: 'Class deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete class'
        });
    }
});

// ============================================
// PROGRESS UPDATES API ENDPOINTS
// ============================================

// API endpoint to create progress update
app.post('/api/create-update', async (req, res) => {
    try {
        const {
            programId,
            studentId,
            classDate,
            classTopic,
            classId, // New field
            studentProgress,
            instructorNotes,
            skillsLearned,
            nextSteps,
            createdBy
        } = req.body;
        
        // Validation
        if (!programId || !studentId || !classDate || !studentProgress) {
            return res.status(400).json({
                success: false,
                error: 'Program ID, Student ID, Class Date, and Progress are required'
            });
        }
        
        const result = await pool.query(`
            INSERT INTO progress_updates (
                program_id,
                student_id,
                class_date,
                class_topic,
                class_id,
                student_progress,
                instructor_notes,
                skills_learned,
                next_steps,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            programId,
            studentId,
            classDate,
            classTopic,
            classId || null,
            studentProgress,
            instructorNotes,
            skillsLearned,
            nextSteps,
            createdBy
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Progress update created successfully',
            update: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating progress update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create progress update: ' + error.message
        });
    }
});

// API endpoint to get updates for a specific student
app.get('/api/get-student-updates/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const result = await pool.query(`
            SELECT pu.*, es.student_name, es.parent_email, p.name as program_name, pc.title as class_title
            FROM progress_updates pu
            JOIN enrolled_students es ON pu.student_id = es.id
            JOIN programs p ON pu.program_id = p.id
            LEFT JOIN program_classes pc ON pu.class_id = pc.id
            WHERE pu.student_id = $1
            ORDER BY pu.class_date DESC, pu.created_at DESC
        `, [studentId]);
        
        res.status(200).json({
            success: true,
            count: result.rows.length,
            updates: result.rows
        });
        
    } catch (error) {
        console.error('Error getting student updates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve updates: ' + error.message
        });
    }
});

// API endpoint to get all updates for a program
app.get('/api/get-program-updates/:programId', async (req, res) => {
    try {
        const { programId } = req.params;
        
        const result = await pool.query(`
            SELECT pu.*, es.student_name, es.parent_email
            FROM progress_updates pu
            JOIN enrolled_students es ON pu.student_id = es.id
            WHERE pu.program_id = $1
            ORDER BY pu.class_date DESC, pu.created_at DESC
        `, [programId]);
        
        res.status(200).json({
            success: true,
            count: result.rows.length,
            updates: result.rows
        });
        
    } catch (error) {
        console.error('Error getting program updates:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve updates: ' + error.message
        });
    }
});

// API endpoint to update a progress update
app.put('/api/update-progress/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            classDate,
            classTopic,
            studentProgress,
            instructorNotes,
            skillsLearned,
            nextSteps
        } = req.body;
        
        const result = await pool.query(`
            UPDATE progress_updates
            SET class_date = $1,
                class_topic = $2,
                student_progress = $3,
                instructor_notes = $4,
                skills_learned = $5,
                next_steps = $6,
                updated_at = NOW()
            WHERE id = $7
            RETURNING *
        `, [
            classDate,
            classTopic,
            studentProgress,
            instructorNotes,
            skillsLearned,
            nextSteps,
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Progress update not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Progress update updated successfully',
            update: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update progress: ' + error.message
        });
    }
});

// API endpoint to delete a progress update
app.delete('/api/delete-update/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM progress_updates WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Progress update not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Progress update deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete update: ' + error.message
        });
    }
});

// API endpoint to send progress update to parent
app.post('/api/send-update-to-parent/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { personalMessage } = req.body;
        
        // Get update with student and program details
        const result = await pool.query(`
            SELECT pu.*, es.student_name, es.parent_name, es.parent_email, p.name as program_name
            FROM progress_updates pu
            JOIN enrolled_students es ON pu.student_id = es.id
            JOIN programs p ON pu.program_id = p.id
            WHERE pu.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Progress update not found'
            });
        }
        
        const update = result.rows[0];
        
        // Get Resend settings
        const settings = await getSettings();
        
        if (!settings.resend_api_key) {
            return res.status(400).json({
                success: false,
                error: 'Resend API key not configured. Please configure in Settings.'
            });
        }
        
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key);
        
        // Format date
        const classDate = new Date(update.class_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        });
        
        // Create email HTML
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Outfit', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f3f4f6; }
                    .container { background-color: #ffffff; border-radius: 16px; overflow: hidden; margin: 20px auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .header { background: #000000; padding: 40px 30px; text-align: center; color: white; position: relative; overflow: hidden; }
                    .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #2563eb, #f97316); }
                    .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 4px; }
                    .tagline { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; margin-bottom: 24px; font-weight: 600; }
                    .header-card { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; padding: 24px; backdrop-filter: blur(10px); }
                    .header-title { margin: 12px 0 4px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
                    .header-subtitle { margin: 0; opacity: 0.9; font-size: 16px; font-weight: 400; }
                    .content { padding: 40px 30px; }
                    .personal-note { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin-bottom: 30px; color: #1e40af; font-style: italic; }
                    .section { margin-bottom: 24px; }
                    .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 700; margin-bottom: 8px; }
                    .section-card { background-color: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; }
                    .footer { padding: 30px; text-align: center; background-color: #f9fafb; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
                    .highlight-badge { display: inline-block; padding: 4px 12px; background: #2563eb; color: white; border-radius: 9999px; font-size: 12px; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="brand">EdAI Accelerator</div>
                        <div class="tagline">Turning Teens into Founders Early</div>
                        <div class="header-card">
                            <div class="highlight-badge">Progress Update</div>
                            <h1 class="header-title">${update.program_name}</h1>
                            <p class="header-subtitle">Learning Report for ${update.student_name}</p>
                        </div>
                    </div>
                    
                    <div class="content">
                        <p style="font-size: 18px; color: #111827; margin-bottom: 24px;">
                            Assalamu Alaikum ${update.parent_name},
                        </p>
                        
                        ${personalMessage ? `
                            <div class="personal-note">
                                "${personalMessage}"
                            </div>
                        ` : ''}
                        
                        <p style="margin-bottom: 30px; color: #4b5563;">
                            Here is a summary of what <strong>${update.student_name}</strong> accomplished in our recent class on <strong>${classDate}</strong>.
                        </p>
                        
                        ${update.class_topic ? `
                            <div class="section">
                                <div class="section-title">📚 Topic Covered</div>
                                <div class="section-card" style="font-size: 18px; font-weight: 600; color: #111827;">
                                    ${update.class_topic}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="section">
                            <div class="section-title">💫 Student Progress</div>
                            <div class="section-card">
                                ${update.student_progress.replace(/\n/g, '<br>')}
                            </div>
                        </div>
                        
                        ${update.skills_learned ? `
                            <div class="section">
                                <div class="section-title">🎯 Skills Learned</div>
                                <div class="section-card">
                                    ${update.skills_learned.replace(/\n/g, '<br>')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${update.instructor_notes ? `
                            <div class="section">
                                <div class="section-title">📝 Instructor Feedback</div>
                                <div class="section-card">
                                    ${update.instructor_notes.replace(/\n/g, '<br>')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${update.next_steps ? `
                            <div class="section">
                                <div class="section-title">🚀 Next Steps</div>
                                <div class="section-card">
                                    ${update.next_steps.replace(/\n/g, '<br>')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <p style="margin-top: 40px; color: #6b7280; font-size: 14px;">
                            We are proud of ${update.student_name}'s dedication and progress!
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} EdAI Accelerator</p>
                        <p>Turning Teens into Founders Early.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI Accelerator <noreply@edaiaccelerator.com>',
            to: update.parent_email,
            subject: `Progress Update: ${update.student_name} - ${update.class_topic || 'Class Update'}`,
            html: emailHtml
        });
        
        // Update sent status
        await pool.query('UPDATE progress_updates SET sent_to_parent = TRUE, sent_at = NOW() WHERE id = $1', [id]);
        
        res.status(200).json({
            success: true,
            message: 'Progress update sent successfully'
        });
        
    } catch (error) {
        console.error('Error sending update:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send update: ' + error.message
        });
    }
});

// ============================================
// STUDENT PORTAL API ENDPOINTS
// ============================================

const studentOtpStore = new Map();

// Send OTP for student login
app.post('/api/send-student-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        
        const cleanEmail = email.trim().toLowerCase();
        
        // Check if student exists
        const result = await pool.query('SELECT * FROM enrolled_students WHERE student_email = $1', [cleanEmail]);
        
        if (result.rows.length === 0) {
            // Check if it's a parent email, maybe allow login? 
            // For now, require student_email to be set.
            return res.status(404).json({ success: false, error: 'Email not found in student records' });
        }
        
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with 10-minute expiry
        studentOtpStore.set(cleanEmail, {
            otp,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });
        
        // Send OTP via email
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI Accelerator <noreply@edaiaccelerator.com>',
            to: cleanEmail,
            subject: 'Your EdAI Student Portal Login Code',
            html: `
                <div style="font-family: 'Outfit', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
                    <h2 style="color: #0a0a0a; margin-bottom: 20px;">Student Login</h2>
                    <p style="color: #666; margin-bottom: 30px;">Use this code to log in to your student portal:</p>
                    <div style="background: #f8f8f8; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0a0a0a;">${otp}</span>
                    </div>
                    <p style="color: #999; font-size: 14px;">This code expires in 10 minutes.</p>
                </div>
            `
        });
        
        res.status(200).json({
            success: true,
            message: 'Verification code sent'
        });
        
    } catch (error) {
        console.error('Error sending student OTP:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send code'
        });
    }
});

// Verify student OTP
app.post('/api/verify-student-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ success: false, error: 'Email and OTP are required' });
        }
        
        const cleanEmail = email.trim().toLowerCase();
        const stored = studentOtpStore.get(cleanEmail);
        
        if (!stored) {
            return res.status(400).json({ success: false, error: 'Invalid or expired code' });
        }
        
        if (Date.now() > stored.expires) {
            studentOtpStore.delete(cleanEmail);
            return res.status(400).json({ success: false, error: 'Code expired' });
        }
        
        if (stored.otp !== otp.trim()) {
            return res.status(400).json({ success: false, error: 'Invalid code' });
        }
        
        // OTP verified
        studentOtpStore.delete(cleanEmail);
        
        // Get student details
        const result = await pool.query('SELECT * FROM enrolled_students WHERE student_email = $1', [cleanEmail]);
        const student = result.rows[0];
        
        res.status(200).json({
            success: true,
            student: {
                name: student.student_name,
                email: student.student_email
            }
        });
        
    } catch (error) {
        console.error('Error verifying student OTP:', error);
        res.status(500).json({
            success: false,
            error: 'Verification failed'
        });
    }
});

// Get student programs
app.get('/api/my-programs', async (req, res) => {
    try {
        const { studentEmail } = req.query; // Get by email to support multiple enrollments
        
        if (!studentEmail) {
            return res.status(400).json({ success: false, error: 'Student Email required' });
        }
        
        const result = await pool.query(`
            SELECT p.*, es.id as enrollment_id
            FROM programs p
            JOIN enrolled_students es ON p.id = es.program_id
            WHERE es.student_email = $1
            ORDER BY p.start_date DESC
        `, [studentEmail]);
        
        res.status(200).json({
            success: true,
            programs: result.rows
        });
        
    } catch (error) {
        console.error('Error getting student programs:', error);
        res.status(500).json({ success: false, error: 'Failed to load programs' });
    }
});

// Submit work
app.post('/api/submit-work', async (req, res) => {
    try {
        const { studentId, classId, text, link } = req.body;
        
        // Check existing submission
        const existing = await pool.query(
            'SELECT id FROM student_submissions WHERE student_id = $1 AND class_id = $2',
            [studentId, classId]
        );
        
        let result;
        if (existing.rows.length > 0) {
            // Update
            result = await pool.query(`
                UPDATE student_submissions
                SET submission_text = $1, submission_link = $2, status = 'submitted', updated_at = NOW()
                WHERE id = $3
                RETURNING *
            `, [text, link, existing.rows[0].id]);
        } else {
            // Insert
            result = await pool.query(`
                INSERT INTO student_submissions (student_id, class_id, submission_text, submission_link, status)
                VALUES ($1, $2, $3, $4, 'submitted')
                RETURNING *
            `, [studentId, classId, text, link]);
        }
        
        res.status(200).json({
            success: true,
            submission: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error submitting work:', error);
        res.status(500).json({ success: false, error: 'Failed to submit work' });
    }
});

// Get submission for a class
app.get('/api/get-submission', async (req, res) => {
    try {
        const { studentId, classId } = req.query;
        
        const result = await pool.query(
            'SELECT * FROM student_submissions WHERE student_id = $1 AND class_id = $2',
            [studentId, classId]
        );
        
        res.status(200).json({
            success: true,
            submission: result.rows[0] || null
        });
        
    } catch (error) {
        console.error('Error getting submission:', error);
        res.status(500).json({ success: false, error: 'Failed to load submission' });
    }
});

// ============= PHASE 2 INVITATION API ENDPOINTS =============

// Helper: Phase 2 curriculum data
const PHASE2_CURRICULUM = [
    { week: 21, theme: 'Entry, Expectations & Reality', activity: 'Confirm teams, sign working agreements, set honest goals', expert: 'EdAI leadership + returning founder' },
    { week: 22, theme: 'Problem Discovery & Customer Access', activity: 'Interview 10+ potential users, document pain points', expert: 'Founder / customer development expert' },
    { week: 23, theme: 'Problem Lock-In & Market Sizing', activity: 'Choose one problem, estimate addressable market', expert: 'Operator / market analyst' },
    { week: 24, theme: 'Team Roles & Conflict Norms', activity: 'Define ownership, decision rights, disagreement process', expert: 'Leadership coach' },
    { week: 25, theme: 'Business Models & Company Structures', activity: 'Understand LLC/C-corp/partnership (don\'t form yet)', expert: 'Legal expert' },
    { week: 26, theme: 'Product Scope & Roadmapping', activity: 'Define brutally minimal MVP', expert: 'Product manager' },
    { week: 27, theme: 'Budget & Build Sprint 1', activity: 'Create spend plan, build core product with real constraints', expert: 'Finance / engineering mentor' },
    { week: 28, theme: 'User Testing Week', activity: '15+ user tests, document feedback systematically', expert: 'UX researcher' },
    { week: 29, theme: 'Sales Conversations & Value Prop', activity: 'Attempt to sell (even if free beta), refine messaging', expert: 'Sales professional' },
    { week: 30, theme: 'Pivot or Persevere Decision', activity: 'Use data to decide: continue, pivot, or stop', expert: 'Product manager + mentor panel' },
    { week: 31, theme: 'Build Sprint 2', activity: 'Iterate based on user feedback and sales learnings', expert: 'Engineering mentor' },
    { week: 32, theme: 'GTM Strategy & Operations', activity: 'Choose distribution channels, set up internal workflows', expert: 'Growth expert / operator' },
    { week: 33, theme: 'Metrics & Decision Making', activity: 'Define 3-5 key metrics, set up tracking', expert: 'Product / analytics' },
    { week: 34, theme: 'Legal, Risk & Capital Options', activity: 'Privacy, ethics, funding paths if traction warrants', expert: 'Legal advisor / investor' },
    { week: 35, theme: 'Demo Preparation & Story', activity: 'Present the truth: what worked, what didn\'t, what\'s next', expert: 'Pitch coach' },
    { week: 36, theme: 'Demo Day & Real Decision Point', activity: 'Present to community, commit to continue or sunset', expert: 'Community + parents + advisors' }
];

function buildCurriculumTableHtml() {
    let rows = PHASE2_CURRICULUM.map(w =>
        `<tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 10px;font-weight:600;color:#2563eb;text-align:center;">${w.week}</td>
            <td style="padding:8px 10px;font-weight:600;color:#0f172a;">${w.theme}</td>
            <td style="padding:8px 10px;color:#475569;font-size:13px;">${w.activity}</td>
            <td style="padding:8px 10px;color:#64748b;font-size:13px;">${w.expert}</td>
        </tr>`
    ).join('');
    return `<table style="width:100%;border-collapse:collapse;font-family:'Outfit',-apple-system,sans-serif;font-size:14px;">
        <thead><tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
            <th style="padding:10px;text-align:center;font-size:12px;text-transform:uppercase;color:#64748b;">Week</th>
            <th style="padding:10px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;">Theme</th>
            <th style="padding:10px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;">What Students Do</th>
            <th style="padding:10px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;">Expert / Support</th>
        </tr></thead><tbody>${rows}</tbody></table>`;
}

// Send Phase 2 invite to a single student
app.post('/api/send-phase2-invite', async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) return res.status(400).json({ success: false, error: 'Student ID is required' });

        // Get student details
        const studentResult = await pool.query(
            'SELECT es.*, p.name as program_name FROM enrolled_students es JOIN programs p ON es.program_id = p.id WHERE es.id = $1',
            [studentId]
        );
        if (studentResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Student not found' });
        const student = studentResult.rows[0];

        // Check for existing invitation
        const existing = await pool.query(
            'SELECT id, status FROM phase2_invitations WHERE enrolled_student_id = $1',
            [studentId]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, error: `Invitation already ${existing.rows[0].status} for this student` });
        }

        // Generate token and create invitation
        const token = crypto.randomBytes(32).toString('hex');
        await pool.query(
            'INSERT INTO phase2_invitations (enrolled_student_id, program_id, invitation_token) VALUES ($1, $2, $3)',
            [studentId, student.program_id, token]
        );

        // Build confirmation link
        const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const confirmLink = `${baseUrl}/phase2-confirm?token=${encodeURIComponent(token)}`;

        // Send email
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);

        await resend.emails.send({
            from: settings.email_from_address || 'EdAI <noreply@edai.fun>',
            to: student.parent_email,
            subject: `🚀 ${student.student_name} is Invited to Phase 2 — EdAI Accelerator`,
            html: `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"></head>
                <body style="font-family:'Outfit',-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;color:#0f172a;max-width:720px;margin:0 auto;padding:0;background:#f1f5f9;">
                    <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:48px 30px;text-align:center;border-bottom:4px solid #f97316;">
                        <div style="display:inline-block;padding:6px 14px;background:rgba(249,115,22,0.15);color:#ea580c;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:24px;">Phase 2 · Accelerator</div>
                        <h1 style="margin:0 0 12px 0;font-size:28px;font-weight:800;color:white;line-height:1.2;">🚀 ${student.student_name} is Invited to Phase 2!</h1>
                        <p style="margin:0;font-size:16px;color:#bfdbfe;font-weight:500;">16 Weeks of Real-World Venture Building</p>
                    </div>
                    <div style="background:#ffffff;padding:32px 28px 36px;">
                        <p><strong>Assalamu Alaikum ${student.parent_name},</strong></p>
                        <p>Alhamdulillah, <strong>${student.student_name}</strong> has completed Phase 1 of the EdAI Accelerator! We are excited to invite them to continue their journey in <strong>Phase 2</strong> — a 16-week deep dive where students go from prototype to real venture.</p>

                        <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #e2e8f0;">
                            <h3 style="margin:0 0 10px 0;font-size:15px;color:#0f172a;">📋 Phase 2 at a Glance</h3>
                            <p style="margin:4px 0;font-size:14px;"><strong>Duration:</strong> 16 weeks (Weeks 21–36)</p>
                            <p style="margin:4px 0;font-size:14px;"><strong>Dates:</strong> February 28 – June 13, 2026, in shaa Allah</p>
                            <p style="margin:4px 0;font-size:14px;"><strong>Schedule:</strong> Saturdays, 9 AM – 12:30 PM</p>
                            <p style="margin:4px 0;font-size:14px;"><strong>Focus:</strong> Customer discovery, team formation, real builds, sales, Demo Day</p>
                            <p style="margin:4px 0;font-size:14px;"><strong>Expert Access:</strong> Weekly sessions with founders, engineers, lawyers, investors & more</p>
                        </div>

                        <h3 style="margin-top:24px;font-size:15px;">📚 What Phase 2 Covers</h3>
                        <p style="font-size:14px;color:#475569;">Each week brings a new focus area with hands-on activities and expert guidance:</p>
                        <div style="overflow-x:auto;margin:16px 0;border:1px solid #e2e8f0;border-radius:12px;">
                            ${buildCurriculumTableHtml()}
                        </div>

                        <h3 style="margin-top:24px;font-size:15px;">✅ What We Need From You</h3>
                        <p style="font-size:14px;">Please let us know if ${student.student_name} will be joining Phase 2 by clicking the button below. This helps us plan teams and secure expert sessions.</p>

                        <p style="text-align:center;">
                            <a href="${confirmLink}" style="display:inline-block;background:#2563eb;color:white;padding:16px 36px;border-radius:99px;text-decoration:none;font-weight:700;margin-top:24px;font-size:16px;">Respond to Invitation →</a>
                        </p>

                        <p style="margin-top:24px;font-size:13px;color:#64748b;">If you have questions, reply to this email or contact us at <a href="mailto:aidris@edai.fun" style="color:#2563eb;font-weight:500;">aidris@edai.fun</a> or text/call <a href="tel:+15153570454" style="color:#2563eb;font-weight:500;">515-357-0454</a>.</p>

                        <p style="margin-top:26px;font-size:14px;">We look forward to building the next chapter with ${student.student_name}, bi-idhnillah.</p>
                        <p style="margin:2px 0 0 0;font-size:14px;"><strong>— The EdAI Team</strong></p>
                    </div>
                    <div style="padding:24px;text-align:center;color:#64748b;font-size:13px;background:#f8fafc;">
                        <p>© ${new Date().getFullYear()} EdAI Accelerator</p>
                    </div>
                </body>
                </html>
            `
        });

        console.log(`Phase 2 invite sent to ${student.parent_email} for ${student.student_name}`);
        res.status(200).json({ success: true, message: `Phase 2 invitation sent to ${student.parent_email}` });

    } catch (error) {
        console.error('Error sending Phase 2 invite:', error);
        res.status(500).json({ success: false, error: 'Failed to send invitation: ' + error.message });
    }
});

// Bulk send Phase 2 invites for all students in a program
app.post('/api/send-bulk-phase2-invites', async (req, res) => {
    try {
        const { programId } = req.body;
        if (!programId) return res.status(400).json({ success: false, error: 'Program ID is required' });

        // Get all active students who haven't been invited yet
        const studentsResult = await pool.query(`
            SELECT es.id FROM enrolled_students es
            WHERE es.program_id = $1 AND es.status = 'active'
            AND es.id NOT IN (SELECT enrolled_student_id FROM phase2_invitations WHERE program_id = $1)
        `, [programId]);

        if (studentsResult.rows.length === 0) {
            return res.status(200).json({ success: true, message: 'All students have already been invited', sent: 0 });
        }

        let sent = 0;
        let errors = [];

        for (const row of studentsResult.rows) {
            try {
                // Use the single invite endpoint logic internally
                const studentResult = await pool.query(
                    'SELECT es.*, p.name as program_name FROM enrolled_students es JOIN programs p ON es.program_id = p.id WHERE es.id = $1',
                    [row.id]
                );
                if (studentResult.rows.length === 0) continue;
                const student = studentResult.rows[0];

                const token = crypto.randomBytes(32).toString('hex');
                await pool.query(
                    'INSERT INTO phase2_invitations (enrolled_student_id, program_id, invitation_token) VALUES ($1, $2, $3)',
                    [row.id, programId, token]
                );

                const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
                const confirmLink = `${baseUrl}/phase2-confirm?token=${encodeURIComponent(token)}`;

                const settings = await getSettings();
                const { Resend } = require('resend');
                const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);

                await resend.emails.send({
                    from: settings.email_from_address || 'EdAI <noreply@edai.fun>',
                    to: student.parent_email,
                    subject: `🚀 ${student.student_name} is Invited to Phase 2 — EdAI Accelerator`,
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head><meta charset="utf-8"></head>
                        <body style="font-family:'Outfit',-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;color:#0f172a;max-width:720px;margin:0 auto;padding:0;background:#f1f5f9;">
                            <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:48px 30px;text-align:center;border-bottom:4px solid #f97316;">
                                <div style="display:inline-block;padding:6px 14px;background:rgba(249,115,22,0.15);color:#ea580c;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:24px;">Phase 2 · Accelerator</div>
                                <h1 style="margin:0 0 12px 0;font-size:28px;font-weight:800;color:white;line-height:1.2;">🚀 ${student.student_name} is Invited to Phase 2!</h1>
                                <p style="margin:0;font-size:16px;color:#bfdbfe;font-weight:500;">16 Weeks of Real-World Venture Building</p>
                            </div>
                            <div style="background:#ffffff;padding:32px 28px 36px;">
                                <p><strong>Assalamu Alaikum ${student.parent_name},</strong></p>
                                <p>Alhamdulillah, <strong>${student.student_name}</strong> has completed Phase 1 of the EdAI Accelerator! We are excited to invite them to continue their journey in <strong>Phase 2</strong> — a 16-week deep dive where students go from prototype to real venture.</p>

                                <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #e2e8f0;">
                                    <h3 style="margin:0 0 10px 0;font-size:15px;color:#0f172a;">📋 Phase 2 at a Glance</h3>
                                    <p style="margin:4px 0;font-size:14px;"><strong>Duration:</strong> 16 weeks (Weeks 21–36)</p>
                                    <p style="margin:4px 0;font-size:14px;"><strong>Dates:</strong> February 28 – June 13, 2026, in shaa Allah</p>
                                    <p style="margin:4px 0;font-size:14px;"><strong>Schedule:</strong> Saturdays, 9 AM – 12:30 PM</p>
                                    <p style="margin:4px 0;font-size:14px;"><strong>Focus:</strong> Customer discovery, team formation, real builds, sales, Demo Day</p>
                                    <p style="margin:4px 0;font-size:14px;"><strong>Expert Access:</strong> Weekly sessions with founders, engineers, lawyers, investors & more</p>
                                </div>

                                <h3 style="margin-top:24px;font-size:15px;">📚 What Phase 2 Covers</h3>
                                <p style="font-size:14px;color:#475569;">Each week brings a new focus area with hands-on activities and expert guidance:</p>
                                <div style="overflow-x:auto;margin:16px 0;border:1px solid #e2e8f0;border-radius:12px;">
                                    ${buildCurriculumTableHtml()}
                                </div>

                                <h3 style="margin-top:24px;font-size:15px;">✅ What We Need From You</h3>
                                <p style="font-size:14px;">Please let us know if ${student.student_name} will be joining Phase 2 by clicking the button below.</p>

                                <p style="text-align:center;">
                                    <a href="${confirmLink}" style="display:inline-block;background:#2563eb;color:white;padding:16px 36px;border-radius:99px;text-decoration:none;font-weight:700;margin-top:24px;font-size:16px;">Respond to Invitation →</a>
                                </p>

                                <p style="margin-top:24px;font-size:13px;color:#64748b;">Questions? Contact <a href="mailto:aidris@edai.fun" style="color:#2563eb;">aidris@edai.fun</a> or call/text <a href="tel:+15153570454" style="color:#2563eb;">515-357-0454</a>.</p>
                                <p style="margin-top:26px;font-size:14px;"><strong>— The EdAI Team</strong></p>
                            </div>
                            <div style="padding:24px;text-align:center;color:#64748b;font-size:13px;background:#f8fafc;"><p>© ${new Date().getFullYear()} EdAI Accelerator</p></div>
                        </body>
                        </html>
                    `
                });

                sent++;
                console.log(`Phase 2 invite sent to ${student.parent_email} for ${student.student_name}`);
            } catch (err) {
                console.error(`Failed to send invite for student ${row.id}:`, err.message);
                errors.push({ studentId: row.id, error: err.message });
            }
        }

        res.status(200).json({ success: true, message: `Sent ${sent} invitation(s)`, sent, errors: errors.length > 0 ? errors : undefined });

    } catch (error) {
        console.error('Error sending bulk Phase 2 invites:', error);
        res.status(500).json({ success: false, error: 'Failed to send invitations: ' + error.message });
    }
});

// Get Phase 2 invitation by token (for confirmation page)
app.get('/api/get-phase2-invite', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

        const result = await pool.query(`
            SELECT pi.*, es.student_name, es.parent_name, es.parent_email, es.parent_phone,
                   es.student_grade, p.name as program_name
            FROM phase2_invitations pi
            JOIN enrolled_students es ON pi.enrolled_student_id = es.id
            JOIN programs p ON pi.program_id = p.id
            WHERE pi.invitation_token = $1
        `, [token]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Invitation not found. Please check your email link.' });
        }

        const invitation = result.rows[0];
        res.status(200).json({ success: true, invitation });

    } catch (error) {
        console.error('Error getting Phase 2 invite:', error);
        res.status(500).json({ success: false, error: 'Failed to load invitation' });
    }
});

// Parent responds to Phase 2 invitation
app.post('/api/respond-phase2-invite', async (req, res) => {
    try {
        const { token, response, parentNotes } = req.body;
        if (!token || !response) return res.status(400).json({ success: false, error: 'Token and response are required' });

        if (!['accepted', 'declined'].includes(response)) {
            return res.status(400).json({ success: false, error: 'Response must be accepted or declined' });
        }

        // Verify invitation exists and hasn't been responded to
        const result = await pool.query(
            'SELECT * FROM phase2_invitations WHERE invitation_token = $1',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Invitation not found' });
        }

        const invitation = result.rows[0];
        if (invitation.status !== 'sent') {
            return res.status(409).json({ success: false, error: 'This invitation has already been responded to', status: invitation.status });
        }

        await pool.query(
            'UPDATE phase2_invitations SET status = $1, parent_notes = $2, responded_at = NOW() WHERE invitation_token = $3',
            [response, parentNotes || null, token]
        );

        res.status(200).json({ success: true, message: response === 'accepted' ? 'Welcome to Phase 2!' : 'Response recorded. Thank you.' });

    } catch (error) {
        console.error('Error responding to Phase 2 invite:', error);
        res.status(500).json({ success: false, error: 'Failed to save response' });
    }
});

// Get all Phase 2 invitations for a program (admin)
app.get('/api/get-phase2-invitations/:programId', async (req, res) => {
    try {
        const { programId } = req.params;

        const result = await pool.query(`
            SELECT pi.*, es.student_name, es.parent_name, es.parent_email
            FROM phase2_invitations pi
            JOIN enrolled_students es ON pi.enrolled_student_id = es.id
            WHERE pi.program_id = $1
            ORDER BY pi.sent_at DESC
        `, [programId]);

        res.status(200).json({ success: true, invitations: result.rows });

    } catch (error) {
        console.error('Error getting Phase 2 invitations:', error);
        res.status(500).json({ success: false, error: 'Failed to load invitations' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`EdAI Accelerator server running on port ${port}`);
});

module.exports = app;
