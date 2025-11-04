// Orders Data
const ordersData = [
    {
        id: 'ORD-001',
        customer: 'John Doe',
        totalItems: 5,
        payment: 'Credit Card',
        status: 'completed',
        address: '123 Main St, New York, NY',
        date: '2024-11-01',
        totalPrice: '$150.00',
        items: [
            { name: 'Fresh Fish', quantity: 2, price: '$40.00' },
            { name: 'Chicken Breast', quantity: 3, price: '$110.00' }
        ]
    },
    {
        id: 'ORD-002',
        customer: 'Jane Smith',
        totalItems: 8,
        payment: 'Cash',
        status: 'processing',
        address: '456 Oak Ave, Los Angeles, CA',
        date: '2024-11-02',
        totalPrice: '$320.00',
        items: [
            { name: 'Ground Beef', quantity: 5, price: '$200.00' },
            { name: 'Salmon Fillet', quantity: 3, price: '$120.00' }
        ]
    },
    {
        id: 'ORD-003',
        customer: 'Mike Johnson',
        totalItems: 3,
        payment: 'Debit Card',
        status: 'pending',
        address: '789 Pine Rd, Chicago, IL',
        date: '2024-11-03',
        totalPrice: '$95.00',
        items: [
            { name: 'Fresh Fish', quantity: 2, price: '$40.00' },
            { name: 'Chicken Breast', quantity: 1, price: '$55.00' }
        ]
    },
    {
        id: 'ORD-004',
        customer: 'Sarah Williams',
        totalItems: 10,
        payment: 'Credit Card',
        status: 'completed',
        address: '321 Elm St, Houston, TX',
        date: '2024-11-03',
        totalPrice: '$450.00',
        items: [
            { name: 'Ground Beef', quantity: 8, price: '$320.00' },
            { name: 'Salmon Fillet', quantity: 2, price: '$130.00' }
        ]
    },
    {
        id: 'ORD-005',
        customer: 'David Brown',
        totalItems: 2,
        payment: 'Cash',
        status: 'cancelled',
        address: '654 Maple Dr, Phoenix, AZ',
        date: '2024-11-02',
        totalPrice: '$75.00',
        items: [
            { name: 'Chicken Breast', quantity: 2, price: '$75.00' }
        ]
    },
    {
        id: 'ORD-006',
        customer: 'Emily Davis',
        totalItems: 6,
        payment: 'Credit Card',
        status: 'processing',
        address: '987 Cedar Ln, Philadelphia, PA',
        date: '2024-11-03',
        totalPrice: '$210.00',
        items: [
            { name: 'Fresh Fish', quantity: 3, price: '$60.00' },
            { name: 'Ground Beef', quantity: 3, price: '$150.00' }
        ]
    },
    {
        id: 'ORD-007',
        customer: 'Robert Taylor',
        totalItems: 4,
        payment: 'Debit Card',
        status: 'completed',
        address: '234 Birch St, San Diego, CA',
        date: '2024-11-01',
        totalPrice: '$180.00',
        items: [
            { name: 'Salmon Fillet', quantity: 4, price: '$180.00' }
        ]
    },
    {
        id: 'ORD-008',
        customer: 'Lisa Anderson',
        totalItems: 7,
        payment: 'Cash',
        status: 'processing',
        address: '567 Oak Blvd, Boston, MA',
        date: '2024-11-02',
        totalPrice: '$290.00',
        items: [
            { name: 'Fresh Fish', quantity: 4, price: '$80.00' },
            { name: 'Ground Beef', quantity: 3, price: '$210.00' }
        ]
    }
];

// Render Orders
function renderOrders(orders = ordersData) {
    const container = document.getElementById('ordersContainer');
    
    container.innerHTML = orders.map((order, index) => `
        <div class="order-item" style="animation-delay: ${index * 0.1}s" onclick="viewOrderDetails('${order.id}')">
            <div>${order.id}</div>
            <div>${order.customer}</div>
            <div>${order.totalItems} items</div>
            <div>${order.payment}</div>
            <div>
                <span class="status-badge status-${order.status}">${order.status}</span>
            </div>
            <div>${order.address}</div>
            <div>
                <span class="material-icons view-icon">visibility</span>
            </div>
        </div>
    `).join('');
}

// View Order Details
function viewOrderDetails(orderId) {
    const order = ordersData.find(o => o.id === orderId);
    if (!order) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">Order ID</div>
            <div class="detail-value">${order.id}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Customer</div>
            <div class="detail-value">${order.customer}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Order Date</div>
            <div class="detail-value">${order.date}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Status</div>
            <div class="detail-value">
                <span class="status-badge status-${order.status}">${order.status}</span>
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Payment Method</div>
            <div class="detail-value">${order.payment}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Delivery Address</div>
            <div class="detail-value">${order.address}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Order Items</div>
            <div class="detail-value">
                ${order.items.map(item => `
                    <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 8px;">
                        <strong>${item.name}</strong><br>
                        Quantity: ${item.quantity} - ${item.price}
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Total Price</div>
            <div class="detail-value" style="font-size: 24px; font-weight: 600; color: #f59e9e;">
                ${order.totalPrice}
            </div>
        </div>
    `;
    
    document.getElementById('orderModal').classList.add('active');
}

// Close Modal
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

// Search Functionality
const searchInput = document.getElementById('searchInput');
const searchPlaceholder = document.querySelector('.text-wrapper-8');

searchInput.addEventListener('focus', () => {
    searchPlaceholder.style.display = 'none';
});

searchInput.addEventListener('blur', () => {
    if (searchInput.value === '') {
        searchPlaceholder.style.display = 'block';
    }
});

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredOrders = ordersData.filter(order => 
        order.id.toLowerCase().includes(searchTerm) ||
        order.customer.toLowerCase().includes(searchTerm) ||
        order.status.toLowerCase().includes(searchTerm) ||
        order.address.toLowerCase().includes(searchTerm) ||
        order.payment.toLowerCase().includes(searchTerm)
    );
    renderOrders(filteredOrders);
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeOrderModal();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    renderOrders();
});