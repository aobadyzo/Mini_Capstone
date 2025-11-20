window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const checkoutForm = document.getElementById('checkout-form');
  const checkoutBtn = document.querySelector('.btn-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        zip: document.getElementById('zip').value,
        shippingMethod: document.querySelector('input[name="shipping-method"]:checked')?.value,
        paymentMethod: document.querySelector('input[name="payment-method"]:checked')?.value,
        reference: document.getElementById('reference').value
      };
      if (formData.shippingMethod === 'pickup') {
        if (!formData.name || !formData.phone) {
          showNotification('Please fill in your name and phone number for pick up', 'error');
          return;
        }
        const pickupDateVal = document.getElementById('pickupDate')?.value;
        if (!pickupDateVal) { showNotification('Please select a pick-up date', 'error'); return; }
        formData.pickupDate = pickupDateVal;
      } else {
        if (!formData.name || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.zip) {
          showNotification('Please fill in all required fields', 'error');
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          showNotification('Please enter a valid email address', 'error');
          return;
        }
      }
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        showNotification('Please enter a valid phone number (09XXXXXXXXX)', 'error');
        return;
      }
      (async () => {
        try {
          const cart = JSON.parse(localStorage.getItem('cart') || '[]');
          if (!cart || cart.length === 0) { showNotification('Your cart is empty', 'error'); return; }
          let currentUser = null;
          try { currentUser = JSON.parse(localStorage.getItem('currentUser')||'null'); }catch(e){ currentUser = null; }
          if (!currentUser) { showNotification('Please log in to place an order', 'error'); window.location.href = '../Login/index.html'; return; }
          const subtotal = cart.reduce((s,i)=>s + ((Number(i.price)||0) * (i.qty||1)), 0);
          const deliveryFee = document.querySelector('input[name="shipping-method"]:checked')?.value === 'pickup' ? 0 : 50;
          const totalAmount = subtotal + deliveryFee;
          const referenceText = document.getElementById('reference') ? document.getElementById('reference').value.trim() : '';
          const referenceFileInput = document.getElementById('referenceImage');
          let referenceImageData = null;
          if (referenceFileInput && referenceFileInput.files && referenceFileInput.files.length) {
            const file = referenceFileInput.files[0];
            referenceImageData = await new Promise((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(fr.result);
              fr.onerror = () => reject(new Error('Failed to read file'));
              fr.readAsDataURL(file);
            });
          }
          if (!referenceText && !referenceImageData) { showNotification('Please provide a reference number or upload a proof image', 'error'); return; }
          const notesObj = { cart, customer: { name: formData.name, email: formData.email, phone: formData.phone, address: formData.address }, reference: referenceText || null };
          if (formData.pickupDate) notesObj.pickupDate = formData.pickupDate;
          if (referenceImageData) notesObj.referenceImage = referenceImageData;
          const normalizedCart = (cart || []).map(ci => {
            const idVal = (ci.id !== undefined && ci.id !== null) ? ci.id : (ci.productId !== undefined ? ci.productId : null);
            const numericId = (idVal !== null && idVal !== '') && !Number.isNaN(Number(idVal)) ? Number(idVal) : null;
            const quantity = (ci.quantity !== undefined && ci.quantity !== null) ? ci.quantity : (ci.qty !== undefined && ci.qty !== null ? ci.qty : 1);
            const price = (ci.price !== undefined && ci.price !== null) ? ci.price : (ci.Price !== undefined ? ci.Price : 0);
            return { id: idVal, productId: numericId, quantity: Number(quantity || 0), price: Number(price || 0), name: ci.name || ci.ProductName || null };
          });
          notesObj.cart = normalizedCart;
          const payload = {
            orderId: null,
            processedBy: currentUser.UserId || null,
            paymentMethod: formData.paymentMethod || 'Cash',
            amountPaid: totalAmount,
            notes: JSON.stringify(notesObj)
          };
          const candidates = [
            'http://localhost:3001/api/transaction',
            '/api/transaction'
          ];
          let lastErr = null;
          for (const url of candidates) {
            try {
              const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              if (!resp.ok) {
                let bodyText = '';
                try { bodyText = await resp.text(); } catch (e) { bodyText = ''; }
                lastErr = new Error('HTTP ' + resp.status + (bodyText ? ' - ' + bodyText : ''));
                continue;
              }
              const json = await resp.json().catch(async () => {
                const t = await resp.text().catch(()=>null);
                return { ok: false, error: t || 'Invalid JSON' };
              });
              if (!json || !json.ok) { lastErr = new Error(json && json.error ? json.error : 'API error'); continue; }
              const last = { orderId: json.orderId || null, processedAt: json.processedAt || new Date().toISOString(), cart, totals: { subtotal, deliveryFee, totalAmount }, customer: notesObj.customer };
              sessionStorage.setItem('lastOrder', JSON.stringify(last));
              localStorage.removeItem('cart');
              showNotification('Order placed successfully! Redirecting...', 'success');
              setTimeout(()=>{ window.location.href = 'Profile/OrderSummary.html'; }, 1000);
              return;
            } catch (err) {
              lastErr = err;
              console.warn('Attempt failed for', url, err && err.message ? err.message : err);
              continue;
            }
          }
          console.error('All attempts to create transaction failed', lastErr);
          showNotification('Failed to place order: ' + (lastErr && lastErr.message ? lastErr.message : 'unknown'), 'error');
        } catch (err) {
          console.error(err);
          showNotification('Failed to submit order: ' + (err && err.message ? err.message : ''), 'error');
        }
      })();
    });
  }
  (function renderCheckoutFromCart(){
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const reviewName = document.querySelector('.review-section .product-name');
      const reviewPrice = document.querySelector('.review-section .product-price');
      const qtyInput = document.getElementById('quantity');
      const productImage = document.querySelector('.review-item .product-image');
      const summaryValues = document.querySelectorAll('.summary-value');
      if (!cart || cart.length === 0) {
        if (reviewName) reviewName.textContent = 'No items in cart';
        if (reviewPrice) reviewPrice.textContent = 'Php 0';
        if (qtyInput) qtyInput.value = 0;
        if (summaryValues && summaryValues.length) {
          summaryValues[0].textContent = 'Php 0';
          summaryValues[1].textContent = 'Php 0';
          summaryValues[2].textContent = 'Php 0';
        }
        const totalEl = document.querySelector('.summary-row.total .summary-value'); if (totalEl) totalEl.textContent = 'Php 0';
        return;
      }
      const first = cart[0];
      const name = first.name || first.Name || first.ProductName || 'Product';
      const price = (typeof first.price !== 'undefined' && first.price !== null) ? Number(first.price) : (typeof first.Price !== 'undefined' ? Number(first.Price) : 0);
      const qty = first.qty || first.quantity || 1;
      const img = first.image || first.ImageData || first.Image || '';
      if (reviewName) reviewName.textContent = name;
      if (reviewPrice) reviewPrice.textContent = `Php ${Number(price).toFixed(2)}`;
      if (qtyInput) qtyInput.value = qty;
      if (productImage) productImage.style.backgroundImage = img ? `url('${img}')` : '';
      let subtotal = 0; let totalItems = 0;
      cart.forEach(it => { const itPrice = (typeof it.price !== 'undefined' ? Number(it.price) : (typeof it.Price !== 'undefined' ? Number(it.Price) : 0)); const itQty = it.qty || it.quantity || 1; subtotal += (itPrice * itQty); totalItems += itQty; });
      const deliveryFee = document.querySelector('input[name="shipping-method"]:checked')?.value === 'pickup' ? 0 : 50;
      const total = subtotal + deliveryFee;
      if (summaryValues && summaryValues.length>=3) {
        summaryValues[0].textContent = `Php ${subtotal.toFixed(2)}`;
        summaryValues[1].textContent = `Php ${subtotal.toFixed(2)}`;
        summaryValues[2].textContent = `Php ${deliveryFee.toFixed(2)}`;
      }
      const totalEl = document.querySelector('.summary-row.total .summary-value'); if (totalEl) totalEl.textContent = `Php ${total.toFixed(2)}`;
      const prodCount = document.querySelector('.product-count'); if (prodCount) prodCount.textContent = totalItems;
    } catch (e) { console.warn('renderCheckoutFromCart failed', e); }
  })();
    const shippingRadios = document.querySelectorAll('input[name="shipping-method"]');
    function toggleShippingFields(method) {
      const deliveryInfo = document.querySelector('.delivery-info');
      const addressGroup = document.getElementById('address')?.parentElement;
      const cityGroup = document.getElementById('city')?.parentElement;
      const zipGroup = document.getElementById('zip')?.parentElement;
      const emailGroup = document.getElementById('email')?.parentElement;
      const pickupGroup = document.getElementById('pickup-date-group');
      const pickupInput = document.getElementById('pickupDate');
      if (method === 'pickup') {
        if (deliveryInfo) deliveryInfo.innerHTML = '<p class="section-title">Pickup Location: 148 BRGY.MANGIN, Dagupan City</p>';
        updateDeliveryFee(0);
        if (addressGroup) addressGroup.style.display = 'none';
        if (cityGroup) cityGroup.style.display = 'none';
        if (zipGroup) zipGroup.style.display = 'none';
        if (emailGroup) emailGroup.style.display = 'none';
        if (pickupGroup) pickupGroup.style.display = 'block';
        if (document.getElementById('address')) document.getElementById('address').required = false;
        if (document.getElementById('city')) document.getElementById('city').required = false;
        if (document.getElementById('zip')) document.getElementById('zip').required = false;
        if (document.getElementById('email')) document.getElementById('email').required = false;
        if (pickupInput) { pickupInput.required = true; pickupInput.min = new Date().toISOString().split('T')[0]; }
      } else {
        if (deliveryInfo) deliveryInfo.innerHTML = '<p class="section-title">Delivery Courier: LBC</p>';
        updateDeliveryFee(50);
        if (addressGroup) addressGroup.style.display = '';
        if (cityGroup) cityGroup.style.display = '';
        if (zipGroup) zipGroup.style.display = '';
        if (emailGroup) emailGroup.style.display = '';
        if (pickupGroup) pickupGroup.style.display = 'none';
        if (document.getElementById('address')) document.getElementById('address').required = true;
        if (document.getElementById('city')) document.getElementById('city').required = true;
        if (document.getElementById('zip')) document.getElementById('zip').required = true;
        if (document.getElementById('email')) document.getElementById('email').required = true;
        if (pickupInput) pickupInput.required = false;
      }
    }
    shippingRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        toggleShippingFields(e.target.value);
      });
    });
    const initialMethod = document.querySelector('input[name="shipping-method"]:checked')?.value || 'delivery';
    toggleShippingFields(initialMethod);
  const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      console.log('Payment method changed to:', e.target.value);
    });
  });
  const formInputs = document.querySelectorAll('.form-input');
  formInputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.style.transform = 'translateX(5px)';
    });
    input.addEventListener('blur', () => {
      input.parentElement.style.transform = 'translateX(0)';
    });
  });
  const referenceInput = document.getElementById('reference');
  if (referenceInput) {
    referenceInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      if (e.target.value.length > 11) {
        e.target.value = e.target.value.slice(0, 11);
      }
    });
  }
});
function updateDeliveryFee(fee) {
  const deliveryValue = document.querySelectorAll('.summary-value')[2];
  const subtotalValue = document.querySelectorAll('.summary-value')[1];
  const totalValue = document.querySelector('.summary-row.total .summary-value');
  if (deliveryValue && subtotalValue && totalValue) {
    const subtotal = parseInt(subtotalValue.textContent.replace(/[^0-9]/g, ''));
    const newTotal = subtotal + fee;
    deliveryValue.textContent = `Php ${fee}`;
    totalValue.textContent = `Php ${newTotal}`;
    deliveryValue.style.transform = 'scale(1.2)';
    totalValue.style.transform = 'scale(1.2)';
    setTimeout(() => {
      deliveryValue.style.transform = 'scale(1)';
      totalValue.style.transform = 'scale(1)';
    }, 300);
  }
}
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
    <span>${message}</span>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 120px;
    right: 30px;
    background: ${type === 'success' ? '#4caf50' : '#f44336'};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    font-size: 14px;
    font-weight: 500;
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100px);
    }
  }
  .form-group {
    transition: transform 0.3s ease;
  }
`;
document.head.appendChild(style);
window.scrollTo({ top: 0, behavior: 'smooth' });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.type === 'radio') {
    document.activeElement.click();
  }
});
const autoSaveForm = () => {
  const formData = {
    name: document.getElementById('name')?.value || '',
    email: document.getElementById('email')?.value || '',
    phone: document.getElementById('phone')?.value || '',
    address: document.getElementById('address')?.value || '',
    city: document.getElementById('city')?.value || '',
    zip: document.getElementById('zip')?.value || ''
  };
  sessionStorage.setItem('checkoutFormData', JSON.stringify(formData));
};
const loadSavedForm = () => {
  const savedData = sessionStorage.getItem('checkoutFormData');
  if (savedData) {
    try {
      const formData = JSON.parse(savedData);
      Object.keys(formData).forEach(key => {
        const input = document.getElementById(key);
        if (input && formData[key]) {
          input.value = formData[key];
        }
      });
    } catch (e) {
      console.error('Error loading saved form data:', e);
    }
  }
};
let saveTimeout;
document.querySelectorAll('.form-input').forEach(input => {
  input.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(autoSaveForm, 2000);
  });
});
window.addEventListener('load', loadSavedForm);
document.addEventListener('DOMContentLoaded', () => {
  const refFile = document.getElementById('referenceImage');
  const previewDiv = document.getElementById('referencePreview');
  const previewImg = document.getElementById('referencePreviewImg');
  if (!refFile) return;
  refFile.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) { if (previewDiv) previewDiv.style.display = 'none'; if (previewImg) previewImg.src = ''; return; }
    const fr = new FileReader();
    fr.onload = () => {
      if (previewImg) previewImg.src = fr.result;
      if (previewDiv) previewDiv.style.display = 'block';
    };
    fr.readAsDataURL(f);
  });
});
