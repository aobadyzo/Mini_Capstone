// removed browser-only import of bcrypt; this file runs in the browser as a plain script
const container = document.querySelector('.container');
console.log('Login script loaded');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

// Local fallback users for testing when the API server is not running


registerBtn.addEventListener('click', () => {
        document.querySelector('.container').classList.add('active');
});

loginBtn.addEventListener('click', () => {
         document.querySelector('.container').classList.remove('active');
});

// Hook into the login form and attempt a simple login using /api/users
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.form-box.login form');
    if (!loginForm) return;
    loginForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const username = loginForm.querySelectorAll('input')[0].value.trim();
        const password = loginForm.querySelectorAll('input')[1].value.trim();

        try {
            // Try common API hosts in order. If your API runs on port 3001 (default), the first will succeed.
            const apiCandidates = [
                `${location.protocol}//${location.hostname}:3001`,
                'http://localhost:3001',
                // fallback to same origin (if the static files are served by the server)
                `${location.protocol}//${location.hostname}${location.port ? (':' + location.port) : ''}`
            ];

            // Helper to fetch with timeout
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
                    // try next candidate
                }
            }
            console.log('API finished, selected host:', successfulHost);

            // If no API host succeeded, fall back to local test users so redirection can be verified without running the server
            if (!json) {
                console.log('No API response, using local fallback users for testing');
                json = { ok: true, rows: localUsers };
                successfulHost = 'localFallback';
            }

            console.log('API rows count:', json && json.rows ? json.rows.length : 'no rows');
            if (json && json.ok && Array.isArray(json.rows)) {
                console.log('Searching users for', username);
                // find user by username or email
                const user = json.rows.find(u => (u.Username && u.Username.toLowerCase() === username.toLowerCase()) || (u.Email && u.Email.toLowerCase() === username.toLowerCase()));
                console.log('Found user object:', user);
                if (user) {
                    // Validate password by comparing plain text (for demo purposes)
                    const storedHash = (user.PasswordHash || '').toString().trim();
                    console.log('Comparing entered password (len)', password.length, 'to stored PasswordHash (trimmed):', storedHash ? `(len ${storedHash.length})` : '(empty)');
                    if (password === storedHash) {
                        // Persist current user in localStorage so other pages (nav) can adjust UI
                        try {
                            localStorage.setItem('currentUser', JSON.stringify(user));
                        } catch (e) { console.warn('Could not persist currentUser', e); }

                        const baseUrl = `${location.protocol}//${location.hostname}${location.port ? (':' + location.port) : ''}`;
                        console.log('Redirecting user:', user.Role);
                        try {
                            if ((user.Role || '').toLowerCase() === 'cashier') {
                                window.location.href = `${baseUrl}/Cashier/pos.html`;
                            } else {
                                window.location.href = `${baseUrl}/Menubar/Inventory.html`;
                            }
                        } catch (redirErr) {
                            console.error('Redirection failed', redirErr);
                        }
                        return;
                    } else {
                        console.log('Password mismatch for user', user.Username);
                    }
                } else {
                    console.log('User not found in rows');
                }
            } else {
                console.log('No valid JSON rows to search');
            }
            alert('Invalid credentials or user not found');
        } catch (e) {
            console.warn('Login API error', e);
            alert('Login failed: could not reach API. Start the API server (cd server && npm install && npm run start) and try again.');
        }
    });
});
