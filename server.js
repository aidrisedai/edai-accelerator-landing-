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

// Adult MAPS AI builder lab landing page
app.get('/maps-ai', (req, res) => {
    res.sendFile(path.join(__dirname, 'maps-ai.html'));
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
        
        // Update status
        await pool.query(
            'UPDATE maps_applications SET application_status = $1, updated_at = NOW() WHERE id = $2',
            ['accepted', applicationId]
        );
        
        // Send acceptance email
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI <noreply@edaiaccelerator.com>',
            to: applicant.email,
            subject: '🎉 Congratulations! You\'ve Been Accepted - MAPS AI Builder Lab',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Outfit', -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                        .header { background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 40px 30px; text-align: center; }
                        .content { background: #f9f9f9; padding: 40px 30px; }
                        .info-box { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #10b981; }
                        .cta-btn { display: inline-block; background: #0a0a0a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px; }
                        .footer { padding: 20px; text-align: center; color: #999; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px;">You've Been Accepted!</p>
                    </div>
                    <div class="content">
                        <p><strong>Assalamu Alaikum ${applicant.name},</strong></p>
                        <p>Alhamdulillah! We are thrilled to inform you that you have been <strong>accepted</strong> into the MAPS AI Builder Lab!</p>
                        
                        ${customMessage ? `<div class="info-box"><p style="margin: 0;">${customMessage}</p></div>` : ''}
                        
                        <div class="info-box">
                            <h3 style="margin: 0 0 15px 0; color: #10b981;">📋 Program Details</h3>
                            <p style="margin: 5px 0;"><strong>Duration:</strong> 3 weeks (6 sessions)</p>
                            <p style="margin: 5px 0;"><strong>Schedule:</strong> Tuesdays & Wednesdays, 6–8 PM</p>
                            <p style="margin: 5px 0;"><strong>Location:</strong> MAPS Redmond, WA</p>
                            <p style="margin: 5px 0;"><strong>Investment:</strong> $850</p>
                            ${startDate ? `<p style="margin: 5px 0;"><strong>Start Date:</strong> ${startDate}</p>` : ''}
                        </div>
                        
                        <h3>📝 Next Steps</h3>
                        <ol>
                            <li><strong>Make Payment:</strong> Complete your $850 payment to secure your spot</li>
                            <li><strong>Confirm:</strong> Reply to this email after payment to confirm enrollment</li>
                            <li><strong>Preparation:</strong> Make sure you have a laptop ready for class</li>
                        </ol>
                        
                        <div style="background: #10b981; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0;">
                            <p style="color: white; margin: 0 0 15px 0; font-size: 16px;"><strong>💳 Complete Your Payment</strong></p>
                            <a href="https://myvanco.io/VEI9M" style="display: inline-block; background: white; color: #10b981; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Pay $850 via MAPS Payment Portal</a>
                            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 13px;">Secure payment processed by MAPS Redmond</p>
                        </div>
                        
                        <p><strong>⚠️ Important:</strong> Spots are limited to 7 students. Please complete payment within 48 hours to secure your seat.</p>
                        
                        <p>Questions? Reply to this email or contact us at <a href="mailto:aidris@edai.fun" style="color: #10b981;">aidris@edai.fun</a> or call/text <a href="tel:+15153570454" style="color: #10b981;">+1 (515) 357-0454</a>.</p>
                        
                        <p style="margin-top: 30px;">We can't wait to start building with you!</p>
                        <p><strong>— The EdAI Team</strong></p>
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
        
        // Send acceptance email
        const settings = await getSettings();
        const { Resend } = require('resend');
        const resend = new Resend(settings.resend_api_key || process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: settings.email_from_address || 'EdAI <noreply@edaiaccelerator.com>',
            to: applicant.email,
            subject: '🎉 Congratulations! You\'ve Been Accepted - MAPS AI Builder Lab',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Outfit', -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                        .header { background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 40px 30px; text-align: center; }
                        .content { background: #f9f9f9; padding: 40px 30px; }
                        .info-box { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #10b981; }
                        .footer { padding: 20px; text-align: center; color: #999; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px;">You've Been Accepted!</p>
                    </div>
                    <div class="content">
                        <p><strong>Assalamu Alaikum ${applicant.name},</strong></p>
                        <p>Alhamdulillah! We are thrilled to inform you that you have been <strong>accepted</strong> into the MAPS AI Builder Lab!</p>
                        
                        ${customMessage ? `<div class="info-box"><p style="margin: 0;">${customMessage}</p></div>` : ''}
                        
                        <div class="info-box">
                            <h3 style="margin: 0 0 15px 0; color: #10b981;">📋 Program Details</h3>
                            <p style="margin: 5px 0;"><strong>Duration:</strong> 3 weeks (6 sessions)</p>
                            <p style="margin: 5px 0;"><strong>Schedule:</strong> Tuesdays & Wednesdays, 6–8 PM</p>
                            <p style="margin: 5px 0;"><strong>Location:</strong> MAPS Redmond, WA</p>
                            <p style="margin: 5px 0;"><strong>Investment:</strong> $850</p>
                            ${startDate ? `<p style="margin: 5px 0;"><strong>Start Date:</strong> ${startDate}</p>` : ''}
                        </div>
                        
                        <h3>📝 Next Steps</h3>
                        <ol>
                            <li><strong>Make Payment:</strong> Complete your $850 payment to secure your spot</li>
                            <li><strong>Confirm:</strong> Reply to this email after payment to confirm enrollment</li>
                            <li><strong>Preparation:</strong> Make sure you have a laptop ready for class</li>
                        </ol>
                        
                        <div style="background: #10b981; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0;">
                            <p style="color: white; margin: 0 0 15px 0; font-size: 16px;"><strong>💳 Complete Your Payment</strong></p>
                            <a href="https://myvanco.io/VEI9M" style="display: inline-block; background: white; color: #10b981; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Pay $850 via MAPS Payment Portal</a>
                            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 13px;">Secure payment processed by MAPS Redmond</p>
                        </div>
                        
                        <p><strong>⚠️ Important:</strong> Spots are limited to 7 students. Please complete payment within 48 hours to secure your seat.</p>
                        
                        <p>Questions? Reply to this email or contact us at <a href="mailto:aidris@edai.fun" style="color: #10b981;">aidris@edai.fun</a> or call/text <a href="tel:+15153570454" style="color: #10b981;">+1 (515) 357-0454</a>.</p>
                        
                        <p style="margin-top: 30px;">We can't wait to start building with you!</p>
                        <p><strong>— The EdAI Team</strong></p>
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
        // Add interview scheduling and pipeline fields
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
                submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_maps_applications_email ON maps_applications(email);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_maps_applications_status ON maps_applications(application_status);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_maps_applications_submitted ON maps_applications(submitted_at);`);
        
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
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Outfit', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #f3f4f6; }
                    .container { background-color: #ffffff; border-radius: 16px; overflow: hidden; margin: 20px auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white; }
                    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
                    .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 16px; font-weight: 400; }
                    .content { padding: 40px 30px; }
                    .personal-note { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin-bottom: 30px; color: #1e40af; font-style: italic; }
                    .section { margin-bottom: 24px; }
                    .section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; font-weight: 600; margin-bottom: 8px; }
                    .section-card { background-color: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
                    .info-item { background: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb; }
                    .info-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; font-weight: 500; }
                    .info-value { font-weight: 600; color: #111827; }
                    .footer { padding: 30px; text-align: center; background-color: #f9fafb; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
                    .highlight-badge { display: inline-block; padding: 4px 12px; background: #dbeafe; color: #1e40af; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="highlight-badge">Progress Update</div>
                        <h1>${update.program_name}</h1>
                        <p>Latest learning update for ${update.student_name}</p>
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
                        <p>Empowering the next generation of Muslim innovators.</p>
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
            success: false,
            error: 'Failed to send update: ' + error.message
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`EdAI Accelerator server running on port ${port}`);
});

module.exports = app;
