
const DARK_MODE_KEY = 'dark_mode_enabled';
function initDarkMode() {
    const isDarkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
    applyDarkMode(isDarkMode);
}
function applyDarkMode(isDarkMode) {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    const toggle = document.querySelector('.toggle-off');
    if (toggle) {
        if (isDarkMode) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
    localStorage.setItem(DARK_MODE_KEY, isDarkMode);
}
function toggleDarkMode(event) {
    event.stopPropagation();
    event.preventDefault();
    
    const toggle = event.currentTarget;
    const isDarkMode = !document.body.classList.contains('dark-mode');
    applyDarkMode(isDarkMode);
}
window.addEventListener('storage', (event) => {
    if (event.key === DARK_MODE_KEY) {
        const isDarkMode = event.newValue === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
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
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    const toggle = document.querySelector('.toggle-off, #darkModeToggle');
    if (toggle) {
        toggle.removeEventListener('click', toggleDarkMode);
        toggle.addEventListener('click', toggleDarkMode);
    }
    console.log('Dark mode initialized, current state:', localStorage.getItem(DARK_MODE_KEY));
});