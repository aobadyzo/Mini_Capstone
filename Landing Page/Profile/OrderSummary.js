const header = document.querySelector('.header');
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  if (!header) return;
  if (currentScroll > 50) {
    header.style.height = '80px';
    header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
  } else {
    header.style.height = '100px';
    header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
  }
  lastScroll = currentScroll;
});
const navItems = document.querySelectorAll('.profile-nav-item');
navItems.forEach(item => {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    navItems.forEach(nav => nav.classList.remove('active'));
    this.classList.add('active');
    const href = (this.getAttribute('href') || '').trim();
    if (href === '#orders' || href === '' ) {
      const ordersList = document.getElementById('ordersList');
      const orderDetail = document.getElementById('orderDetail');
      if (ordersList) { ordersList.style.display = 'block'; ordersList.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (orderDetail) orderDetail.style.display = 'none';
      const modal = document.getElementById('orderModal'); if (modal) modal.style.display = 'none';
    }
  });
});
const closeBtn = document.querySelector('.close-btn');
function closeOrderModalOrBack() {
  const detail = document.getElementById('orderDetail');
  const list = document.getElementById('ordersList');
  if (detail && detail.style.display && detail.style.display !== 'none') {
    detail.style.display = 'none';
    if (list) list.style.display = 'block';
    const grid = list ? list.querySelector('.products-grid') : null; if (grid) grid.focus();
    return;
  }
  const modal = document.getElementById('orderModal');
  if (modal && modal.style.display && modal.style.display !== 'none') { modal.style.display = 'none'; return; }
  const ordersAnchor = document.querySelector('.profile-nav-item[href="#orders"]') || document.querySelector('.profile-nav-item');
  if (ordersAnchor) ordersAnchor.click();
}
if (closeBtn) closeBtn.addEventListener('click', closeOrderModalOrBack);
async function openOrderModal(orderId) {
  const detail = document.getElementById('orderDetail');
  const list = document.getElementById('ordersList');
  if (!detail) return;
  if (list) list.style.display = 'none';
  detail.style.display = 'block';
  const itemsGrid = document.getElementById('detailItems');
  if (itemsGrid) itemsGrid.innerHTML = '<div style="padding:12px;color:#666">Loading order...</div>';
    try {
    const candidates = [
      `http://localhost:3001/api/orders/${encodeURIComponent(orderId)}`,
      `/api/orders/${encodeURIComponent(orderId)}`
    ];
    let data = null;
    for (const url of candidates) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const j = await r.json().catch(()=>null);
        if (j && j.ok && j.data) { data = j.data; break; }
      } catch(e) { continue; }
    }
    if (!data) { if (itemsGrid) itemsGrid.innerHTML = '<div style="padding:20px;color:#c00">Failed to load order details</div>'; return; }
    const ord = data.order || {};
    const tx = data.transaction || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const courierEl = document.getElementById('detailCourier'); if (courierEl) courierEl.textContent = (tx && tx.notes && tx.notes.courier) ? tx.notes.courier : (tx && tx.paymentMethod==='Shipping' ? 'N/A' : '');
    const trackingEl = document.getElementById('detailTracking'); if (trackingEl) trackingEl.textContent = (tx && tx.notes && tx.notes.trackingNumber) ? tx.notes.trackingNumber : '';
    const nameEl = document.getElementById('detailName'); if (nameEl) nameEl.textContent = (tx && tx.notes && tx.notes.customer && tx.notes.customer.name) ? tx.notes.customer.name : '';
    const addrEl = document.getElementById('detailAddress'); if (addrEl) addrEl.textContent = (tx && tx.notes && tx.notes.customer && tx.notes.customer.address) ? tx.notes.customer.address : '';
    const emailEl = document.getElementById('detailEmail'); if (emailEl) emailEl.textContent = (tx && tx.notes && tx.notes.customer && tx.notes.customer.email) ? tx.notes.customer.email : '';
    const phoneEl = document.getElementById('detailPhone'); if (phoneEl) phoneEl.textContent = (tx && tx.notes && tx.notes.customer && tx.notes.customer.phone) ? tx.notes.customer.phone : '';
    if (itemsGrid) {
      itemsGrid.innerHTML = '';
      if (items.length === 0) itemsGrid.innerHTML = '<div style="color:#999;padding:12px">No items recorded for this order</div>';
      items.forEach(it => {
        const el = document.createElement('div'); el.className = 'product-card';
        el.style.marginBottom = '10px';
        el.innerHTML = `
          <div class="product-image" style="background-image:url('${it.image || ''}');width:72px;height:72px;border-radius:50%;display:inline-block;vertical-align:middle;margin-right:12px;background-size:cover;background-position:center;"></div>
          <div style="display:inline-block;vertical-align:middle;max-width:calc(100% - 96px);">
            <div style="font-weight:600">${it.name}</div>
            <div style="font-size:13px;color:#666">Quantity: ${it.quantity}</div>
            <div style="margin-top:6px;color:#f25d5d;">Price: ₱${Number(it.unitPrice||0).toFixed(2)}</div>
          </div>
        `;
        itemsGrid.appendChild(el);
      });
    }
    const totalEl = document.getElementById('detailTotal'); if (totalEl) totalEl.textContent = `: ₱${Number(ord.totalAmount||0).toFixed(2)}`;
  } catch (e) {
    console.warn('openOrderModal failed', e);
    if (itemsGrid) itemsGrid.innerHTML = '<div style="padding:20px;color:#c00">Error loading order</div>';
  }
}
const modalClose = document.getElementById('orderModalClose');
if (modalClose) modalClose.addEventListener('click', () => { const m = document.getElementById('orderModal'); if (m) m.style.display = 'none'; });
const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    if (!confirm('Are you sure you want to log out?')) return;
    try { localStorage.removeItem('currentUser'); } catch (e) {  }
    try { sessionStorage.removeItem('lastOrder'); } catch (e) {  }
    console.log('User logged out — redirecting to login page');
    window.location.href = '../../Login/index.html';
  });
}
const productCards = document.querySelectorAll('.product-card');
productCards.forEach(card => {
  card.addEventListener('click', function() {
    this.style.transform = 'scale(0.98)';
    setTimeout(() => {
      this.style.transform = '';
    }, 150);
    console.log('Product card clicked');
  });
});
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
window.addEventListener('load', () => {
  const main = document.querySelector('main');
  main.style.opacity = '0';
  setTimeout(() => {
    main.style.transition = 'opacity 0.5s ease';
    main.style.opacity = '1';
  }, 100);
});
let hasUnsavedChanges = false;
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});
const infoCards = document.querySelectorAll('.info-card');
infoCards.forEach(card => {
  card.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(243, 65, 65, 0.3)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple 0.6s ease-out';
    ripple.style.pointerEvents = 'none';
    this.appendChild(ripple);
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
});
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
console.log('Order Summary page loaded successfully!');
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('.order-summary-section');
  if (!container) return;
  const ordersList = document.getElementById('ordersList');
  const ordersGrid = ordersList ? ordersList.querySelector('.products-grid') : null;
  const orderDetail = document.getElementById('orderDetail');
  const detailItems = document.getElementById('detailItems');
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser')||'null'); } catch(e){ return null; } })();
  if (!currentUser) {
    try {
      const raw = sessionStorage.getItem('lastOrder');
      if (!raw) return;
      const last = JSON.parse(raw);
      if (ordersList) ordersList.style.display = 'none';
      if (orderDetail) orderDetail.style.display = 'block';
      const titleEl = orderDetail.querySelector('.section-title');
      if (titleEl) titleEl.textContent = `Order Summary — #${last.orderId || '—'}`;
      if (detailItems) {
        detailItems.innerHTML = '';
        last.cart.forEach(it => {
          const article = document.createElement('article');
          article.className = 'product-card';
          article.innerHTML = `
            <div class="product-image" style="background-image: url('${it.image || ''}')"></div>
            <div class="product-info">
              <h4 class="product-name">${it.name}</h4>
              <p class="product-quantity">Quantity: ${it.qty}</p>
              <p class="product-price">Price: ₱${Number(it.price||0) * (it.qty||1)}</p>
            </div>`;
          detailItems.appendChild(article);
        });
      }
      const totalEl = document.getElementById('detailTotal');
      if (totalEl && last.totals) totalEl.textContent = `: ₱${last.totals.totalAmount}`;
    } catch (e) { console.warn('Failed to render last order', e); }
    return;
  }
  try {
    const candidates = [
      `http://localhost:3001/api/orders`,
      `/api/orders`
    ];
    let rows = null;
    for (const url of candidates) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const j = await r.json().catch(()=>null);
        if (j && j.ok && Array.isArray(j.rows)) { rows = j.rows; break; }
      } catch(e) { continue; }
    }
    if (!rows) { if (ordersGrid) ordersGrid.innerHTML = '<div style="color:#999;padding:16px">Orders unavailable (API unreachable)</div>'; return; }
    const myOrders = rows.filter(r => Number(r.UserId) === Number(currentUser.UserId));
    if (!ordersGrid) return;
    if (!myOrders || myOrders.length === 0) { ordersGrid.innerHTML = '<div style="color:#999;padding:16px">You have no orders yet.</div>'; return; }
    ordersGrid.innerHTML = '';
    for (const ord of myOrders) {
      const orderCard = document.createElement('div'); orderCard.className = 'order-card';
      orderCard.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <h3 style="margin:0">Order #${ord.OrderNumber || ord.OrderId}</h3>
            <div style="font-size:13px;color:#666">Status: <strong>${ord.Status || 'pending'}</strong></div>
          </div>
          <div>
            <button class="view-btn" data-orderid="${ord.OrderId}" style="padding:10px 16px;border-radius:10px;border:2px solid #f25d5d;background:white;cursor:pointer;">View</button>
          </div>
        </div>
        <div class="order-items" id="order-items-${ord.OrderId}">Loading items...</div>
      `;
      ordersGrid.appendChild(orderCard);
      const vb = orderCard.querySelector('.view-btn');
      if (vb) vb.addEventListener('click', (e) => { e.stopPropagation(); openOrderModal(ord.OrderId); });
      (async (o) => {
        try {
          const detailCandidates = [
            `http://localhost:3001/api/orders/${encodeURIComponent(o.OrderId)}`,
            `/api/orders/${encodeURIComponent(o.OrderId)}`
          ];
          let j = null;
          for (const url of detailCandidates) {
            try {
              const r = await fetch(url);
              if (!r.ok) continue;
              j = await r.json().catch(()=>null);
              if (j && j.ok) break;
              j = null;
            } catch(e) { j = null; }
          }
          const containerItems = document.getElementById('order-items-' + o.OrderId);
          if (!containerItems) return;
          if (!j || !j.ok) { containerItems.innerHTML = '<div style="color:#999">Could not load order details</div>'; return; }
          const items = j.data && j.data.items ? j.data.items : [];
          if (!items || items.length === 0) { containerItems.innerHTML = '<div style="color:#999">No items recorded</div>'; return; }
          containerItems.innerHTML = '';
          items.forEach(it => {
            const el = document.createElement('div'); el.className = 'order-item'; el.innerHTML = `<div>${escapeHtml(it.name)}</div><div>Qty: ${escapeHtml(String(it.quantity))}</div><div>Price: ₱${escapeHtml(String(it.unitPrice))}</div>`; containerItems.appendChild(el);
          });
        } catch(e) { console.warn('load order detail failed', e); }
      })(ord);
    }
  } catch (e) { console.warn('Failed to load orders', e); const grid = container.querySelector('.products-grid'); if (grid) grid.innerHTML = '<div style="color:#999;padding:16px">Failed to load orders</div>'; }
});
