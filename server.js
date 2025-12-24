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

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
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
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            
            const childrenList = insertedApplications.map(app => 
                `${app.childName} (${app.childGrade}th Grade)`
            ).join(', ');
            
            const isWaitlist = applicationStatus === 'waitlist';
            
            await resend.emails.send({
                from: 'EdAI Accelerator <noreply@edaiaccelerator.com>',
                to: parentEmail.trim().toLowerCase(),
                subject: isWaitlist 
                    ? 'Application Received - 2026 Waitlist | EdAI Accelerator'
                    : 'Application Received - Thank You! | EdAI Accelerator',
                html: `
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
                `
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
        // Add interview scheduling fields
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
                submitted_at
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
        
        // Send email using Resend
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
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
        
        await resend.emails.send({
            from: 'EdAI Accelerator <noreply@edaiaccelerator.com>',
            to: app.parent_email,
            subject: `Interview Invitation for ${app.teen_name} - EdAI Accelerator`,
            html: emailHtml
        });
        
        res.status(200).json({
            success: true,
            message: 'Interview invitation sent successfully'
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
            // Parent confirmed one of the proposed times
            await pool.query(`
                UPDATE applications 
                SET interview_status = 'confirmed',
                    confirmed_interview_date = $1,
                    parent_response = 'Confirmed',
                    parent_response_date = NOW()
                WHERE id = $2
            `, [confirmedTime, applicant.id]);
            
            // Send confirmation email to parent
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            
            await resend.emails.send({
                from: 'EdAI Accelerator <noreply@edaiaccelerator.com>',
                to: applicant.parent_email,
                subject: `Interview Confirmed for ${applicant.teen_name} - EdAI Accelerator`,
                html: `
                    <h2>Interview Confirmed!</h2>
                    <p>Assalamu Alaikum ${applicant.parent_name},</p>
                    <p>Thank you for confirming the interview time for ${applicant.teen_name}.</p>
                    <h3>Interview Details:</h3>
                    <p><strong>Date & Time:</strong> ${new Date(confirmedTime).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZoneName: 'short'
                    })}</p>
                    <p>We will send you the meeting link closer to the interview date.</p>
                    <p>If you need to reschedule, please contact us at contact@edaiaccelerator.com</p>
                    <p>Jazakallahu Khairan,<br>EdAI Accelerator Team</p>
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
            
            // Notify admin via email
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            
            await resend.emails.send({
                from: 'EdAI Accelerator <noreply@edaiaccelerator.com>',
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

// Start server
app.listen(port, () => {
    console.log(`EdAI Accelerator server running on port ${port}`);
});

module.exports = app;