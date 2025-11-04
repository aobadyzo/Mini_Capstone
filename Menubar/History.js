// Tab configuration with headers
const tabConfig = {
    'Audit Logs': {
        headers: ['LOG ID', 'PERFORMED BY', 'ACTION TYPE', 'DATE PERFORMED'],
        class: 'audit-header',
        contentId: 'auditContent'
    },
    'Transaction Logs': {
        headers: ['TRANSACTION LOG ID', 'ORDER ID', 'PROCESSED BY', 'PAYMENT METHOD', 'AMOUNT PAID', 'DATE'],
        class: 'transaction-header',
        contentId: 'transactionContent'
    },
    'Inventory Logs': {
        headers: ['INVENTORY LOG ID', 'PRODUCT ID', 'BATCH ID', 'PERFORMED BY', 'ACTION TYPE', 'DATE'],
        class: 'inventory-header',
        contentId: 'inventoryContent'
    }
};

const tableHeader = document.getElementById('tableHeader');
const tabs = document.querySelectorAll('.tab');
const contentSections = document.querySelectorAll('.content-section');

// Tab functionality
tabs.forEach(tab => {
    tab.addEventListener('click', function() {
        const tabName = this.textContent;
        const config = tabConfig[tabName];

        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        // Update table headers
        if (config) {
            tableHeader.innerHTML = config.headers.map(h => `<div>${h}</div>`).join('');
            tableHeader.className = 'table-header ' + config.class;

            // Show corresponding content
            contentSections.forEach(section => section.classList.remove('active'));
            document.getElementById(config.contentId).classList.add('active');
        }
    });
});

// Search functionality
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const activeContent = document.querySelector('.content-section.active');
    const rows = activeContent.querySelectorAll('.table-row');
    
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
        // Remove active from all
        navItems.forEach(nav => nav.classList.remove('active'));
        // Add active to clicked
        this.classList.add('active');
    });
});

// Initialize with Audit Logs headers
const initialConfig = tabConfig['Audit Logs'];
tableHeader.className = 'table-header ' + initialConfig.class;