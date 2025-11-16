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

// Fetch users from API for admin usage
async function fetchUsersFromApi() {
  try {
    const res = await fetch('http://localhost:3001/api/users');
    const json = await res.json();
    if (json && json.ok && Array.isArray(json.rows)) {
      console.log('Users from API:', json.rows);
      return json.rows;
    }
  } catch (e) {
    console.warn('Users API not available', e);
  }
  return [];
}

// Account Modal Functions
function openAccountModal() {
  // Populate fields with current user info when opening
  try {
    const currentUser = (function(){ try{ return JSON.parse(localStorage.getItem('currentUser')); }catch(e){return null;} })();
    if (currentUser && currentUser.UserId) {
      // Try to fetch fresh user data from API
      (async function(){
        try {
          const res = await fetch('http://localhost:3001/api/users');
          const json = await res.json();
          if (json && json.ok && Array.isArray(json.rows)) {
            const user = json.rows.find(u => Number(u.UserId) === Number(currentUser.UserId));
            if (user) {
              // Fill fields: accountName = FullName, username = Username, email, contact
              document.getElementById('accountName').value = user.FullName || '';
              document.getElementById('username').value = user.Username || '';
              document.getElementById('email').value = user.Email || '';
              // contact not stored in Users table; leave as is
              document.getElementById('contact').value = '';
            }
          }
        } catch(e){
          // fallback to localStorage values
          if (currentUser) {
            document.getElementById('accountName').value = currentUser.FullName || currentUser.Fullname || '';
            document.getElementById('username').value = currentUser.Username || '';
            document.getElementById('email').value = currentUser.Email || '';
          }
        }
      })();
    }
  } catch(e){}
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
  
  // Only allow saving own account (username/password) via API
  const currentUser = (function(){ try{ return JSON.parse(localStorage.getItem('currentUser')); }catch(e){return null;} })();
  const accountName = document.getElementById('accountName').value;
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const contact = document.getElementById('contact').value;
  const password = document.getElementById('password').value;

  if (currentUser && currentUser.UserId) {
    // split accountName into first/last
    const parts = (accountName || '').trim().split(/\s+/);
    const firstName = parts.length ? parts[0] : '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    const payload = { firstName, lastName, email, performedBy: currentUser.UserId, username };
    if (password && password.length) payload.newPassword = password;
    fetch(`http://localhost:3001/api/users/${encodeURIComponent(currentUser.UserId)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).then(r => r.json()).then(j => {
      if (j && j.ok) {
        const successMsg = document.getElementById('accountSuccess');
        successMsg.classList.add('show');
        setTimeout(() => successMsg.classList.remove('show'), 3000);
        document.getElementById('password').value = '';
        // update localStorage currentUser username/email
        try { currentUser.Username = username; currentUser.Email = email; currentUser.FullName = accountName; localStorage.setItem('currentUser', JSON.stringify(currentUser)); } catch(e){}
      } else {
        alert('Failed to save account settings: ' + (j && j.error ? j.error : 'unknown'));
      }
    }).catch(e => { console.warn('Could not reach API to save account', e); alert('Could not reach API to save account settings.'); });
  } else {
    alert('No current user session found');
  }
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