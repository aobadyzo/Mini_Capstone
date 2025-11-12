
// Auth guard: redirect to login if not logged in
(function authGuard(){
  try {
    const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!u || !u.UserId) {
      window.location.href = '../Login/index.html';
    }
  } catch(e) { try { window.location.href = '../Login/index.html'; } catch(e){} }
})();

const menuItems = document.querySelectorAll('.menu-item');
menuItems.forEach(item => {
  item.addEventListener('click', function() {
    const target = this.getAttribute('data-target');
    if (target) {
      if (target.includes('Login')) {
        try { localStorage.removeItem('currentUser'); } catch(e){}
      }
      window.location.href = target;
    }
  });
});

const checkoutButton = document.querySelector('.checkout-button');
if (checkoutButton) checkoutButton.addEventListener('click', async function() {
  console.log('Checkout clicked');

  const addressEl = document.getElementById('checkoutAddress');
  const contactEl = document.getElementById('checkoutContact');
  const address = addressEl ? addressEl.value.trim() : '';
  const contact = contactEl ? contactEl.value.trim() : '';

  const delivery = document.querySelector('input[name="delivery"]:checked');
  const deliveryOption = delivery ? delivery.value : '';

  const payment = document.querySelector('input[name="payment"]:checked');
  const paymentMethod = payment ? payment.value : '';

  // If delivery is walkin, address not required. Be tolerant of whitespace.
  if (deliveryOption !== 'walkin' && (!address || !address.trim())) {
    alert('Please enter an address');
    try {
      const res = await fetch('http://localhost:3001/api/transaction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await res.json().catch(()=>null);
      if (res.ok && j && j.ok) {
        alert('Transaction completed successfully');
        // j may include allocations and processed metadata: { orderId, processedAt, processedBy, allocations }
        // merge allocation info into cart items for receipt printing
        const allocations = j.allocations || [];
        const cartWithBatches = cart.map(ci => {
          const alloc = allocations.find(a => Number(a.productId) === Number(ci.id));
          return Object.assign({}, ci, { allocations: alloc ? alloc.batches : [] });
        });

        // print receipt with allocation and processing meta
        printReceipt(cartWithBatches, { productSubtotal, shippingFee, shippingDiscount, total, paymentMethod, paymentRef, address, contact, processedAt: j.processedAt, processedBy: j.processedBy, orderId: j.orderId });

        // clear cart
        try { localStorage.removeItem('pos_cart'); } catch(e){ }
        // optional: redirect to orders
        return;
      } else {
        alert('Transaction failed: ' + (j && j.error ? j.error : 'unknown'));
        return;
      }
    } catch (e) {
      console.warn('Transaction API error', e);
      alert('Transaction failed: could not reach server');
      return;
    }
  try { cart = JSON.parse(localStorage.getItem('pos_cart') || '[]'); } catch(e) { cart = []; }
  if (!Array.isArray(cart) || cart.length === 0) {
    alert('Cart is empty');
    return;
  }

  const productSubtotal = cart.reduce((s, it) => s + (Number(it.price||0) * Number(it.quantity||1)), 0);
  const shippingFee = (deliveryOption === 'delivery') ? 50 : 0; // default shipping
  const shippingDiscount = 0;
  const total = productSubtotal + shippingFee - shippingDiscount;

  // If non-cash payment, require reference number
  let paymentRef = null;
  if (paymentMethod === 'gcash' || paymentMethod === 'card') {
    paymentRef = window.prompt('Enter payment reference / transaction number:');
    if (!paymentRef || !paymentRef.trim()) {
      alert('Reference number is required for the selected payment method');
      return;
    }
  }

  const performedBy = (function(){ try{ const u = JSON.parse(localStorage.getItem('currentUser')); return u && u.UserId ? u.UserId : null;}catch(e){return null;} })();

  const payload = {
    orderId: null,
    processedBy: performedBy,
    paymentMethod: paymentMethod === 'cash' ? 'Cash' : (paymentMethod === 'gcash' ? 'Gcash' : 'Card'),
    amountPaid: total,
    notes: JSON.stringify({ cart, deliveryOption, address, contact, paymentRef })
  };

  try {
    const res = await fetch('http://localhost:3001/api/transaction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await res.json().catch(()=>null);
    if (res.ok && j && j.ok) {
      alert('Transaction completed successfully');
      // print receipt
      printReceipt(cart, { productSubtotal, shippingFee, shippingDiscount, total, paymentMethod, paymentRef, address, contact });
      // clear cart
      try { localStorage.removeItem('pos_cart'); } catch(e){}
      // optional: redirect to orders
      return;
    } else {
      alert('Transaction failed: ' + (j && j.error ? j.error : 'unknown'));
      return;
    }
  } catch (e) {
    console.warn('Transaction API error', e);
    alert('Transaction failed: could not reach server');
    return;
  }
});

// Back button handler: go back to CreateOrder and keep cart in localStorage
const backBtn = document.getElementById('backBtn');
if (backBtn) backBtn.addEventListener('click', function() {
  // ensure cart persisted (it should already be)
  try { const cart = JSON.parse(localStorage.getItem('pos_cart') || '[]'); localStorage.setItem('pos_cart', JSON.stringify(cart)); } catch(e) {}
  window.location.href = 'CreateOrder.html';
});

const deliveryCheckboxes = document.querySelectorAll('.delivery-options input[type="checkbox"]');
deliveryCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', function() {
    if (this.checked) {
      deliveryCheckboxes.forEach(cb => {
        if (cb !== this) cb.checked = false;
      });
    }
  });
});

const paymentCheckboxes = document.querySelectorAll('.payment-method input[type="checkbox"]');
paymentCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', function() {
    if (this.checked) {
      paymentCheckboxes.forEach(cb => {
        if (cb !== this) cb.checked = false;
      });
    }
  });
});

// New behavior: watch delivery radios to hide/disable address and shipping
function updateDeliveryUI() {
  const walkin = document.getElementById('deliveryWalkin');
  const addressSection = document.querySelector('.address-section');
  const shippingSection = document.querySelector('.shipping-subtotal');
  const addressInput = document.getElementById('checkoutAddress');
  if (walkin && walkin.checked) {
    if (addressInput) { addressInput.value = ''; addressInput.disabled = true; }
    if (addressSection) addressSection.style.opacity = '0.6';
    if (shippingSection) shippingSection.style.display = 'none';
  } else {
    if (addressInput) addressInput.disabled = false;
    if (addressSection) addressSection.style.opacity = '1';
    if (shippingSection) shippingSection.style.display = '';
  }
}

document.querySelectorAll('input[name="delivery"]').forEach(r => r.addEventListener('change', updateDeliveryUI));
updateDeliveryUI();

// Render checkout product list
function renderCheckoutProducts() {
  const list = document.getElementById('checkoutProductList');
  if (!list) return;
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('pos_cart') || '[]'); } catch(e){ cart = []; }
  if (!cart || !cart.length) {
    list.innerHTML = '<div style="color:#999;">No products in cart</div>';
    return;
  }
  const rows = cart.map(it => {
    const subtotal = (Number(it.price||0) * Number(it.quantity||1)).toFixed(2);
    return `<div class="checkout-row"><div class="c-name">${it.name}</div><div class="c-qty">x${it.quantity}</div><div class="c-price">PHP ${Number(it.price).toFixed(2)}</div><div class="c-sub">PHP ${subtotal}</div></div>`;
  }).join('');
  list.innerHTML = rows;
  // also update product subtotal and totals
  const productSubtotal = cart.reduce((s, it) => s + (Number(it.price||0) * Number(it.quantity||1)), 0);
  const shippingFee = (document.querySelector('input[name="delivery"]:checked') && document.querySelector('input[name="delivery"]:checked').value === 'delivery') ? 50 : 0;
  const shippingEl = document.querySelector('.shipping-subtotal');
  if (shippingEl) {
    shippingEl.querySelectorAll('.row')[0].children[1].textContent = `PHP ${shippingFee.toFixed(2)}`;
    shippingEl.querySelectorAll('.row')[1].children[1].textContent = `PHP 0.00`;
  }
  const prodEl = document.querySelector('.product-subtotal');
  if (prodEl) {
    prodEl.querySelectorAll('.row')[0].children[1].textContent = `PHP ${productSubtotal.toFixed(2)}`;
    prodEl.querySelectorAll('.row')[1].children[1].textContent = `PHP ${productSubtotal.toFixed(2)}`;
  }
  const totalEl = document.querySelector('.total-section');
  if (totalEl) {
    totalEl.querySelector('.title-text').textContent = `Total : PHP ${(productSubtotal + shippingFee).toFixed(2)}`;
  }
}

// call on load
renderCheckoutProducts();

// re-render when storage changes in same tab or other tab
window.addEventListener('storage', function(e){ if (e.key === 'pos_cart') renderCheckoutProducts(); });

// Print receipt by opening a new window and calling print()
function printReceipt(cart, meta) {
  const w = window.open('', '_blank');
  if (!w) { alert('Popup blocked. Please allow popups to print receipt.'); return; }
  const itemsHtml = cart.map(it => {
    const batchesHtml = (it.allocations && it.allocations.length) ? `<div style="font-size:12px;color:#444;margin-top:6px;">Batch(s): ${it.allocations.map(b => (b.batchId || 'N/A') + ' x' + b.quantity).join(', ')}</div>` : '';
    return `<tr><td style="vertical-align:top">${it.name}${batchesHtml}</td><td style="text-align:center;vertical-align:top">${it.quantity}</td><td style="text-align:right;vertical-align:top">PHP ${Number(it.price).toFixed(2)}</td><td style="text-align:right;vertical-align:top">PHP ${(Number(it.price)*Number(it.quantity)).toFixed(2)}</td></tr>`;
  }).join('');

  const processedLine = (meta.processedBy || meta.processedAt) ? `<p>Processed by: ${meta.processedBy || '-'} on ${meta.processedAt ? new Date(meta.processedAt).toLocaleString() : '-'}</p>` : '';

  const html = `<!doctype html><html><head><title>Receipt</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #ddd}</style></head><body><h2>Receipt</h2><p>Order: ${meta.orderId || '-'}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table><p>Product Subtotal: PHP ${meta.productSubtotal.toFixed(2)}</p><p>Shipping: PHP ${meta.shippingFee.toFixed(2)}</p><p>Total: PHP ${meta.total.toFixed(2)}</p><p>Payment: ${meta.paymentMethod} ${meta.paymentRef?(' (ref: '+meta.paymentRef+')'):''}</p><p>Address: ${meta.address || '-'}</p><p>Contact: ${meta.contact || '-'}</p>${processedLine}</body></html>`;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=>{ w.print(); }, 500);
}