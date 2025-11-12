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

let darkModeStore = false;

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
  toggle.classList.toggle('active');
  
  darkModeStore = toggle.classList.contains('active');
  
  if (darkModeStore) {
    document.body.style.filter = 'invert(1) hue-rotate(180deg)';
  } else {
    document.body.style.filter = 'none';
  }
}

function loadDarkMode() {
  const toggle = document.querySelector('.toggle-off');
  
  if (darkModeStore) {
    toggle.classList.add('active');
    document.body.style.filter = 'invert(1) hue-rotate(180deg)';
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

// Navigation for menu items
document.querySelectorAll('.menu-item').forEach(mi => {
  mi.addEventListener('click', function() {
    const target = this.getAttribute('data-target');
    if (target) {
      if (target.includes('Login')) {
        try { localStorage.removeItem('currentUser'); } catch(e){}
      }
      window.location.href = target;
    }
  });
});