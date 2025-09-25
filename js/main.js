console.log('JavaScript file loaded successfully!');

// Chat Application System
let chatState = {
    step: 0,
    data: {},
    currentChild: 1,
    totalChildren: 1
};

const chatQuestions = [
    {
        bot: "Assalamu Alaikum wa Rahmatullahi wa Barakatuh! Welcome to EdAI Accelerator. I'm delighted to help you with your application. May I please have your name?",
        type: 'text',
        field: 'parentName'
    },
    {
        bot: "Barakallahu feeki, {parentName}. Could you please provide your email address so we can keep you updated throughout the process?",
        type: 'email',
        field: 'parentEmail'
    },
    {
        bot: "Jazakallahu khair. And your phone number for any urgent communication?",
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
        bot: "Masha'Allah! How old is {teenName}?",
        type: 'options',
        options: ['12 years', '13 years', '14 years', '15 years', '16 years', '17 years', '18 years'],
        field: 'teenAge'
    },
    {
        bot: "And what grade is {teenName} currently in?",
        type: 'options',
        options: ['7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade'],
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
        bot: "I need to confirm that {teenName} is Muslim and in 7th grade or above, as this is required for our program. Can you confirm this?",
        type: 'options',
        options: ['Yes, I confirm', 'No, they do not meet these requirements'],
        field: 'agreeTerms'
    },
    {
        bot: "Would you like us to keep you updated about program news and future opportunities?",
        type: 'options',
        options: ['Yes, please keep me updated', 'No, just this application'],
        field: 'agreeContact'
    }
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
    
    // Reset chat state
    chatState = {
        step: 0,
        data: {},
        currentChild: 1,
        totalChildren: 1
    };
    
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
    const question = chatQuestions[chatState.step];
    
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
    
    const question = chatQuestions[chatState.step];
    
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
    
    const question = chatQuestions[chatState.step];
    
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
        const currentQuestion = chatQuestions[chatState.step - 1];
        const nextQuestion = chatQuestions[chatState.step];
        
        // If we just finished agreeTerms (last child-specific question) and have more children to process
        if (currentQuestion && currentQuestion.field === 'agreeTerms' && chatState.currentChild < chatState.totalChildren) {
            console.log(`Finished child ${chatState.currentChild} of ${chatState.totalChildren}. Moving to next child.`);
            
            // Store current child's data with child number prefix
            const childPrefix = `child${chatState.currentChild}_`;
            const childData = {};
            
            // Copy child-specific data with prefix (excluding agreeContact which is asked once at the end)
            ['teenName', 'teenAge', 'teenGrade', 'teenInterests', 'parentExpectations', 'agreeTerms'].forEach(field => {
                if (chatState.data[field]) {
                    childData[childPrefix + field] = chatState.data[field];
                    delete chatState.data[field]; // Remove from temp storage
                }
            });
            
            // Add child data to main data object
            Object.assign(chatState.data, childData);
            
            // Move to next child
            chatState.currentChild++;
            
            // Find the index of teenName question dynamically
            const teenNameQuestionIndex = chatQuestions.findIndex(q => q.field === 'teenName');
            chatState.step = teenNameQuestionIndex;
            
            // Add transition message
            addBotMessage(`Alhamdulillah! Now let's move on to your ${getOrdinalNumber(chatState.currentChild)} child.`);
            
            // Continue with next child
            setTimeout(() => {
                const question = chatQuestions[chatState.step];
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
            completeApplication();
        }
    }, 1000);
}

function completeApplication() {
    showTypingIndicator();
    
    setTimeout(() => {
        hideTypingIndicator();
        
        // Store the last child's data if we haven't already
        if (chatState.data.teenName && chatState.currentChild <= chatState.totalChildren) {
            const childPrefix = `child${chatState.currentChild}_`;
            const childData = {};
            
            // Copy child-specific data with prefix
            ['teenName', 'teenAge', 'teenGrade', 'teenInterests', 'parentExpectations', 'agreeTerms'].forEach(field => {
                if (chatState.data[field]) {
                    childData[childPrefix + field] = chatState.data[field];
                    delete chatState.data[field]; // Remove from temp storage
                }
            });
            
            // Add child data to main data object
            Object.assign(chatState.data, childData);
        }
        
        addBotMessage("Barakallahu feekum! I have all the information I need. Let me submit your application now...");
        
        // Prepare application data with all children
        const applicationData = {
            parentName: chatState.data.parentName,
            parentEmail: chatState.data.parentEmail,
            parentPhone: chatState.data.parentPhone,
            totalChildren: chatState.totalChildren,
            agreeContact: chatState.data.agreeContact,
            applicationMethod: 'chat',
            submissionDate: new Date().toISOString()
        };
        
        // Add all children data
        for (let i = 1; i <= chatState.totalChildren; i++) {
            const prefix = `child${i}_`;
            console.log(`Building data for child ${i} with prefix '${prefix}'`);
            console.log(`Available keys with this prefix:`, Object.keys(chatState.data).filter(key => key.startsWith(prefix)));
            
            const childData = {
                name: chatState.data[prefix + 'teenName'],
                age: chatState.data[prefix + 'teenAge'],
                grade: chatState.data[prefix + 'teenGrade'],
                interests: chatState.data[prefix + 'teenInterests'],
                parentExpectations: chatState.data[prefix + 'parentExpectations'],
                agreeTerms: chatState.data[prefix + 'agreeTerms']
            };
            
            console.log(`Child ${i} constructed data:`, childData);
            applicationData[`child${i}`] = childData;
        }
        
        console.log('=== DEBUGGING APPLICATION SUBMISSION ===');
        console.log('Total children:', chatState.totalChildren);
        console.log('Current child:', chatState.currentChild);
        console.log('Chat state data keys:', Object.keys(chatState.data));
        console.log('Complete application data:', applicationData);
        
        // Verify children data structure
        for (let i = 1; i <= chatState.totalChildren; i++) {
            console.log(`Child ${i} data:`, applicationData[`child${i}`]);
        }
        
        // Submit application
        submitChatApplication(applicationData);
    }, 2000);
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
window.handleExactChildrenCount = handleExactChildrenCount;
window.openChatApplication = openChatApplication;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Hero Apply Now button
    const heroApplyBtn = document.getElementById('heroApplyBtn');
    console.log('Looking for hero apply button with ID: heroApplyBtn');
    console.log('Hero apply button element:', heroApplyBtn);
    
    if (heroApplyBtn) {
        console.log('Hero apply button found, adding event listener');
        heroApplyBtn.addEventListener('click', function(e) {
            console.log('Hero apply button clicked!');
            e.preventDefault();
            openChatApplication();
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
            openChatApplication();
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
            openChatApplication();
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
});