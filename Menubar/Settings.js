// Store data in memory instead of localStorage
let accountDataStore = {
  accountName: '',
  username: '',
  email: '',
  contact: '',
  password: ''
};

let maintenanceDataStore = {
  aboutUs: '',
  contactMessage: ''
};

// Load saved data on page load
window.addEventListener('DOMContentLoaded', () => {
  loadAccountData();
  loadMaintenanceData();
  loadDarkMode();
});

// Account Modal Functions
function openAccountModal() {
  document.getElementById('accountModal').classList.add('active');
}

function closeAccountModal() {
  document.getElementById('accountModal').classList.remove('active');
}

function loadAccountData() {
  document.getElementById('accountName').value = accountDataStore.accountName;
  document.getElementById('username').value = accountDataStore.username;
  document.getElementById('email').value = accountDataStore.email;
  document.getElementById('contact').value = accountDataStore.contact;
}

function saveAccountSettings(event) {
  event.preventDefault();
  
  accountDataStore.accountName = document.getElementById('accountName').value;
  accountDataStore.username = document.getElementById('username').value;
  accountDataStore.email = document.getElementById('email').value;
  accountDataStore.contact = document.getElementById('contact').value;
  
  const password = document.getElementById('password').value;
  if (password) {
    accountDataStore.password = password;
    document.getElementById('password').value = '';
  }
  
  const successMsg = document.getElementById('accountSuccess');
  successMsg.classList.add('show');
  setTimeout(() => successMsg.classList.remove('show'), 3000);
}

// Maintenance Modal Functions
function openMaintenanceModal() {
  document.getElementById('maintenanceModal').classList.add('active');
}

function closeMaintenanceModal() {
  document.getElementById('maintenanceModal').classList.remove('active');
}

function loadMaintenanceData() {
  document.getElementById('aboutUs').value = maintenanceDataStore.aboutUs;
  document.getElementById('contactMessage').value = maintenanceDataStore.contactMessage;
}

function saveMaintenanceSettings(event) {
  event.preventDefault();
  
  maintenanceDataStore.aboutUs = document.getElementById('aboutUs').value;
  maintenanceDataStore.contactMessage = document.getElementById('contactMessage').value;
  
  const successMsg = document.getElementById('maintenanceSuccess');
  successMsg.classList.add('show');
  setTimeout(() => successMsg.classList.remove('show'), 3000);
}

// Dark Mode Toggle
function toggleDarkMode(event) {
  event.stopPropagation();
  const toggle = event.target;
  // Use shared theme API if available
  let next;
  if (window.MiniCapstoneTheme && typeof window.MiniCapstoneTheme.toggle === 'function') {
    next = window.MiniCapstoneTheme.toggle();
  } else {
    // fallback: toggle local class
    toggle.classList.toggle('active');
    next = toggle.classList.contains('active');
    if (next) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
  }

  // Reflect state on the toggle element
  if (next) toggle.classList.add('active'); else toggle.classList.remove('active');
}

function loadDarkMode() {
  const toggle = document.querySelector('.toggle-off');
  if (!toggle) return;

  const isDark = window.MiniCapstoneTheme && typeof window.MiniCapstoneTheme.isDark === 'function'
    ? window.MiniCapstoneTheme.isDark()
    : false;

  if (isDark) {
    toggle.classList.add('active');
    document.body.classList.add('dark-mode');
  } else {
    toggle.classList.remove('active');
    document.body.classList.remove('dark-mode');
  }
}

// Close modals when clicking outside
window.onclick = function(event) {
  const accountModal = document.getElementById('accountModal');
  const maintenanceModal = document.getElementById('maintenanceModal');
  
  if (event.target === accountModal) {
    closeAccountModal();
  }
  if (event.target === maintenanceModal) {
    closeMaintenanceModal();
  }
}