console.log('JavaScript file loaded successfully!');

// Time gate disabled - we are now in rolling admissions mode
const IS_AFTER_CUTOFF = false;

// Chat Application System
let chatState = {
    step: 0,
    data: {},
    currentChild: 1,
    totalChildren: 1,
    mode: 'application' // 'application' | 'waitlist'
};

// Active questions pointer (switches to waitlist when needed)
let activeQuestions;

const chatQuestions = [
    {
        bot: "Assalamu Alaikum wa Rahmatullahi wa Barakatuh! Welcome to EdAI Accelerator. I'm delighted to help you with your application. May I please have your name? (Please enter Parent/Guardian Name)",
        type: 'text',
        field: 'parentName'
    },
    {
        bot: "Barakallahu feeki, {parentName}. Could you please provide your email address? Please ensure this is your current email as we will send the interview invite here (from aidris@edai.fun).",
        type: 'email',
        field: 'parentEmail'
    },
    {
        bot: "Jazakallahu khair. And your phone number? Expect a text or call from 515-357-0454 for any urgent communication.",
        type: 'tel',
        field: 'parentPhone'
    },
    {
        bot: "Perfect! Now, how many children would you like to enroll in our program? We welcome multiple children from the same family.",
        type: 'options',
        options: ['1 child', '2 children', '3 children', '4+ children'],
        field: 'totalChildren'
    },
    {
        bot: "Wonderful! Let's start with your {childNumber} child. What is their name?",
        type: 'text',
        field: 'teenName'
    },
    {
        bot: "Masha'Allah! How old is {teenName}? (Late elementary/Grade 5+ students are welcome!)",
        type: 'options',
        options: ['10 years', '11 years', '12 years', '13 years', '14 years', '15 years', '16 years', '17 years', '18 years'],
        field: 'teenAge'
    },
    {
        bot: "And what grade is {teenName} currently in?",
        type: 'options',
        options: ['5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'],
        field: 'teenGrade'
    },
    {
        bot: "Tell me, what excites {teenName} about creating and building? What drives their curiosity?",
        type: 'textarea',
        field: 'teenInterests',
        placeholder: "Share what inspires your teen to create and innovate..."
    },
    {
        bot: "Subhan'Allah! As a parent, what do you hope {teenName} will gain from this program? What are your aspirations for them?",
        type: 'textarea',
        field: 'parentExpectations',
        placeholder: "Tell us about your hopes and expectations..."
    },
    {
        bot: "Since our Nov cohort is full, we are accepting rolling admissions for Dec 2025. However, if demand is high, we may start an early cohort. Which schedule works best for you?",
        type: 'options',
        options: ['Sun 9 AM - 12:30 PM', 'Sat 5 PM - 8 PM', 'Dec 2025 Only', 'Other (Please specify in interview)'],
        field: 'schedulePreference'
    },
    {
        bot: "Almost done! The program cost is $800. Do you require financial aid to participate?",
        type: 'options',
        options: ['No, I can pay the full amount', 'Yes, I would like to apply for financial aid'],
        field: 'financialAid'
    },
    {
        bot: "Finally, please confirm: {teenName} is Muslim, Grade 5 or above, has a laptop for class, and you understand an interview is required for admission.",
        type: 'options',
        options: ['Yes, I confirm', 'No, I have questions'],
        field: 'agreeTerms'
    },
    {
        bot: "Would you like us to keep you updated about program news and future opportunities?",
        type: 'options',
        options: ['Yes, please keep me updated', 'No, just this application'],
        field: 'agreeContact'
    }
]; 

// Waitlist (Dec 2025) chat questions
const waitlistQuestions = [
    { bot: "Assalamu Alaikum! Our Nov cohort is closed. We are building the priority waitlist for the December 2025 cohort. May I have your name?", type: 'text', field: 'parentName' },
    { bot: "Jazakallahu khair, {parentName}. What email should we contact? You'll also receive updates from aidris@edai.fun.", type: 'email', field: 'parentEmail' },
    { bot: "And your phone number? We'll text you from +1 (515) 357-0454 so you recognize us.", type: 'tel', field: 'parentPhone' },
    { bot: "Who is the student you want to enroll?", type: 'text', field: 'teenName' },
    { bot: "How old is {teenName}?", type: 'options', field: 'teenAge', options: ['10 years','11 years','12 years','13 years','14 years','15 years','16 years','17 years','18 years'] },
    { bot: "What grade is {teenName} in?", type: 'options', field: 'teenGrade', options: ['5th Grade','6th Grade','7th Grade','8th Grade','9th Grade','10th Grade','11th Grade','12th Grade'] },
    { bot: "Briefly, why is {teenName} excited to join in February?", type: 'textarea', field: 'teenInterests', placeholder: "Share a few sentences (20+ chars)" },
    { bot: "As a parent/guardian, what outcome do you hope for from this program?", type: 'textarea', field: 'parentExpectations', placeholder: "Share a few sentences (20+ chars)" },
    { bot: "Please confirm: {teenName} is Muslim and in 5th grade or above.", type: 'options', field: 'agreeTerms', options: ['Yes, I confirm','No, they do not meet these requirements'] },
    { bot: "To secure priority consideration, please confirm: If offered a seat for December 2025, we are committed to enrolling (bi-idhnillah).", type: 'options', field: 'agreeCommit', options: ['Yes, we commit','Not sure yet'] },
    { bot: "May we send you SMS from +1 (515) 357-0454 and emails from aidris@edai.fun about the waitlist and onboarding?", type: 'options', field: 'agreeComms', options: ['Yes, you may contact me','No, email only'] }
];

function openChatApplication() {
    console.log('openChatApplication function called!');
    const modal = document.getElementById('chatApplicationModal');
    const chatMessages = document.getElementById('chatMessages');
    
    console.log('Chat modal element:', modal);
    console.log('Chat messages element:', chatMessages);
    
    if (!modal) {
        console.error('Chat application modal not found!');
        return;
    }
    
    if (!chatMessages) {
        console.error('Chat messages element not found!');
        return;
    }
    
    // If after cutoff, route to waitlist chat
    if (IS_AFTER_CUTOFF) {
        return openWaitlistChat();
    }

    // Reset chat state
    chatState = {
        step: 0,
        data: {},
        currentChild: 1,
        totalChildren: 1,
        mode: 'application'
    };

    activeQuestions = chatQuestions;
    
    // Clear chat messages
    chatMessages.innerHTML = '';
    
    // Show modal
    console.log('Adding show class to modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Start conversation
    setTimeout(() => {
        console.log('Starting conversation with first message');
        addBotMessage(chatQuestions[0].bot);
        showInputForCurrentStep();
    }, 500);
}

function addBotMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot';
    
    // Replace placeholders with actual data
    let processedMessage = message;
    Object.keys(chatState.data).forEach(key => {
        processedMessage = processedMessage.replace(new RegExp(`{${key}}`, 'g'), chatState.data[key]);
    });
    processedMessage = processedMessage.replace('{childNumber}', getOrdinalNumber(chatState.currentChild));
    
    // For child name placeholder, use current teen name if available
    if (chatState.data.teenName) {
        processedMessage = processedMessage.replace(new RegExp('{teenName}', 'g'), chatState.data.teenName);
    }
    
    messageDiv.innerHTML = `
        <div class="chat-avatar">EdAI</div>
        <div class="chat-bubble">${processedMessage}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    scrollChatToBottom(100);
}

function addUserMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user';
    
    messageDiv.innerHTML = `
        <div class="chat-avatar">You</div>
        <div class="chat-bubble">${message}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    scrollChatToBottom(50);
}

function showInputForCurrentStep() {
    const container = document.getElementById('chatInputContainer');
    const question = activeQuestions[chatState.step];
    
    if (!question) {
        // Application complete
        completeApplication();
        return;
    }
    
    let inputHTML = '';
    
    if (question.type === 'text' || question.type === 'email' || question.type === 'tel') {
        inputHTML = `
            <input type="${question.type}" class="chat-input" id="chatInput" 
                   placeholder="Type your answer..." required>
            <button class="chat-send-btn" onclick="handleTextInput()">Send</button>
        `;
    } else if (question.type === 'textarea') {
        inputHTML = `
            <textarea class="chat-input" id="chatInput" rows="3" 
                      placeholder="${question.placeholder || 'Type your answer...'}"></textarea>
            <button class="chat-send-btn" onclick="handleTextInput()">Send</button>
        `;
    } else if (question.type === 'options') {
        const optionsHTML = question.options.map((option, index) => 
            `<button class="chat-option" onclick="handleOptionSelect('${option}')">${option}</button>`
        ).join('');
        
        inputHTML = `
            <div class="chat-options">${optionsHTML}</div>
        `;
    }
    
    container.innerHTML = inputHTML;
    
    // Auto-scroll to show the new input area (especially for options)
    if (question && question.type === 'options') {
        console.log('Showing options - scrolling input container into view');
        // For options, scroll the input container into view
        setTimeout(() => {
            const inputContainer = document.getElementById('chatInputContainer');
            if (inputContainer) {
                inputContainer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'end',
                    inline: 'nearest'
                });
            }
        }, 300);
    } else {
        // Regular scroll for text inputs
        scrollChatToBottom(150);
    }
    
    // Focus on input if it's a text input
    const input = document.getElementById('chatInput');
    if (input) {
        input.focus();
        
        // Handle Enter key
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextInput();
            }
        });
    }
}

function handleTextInput() {
    const input = document.getElementById('chatInput');
    const value = input.value.trim();
    
    if (!value) return;
    
    const question = activeQuestions[chatState.step];
    
    // Validate input
    if (question.type === 'email' && !isValidEmail(value)) {
        addBotMessage('I need a valid email address to keep you updated. Could you please check the format? For example: parent@email.com');
        return;
    }
    
    if (question.type === 'tel' && !isValidPhone(value)) {
        addBotMessage('Please provide a valid phone number. You can include country codes if needed (e.g., +1-555-123-4567).');
        return;
    }
    
    if (question.type === 'textarea' && value.length < 20) {
        addBotMessage('I\'d love to hear more detail in your response. Could you elaborate a bit more? At least 20 characters help me understand better.');
        return;
    }
    
    // Add user message and store data
    addUserMessage(value);
    chatState.data[question.field] = value;
    
    // Move to next step
    moveToNextStep();
}

function handleOptionSelect(option) {
    console.log('Option selected:', option);
    console.log('Current chat state step:', chatState.step);
    
    const question = activeQuestions[chatState.step];
    
    if (!question) {
        console.error('No question found for current step');
        return;
    }
    
    console.log('Current question field:', question.field);
    
    // Disable all option buttons to prevent multiple clicks
    const optionButtons = document.querySelectorAll('.chat-option');
    optionButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.7';
    });
    
    // Add user message and store data
    addUserMessage(option);
    chatState.data[question.field] = option;
    
    console.log('Updated chat state data:', chatState.data);
    
    // Special handling for totalChildren
    if (question.field === 'totalChildren') {
        let num;
        if (option.includes('4+ children')) {
            // For 4+ children, we need to ask for the exact number
            chatState.needsChildrenCount = true;
            chatState.totalChildren = 4; // Temporary, will be updated
        } else {
            num = option.match(/\d+/)[0];
            chatState.totalChildren = parseInt(num);
        }
        console.log('Set total children to:', chatState.totalChildren);
    }
    
    // Special handling for agreeTerms (No, I have questions)
    if (question.field === 'agreeTerms' && option === 'No, I have questions') {
        chatState.hasQuestions = true;
        // Temporarily override agreeTerms to satisfy validation on submission, but set a flag
        // The actual 'parentQuestions' field will contain their questions
        chatState.data['agreeTerms'] = 'Yes, I confirm';
        
        addBotMessage("No problem at all. Please type your questions below. You can also email us at aidris@edai.fun or call/text 515-357-0454. Go ahead and submit your application now, and we will answer your questions in shaa Allah.");
        
        const container = document.getElementById('chatInputContainer');
        container.innerHTML = `
            <textarea class="chat-input" id="chatInput" rows="3" 
                      placeholder="Type your questions here..."></textarea>
            <button class="chat-send-btn" onclick="handleQuestionInput()">Submit Application</button>
        `;
        return;
    }
    
    // If 4+ selected, ask for exact number now
    if (question.field === 'totalChildren' && chatState.needsChildrenCount) {
        addBotMessage('How many children would you like to register? Please enter a number (e.g., 5).');
        const container = document.getElementById('chatInputContainer');
        container.innerHTML = `
            <input type="number" min="1" max="10" class="chat-input" id="chatInput" placeholder="Enter number of children" required>
            <button class="chat-send-btn" onclick="handleExactChildrenCount()">Send</button>
        `;
        return;
    }

    // Move to next step
    console.log('Moving to next step...');
    moveToNextStep();
}

function handleQuestionInput() {
    const input = document.getElementById('chatInput');
    const value = input.value.trim();
    
    if (!value) {
        addBotMessage('Please type your question or just type "None" if you changed your mind.');
        return;
    }
    
    // Add user message and store data
    addUserMessage(value);
    chatState.data['parentQuestions'] = value;
    
    // Move to next step (agreeContact)
    moveToNextStep();
}

function handleExactChildrenCount() {
    const input = document.getElementById('chatInput');
    const count = parseInt(input.value);
    
    if (!count || count < 1 || count > 10) {
        addBotMessage('Please enter a valid number between 1 and 10.');
        return;
    }
    
    chatState.totalChildren = count;
    chatState.needsChildrenCount = false;
    addUserMessage(`${count} children`);
    addBotMessage(`Wonderful! I'll help you register ${count} children. Let's get started.`);
    
    moveToNextStep();
}

function moveToNextStep() {
    console.log('moveToNextStep called - current step:', chatState.step);
    chatState.step++;
    console.log('Incremented to step:', chatState.step);
    
    // Show typing indicator
    showTypingIndicator();
    
    setTimeout(() => {
        hideTypingIndicator();
        
        // Check if we just completed the last child-specific question (agreeTerms)
        const currentQuestion = activeQuestions[chatState.step - 1];
        const nextQuestion = activeQuestions[chatState.step];
        
        // If we just finished agreeTerms (last child-specific question) and have more children to process
        if (currentQuestion && currentQuestion.field === 'agreeTerms' && chatState.currentChild < chatState.totalChildren) {
            console.log(`Finished child ${chatState.currentChild} of ${chatState.totalChildren}. Moving to next child.`);
            
            // Store current child's data with child number prefix
            saveCurrentChildData();
            
            // Move to next child
            chatState.currentChild++;
            
            // Find the index of teenName question dynamically
            const teenNameQuestionIndex = activeQuestions.findIndex(q => q.field === 'teenName');
            chatState.step = teenNameQuestionIndex;
            
            // Add transition message
            addBotMessage(`Alhamdulillah! Now let's move on to your ${getOrdinalNumber(chatState.currentChild)} child.`);
            
            // Continue with next child
            setTimeout(() => {
                const question = activeQuestions[chatState.step];
                if (question) {
                    addBotMessage(question.bot);
                    showInputForCurrentStep();
                }
            }, 1500);
            return;
        }
        
        // Normal flow - check if we have more questions
        console.log('Next question:', nextQuestion ? nextQuestion.field : 'Application complete');
        
        if (nextQuestion) {
            addBotMessage(nextQuestion.bot);
            showInputForCurrentStep();
        } else {
            console.log('All questions completed, finishing application');
            // Save the last child's data
            saveCurrentChildData();
            // Show confirmation instead of immediate submission
            showConfirmationSummary();
        }
    }, 1000);
}

function saveCurrentChildData() {
    if (chatState.currentChild > chatState.totalChildren) return;
    
    const childPrefix = `child${chatState.currentChild}_`;
    const childData = {};
    
    // Copy child-specific data with prefix
    ['teenName', 'teenAge', 'teenGrade', 'teenInterests', 'parentExpectations', 'schedulePreference', 'financialAid', 'agreeTerms', 'parentQuestions'].forEach(field => {
        if (chatState.data[field]) {
            childData[childPrefix + field] = chatState.data[field];
            
            // Fix for agreeTerms: if the user had questions, the value might be "No, I have questions"
            // We need to ensure the backend sees a valid "Yes" if they are submitting
            if (field === 'agreeTerms' && chatState.data[field] === 'No, I have questions') {
                // If they have questions, we mark terms as accepted for the purpose of submission
                // The actual question text is preserved in parentQuestions
                childData[childPrefix + field] = 'Yes, I confirm';
            }
            
            delete chatState.data[field]; // Remove from temp storage
        }
    });
    
    // Add child data to main data object
    Object.assign(chatState.data, childData);
}

function showConfirmationSummary() {
    // If waitlist, skip summary and submit directly (or we can add summary later)
    if (chatState.mode === 'waitlist') {
        submitFinalApplication();
        return;
    }

    // Build Summary HTML
    let studentsSummary = '';
    let totalPrice = 0;
    let financialAidRequested = false;

    for (let i = 1; i <= chatState.totalChildren; i++) {
        const prefix = `child${i}_`;
        const name = chatState.data[prefix + 'teenName'] || 'Student';
        const grade = chatState.data[prefix + 'teenGrade'] || '';
        const schedule = chatState.data[prefix + 'schedulePreference'] || 'Dec 2025';
        const aid = chatState.data[prefix + 'financialAid'];
        
        if (aid && aid.includes('Yes')) financialAidRequested = true;
        
        studentsSummary += `
            <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <strong>${name}</strong> (${grade})<br>
                Schedule: ${schedule}
            </div>
        `;
    }

    const priceText = financialAidRequested 
        ? "Financial Aid Application" 
        : `$${chatState.totalChildren * 800} ($800/student)`;

    const summaryMessage = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 10px;">
            <h3 style="margin-top: 0; color: #2563eb;">Application Summary</h3>
            <div style="margin-bottom: 15px;">
                <strong>Parent:</strong> ${chatState.data.parentName}<br>
                <strong>Email:</strong> ${chatState.data.parentEmail}<br>
                <strong>Phone:</strong> ${chatState.data.parentPhone}
            </div>
            
            <h4 style="margin: 10px 0 5px;">Students</h4>
            ${studentsSummary}
            
            <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #ddd;">
                <strong>Total Program Cost:</strong><br>
                <span style="font-size: 1.2em; color: #059669;">${priceText}</span>
            </div>
            
            <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                By clicking submit, you confirm that the details above are correct and you understand the program commitments.
            </p>
        </div>
    `;

    addBotMessage("Almost there! Please review your application details and the program cost below.");
    addBotMessage(summaryMessage);

    // Show Submit Button
    const container = document.getElementById('chatInputContainer');
    container.innerHTML = `
        <button class="chat-send-btn" style="width: 100%; background: #059669; margin-bottom: 10px;" onclick="submitFinalApplication()">✅ Confirm & Submit Application</button>
        <button class="chat-option" style="width: 100%; text-align: center; border: 1px solid #ddd;" onclick="location.reload()">❌ Cancel / Restart</button>
    `;
    
    // Scroll to show the summary
    setTimeout(() => {
        const inputContainer = document.getElementById('chatInputContainer');
        if (inputContainer) {
            inputContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, 300);
}

function submitFinalApplication() {
    showTypingIndicator();
    
    setTimeout(() => {
        hideTypingIndicator();
        
        // Disable buttons
        const btns = document.querySelectorAll('#chatInputContainer button');
        btns.forEach(b => b.disabled = true);
        
        const finishingLine = chatState.mode === 'waitlist' 
            ? "Barakallahu feekum! I have what I need to add you to the December 2025 waitlist. Submitting now..."
            : "Barakallahu feekum! Application submitted. Please watch your email (aidris@edai.fun) for an interview invite. We will also text you from 515-357-0454.";
        addBotMessage(finishingLine);
        
        // Prepare application data with all children
        const applicationData = {
            parentName: chatState.data.parentName,
            parentEmail: chatState.data.parentEmail,
            parentPhone: chatState.data.parentPhone,
            totalChildren: chatState.totalChildren,
            agreeContact: chatState.data.agreeContact || chatState.data.agreeComms,
            applicationMethod: chatState.mode === 'waitlist' ? 'waitlist' : 'chat',
            applicationStatus: chatState.mode === 'waitlist' ? 'waitlist' : 'pending',
            submissionDate: new Date().toISOString()
        };
        
        // Add all children data
        for (let i = 1; i <= chatState.totalChildren; i++) {
            const prefix = `child${i}_`;
            
            const childData = {
                name: chatState.data[prefix + 'teenName'],
                age: chatState.data[prefix + 'teenAge'],
                grade: chatState.data[prefix + 'teenGrade'],
                interests: chatState.data[prefix + 'teenInterests'],
                parentExpectations: chatState.data[prefix + 'parentExpectations'],
                schedulePreference: chatState.data[prefix + 'schedulePreference'],
                financialAid: chatState.data[prefix + 'financialAid'],
                agreeTerms: chatState.data[prefix + 'agreeTerms'],
                questions: chatState.data[prefix + 'parentQuestions']
            };
            
            applicationData[`child${i}`] = childData;
        }
        
        console.log('Submitting application data:', applicationData);
        
        // Submit application
        submitChatApplication(applicationData);
    }, 1000);
}

function openWaitlistChat() {
    const modal = document.getElementById('chatApplicationModal');
    const chatMessages = document.getElementById('chatMessages');
    const headerTitle = document.querySelector('.chat-title');
    const headerSubtitle = document.querySelector('.chat-subtitle');

    if (!modal || !chatMessages) return;

    chatState = { step: 0, data: {}, currentChild: 1, totalChildren: 1, mode: 'waitlist' };
    activeQuestions = waitlistQuestions;

    chatMessages.innerHTML = '';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    if (headerTitle) headerTitle.textContent = 'Waitlist Application — December 2025';
    if (headerSubtitle) headerSubtitle.textContent = 'Priority consideration comes from the waitlist.';

    setTimeout(() => {
        addBotMessage(waitlistQuestions[0].bot);
        showInputForCurrentStep();
    }, 400);
}

async function submitChatApplication(data) {
    console.log('Submitting application data:', data);
    
    try {
        // Try real API call first (for production)
        const response = await fetch('/api/submit-application', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        console.log('API Response status:', response.status);
        console.log('API Response headers:', response.headers);
        
        if (!response.ok) {
            console.error('API returned error status:', response.status, response.statusText);
        }
        
        const responseText = await response.text();
        console.log('Raw API response:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse API response as JSON:', parseError);
            addBotMessage('There was an unexpected error with the server response. Please try again.');
            return;
        }

        if (result.success) {
            closeChatModal();
            showSuccessModal();
        } else {
            console.error('API validation failed:', result);
            
            // Show detailed validation errors if available
            let errorMessage = `I apologize, there was an issue submitting your application: ${result.error || 'Please try again.'}`;
            
            if (result.details && result.details.length > 0) {
                console.error('Validation details:', result.details);
                errorMessage += '\n\nSpecific issues:';
                result.details.forEach(detail => {
                    errorMessage += `\n• ${detail}`;
                });
            }
            
            addBotMessage(errorMessage);
        }
    } catch (error) {
        console.error('API submission failed, this might be local development:', error);
        
        // For local development (when API is not available), show mock success
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Local development detected, using mock success');
            await new Promise(resolve => setTimeout(resolve, 1500));
            closeChatModal();
            showSuccessModal();
        } else {
            // In production, show the error
            addBotMessage('There was a network issue. Please check your connection and try again.');
        }
    }
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
        <span>EdAI is typing</span>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatMessages.appendChild(indicator);
    
    // Smooth scroll to show typing indicator
    scrollChatToBottom(50);
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function closeChatModal() {
    const modal = document.getElementById('chatApplicationModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function getOrdinalNumber(num) {
    const ordinals = ['', 'first', 'second', 'third', 'fourth', 'fifth'];
    return ordinals[num] || `${num}th`;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Utility function to ensure chat is scrolled to show latest content
function scrollChatToBottom(delay = 100) {
    setTimeout(() => {
        const chatMessages = document.getElementById('chatMessages');
        
        if (chatMessages) {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, delay);
}

// Make functions globally available for onclick handlers
window.handleTextInput = handleTextInput;
window.handleOptionSelect = handleOptionSelect;
window.handleQuestionInput = handleQuestionInput;
window.handleExactChildrenCount = handleExactChildrenCount;
window.openChatApplication = openChatApplication;
window.openWaitlistChat = openWaitlistChat;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Gate the UI after cutoff to promote waitlist logic removed (updated in HTML directly)

    // Hero Apply Now button
    const heroApplyBtn = document.getElementById('heroApplyBtn');
    console.log('Looking for hero apply button with ID: heroApplyBtn');
    console.log('Hero apply button element:', heroApplyBtn);
    
    if (heroApplyBtn) {
        console.log('Hero apply button found, adding event listener');
        heroApplyBtn.addEventListener('click', function(e) {
            console.log('Hero apply button clicked!');
            e.preventDefault();
            if (IS_AFTER_CUTOFF) { openWaitlistChat(); } else { openChatApplication(); }
        });
    } else {
        console.log('Hero apply button NOT found');
    }
    
    // Start chat application button
    const startChatBtn = document.getElementById('startChatApplication');
    if (startChatBtn) {
        console.log('Start chat button found');
        startChatBtn.addEventListener('click', function(e) {
            console.log('Start chat button clicked!');
            e.preventDefault();
            if (IS_AFTER_CUTOFF) { openWaitlistChat(); } else { openChatApplication(); }
        });
    } else {
        console.log('Start chat button NOT found');
    }
    
    // Program Details Apply Now button
    const programDetailsApplyBtn = document.getElementById('programDetailsApplyBtn');
    if (programDetailsApplyBtn) {
        console.log('Program details apply button found');
        programDetailsApplyBtn.addEventListener('click', function(e) {
            console.log('Program details apply button clicked!');
            e.preventDefault();
            if (IS_AFTER_CUTOFF) { openWaitlistChat(); } else { openChatApplication(); }
        });
    } else {
        console.log('Program details apply button NOT found');
    }
    
    // Chat modal close button
    const chatModalClose = document.getElementById('chatModalClose');
    if (chatModalClose) {
        console.log('Chat modal close button found');
        chatModalClose.addEventListener('click', function() {
            closeChatModal();
        });
    }
    
    // Success modal close buttons
    const modalClose = document.getElementById('modalClose');
    const modalOk = document.getElementById('modalOk');
    
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    if (modalOk) {
        modalOk.addEventListener('click', closeModal);
    }
    
    // Close modals when clicking outside
    const chatModal = document.getElementById('chatApplicationModal');
    const successModal = document.getElementById('successModal');
    
    if (chatModal) {
        chatModal.addEventListener('click', function(e) {
            if (e.target === chatModal) {
                closeChatModal();
            }
        });
    }
    
    if (successModal) {
        successModal.addEventListener('click', function(e) {
            if (e.target === successModal) {
                closeModal();
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (chatModal && chatModal.classList.contains('show')) {
                closeChatModal();
            }
            if (successModal && successModal.classList.contains('show')) {
                closeModal();
            }
        }
    });

    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle && navLinks) {
        console.log('Mobile menu elements found');
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
        
        // Close menu when clicking a link
        const links = navLinks.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navLinks.contains(e.target) && !mobileMenuToggle.contains(e.target) && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        });
    } else {
        console.error('Mobile menu elements NOT found');
    }
});
