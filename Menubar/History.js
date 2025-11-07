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

// When a tab becomes active, fetch logs from backend (if available)
tabs.forEach(tab => {
    tab.addEventListener('click', async function() {
        const tabName = this.textContent;
        try {
            if (tabName === 'Audit Logs') {
                const res = await fetch('http://localhost:3001/api/logs/audit');
                const json = await res.json();
                if (json.ok) renderAuditRows(json.rows);
            } else if (tabName === 'Transaction Logs') {
                const res = await fetch('http://localhost:3001/api/logs/transactions');
                const json = await res.json();
                if (json.ok) renderTransactionRows(json.rows);
            } else if (tabName === 'Inventory Logs') {
                const res = await fetch('http://localhost:3001/api/logs/inventory');
                const json = await res.json();
                if (json.ok) renderInventoryLogRows(json.rows);
            }
        } catch (e) {
            // Backend not available - keep using static content
            console.warn('Logs API not available', e);
        }
    });
});

function renderAuditRows(rows = []) {
    const container = document.getElementById('auditContent');
    if (!container) return;
    container.innerHTML = rows.map(r => `
        <div class="table-row">
            <div>${r.AuditLogId}</div>
            <div>${r.PerformedByUserId || ''}</div>
            <div>${r.ActionType}</div>
            <div>${new Date(r.EventTime).toLocaleString()}</div>
        </div>
    `).join('');
}

function renderTransactionRows(rows = []) {
    const container = document.getElementById('transactionContent');
    if (!container) return;
    container.innerHTML = rows.map(r => `
        <div class="table-row">
            <div>${r.TransactionLogId}</div>
            <div>${r.OrderId}</div>
            <div>${r.ProcessedByUserId || ''}</div>
            <div>${r.PaymentMethod}</div>
            <div>${r.AmountPaid}</div>
            <div>${new Date(r.TransactionDate).toLocaleString()}</div>
        </div>
    `).join('');
}

function renderInventoryLogRows(rows = []) {
    const container = document.getElementById('inventoryContent');
    if (!container) return;
    container.innerHTML = rows.map(r => `
        <div class="table-row">
            <div>${r.HistoryId}</div>
            <div>${r.ProductId}</div>
            <div>${r.BatchId || ''}</div>
            <div>${r.PerformedByUserId || ''}</div>
            <div>${r.ActionType}</div>
            <div>${new Date(r.CreatedAt).toLocaleString()}</div>
        </div>
    `).join('');
}