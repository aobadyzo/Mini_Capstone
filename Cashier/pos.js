let cart = [];

function formatCurrency(v){
  if (!v) return '₱0.00';
  return typeof v === 'number' ? '₱' + v.toFixed(2) : v;
}

async function loadProducts(){
  const container = document.getElementById('productItems');
  container.innerHTML = 'Loading...';
  try{
    const res = await fetch('/api/products');
    const json = await res.json();
    if (json.ok && Array.isArray(json.rows)){
      if (json.rows.length===0) container.innerHTML = 'No products';
      else container.innerHTML = json.rows.map(p=>{
        const price = p.Price || 0;
        const pid = p.ProductId || '';
        return `<div class="product-card"><div class="name">${p.Name}</div><div class="price">${formatCurrency(price)}</div><div class="qty">Stock: ${p.QuantityOnHand||0}</div><button data-id="${pid}" data-price="${price}">Add</button></div>`;
      }).join('');
      container.querySelectorAll('button[data-id]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const id = btn.getAttribute('data-id');
          const price = parseFloat(btn.getAttribute('data-price'))||0;
          addToCart({ id, name: btn.previousElementSibling ? btn.previousElementSibling.previousElementSibling.textContent : 'Item', price });
        });
      });
    } else {
      container.innerHTML = 'No products available';
    }
  }catch(e){
    console.warn('Products API failed', e);
    container.innerHTML = 'Unable to load products';
  }
}

function addToCart(item){
  const existing = cart.find(c=>c.id===item.id);
  if (existing) existing.qty += 1; else cart.push({ ...item, qty: 1 });
  renderCart();
}

function renderCart(){
  const el = document.getElementById('cartItems');
  if (!cart.length) el.innerHTML = 'No items';
  else el.innerHTML = cart.map(c=>`<div class="cart-item"><div>${c.name} x${c.qty}</div><div>${formatCurrency(c.price * c.qty)}</div></div>`).join('');
  const total = cart.reduce((s,i)=>s + (i.price * i.qty),0);
  document.getElementById('cartTotal').textContent = formatCurrency(total);
}

const placeBtn = document.getElementById('placeOrderBtn');
if (placeBtn) {
  placeBtn.addEventListener('click', async () => {
    if (!cart.length) { alert('Cart is empty'); return; }
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const payment = (document.getElementById('paymentMethod') || {}).value || 'Cash';
    try {
      const res = await fetch('/api/transaction', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: null, processedBy: null, paymentMethod: payment, amountPaid: total, notes: JSON.stringify(cart) }) });
      const json = await res.json();
      if (json.ok) { alert('Order recorded'); cart = []; renderCart(); }
      else alert('Failed to record order');
    } catch (e) { console.warn('Transaction API failed', e); alert('Transaction failed'); }
  });
}
document.addEventListener('DOMContentLoaded', ()=>{ loadProducts(); renderCart(); });
