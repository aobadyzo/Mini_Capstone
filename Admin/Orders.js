console.log('Admin/Orders.js loaded');
console.log('Admin/Orders.js loaded');
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}
let ordersCache = [];
function buildRowHtml(order) {
    const displayId = escapeHtml(order.id || '');
    const internalIdRaw = (order.internalId !== undefined && order.internalId !== null) ? String(order.internalId) : (order.id || '');
    const internalId = escapeHtml(internalIdRaw);
    const customer = escapeHtml(order.customer || '');
    const totalItems = escapeHtml(String(order.totalItems || 0));
    const payment = escapeHtml(order.payment || 'N/A');
    const status = escapeHtml((order.status || 'pending').toLowerCase());
    const address = escapeHtml(order.address || '');
    let proofHtml = '';
    if (order.ReferenceImageThumb) {
        proofHtml = `<img class="proof-thumb" src="${escapeHtml(order.ReferenceImageThumb)}" alt="proof"/>`;
    } else if (order.HasReferenceImage) {
        proofHtml = '<span class="proof-dot" title="Proof provided"></span>';
    }
    return `
        <div class="table-row" data-order-id="${internalId}" onclick="viewOrderDetails('${internalId.replace(/'/g, "\\'")}')">
            <div>${displayId}</div>
            <div>${customer}</div>
            <div>${totalItems}</div>
            <div>${payment}</div>
            <div><span class="status-badge status-${status}">${status}</span></div>
            <div class="proof-cell">${proofHtml}</div>
            <div title="${address}">${address}</div>
            <div class="action-buttons">
                <button class="action-btn check-btn" onclick="approveOrder(event, '${internalId.replace(/'/g, "\\'")}')" title="Approve Order">
                    <span class="material-icons">check</span>
                </button>
                <button class="action-btn cancel-btn" onclick="cancelOrder(event, '${internalId.replace(/'/g, "\\'")}')" title="Cancel Order">
                    <span class="material-icons">close</span>
                </button>
            </div>
        </div>`;
}
function renderOrders(orders) {
    const container = document.getElementById('ordersContainer');
    if (!container) return console.warn('ordersContainer not found');
    if (!Array.isArray(orders) || orders.length === 0) {
        container.innerHTML = `<div class="no-orders" style="padding:30px;color:#666">No orders to display</div>`;
        return;
    }
    try {
        const html = orders.map(buildRowHtml).join('');
        container.innerHTML = html;
    } catch (err) {
        console.error('renderOrders failed', err);
        container.innerHTML = `<div style="padding:20px;color:#c00">Error rendering orders</div>`;
    }
}
async function fetchOrders() {
    const candidates = [
        `http://localhost:3001/api/orders`,
        '/api/orders'
    ];
    for (const url of candidates) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const json = await res.json().catch(() => null);
            if (json && json.ok && Array.isArray(json.rows)) return json.rows;
        } catch (e) {
        }
    }
    throw new Error('Orders API not available');
}
async function refreshOrders() {
    try {
        const rows = await fetchOrders();
        ordersCache = rows.map(r => ({
            id: r.OrderNumber || (`ORD-${String(r.OrderId).padStart(3, '0')}`),
            internalId: (r.OrderId !== undefined && r.OrderId !== null) ? r.OrderId : null,
            customer: r.CustomerName || 'Customer',
            totalItems: r.TotalItems || 0,
            payment: r.PaymentMethod || r.Payment || 'N/A',
            status: (r.Status || 'pending').toLowerCase(),
            address: r.ShippingAddress || r.Address || '',
            date: r.OrderDate || '',
            totalPrice: r.TotalPrice || r.TotalAmount || '$0.00',
            items: [],
            HasReferenceImage: r.HasReferenceImage || 0,
            ReferenceImageThumb: r.ReferenceImageThumb || null
        }));
        renderOrders(ordersCache);
        showApiDebug(`Loaded ${ordersCache.length} orders`, 'success');
    } catch (err) {
        console.warn('refreshOrders failed', err);
        renderOrders([]);
        showApiDebug('API not available', 'error');
    }
}
function showApiDebug(text, type) {
    let b = document.getElementById('apiDebugBanner');
    if (!b) {
        b = document.createElement('div');
        b.id = 'apiDebugBanner';
        b.style.position = 'fixed';
        b.style.top = '12px';
        b.style.right = '12px';
        b.style.padding = '8px 12px';
        b.style.borderRadius = '8px';
        b.style.zIndex = 9999;
        b.style.fontSize = '13px';
        document.body.appendChild(b);
    }
    b.textContent = text;
    b.style.background = type === 'success' ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)';
    b.style.color = type === 'success' ? '#226622' : '#6b1f1f';
}
function approveOrder(event, orderId) {
    event.stopPropagation();
    event.preventDefault();
    (async () => {
        const candidates = [
            `http://localhost:3001/api/orders/${encodeURIComponent(orderId)}`,
            `/api/orders/${encodeURIComponent(orderId)}`
        ];
        let orderData = null;
        for (const url of candidates) {
            try {
                const r = await fetch(url);
                if (!r.ok) continue;
                const j = await r.json().catch(()=>null);
                if (j && j.ok && j.data) { orderData = j.data; break; }
            } catch(e) {  }
        }
        const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (e) { return null; } })();
        try {
            const txNotes = orderData && orderData.transaction ? orderData.transaction.notes : null;
            const isPickup = txNotes && ( (typeof txNotes === 'object' && (txNotes.pickupDate || txNotes.pickup_date)) || (typeof txNotes === 'string' && txNotes.includes('pickup')) );
            if (isPickup) {
                if (!confirm('This order is marked for pickup. Approve and mark as ToShip (no shipping info needed)?')) return;
                const payload = { courier: null, trackingNumber: null, processedBy: currentUser ? currentUser.UserId : null };
                let ok = false; let lastErr = null;
                const postCandidates = [
                    `http://localhost:3001/api/orders/${encodeURIComponent(orderId)}/approve`,
                    `/api/orders/${encodeURIComponent(orderId)}/approve`
                ];
                for (const url of postCandidates) {
                    try {
                        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                        const j = await res.json().catch(()=>null);
                        if (res.ok && j && j.ok) { ok = true; break; }
                        if (j && (j.message || j.error)) lastErr = j.message || j.error; else lastErr = `HTTP ${res.status}`;
                    } catch(e) { lastErr = e && e.message ? e.message : String(e); }
                }
                if (!ok) { console.error('Approve failed:', lastErr); showNotification(lastErr || 'Failed to approve order', 'error'); }
                else { showNotification(`Order ${orderId} approved`, 'success'); await refreshOrders(); }
                return;
            }
        } catch(e) {  }
        const modal = document.getElementById('orderModal');
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <label>Courier</label>
                <select id="approveCourier" style="padding:8px;border-radius:6px;border:1px solid #ddd;">
                    <option value="LBC">LBC</option>
                </select>
                <label>Tracking Number</label>
                <input id="approveTracking" type="text" placeholder="Tracking number" style="padding:8px;border-radius:6px;border:1px solid #ddd;" />
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                    <button id="approveCancel" class="modal-btn">Cancel</button>
                    <button id="approveConfirm" class="modal-btn check-btn">Approve & Ship</button>
                </div>
            </div>`;
        modal.classList.add('active');
        document.getElementById('approveCancel').addEventListener('click', () => modal.classList.remove('active'));
        document.getElementById('approveConfirm').addEventListener('click', async () => {
            const courier = document.getElementById('approveCourier').value.trim();
            const tracking = document.getElementById('approveTracking').value.trim();
            const payload = { courier, trackingNumber: tracking, processedBy: currentUser ? currentUser.UserId : null };
            try {
                const candidates = [
                    `http://localhost:3001/api/orders/${encodeURIComponent(orderId)}/approve`,
                    `/api/orders/${encodeURIComponent(orderId)}/approve`
                ];
                let ok = false;
                let lastErr = null;
                for (const url of candidates) {
                    try {
                        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                        const j = await res.json().catch(() => null);
                        if (res.ok && j && j.ok) { ok = true; break; }
                        if (j && (j.message || j.error)) lastErr = j.message || j.error; else lastErr = `HTTP ${res.status}`;
                    } catch (e) { lastErr = e && e.message ? e.message : String(e); }
                }
                if (!ok) {
                    console.error('Approve failed:', lastErr);
                    showNotification(lastErr || 'Failed to approve order', 'error');
                } else {
                    modal.classList.remove('active');
                    showNotification(`Order ${orderId} approved and shipped`, 'success');
                    await refreshOrders();
                }
            } catch (err) {
                console.error(err);
                showNotification(err && err.message ? err.message : 'Failed to approve order', 'error');
            }
        });
    })();
}
function cancelOrder(event, orderId) {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm('Are you sure you want to cancel this order?')) return;
    const payload = { processedBy: (JSON.parse(localStorage.getItem('currentUser') || 'null') || {}).UserId || null, reason: 'Cancelled by admin' };
    (async () => {
        try {
            const candidates = [
                `http://localhost:3001/api/orders/${encodeURIComponent(orderId)}/cancel`,
                `/api/orders/${encodeURIComponent(orderId)}/cancel`
            ];
            let ok = false;
            for (const url of candidates) {
                try {
                    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    const j = await res.json().catch(() => null);
                    if (res.ok && j && j.ok) { ok = true; break; }
                } catch (e) {  }
            }
            if (!ok) throw new Error('Cancel API failed');
            showNotification(`Order ${orderId} cancelled`, 'error');
            await refreshOrders();
        } catch (err) {
            console.error(err);
            showNotification('Failed to cancel order', 'error');
        }
    })();
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
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    modalBody.innerHTML = `<div style="padding:20px;color:#666">Loading order details...</div>`;
    document.getElementById('orderModal').classList.add('active');
    const candidates = [
        `http://localhost:3001/api/orders/${encodeURIComponent(orderId)}`,
        `/api/orders/${encodeURIComponent(orderId)}`
    ];
    for (const url of candidates) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const json = await res.json().catch(() => null);
            if (!json || !json.ok) continue;
            const d = json.data || {};
            const ord = d.order || {};
            const tx = d.transaction || {};
            let items = Array.isArray(d.items) && d.items.length ? d.items : [];
            if ((!items || items.length === 0) && tx && tx.notes && Array.isArray(tx.notes.cart)) {
                items = tx.notes.cart.map(ci => ({ name: ci.name || ci.productName || ('Product ' + ci.id), quantity: ci.quantity, unitPrice: Number(ci.price || 0) }));
            }
            const paymentMethod = (tx && tx.paymentMethod) ? tx.paymentMethod : 'N/A';
            const address = (tx && tx.notes && tx.notes.address) ? tx.notes.address : '';
            const contact = (tx && tx.notes && tx.notes.contact) ? tx.notes.contact : '';
            let referenceNumber = ord.referenceNumber || null;
            let referenceImage = ord.referenceImage || null;
            if ((!referenceNumber || !referenceImage) && tx && tx.notes) {
                if (typeof tx.notes === 'string') {
                    try { const parsed = JSON.parse(tx.notes); if (parsed) { referenceNumber = referenceNumber || parsed.reference || null; referenceImage = referenceImage || parsed.referenceImage || null; } } catch (e) { referenceNumber = referenceNumber || tx.notes; }
                } else if (typeof tx.notes === 'object') {
                    referenceNumber = referenceNumber || tx.notes.reference || null;
                    referenceImage = referenceImage || tx.notes.referenceImage || null;
                }
            }
            const itemsHtml = items.length ? items.map(it => `<div style="margin-top:10px;padding:10px;background:#fff;border-radius:8px;color:#222;"><strong>${escapeHtml(it.name)}</strong><br>Quantity: ${escapeHtml(String(it.quantity))} - PHP ${Number(it.unitPrice||it.price||0).toFixed(2)}</div>`).join('') : '<div style="color:#999">No items recorded for this order</div>';
            modalBody.innerHTML = `
                <div class="detail-row"><div class="detail-label">Order ID</div><div class="detail-value">${escapeHtml(ord.orderNumber || ('ORD-' + String(ord.orderId || '').padStart(3,'0')))}</div></div>
                <div class="detail-row"><div class="detail-label">Status</div><div class="detail-value"><span class="status-badge status-${escapeHtml((ord.orderStatus||'pending').toLowerCase())}">${escapeHtml(ord.orderStatus||'pending')}</span></div></div>
                <div class="detail-row"><div class="detail-label">Order Date</div><div class="detail-value">${escapeHtml(ord.placedAt || '')}</div></div>
                <div class="detail-row"><div class="detail-label">Payment Method</div><div class="detail-value">${escapeHtml(paymentMethod)}</div></div>
                <div class="detail-row"><div class="detail-label">Delivery Address</div><div class="detail-value">${escapeHtml(address) || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Reference</div><div class="detail-value">${referenceNumber ? escapeHtml(referenceNumber) : (referenceImage ? '<em>Provided as image</em>' : '-')}</div></div>
                <div class="detail-row"><div class="detail-label">Pick-up Date</div><div class="detail-value">${escapeHtml(ord.pickupDate || '-')}</div></div>
                ${referenceImage ? `<div class="detail-row"><div class="detail-label">Reference Image</div><div class="detail-value"><img src="${escapeHtml(referenceImage)}" style="max-width:260px;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,0.12)"/></div></div>` : ''}
                <div class="detail-row"><div class="detail-label">Contact</div><div class="detail-value">${escapeHtml(contact) || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Order Items</div><div class="detail-value">${itemsHtml}</div></div>
                <div class="detail-row"><div class="detail-label">Total Price</div><div class="detail-value" style="font-size:24px;font-weight:600;color:#f59e9e;">PHP ${Number(ord.totalAmount || ord.TotalPrice || 0).toFixed(2)}</div></div>
            `;
            return; 
        } catch (e) {
        }
    }
    modalBody.innerHTML = `<div style="padding:20px;color:#c00">Failed to load order details</div>`;
}
function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.classList.remove('active');
}
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const q = (e.target.value || '').toLowerCase();
        const filtered = ordersCache.filter(o => (o.id||'').toLowerCase().includes(q) || (o.customer||'').toLowerCase().includes(q) || (o.status||'').toLowerCase().includes(q) || (o.address||'').toLowerCase().includes(q) || (o.payment||'').toLowerCase().includes(q));
        renderOrders(filtered);
    });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOrderModal(); });
document.addEventListener('DOMContentLoaded', async () => {
    setupSearch();
    await refreshOrders();
});
