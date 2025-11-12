
// Defensive DOM bindings: if HTML was modified and elements are missing, avoid runtime errors
const searchInput = document.getElementById('searchInput');
if (searchInput) {
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
} else {
    console.warn('User.js: #searchInput not found — search functionality disabled');
}

const navItems = document.querySelectorAll('.nav-item');
if (navItems && navItems.length) {
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
} else {
    console.warn('User.js: .nav-item elements not found — nav highlighting disabled');
}

function openEditModal(id, firstName, lastName, role, email, contact, address) {
    const modal = document.getElementById('editModal');

    document.getElementById('editUserId').value = id;
    document.getElementById('editFirstName').value = firstName;
    document.getElementById('editLastName').value = lastName;
    document.getElementById('editUserRole').value = role;
    document.getElementById('editEmail').value = email;
    document.getElementById('editContact').value = contact;
    document.getElementById('editAddress').value = address;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function sendAudit(performedBy, actionType, details) {
    try {
        fetch('http://localhost:3001/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ performedBy: performedBy || null, actionType, details })
        }).then(r => r.json()).then(j => console.log('Audit:', j)).catch(e => {});
    } catch(e) {  }
}

function closeModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto'; // Restore scrolling
}

function saveUser() {
    const id = document.getElementById('editUserId').value;
    const firstName = document.getElementById('editFirstName').value;
    const lastName = document.getElementById('editLastName').value;
    const role = document.getElementById('editUserRole').value;
    const email = document.getElementById('editEmail').value;
    const contact = document.getElementById('editContact').value;
    const address = document.getElementById('editAddress').value;

    if (!firstName || !lastName || !email) {
        alert('Please fill in all required fields:\n- First Name\n- Last Name\n- Email');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

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

function updateTableRow(id, firstName, lastName, role, email) {
    const rows = document.querySelectorAll('.table-row');
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('div');

        if (cells[2].textContent === id) {

            cells[0].textContent = firstName;

            cells[1].textContent = lastName;

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

            cells[5].textContent = email;

            const contact = document.getElementById('editContact').value;
            const address = document.getElementById('editAddress').value;
            row.setAttribute('onclick', 
                `openEditModal('${id}', '${firstName}', '${lastName}', '${role}', '${email}', '${contact}', '${address}')`
            );
        }
    });
}

function resetPassword() {
    const userId = document.getElementById('editUserId').value;
    const firstName = document.getElementById('editFirstName').value;
    const lastName = document.getElementById('editLastName').value;
    const email = document.getElementById('editEmail').value;

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

function uploadPhoto() {
    const fileInput = document.getElementById('imageUpload');
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

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

function downloadPhoto() {
    const img = document.getElementById('profileImage');
    
    if (img.src && img.style.display !== 'none') {

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

function openAddModal() {
    const modal = document.getElementById('addModal');

    const rows = document.querySelectorAll('.table-row');
    let maxId = 0;
    rows.forEach(row => {
        const cells = row.querySelectorAll('div');
        const id = parseInt(cells[2].textContent);
        if (id > maxId) maxId = id;
    });
    const newId = String(maxId + 1).padStart(3, '0');

    document.getElementById('addUserId').value = newId;

    clearAddForm();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAddModal() {
    const modal = document.getElementById('addModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function clearAddForm() {
    document.getElementById('addFirstName').value = '';
    document.getElementById('addLastName').value = '';
    document.getElementById('addUserRole').value = 'Cashier';
    document.getElementById('addEmail').value = '';
    document.getElementById('addContact').value = '';
    document.getElementById('addAddress').value = '';

    const img = document.getElementById('addProfileImage');
    const placeholder = document.getElementById('addPlaceholderIcon');
    img.style.display = 'none';
    img.src = '';
    placeholder.style.display = 'block';
}

function addNewUser() {
    const id = document.getElementById('addUserId').value;
    const firstName = document.getElementById('addFirstName').value.trim();
    const lastName = document.getElementById('addLastName').value.trim();
    const role = document.getElementById('addUserRole').value;
    const email = document.getElementById('addEmail').value.trim();
    const contact = document.getElementById('addContact').value.trim();
    const address = document.getElementById('addAddress').value.trim();

    if (!firstName || !lastName || !email) {
        alert('Please fill in all required fields:\n- First Name\n- Last Name\n- Email');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

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


        const username = firstName || `user${id}`;

        const newPassword = (role && role.toString().toLowerCase() === 'admin') ? 'admin123' : 'cashier123';
        const performedBy = (function(){ try{ const u = JSON.parse(localStorage.getItem('currentUser')); return u && u.UserId ? u.UserId : null;}catch(e){return null;} })();
        fetch('http://localhost:3001/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, firstName, lastName, email, role, performedBy, password: newPassword })
        }).then(r => r.json()).then(j => {
            if (j && j.ok) {

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

                try { sendAudit(performedBy, 'AddUser', `Created user ${email} (id=${j.userId})`); } catch(e){}
            } else {
                alert('Failed to create user: ' + (j && j.error ? j.error : 'unknown'));
            }
        }).catch(e => { console.warn('API not available', e); alert('Could not reach API to add user.'); });
}

function uploadAddPhoto() {
    const fileInput = document.getElementById('addImageUpload');
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

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

document.addEventListener('DOMContentLoaded', function() {
    // wire Enter key on inputs
    const inputs = document.querySelectorAll('.input-field, .input-role');
    inputs.forEach(input => {
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();

                const editModal = document.getElementById('editModal');
                const addModal = document.getElementById('addModal');
                
                if (editModal && editModal.classList.contains('active')) {
                    saveUser();
                } else if (addModal && addModal.classList.contains('active')) {
                    addNewUser();
                }
            }
        });
    });

    // Fetch users from API and populate the user list so UI matches DB
    async function fetchUsers() {
        try {
            const res = await fetch('http://localhost:3001/api/users');
            const json = await res.json().catch(()=>null);
            if (!res.ok || !json || !json.ok) {
                console.warn('Failed to load users from API');
                return;
            }

            const users = json.rows || [];
            const userList = document.getElementById('userList');
            if (!userList) return;
            userList.innerHTML = '';

            users.forEach(u => {
                const full = u.FullName || '';
                const parts = full.trim().split(/\s+/);
                const first = parts.length ? parts[0] : '';
                const last = parts.length > 1 ? parts.slice(1).join(' ') : '';
                const role = u.Role || '';
                const dateCreated = u.CreatedAt ? new Date(u.CreatedAt).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '') : '';

                const roleBadgeClass = (role.toString().toLowerCase() === 'admin') ? 'role-admin' : (role.toString().toLowerCase() === 'manager' ? 'role-manager' : (role.toString().toLowerCase() === 'cashier' ? 'role-cashier' : 'role-staff'));

                const row = document.createElement('div');
                row.className = 'table-row';
                row.setAttribute('onclick', `openEditModal('${u.UserId}', '${escapeJs(first)}', '${escapeJs(last)}', '${escapeJs(role)}', '${escapeJs(u.Email||'')}', '', '')`);
                row.innerHTML = `
                    <div>${escapeHtml(first)}</div>
                    <div>${escapeHtml(last)}</div>
                    <div>${u.UserId}</div>
                    <div><span class="role-badge ${roleBadgeClass}">${escapeHtml(role)}</span></div>
                    <div>${escapeHtml(dateCreated)}</div>
                    <div>${escapeHtml(u.Email||'')}</div>
                `;
                userList.appendChild(row);
            });
        } catch (e) {
            console.warn('Could not fetch users', e);
        }
    }

    // small helpers to avoid injection when setting attributes
    function escapeHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
    function escapeJs(s) { return String(s || '').replace(/\\/g,'\\\\').replace(/'/g, "\\'").replace(/\"/g, '\\"'); }

    fetchUsers();
});