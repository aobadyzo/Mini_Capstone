const container = document.querySelector('.container');
console.log('Login script loaded');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');
registerBtn.addEventListener('click', () => {
        document.querySelector('.container').classList.add('active');
});
loginBtn.addEventListener('click', () => {
         document.querySelector('.container').classList.remove('active');
});
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.form-box.login form');
    if (!loginForm) return;
    loginForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const username = loginForm.querySelectorAll('input')[0].value.trim();
        const password = loginForm.querySelectorAll('input')[1].value.trim();
        const localUsers = [
            { UserId: 1, Username: 'admin', Email: 'admin@example.local', PasswordHash: 'admin123', FullName: 'Administrator', Role: 'admin', CreatedAt: new Date().toISOString() },
            { UserId: 2, Username: 'cashier', Email: 'cashier@example.local', PasswordHash: 'cashier123', FullName: 'Cashier User', Role: 'cashier', CreatedAt: new Date().toISOString() }
            ,{ UserId: 3, Username: 'customer', Email: 'customer@example.local', PasswordHash: 'customer123', FullName: 'Customer User', Role: 'customer', CreatedAt: new Date().toISOString() }
        ];
        const performLoginCheck = (jsonData) => {
            try {
                console.log('API rows count:', jsonData && jsonData.rows ? jsonData.rows.length : 'no rows');
                if (jsonData && jsonData.ok && Array.isArray(jsonData.rows)) {
                    console.log('Searching users for', username);
                    const user = jsonData.rows.find(u => (u.Username && u.Username.toLowerCase() === username.toLowerCase()) || (u.Email && u.Email.toLowerCase() === username.toLowerCase()));
                    console.log('Found user object:', user);
                    if (user) {
                        const storedHash = (user.PasswordHash || '').toString().trim();
                        console.log('Comparing entered password (len)', password.length, 'to stored PasswordHash (trimmed):', storedHash ? `(len ${storedHash.length})` : '(empty)');
                        if (password === storedHash) {
                            try { localStorage.setItem('currentUser', JSON.stringify(user)); } catch (e) { console.warn('Could not persist currentUser', e); }
                            const baseUrl = location.origin;
                            console.log('Redirecting user:', user.Role);
                            try {
                                const auditHost = successfulHost || 'http://localhost:3001';
                                if (auditHost !== 'localFallback') {
                                    fetch(auditHost.replace(/\/$/, '') + '/api/audit', {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ performedBy: user.UserId || null, actionType: 'Login', details: `User ${user.Username || user.Email} logged in` })
                                    }).catch(e => {});
                                }
                            } catch(e) {  }
                            try {
                                const role = (user.Role || '').toLowerCase();
                                if (role === 'cashier') {
                                    window.location.href = `${baseUrl}/Cashier/POS/CreateOrder.html`;
                                } else if (role === 'admin') {
                                    window.location.href = `${baseUrl}/Admin/Inventory.html`;
                                } else {
                                    window.location.href = `${baseUrl}/Landing%20Page/Home.html`;
                                }
                            } catch (redirErr) { console.error('Redirection failed', redirErr); }
                            return true;
                        } else {
                            console.log('Password mismatch for user', user.Username);
                        }
                    } else {
                        console.log('User not found in rows');
                    }
                } else {
                    console.log('No valid JSON rows to search');
                }
            } catch (err) {
                console.warn('performLoginCheck error', err);
            }
            return false;
        };
    try {
            const apiCandidates = [
                location.origin,
                'http://localhost:3001'
            ];
            const fetchWithTimeout = (url, opts = {}, ms = 3000) => {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), ms);
                return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
            };
            let json = null;
            let successfulHost = null;
            for (const host of apiCandidates) {
                const url = host.replace(/\/+$/, '') + '/api/users';
                console.log('Trying API host', url);
                try {
                    const res = await fetchWithTimeout(url);
                    if (!res.ok) {
                        console.log('Host responded but status not OK', res.status, url);
                        continue;
                    }
                    json = await res.json();
                    console.log('Got JSON from', url, json);
                    if (json && json.ok) {
                        successfulHost = url;
                        break;
                    }
                } catch (e) {
                    console.log('Fetch failed for', url, e && e.name ? e.name : e);
                }
            }
            console.log('API finished, selected host:', successfulHost);
            if (!json) {
                console.log('No API response, using local fallback users for testing');
                json = { ok: true, rows: localUsers };
                successfulHost = 'localFallback';
            }
            if (performLoginCheck(json)) return;
            alert('Invalid credentials or user not found');
        } catch (e) {
            console.warn('Login API error', e);
            json = { ok: true, rows: localUsers };
            console.log('Using local fallback users due to API error');
            if (performLoginCheck(json)) return;
            alert('Invalid credentials or user not found');
        }
    });
});
