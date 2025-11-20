const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) header.classList.add('scrolled'); else header.classList.remove('scrolled');
});
const productGrid = document.querySelector('.product-grid');
const searchInput = document.querySelector('.search-input');
async function fetchProducts(){
  const candidates = [
    'http://localhost:3001/api/products',
    '/api/products'
  ];
  const fetchWithTimeout = (url, ms = 3000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
  };
  for(const url of candidates){
    try{
      const res = await fetchWithTimeout(url);
      if(!res.ok) continue;
      const json = await res.json();
      if(Array.isArray(json)) return json;
      if(json && Array.isArray(json.rows)) return json.rows;
    }catch(e){  }
  }
  return [
    { id: 'p1', name: 'Dagupan Bangus', description: 'Premium milkfish sourced fresh from Dagupan Bay, known for its tender meat and rich flavor.', price: 150, badge: 'Fresh' },
    { id: 'p2', name: 'Boneless Bangus', description: 'Carefully deboned milkfish, perfect for quick and easy cooking without compromising taste.', price: 200, badge: 'Popular' },
    { id: 'p3', name: 'Marinated Bangus', description: 'Pre-seasoned milkfish with our secret blend of spices, ready to cook for your convenience.', price: 180, badge: 'New' },
    { id: 'p4', name: 'Smoked Bangus', description: 'Traditionally smoked milkfish with a distinctive aroma and savory taste, a local delicacy.', price: 220, badge: 'Special' }
  ];
}
function formatPrice(n){ return `PHP ${n}`; }
function renderProducts(products){
  if(!productGrid) return;
  productGrid.innerHTML = '';
  products.forEach(p => {
    const el = document.createElement('article');
    el.className = 'product-card';
    const prodId = p.ProductId || p.id || p.ID || null;
    const name = p.Name || p.ProductName || p.name || '';
    const desc = p.Description || p.ProductDescription || p.description || '';
    const priceVal = (typeof p.Price !== 'undefined' && p.Price !== null) ? p.Price : (typeof p.price !== 'undefined' ? p.price : 0);
    const badge = p.badge || p.Category || p.Tag || '';
    const imageUrl = p.ImageData || p.Image || p.image || null;
    el.dataset.id = prodId;
    const bgStyle = imageUrl ? `background-image: url('${imageUrl}')` : 'background-image: none';
    el.innerHTML = `
      <div class="product-image-container">
        <div class="product-image" style="${bgStyle}"></div>
        <span class="product-badge">${escapeHtml(badge)}</span>
      </div>
      <div class="product-info">
        <h3 class="product-name">${escapeHtml(name)}</h3>
        <p class="product-description">${escapeHtml(desc)}</p>
        <div class="product-footer">
          <div class="product-price">
            <span class="price-label">PHP</span>
            <span class="price-value">${escapeHtml(Number(priceVal).toString())}</span>
          </div>
          <button class="add-to-cart-btn">
            <span class="material-symbols-outlined" style="font-size: 18px;">add_shopping_cart</span>
            Add to Cart
          </button>
        </div>
      </div>
    `;
    productGrid.appendChild(el);
  });
  productGrid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.product-card');
      const id = card.dataset.id;
      const name = card.querySelector('.product-name').textContent.trim();
      const price = Number(card.querySelector('.price-value').textContent) || 0;
      addToCart({ id, name, price });
      const origHtml = btn.innerHTML;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">check</span> Added';
      btn.style.background = 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
      setTimeout(()=>{ btn.innerHTML = origHtml; btn.style.background = ''; }, 1500);
    });
  });
}
function escapeHtml(s){ return (s+'').replace(/[&"'<>]/g, c => ({'&':'&amp;','"':'&quot;','\'':'&#39;','<':'&lt;','>':'&gt;'}[c])); }
function getCart(){
  try{ return JSON.parse(localStorage.getItem('cart') || '[]'); }catch(e){return []}
}
function saveCart(cart){ try{ localStorage.setItem('cart', JSON.stringify(cart)); }catch(e){}
}
function addToCart(item){
  const cart = getCart();
  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch(e) { currentUser = null; }
  if (!currentUser) {
    try { sessionStorage.setItem('postLoginRedirect', window.location.pathname + window.location.search); } catch(e){}
    alert('Please log in to add items to your cart. You will be redirected to the login page.');
    window.location.href = '../Login/index.html';
    return;
  }
  const idVal = item.id !== undefined && item.id !== null ? item.id : (item.ProductId !== undefined ? item.ProductId : null);
  const numericId = (idVal !== null && idVal !== '' && !Number.isNaN(Number(idVal))) ? Number(idVal) : null;
  const existing = cart.find(c => (c.id && String(c.id) === String(idVal)) || (numericId !== null && c.productId === numericId));
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
    existing.quantity = existing.qty;
  } else {
    cart.push(Object.assign({}, item, { id: idVal, productId: numericId, qty: 1, quantity: 1 }));
  }
  saveCart(cart);
  try{ const cnt = cart.reduce((s,i)=>s+(i.qty||1),0); document.querySelectorAll('.cart-count').forEach(n=>n.textContent = cnt); }catch(e){}
}
function setupSearch(){
  if(!searchInput) return;
  searchInput.addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.product-card').forEach(card=>{
      const name = card.querySelector('.product-name').textContent.toLowerCase();
      const desc = card.querySelector('.product-description').textContent.toLowerCase();
      card.style.display = (name.includes(q) || desc.includes(q)) ? '' : 'none';
    });
  });
}
document.addEventListener('DOMContentLoaded', async ()=>{
  const products = await fetchProducts();
  renderProducts(products);
  setupSearch();
});
