// Search functionality
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const rows = document.querySelectorAll('.table-row');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = 'grid';
        } else {
            row.style.display = 'none';
        }
    });
});

// Navigation
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', function() {
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
    });
});

// Open Edit Modal - Populates with user data
function openEditModal(id, firstName, lastName, role, email, contact, address) {
    const modal = document.getElementById('editModal');
    
    // Populate fields with user data
    document.getElementById('editUserId').value = id;
    document.getElementById('editFirstName').value = firstName;
    document.getElementById('editLastName').value = lastName;
    document.getElementById('editUserRole').value = role;
    document.getElementById('editEmail').value = email;
    document.getElementById('editContact').value = contact;
    document.getElementById('editAddress').value = address;
    
    // Show modal with animation
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Audit helper (best-effort client-side wrapper)
function sendAudit(performedBy, actionType, details) {
    try {
        fetch('http://localhost:3001/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ performedBy: performedBy || null, actionType, details })
        }).then(r => r.json()).then(j => console.log('Audit:', j)).catch(e => {/* ignore */});
    } catch(e) { /* ignore */ }
}

// Close Modal
function closeModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Save User - Updates user information
function saveUser() {
    const id = document.getElementById('editUserId').value;
    const firstName = document.getElementById('editFirstName').value;
    const lastName = document.getElementById('editLastName').value;
    const role = document.getElementById('editUserRole').value;
    const email = document.getElementById('editEmail').value;
    const contact = document.getElementById('editContact').value;
    const address = document.getElementById('editAddress').value;
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
        alert('Please fill in all required fields:\n- First Name\n- Last Name\n- Email');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Call server to update user so DB and audit logs are updated
    const performedBy = (function(){ try{ const u = JSON.parse(localStorage.getItem('currentUser')); return u && u.UserId ? u.UserId : null;}catch(e){return null;} })();
    fetch(`http://localhost:3001/api/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, role, performedBy })
    }).then(r => r.json()).then(j => {
        if (j && j.ok) {
            updateTableRow(id, firstName, lastName, role, email);
            alert('✅ User information saved successfully!');
            closeModal();
            try { sendAudit(performedBy, 'EditUser', `Edited user id=${id} (${firstName} ${lastName})`); } catch(e){}
        } else {
            alert('Failed to update user: ' + (j && j.error ? j.error : 'unknown'));
        }
    }).catch(e => { console.warn('API not available', e); alert('Could not reach API to update user.'); });
}

// Update Table Row with new data
function updateTableRow(id, firstName, lastName, role, email) {
    const rows = document.querySelectorAll('.table-row');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('div');
        // Find row by ID (3rd cell)
        if (cells[2].textContent === id) {
            // Update first name
            cells[0].textContent = firstName;
            
            // Update last name
            cells[1].textContent = lastName;
            
            // Update role badge
            const roleBadge = cells[3].querySelector('.role-badge');
            roleBadge.textContent = role;
            roleBadge.className = 'role-badge';
            if (role === 'Admin') {
                roleBadge.classList.add('role-admin');
            } else if (role === 'Manager') {
                roleBadge.classList.add('role-manager');
            } else if (role === 'Cashier') {
                roleBadge.classList.add('role-cashier');
            } else {
                roleBadge.classList.add('role-staff');
            }
            
            // Update email
            cells[5].textContent = email;
            
            // Update onclick attribute with new data
            const contact = document.getElementById('editContact').value;
            const address = document.getElementById('editAddress').value;
            row.setAttribute('onclick', 
                `openEditModal('${id}', '${firstName}', '${lastName}', '${role}', '${email}', '${contact}', '${address}')`
            );
        }
    });
}

// Reset Password functionality
function resetPassword() {
    const userId = document.getElementById('editUserId').value;
    const firstName = document.getElementById('editFirstName').value;
    const lastName = document.getElementById('editLastName').value;
    const email = document.getElementById('editEmail').value;
    // Only allow resetting another user's password if current user is Admin
    const currentUser = (function(){ try{ return JSON.parse(localStorage.getItem('currentUser')); }catch(e){return null;} })();
    if (!currentUser) { alert('No current user session found'); return; }
    if (Number(currentUser.UserId) !== Number(userId) && ((currentUser.Role||'').toString().toLowerCase() !== 'admin')) {
        alert('You may only reset your own password. Admins can reset other users.');
        return;
    }

    const confirmed = confirm(
        `Reset password for:\n\n` +
        `User ID: ${userId}\n` +
        `Name: ${firstName} ${lastName}\n` +
        `Email: ${email}\n\n` +
        `This will set the user's password back to the default for their role. Continue?`
    );
    if (!confirmed) return;

    // Determine default password by role
    const role = document.getElementById('editUserRole').value || '';
    const defaultPw = (role.toString().toLowerCase() === 'admin') ? 'admin123' : 'cashier123';
    const performedBy = (function(){ try{ const u = JSON.parse(localStorage.getItem('currentUser')); return u && u.UserId ? u.UserId : null;}catch(e){return null;} })();

    fetch(`http://localhost:3001/api/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, role, performedBy, newPassword: defaultPw })
    }).then(r => r.json()).then(j => {
        if (j && j.ok) {
            alert('Password has been reset to default for this role.');
            try { sendAudit(performedBy, 'ChangedPassword', `Reset password for user id=${userId}`); } catch(e){}
        } else {
            alert('Failed to reset password: ' + (j && j.error ? j.error : 'unknown'));
        }
    }).catch(e => { console.warn('API not available', e); alert('Could not reach API to reset password.'); });
}

// Upload Photo functionality - Edit profile picture
function uploadPhoto() {
    const fileInput = document.getElementById('imageUpload');
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = document.getElementById('profileImage');
                const placeholder = document.getElementById('placeholderIcon');
                
                img.src = event.target.result;
                img.style.display = 'block';
                placeholder.style.display = 'none';
                
                console.log('Profile picture updated');
            };
            reader.readAsDataURL(file);
        }
    };
    
    fileInput.click();
}

// Download Photo functionality - Archive profile picture
function downloadPhoto() {
    const img = document.getElementById('profileImage');
    
    if (img.src && img.style.display !== 'none') {
        // Create a temporary link to download the image
        const link = document.createElement('a');
        link.href = img.src;
        link.download = `profile_${document.getElementById('editUserId').value}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Profile picture downloaded');
    } else {
        alert('No profile picture to download. Please upload a profile picture first.');
    }
}

// Add New User Modal
function openAddModal() {
    const modal = document.getElementById('addModal');
    
    // Generate new user ID
    const rows = document.querySelectorAll('.table-row');
    let maxId = 0;
    rows.forEach(row => {
        const cells = row.querySelectorAll('div');
        const id = parseInt(cells[2].textContent);
        if (id > maxId) maxId = id;
    });
    const newId = String(maxId + 1).padStart(3, '0');
    
    // Set the ID field
    document.getElementById('addUserId').value = newId;
    
    // Clear all form fields
    clearAddForm();
    
    // Show modal with animation
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close Add Modal
function closeAddModal() {
    const modal = document.getElementById('addModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Clear Add Form
function clearAddForm() {
    document.getElementById('addFirstName').value = '';
    document.getElementById('addLastName').value = '';
    document.getElementById('addUserRole').value = 'Staff';
    document.getElementById('addEmail').value = '';
    document.getElementById('addContact').value = '';
    document.getElementById('addAddress').value = '';
    
    // Reset profile picture
    const img = document.getElementById('addProfileImage');
    const placeholder = document.getElementById('addPlaceholderIcon');
    img.style.display = 'none';
    img.src = '';
    placeholder.style.display = 'block';
}

// Add New User
function addNewUser() {
    const id = document.getElementById('addUserId').value;
    const firstName = document.getElementById('addFirstName').value.trim();
    const lastName = document.getElementById('addLastName').value.trim();
    const role = document.getElementById('addUserRole').value;
    const email = document.getElementById('addEmail').value.trim();
    const contact = document.getElementById('addContact').value.trim();
    const address = document.getElementById('addAddress').value.trim();
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
        alert('Please fill in all required fields:\n- First Name\n- Last Name\n- Email');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Check for duplicate email
    const rows = document.querySelectorAll('.table-row');
    let emailExists = false;
    rows.forEach(row => {
        const cells = row.querySelectorAll('div');
        if (cells[5].textContent.toLowerCase() === email.toLowerCase()) {
            emailExists = true;
        }
    });
    
    if (emailExists) {
        alert('This email address is already registered. Please use a different email.');
        return;
    }
        // Prefer server-side creation so DB and audit logs are updated
        // Use firstName as username by default
        const username = firstName || `user${id}`;
        // Default password based on role
        const newPassword = (role && role.toString().toLowerCase() === 'admin') ? 'admin123' : 'cashier123';
        const performedBy = (function(){ try{ const u = JSON.parse(localStorage.getItem('currentUser')); return u && u.UserId ? u.UserId : null;}catch(e){return null;} })();
        fetch('http://localhost:3001/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, firstName, lastName, email, role, performedBy, password: newPassword })
        }).then(r => r.json()).then(j => {
            if (j && j.ok) {
                // Append row locally for immediate UI feedback
                const now = new Date();
                const dateCreated = now.toLocaleString('en-US', {
                    month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                }).replace(',', '');
                const userList = document.getElementById('userList');
                const newRow = document.createElement('div');
                newRow.className = 'table-row';
                newRow.style.animation = 'slideInRow 0.5s ease-out';
                newRow.setAttribute('onclick', `openEditModal('${j.userId}', '${firstName}', '${lastName}', '${role}', '${email}', '${contact}', '${address}')`);
                let roleBadgeClass = 'role-staff';
                if (role === 'Admin') roleBadgeClass = 'role-admin';
                else if (role === 'Manager') roleBadgeClass = 'role-manager';
                else if (role === 'Cashier') roleBadgeClass = 'role-cashier';
                newRow.innerHTML = `
                    <div>${firstName}</div>
                    <div>${lastName}</div>
                    <div>${j.userId}</div>
                    <div><span class="role-badge ${roleBadgeClass}">${role}</span></div>
                    <div>${dateCreated}</div>
                    <div>${email}</div>
                `;
                userList.appendChild(newRow);
                alert(`✅ User account created successfully!\n\nUser ID: ${j.userId}\nName: ${firstName} ${lastName}\nEmail: ${email}\nRole: ${role}`);
                closeAddModal();
                // Audit already recorded server-side, but attempt a lightweight client audit log as well (best-effort)
                try { sendAudit(performedBy, 'AddUser', `Created user ${email} (id=${j.userId})`); } catch(e){}
            } else {
                alert('Failed to create user: ' + (j && j.error ? j.error : 'unknown'));
            }
        }).catch(e => { console.warn('API not available', e); alert('Could not reach API to add user.'); });
}

// Upload Photo for Add Modal
function uploadAddPhoto() {
    const fileInput = document.getElementById('addImageUpload');
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = document.getElementById('addProfileImage');
                const placeholder = document.getElementById('addPlaceholderIcon');
                
                img.src = event.target.result;
                img.style.display = 'block';
                placeholder.style.display = 'none';
                
                console.log('Profile picture uploaded for new user');
            };
            reader.readAsDataURL(file);
        }
    };
    
    fileInput.click();
}

// Close modal when pressing ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const editModal = document.getElementById('editModal');
        const addModal = document.getElementById('addModal');
        
        if (editModal.classList.contains('active')) {
            closeModal();
        } else if (addModal.classList.contains('active')) {
            closeAddModal();
        }
    }
});

// Prevent form submission on Enter key in input fields
document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('.input-field, .input-role');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                
                // Check which modal is active
                const editModal = document.getElementById('editModal');
                const addModal = document.getElementById('addModal');
                
                if (editModal.classList.contains('active')) {
                    saveUser();
                } else if (addModal.classList.contains('active')) {
                    addNewUser();
                }
            }
        });
    });
});