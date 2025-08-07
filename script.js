// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Scroll Good Landing Page Loaded Successfully!');
    
    // Get DOM elements
    const youtubeInput = document.querySelector('.youtube-input');
    const submitBtn = document.querySelector('.submit-btn');
    const arrow = document.querySelector('.arrow');
    
    // Error handling for missing elements
    if (!youtubeInput || !submitBtn) {
        console.error('Required elements not found. Please check HTML structure.');
        return;
    }
    
    // State management
    let isProcessing = false;
    
    // YouTube URL validation function
    function isValidYouTubeURL(url) {
        if (!url || typeof url !== 'string') return false;
        
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
        return youtubeRegex.test(url.trim());
    }
    
    // Create video result display
    function createVideoDisplay() {
        const existingDisplay = document.querySelector('.video-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }
        
        const videoDisplay = document.createElement('div');
        videoDisplay.className = 'video-display';
        videoDisplay.innerHTML = `
            <div class="video-card">
                <div class="video-thumbnail-container">
                    <img class="video-thumbnail" alt="Video thumbnail" />
                    <div class="thumbnail-overlay">
                        <div class="play-icon">▶</div>
                    </div>
                </div>
                <div class="video-info">
                    <h3 class="video-title"></h3>
                    <div class="video-meta">
                        <span class="video-duration"></span>
                        <span class="video-uploader"></span>
                    </div>
                    <div class="video-summary"></div>
                </div>
                <button class="close-btn" aria-label="Close video display">×</button>
            </div>
        `;
        
        // Insert after the YouTube section
        const youtubeSection = document.querySelector('.youtube-section');
        youtubeSection.parentNode.insertBefore(videoDisplay, youtubeSection.nextSibling);
        
        // Add close functionality
        const closeBtn = videoDisplay.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            videoDisplay.classList.add('fade-out');
            setTimeout(() => {
                if (videoDisplay.parentNode) {
                    videoDisplay.parentNode.removeChild(videoDisplay);
                }
            }, 300);
        });
        
        return videoDisplay;
    }
    
    // Display video information
    function displayVideoInfo(videoData) {
        const videoDisplay = createVideoDisplay();
        const card = videoDisplay.querySelector('.video-card');
        
        // Populate data
        const thumbnail = videoDisplay.querySelector('.video-thumbnail');
        const title = videoDisplay.querySelector('.video-title');
        const duration = videoDisplay.querySelector('.video-duration');
        const uploader = videoDisplay.querySelector('.video-uploader');
        const summary = videoDisplay.querySelector('.video-summary');
        
        thumbnail.src = videoData.thumbnail;
        thumbnail.onerror = () => {
            thumbnail.src = `https://img.youtube.com/vi/${videoData.video_id}/hqdefault.jpg`;
        };
        
        title.textContent = videoData.title;
        duration.textContent = videoData.duration;
        uploader.textContent = `by ${videoData.uploader}`;
        
        // Format summary with markdown-like styling
        const formattedSummary = videoData.summary
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/📹|⏱️|📝/g, '<span class="emoji">$&</span>')
            .replace(/\n/g, '<br>');
        
        summary.innerHTML = formattedSummary;
        
        // Animate in
        setTimeout(() => {
            videoDisplay.classList.add('show');
            card.classList.add('animate-in');
        }, 100);
    }
    
    // Show loading state
    function showLoading() {
        isProcessing = true;
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        arrow.textContent = '⟳';
        arrow.classList.add('spinning');
        
        showFeedback('Processing video...', 'info');
    }
    
    // Hide loading state
    function hideLoading() {
        isProcessing = false;
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        arrow.textContent = '→';
        arrow.classList.remove('spinning');
    }
    
    // Process video with backend
    async function processVideo(url) {
        try {
            showLoading();
            
            const response = await fetch('http://localhost:5000/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to process video');
            }
            
            if (data.success && data.video) {
                console.log('✅ Video processed successfully:', data.video);
                displayVideoInfo(data.video);
                showFeedback('Video processed successfully!', 'success');
            } else {
                throw new Error('Invalid response from server');
            }
            
        } catch (error) {
            console.error('❌ Error processing video:', error);
            
            if (error.message.includes('fetch')) {
                showFeedback('Backend server not running. Please start the Python server.', 'error');
            } else {
                showFeedback(error.message || 'Failed to process video', 'error');
            }
        } finally {
            hideLoading();
        }
    }
    
    // Handle form submission
    function handleSubmit() {
        if (isProcessing) return;
        
        try {
            const inputValue = youtubeInput.value.trim();
            
            if (!inputValue) {
                console.log('⚠️ Please enter a YouTube URL');
                showFeedback('Please enter a YouTube URL', 'warning');
                return;
            }
            
            if (!isValidYouTubeURL(inputValue)) {
                console.log('⚠️ Please enter a valid YouTube URL');
                showFeedback('Please enter a valid YouTube URL', 'warning');
                return;
            }
            
            // Process the video
            processVideo(inputValue);
            
        } catch (error) {
            console.error('❌ Error in handleSubmit:', error);
            showFeedback('An error occurred. Please try again.', 'error');
        }
    }
    
    // Visual feedback function
    function showFeedback(message, type) {
        // Remove any existing feedback
        const existingFeedback = document.querySelector('.feedback-message');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `feedback-message feedback-${type}`;
        feedback.textContent = message;
        
        // Style the feedback message
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            max-width: 90vw;
            text-align: center;
        `;
        
        // Set colors based on type
        switch (type) {
            case 'success':
                feedback.style.background = '#10b981';
                feedback.style.color = '#fff';
                break;
            case 'warning':
                feedback.style.background = '#f59e0b';
                feedback.style.color = '#fff';
                break;
            case 'error':
                feedback.style.background = '#ef4444';
                feedback.style.color = '#fff';
                break;
            case 'info':
                feedback.style.background = '#3b82f6';
                feedback.style.color = '#fff';
                break;
            default:
                feedback.style.background = '#6b7280';
                feedback.style.color = '#fff';
        }
        
        // Add to DOM and animate
        document.body.appendChild(feedback);
        
        // Trigger animation
        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
        });
        
        // Remove after 4 seconds (longer for processing messages)
        const duration = type === 'info' ? 6000 : 4000;
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, duration);
    }
    
    // Event listeners
    submitBtn.addEventListener('click', handleSubmit);
    
    // Handle Enter key press in input field
    youtubeInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleSubmit();
        }
    });
    
    // Add input validation on blur
    youtubeInput.addEventListener('blur', function() {
        const value = this.value.trim();
        if (value && !isValidYouTubeURL(value)) {
            this.style.borderBottom = '2px solid #ef4444';
        } else {
            this.style.borderBottom = 'none';
        }
    });
    
    // Clear validation styling on focus
    youtubeInput.addEventListener('focus', function() {
        this.style.borderBottom = 'none';
    });
    
    // Console welcome message
    console.log(`
    🎬 Welcome to Scroll Good with Backend Integration!
    
    This landing page now features:
    ✨ Animated background with gradient shimmer
    🎭 Special text morphing animation (l → d)
    🖼️ YouTube video thumbnail display
    📝 AI-powered video summaries
    📱 Fully responsive design
    ♿ Accessibility features
    🎯 YouTube URL validation
    🔗 Python Flask backend integration
    
    Backend API running at: http://localhost:5000
    Try pasting a YouTube URL and clicking the submit button!
    `);
});
