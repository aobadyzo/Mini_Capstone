// Orders data
const orders = [
    { 
        id: '001', 
        amount: '5 items', 
        price: '$250.00', 
        payment: 'Credit Card', 
        status: 'Completed', 
        address: '123 Main St, New York, NY' 
    },
    { 
        id: '002', 
        amount: '3 items', 
        price: '$180.00', 
        payment: 'PayPal', 
        status: 'Pending', 
        address: '456 Oak Ave, Los Angeles, CA' 
    },
    { 
        id: '003', 
        amount: '8 items', 
        price: '$420.00', 
        payment: 'Credit Card', 
        status: 'Processing', 
        address: '789 Pine Rd, Chicago, IL' 
    },
    { 
        id: '004', 
        amount: '2 items', 
        price: '$95.00', 
        payment: 'Cash', 
        status: 'Completed', 
        address: '321 Elm St, Houston, TX' 
    }
];

// Get status class
function getStatusClass(status) {
    switch(status.toLowerCase()) {
        case 'completed':
            return 'status-completed';
        case 'pending':
            return 'status-pending';
        case 'processing':
            return 'status-processing';
        case 'cancelled':
            return 'status-cancelled';
        default:
            return '';
    }
}

// Create SVG icons
function createCheckIcon() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`;
}

function createXIcon() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;
}

// Render orders table
function renderOrders(ordersToRender) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    ordersToRender.forEach(order => {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        row.innerHTML = `
            <div class="order-id">${order.id}</div>
            <div>${order.amount}</div>
            <div>${order.price}</div>
            <div>${order.payment}</div>
            <div>
                <span class="status-badge ${getStatusClass(order.status)}">
                    ${order.status}
                </span>
            </div>
            <div>${order.address}</div>
            <div class="action-buttons">
                <button class="action-btn check-btn" onclick="handleCheck('${order.id}')">
                    ${createCheckIcon()}
                </button>
                <button class="action-btn cancel-btn" onclick="handleCancel('${order.id}')">
                    ${createXIcon()}
                </button>
            </div>
        `;
        
        tableBody.appendChild(row);
    });
}

// Handle check button click
function handleCheck(orderId) {
    console.log('Check clicked for order:', orderId);
    alert(`Order ${orderId} approved!`);
}

// Handle cancel button click
function handleCancel(orderId) {
    console.log('Cancel clicked for order:', orderId);
    if (confirm(`Are you sure you want to cancel order ${orderId}?`)) {
        alert(`Order ${orderId} cancelled!`);
    }
}

// Search functionality
function handleSearch(searchTerm) {
    const filteredOrders = orders.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.payment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderOrders(filteredOrders);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Render initial orders
    renderOrders(orders);

    // Setup search input listener
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        handleSearch(e.target.value);
    });

    // Add click handlers to navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            const target = this.getAttribute('data-target');
            if (target) {
                // perform logout cleanup if navigating to login
                if (target.includes('Login')) {
                    try { localStorage.removeItem('currentUser'); } catch(e){}
                }
                window.location.href = target;
            }
        });
    });
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        orders,
        renderOrders,
        handleCheck,
        handleCancel,
        handleSearch
    };
}