// Dark mode state management
const DARK_MODE_KEY = 'dark_mode_enabled';

// Initialize dark mode from localStorage
function initDarkMode() {
    const isDarkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
    applyDarkMode(isDarkMode);
}

// Apply dark mode state to the UI
function applyDarkMode(isDarkMode) {
    // Update body class
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    // Update toggle button if it exists
    const toggle = document.querySelector('.toggle-off');
    if (toggle) {
        if (isDarkMode) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }

    // Save state to localStorage
    localStorage.setItem(DARK_MODE_KEY, isDarkMode);
}

// Toggle dark mode
function toggleDarkMode(event) {
    event.stopPropagation();
    event.preventDefault();
    
    const toggle = event.currentTarget;
    const isDarkMode = !document.body.classList.contains('dark-mode');
    applyDarkMode(isDarkMode);
}

// Listen for dark mode changes from other pages
window.addEventListener('storage', (event) => {
    if (event.key === DARK_MODE_KEY) {
        const isDarkMode = event.newValue === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Update toggle button if it exists
        const toggle = document.querySelector('.toggle-off');
        if (toggle) {
            if (isDarkMode) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    }
});

// Initialize dark mode and event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // First initialize the dark mode state
    initDarkMode();
    
    // Then set up the toggle button event listener
    const toggle = document.querySelector('.toggle-off, #darkModeToggle');
    if (toggle) {
        // Remove any existing click listeners
        toggle.removeEventListener('click', toggleDarkMode);
        // Add the click listener
        toggle.addEventListener('click', toggleDarkMode);
    }
    
    // Debug log
    console.log('Dark mode initialized, current state:', localStorage.getItem(DARK_MODE_KEY));
});