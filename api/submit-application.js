// EdAI Accelerator Application Submission API
// Vercel serverless function to handle form submissions

import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        console.log('=== API DEBUGGING - RECEIVED DATA ===');
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
            if (!age || age < 12 || age > 18) {
                validationErrors.push(`Child ${childNum} age must be between 12 and 18`);
            }
            
            // Parse grade from string like "8th Grade"
            let grade = child.grade;
            if (typeof grade === 'string') {
                const gradeMatch = grade.match(/\d+/);
                grade = gradeMatch ? parseInt(gradeMatch[0]) : null;
            }
            if (!grade || grade < 7 || grade > 12) {
                validationErrors.push(`Child ${childNum} grade must be between 7 and 12`);
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
        const existingApplications = await sql`
            SELECT teen_name FROM applications WHERE parent_email = ${parentEmail.trim().toLowerCase()}
        `;
        
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
            
            const result = await sql`
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
                    agrees_contact
                ) VALUES (
                    ${parentName.trim()},
                    ${parentEmail.trim().toLowerCase()},
                    ${parentPhone.trim()},
                    ${child.name.trim()},
                    ${age},
                    ${grade},
                    ${child.interests.trim()},
                    ${child.parentExpectations.trim()},
                    ${child.agreeTerms === 'Yes, I confirm'},
                    ${Boolean(agreeContact)}
                )
                RETURNING id, submitted_at
            `;
            
            insertedApplications.push({
                id: result.rows[0].id,
                submittedAt: result.rows[0].submitted_at,
                childName: child.name.trim()
            });
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
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: ['Invalid data format or constraints violation']
            });
        }

        // Generic error response
        res.status(500).json({
            success: false,
            error: 'Internal server error. Please try again later.'
        });
    }
}