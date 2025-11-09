// Shared navigation helper for Menubar pages
(function () {
    // Map visible label -> target path (relative to Menubar/)
    const navMap = {
        'Dashboard': '../Home Page/index.html',
        'User': 'User.html',
        'Orders': 'Orders.html',
        'Analytics': 'Analytics.html',
        'Inventory': 'Inventory.html',
        'History': 'History.html',
        // 'POS' link will be conditionally added below based on logged-in role
        'Settings': 'Settings.html',
        'Logout': '#' // leave logout as placeholder
    };

    const items = document.querySelectorAll('.nav-item, .menu-item');
    if (!items || items.length === 0) return;

    // Determine current page name from filename or title
    const file = window.location.pathname.split('/').pop().toLowerCase();
    let currentName = '';
    if (file.includes('inventory')) currentName = 'Inventory';
    else if (file.includes('history')) currentName = 'History';
    else if (file.includes('analytics')) currentName = 'Analytics';
    else if (file.includes('orders')) currentName = 'Orders';
    else if (file.includes('pos')) currentName = 'POS';
    else if (file.includes('settings')) currentName = 'Settings';
    else if (file.includes('user')) currentName = 'User';
    else currentName = document.title || '';

    // Normalize text helper
    const norm = (s) => s.replace(/\s+/g, ' ').trim();

    // Set active state based on current page
    items.forEach(it => {
        const text = norm(it.textContent || it.innerText || '');
        if (text.toLowerCase().includes(currentName.toLowerCase())) {
            it.classList.add('active');
        } else {
            it.classList.remove('active');
        }
    });

    // Click handler to navigate
    items.forEach(it => {
        it.addEventListener('click', function (e) {
            // Prevent default anchor behaviour if any
            if (e && e.preventDefault) e.preventDefault();

            const label = norm(this.textContent || this.innerText || '');
            // Find a mapping key that matches the label (contains)
            let target = null;
            for (const k of Object.keys(navMap)) {
                if (label.toLowerCase().includes(k.toLowerCase())) {
                    target = navMap[k];
                    break;
                }
            }

            // Update active classes
            items.forEach(x => x.classList.remove('active'));
            this.classList.add('active');

            if (target && target !== '#') {
                window.location.href = target;
            } else if (label.toLowerCase().includes('logout')) {
                // Placeholder: implement logout flow if needed
                console.log('Logout clicked');
            }
        });
    });

    // Inject a POS nav item into the sidebar for cashier access (if a sidebar exists and POS isn't present)
    (function injectPosLink(){
        try{
            // Only inject/show POS link if currentUser role is 'cashier'
            let currentUser = null;
            try { currentUser = JSON.parse(localStorage.getItem('currentUser')); } catch(e) { currentUser = null; }
            if (!currentUser || (currentUser.Role || '').toLowerCase() !== 'cashier') return;
            const sidebar = document.querySelector('.sidebar');
            if (!sidebar) return;
            const existing = Array.from(sidebar.querySelectorAll('.nav-item, .menu-item')).some(n => /pos/i.test(n.textContent || ''));
            if (existing) return;
            const el = document.createElement('div');
            el.className = 'nav-item';
            el.innerHTML = `<div class="nav-icon"><span class="material-icons">point_of_sale</span></div><span>POS</span>`;
            // insert before the divider if present, else append
            const divider = sidebar.querySelector('.divider, .menu-divider');
            if (divider) sidebar.insertBefore(el, divider);
            else sidebar.appendChild(el);
            el.addEventListener('click', function(){ window.location.href = '../Cashier/pos.html'; });
        }catch(e){ console.warn('Failed to inject POS link', e); }
    })();
})();
