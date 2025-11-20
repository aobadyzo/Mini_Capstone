window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});
function getCart(){ try{ return JSON.parse(localStorage.getItem('cart')||'[]'); }catch(e){ return []; } }
function saveCart(cart){ try{ localStorage.setItem('cart', JSON.stringify(cart)); }catch(e){}
  updateCartCount(); }
function updateCartCount(){ try{ const cart = getCart(); const cnt = cart.reduce((s,i)=>s+(i.qty||1),0); document.querySelectorAll('.cart-count').forEach(n=>n.textContent = cnt); }catch(e){} }
function renderCart(){
  const cart = getCart();
  const container = document.querySelector('.cart-items');
  if(!container) return;
  if(!cart || cart.length === 0){
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined" style="font-size: 80px; color: #e0e0e0;">shopping_cart</span>
        <h3>Your cart is empty</h3>
        <p>Add some delicious products from our menu!</p>
      </div>`;
    document.querySelector('.product-count') && (document.querySelector('.product-count').textContent = '0');
    document.querySelectorAll('.summary-value')[0] && (document.querySelectorAll('.summary-value')[0].textContent = 'Php 0');
    document.querySelectorAll('.summary-value')[1] && (document.querySelectorAll('.summary-value')[1].textContent = 'Php 0');
    document.querySelectorAll('.summary-value')[2] && (document.querySelectorAll('.summary-value')[2].textContent = 'Php 0');
    document.querySelector('.summary-row.total .summary-value') && (document.querySelector('.summary-row.total .summary-value').textContent = 'Php 0');
    return;
  }
  container.innerHTML = '';
  cart.forEach(item => {
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.dataset.id = item.id;
    el.innerHTML = `
      <div class="item-left">
        <div class="thumb" style="background-image: url('${item.image || ''}');"></div>
        <div class="meta">
          <h4 class="product-name">${item.name}</h4>
          <p class="product-desc">${item.desc || ''}</p>
        </div>
      </div>
      <div class="item-right">
        <div class="qty-controls">
          <button class="qty-decrease qty-btn">-</button>
          <span class="qty-display">${item.qty}</span>
          <button class="qty-increase qty-btn">+</button>
        </div>
        <div class="price-delete">
          <div class="product-price">Php ${item.price}</div>
          <button class="delete-btn">Remove</button>
        </div>
      </div>`;
    container.appendChild(el);
  });
  bindCartEvents();
  updateOrderSummary();
}
function bindCartEvents(){
  document.querySelectorAll('.cart-item').forEach(item => {
    const dec = item.querySelector('.qty-decrease');
    const inc = item.querySelector('.qty-increase');
    const del = item.querySelector('.delete-btn');
    const qtyDisplay = item.querySelector('.qty-display');
    const id = item.dataset.id;
    dec && dec.addEventListener('click', ()=>{
      const cart = getCart(); const idx = cart.findIndex(c=>c.id==id); if(idx>=0 && cart[idx].qty>1) { cart[idx].qty--; cart[idx].quantity = cart[idx].qty; } saveCart(cart); renderCart();
    });
    inc && inc.addEventListener('click', ()=>{
      const cart = getCart(); const idx = cart.findIndex(c=>c.id==id); if(idx>=0) { cart[idx].qty++; cart[idx].quantity = cart[idx].qty; } saveCart(cart); renderCart();
    });
    del && del.addEventListener('click', ()=>{
      let cart = getCart(); cart = cart.filter(c=>c.id!=id); saveCart(cart); renderCart();
    });
  });
}
function updateOrderSummary() {
  const cart = getCart();
  let totalItems = 0;
  let subtotal = 0;
  cart.forEach(item => { totalItems += item.qty||1; subtotal += (Number(item.price)||0) * (item.qty||1); });
  const deliveryFee = 50;
  const total = subtotal + deliveryFee;
  document.querySelector('.product-count') && (document.querySelector('.product-count').textContent = totalItems);
  const sv = document.querySelectorAll('.summary-value');
  if(sv && sv.length>=3){ sv[0].textContent = `Php ${subtotal}`; sv[1].textContent = `Php ${subtotal}`; sv[2].textContent = `Php ${deliveryFee}`; }
  document.querySelector('.summary-row.total .summary-value') && (document.querySelector('.summary-row.total .summary-value').textContent = `Php ${total}`);
}
const checkoutBtn = document.querySelector('.btn-primary');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    let currentUser = null;
    try { currentUser = JSON.parse(localStorage.getItem('currentUser')||'null'); } catch(e) { currentUser = null; }
    if (!currentUser) { alert('Please log in to proceed to checkout'); window.location.href = '../Login/index.html'; return; }
    try{ window.location.href = 'Checkout.html'; }catch(err){ window.location.href = '#checkout'; }
  });
}
const continueBtn = document.querySelector('.btn-secondary');
if (continueBtn) {
  continueBtn.addEventListener('click', () => { window.location.href = 'Menu.html'; });
}
document.addEventListener('DOMContentLoaded', () => { updateCartCount(); renderCart(); });
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-20px); }
  }
`;
document.head.appendChild(style);
