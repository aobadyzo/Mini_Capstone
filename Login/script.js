const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});

// Local users for demo
const localUsers = [
    { UserId: 1, Username: 'admin', Email: 'admin@example.local', PasswordHash: 'admin123', FullName: 'Administrator', Role: 'admin', CreatedAt: new Date().toISOString() },
    { UserId: 2, Username: 'cashier', Email: 'cashier@example.local', PasswordHash: 'cashier123', FullName: 'Cashier User', Role: 'cashier', CreatedAt: new Date().toISOString() }
];

// Calculate age from birthdate
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

// Set max date for birthdate (must be 18+)
const birthDateInput = document.getElementById('regBirthDate');
const today = new Date();
const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
birthDateInput.max = maxDate.toISOString().split('T')[0];

// Login form handler
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const inputs = loginForm.querySelectorAll('input');
    const username = inputs[0].value.trim();
    const password = inputs[1].value.trim();

    const user = localUsers.find(u => 
        (u.Username && u.Username.toLowerCase() === username.toLowerCase()) || 
        (u.Email && u.Email.toLowerCase() === username.toLowerCase())
    );

    if (user && password === user.PasswordHash) {
        loginMessage.className = 'message success';
        loginMessage.textContent = `Welcome back, ${user.FullName}! Role: ${user.Role}`;
    } else {
        loginMessage.className = 'message error';
        loginMessage.textContent = 'Invalid credentials or user not found';
    }
});

// Register form handler
const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

registerForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    
    const username = document.getElementById('regUsername').value.trim();
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const contact = document.getElementById('regContact').value.trim();
    const birthDate = document.getElementById('regBirthDate').value;
    const address = document.getElementById('regAddress').value.trim();

    // Validate age (18+)
    const age = calculateAge(birthDate);
    if (age < 18) {
        registerMessage.className = 'message error';
        registerMessage.textContent = 'You must be 18 years or older to register';
        return;
    }

    // Validate password match
    if (password !== confirmPassword) {
        registerMessage.className = 'message error';
        registerMessage.textContent = 'Passwords do not match';
        return;
    }

    // Check if user exists
    const exists = localUsers.find(u => 
        u.Username.toLowerCase() === username.toLowerCase() || 
        u.Email.toLowerCase() === email.toLowerCase()
    );

    if (exists) {
        registerMessage.className = 'message error';
        registerMessage.textContent = 'Username or email already exists';
    } else {
        const newUser = {
            UserId: localUsers.length + 1,
            Username: username,
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            PasswordHash: password,
            FullName: `${firstName} ${lastName}`,
            Contact: contact,
            BirthDate: birthDate,
            Address: address,
            Role: 'user',
            CreatedAt: new Date().toISOString()
        };
        localUsers.push(newUser);
        registerMessage.className = 'message success';
        registerMessage.textContent = 'Registration successful! You can now login.';
        registerForm.reset();
    }
});