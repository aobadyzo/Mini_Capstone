
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

function renderOrders(orders = ordersData) {
    const container = document.getElementById('ordersContainer');
    
    container.innerHTML = orders.map((order, index) => `
        <div class="table-row" onclick="viewOrderDetails('${order.id}')">
            <div>${order.id}</div>
            <div>${order.customer}</div>
            <!-- show order id/string in the Item column as requested -->
            <div>${order.id}</div>
            <div>${order.payment}</div>
            <div>
                <span class="status-badge status-${order.status}">${order.status}</span>
            </div>
            <div>${order.address}</div>
            <div class="action-buttons">
                <button class="action-btn check-btn" onclick="approveOrder(event, '${order.id}')" title="Approve Order">
                    <span class="material-icons">check</span>
                </button>
                <button class="action-btn cancel-btn" onclick="cancelOrder(event, '${order.id}')" title="Cancel Order">
                    <span class="material-icons">close</span>
                </button>
            </div>
        </div>
    `).join('');
}

function approveOrder(event, orderId) {
    event.stopPropagation();
    const order = ordersData.find(o => o.id === orderId);
    if (order) {
        order.status = 'completed';
        renderOrders();
        showNotification(`Order ${orderId} approved!`, 'success');
    }
}

function cancelOrder(event, orderId) {
    event.stopPropagation();
    const order = ordersData.find(o => o.id === orderId);
    if (order) {
        order.status = 'cancelled';
        renderOrders();
        showNotification(`Order ${orderId} cancelled!`, 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        border-radius: 10px;
        font-family: Inter, sans-serif;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

async function viewOrderDetails(orderId) {
    // try to load detailed info from server (orderId may be OrderNumber string like 'ORD-123' or a numeric id)
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `<div style="padding:20px;color:#666">Loading order details...</div>`;
    document.getElementById('orderModal').classList.add('active');
    try {
        const encoded = encodeURIComponent(orderId);
        const res = await fetch(`http://localhost:3001/api/orders/${encoded}`);
        const json = await res.json().catch(()=>null);
        if (!res.ok || !json || !json.ok) {
            modalBody.innerHTML = `<div style="padding:20px;color:#c00">Failed to load order details</div>`;
            return;
        }

        const d = json.data || {};
        const ord = d.order || {};
        const tx = d.transaction || {};
        // items may come from order items or from parsed notes.cart
        let items = Array.isArray(d.items) && d.items.length ? d.items : [];
        if ((!items || items.length === 0) && tx && tx.notes && Array.isArray(tx.notes.cart)) items = tx.notes.cart.map(ci => ({ name: ci.name || ci.productName || ('Product ' + ci.id), quantity: ci.quantity, unitPrice: Number(ci.price || 0) }));

        const paymentMethod = (tx && tx.paymentMethod) ? tx.paymentMethod : 'N/A';
        const address = (tx && tx.notes && tx.notes.address) ? tx.notes.address : '';
        const contact = (tx && tx.notes && tx.notes.contact) ? tx.notes.contact : '';

        modalBody.innerHTML = `
            <div class="detail-row">
                <div class="detail-label">Order ID</div>
                <div class="detail-value">${ord.orderNumber || ('ORD-' + String(ord.orderId || '').padStart(3,'0'))}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Status</div>
                <div class="detail-value"><span class="status-badge status-${(ord.orderStatus||'pending').toLowerCase()}">${ord.orderStatus || 'pending'}</span></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Order Date</div>
                <div class="detail-value">${ord.placedAt || ''}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Payment Method</div>
                <div class="detail-value">${paymentMethod}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Delivery Address</div>
                <div class="detail-value">${address || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Contact</div>
                <div class="detail-value">${contact || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Order Items</div>
                <div class="detail-value">
                    ${items.length ? items.map(item => `
                        <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 8px; color:#222;">
                            <strong>${item.name}</strong><br>
                            Quantity: ${item.quantity} - PHP ${Number(item.unitPrice || item.price || 0).toFixed(2)}
                        </div>
                    `).join('') : '<div style="color:#999">No items recorded for this order</div>'}
                </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Total Price</div>
                <div class="detail-value" style="font-size: 24px; font-weight: 600; color: #f59e9e;">
                    PHP ${Number(ord.totalAmount || ord.TotalPrice || 0).toFixed(2)}
                </div>
            </div>
        `;
    } catch (e) {
        console.warn('Failed to fetch order details', e);
        modalBody.innerHTML = `<div style="padding:20px;color:#c00">Error loading order details</div>`;
    }
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

const searchInput = document.getElementById('searchInput');

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

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeOrderModal();
    }
});

document.addEventListener('DOMContentLoaded', async () => {

    try {
        const res = await fetch('http://localhost:3001/api/orders');
        const json = await res.json();
        if (json && json.ok && Array.isArray(json.rows) && json.rows.length) {

            const apiOrders = json.rows.map(r => ({
                id: r.OrderNumber || (`ORD-${String(r.OrderId).padStart(3,'0')}`),
                customer: r.CustomerName || 'Customer',
                totalItems: r.TotalItems || 0,
                payment: r.PaymentMethod || r.Payment || 'N/A',
                status: (r.Status || 'pending').toLowerCase(),
                address: r.ShippingAddress || r.Address || '',
                date: r.OrderDate || '',
                totalPrice: r.TotalPrice || r.TotalAmount || '$0.00',
                items: []
            }));

            ordersData.length = 0;
            ordersData.push(...apiOrders);
            renderOrders(ordersData);
            return;
        }
    } catch (e) {
        console.warn('Orders API not available', e);
    }

    renderOrders();
});