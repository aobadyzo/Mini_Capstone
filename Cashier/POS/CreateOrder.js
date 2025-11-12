let products = [];

// Auth guard: redirect to login if no currentUser in localStorage
(function authGuard(){
    try {
        const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!u || !u.UserId) {
            window.location.href = '../Login/index.html';
        }
    } catch (e) {
        try { window.location.href = '../Login/index.html'; } catch(e){}
    }
})();

// Load products from server API; falls back to empty array on error
async function loadProducts() {
    try {
        const res = await fetch('http://localhost:3001/api/products');
        const json = await res.json();
        if (json && json.ok && Array.isArray(json.rows)) {
            products = json.rows.map(p => ({
                id: Number(p.ProductId),
                name: p.Name || 'Product',
                price: p.Price != null ? Number(p.Price) : 0,
                image: p.ImageData || ''
            }));
            renderProducts();
            return;
        }
    } catch (e) {
        console.warn('Could not load products from API', e);
    }

    // fallback sample products if API missing
    products = [
        { id: 1, name: 'Product 1', price: 150, image: '' },
        { id: 2, name: 'Product 2', price: 250, image: '' },
        { id: 3, name: 'Product 3', price: 350, image: '' }
    ];
    renderProducts();
}

let cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
let selectedProduct = null;
let editingProductId = null;

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';

    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item';

        productDiv.innerHTML = `
            <div class="product-name-label">${product.name}</div>
            <div class="product-image">
                ${product.image ? `<img src="${product.image}" alt="${product.name}">` : ''}
            </div>
            <button class="product-price-btn" data-product-id="${product.id}">PHP ${product.price}</button>
        `;

        grid.appendChild(productDiv);
    });

    document.querySelectorAll('.product-price-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-product-id'));
            openQuantityModal(productId);
        });
    });
}

function editProductName(productId) {
    editingProductId = productId;
    const product = products.find(p => p.id === productId);
    document.getElementById('editNameInput').value = product.name;
    document.getElementById('editNameModal').classList.add('active');
}

function closeEditNameModal() {
    document.getElementById('editNameModal').classList.remove('active');
    editingProductId = null;
}

function confirmEditName() {
    const newName = document.getElementById('editNameInput').value.trim();
    if (newName) {
        const product = products.find(p => p.id === editingProductId);
        if (product) {
            product.name = newName;
            renderProducts();
        }
    }
    closeEditNameModal();
}

function openQuantityModal(productId) {
    selectedProduct = products.find(p => p.id === productId);
    document.getElementById('quantityInput').value = 1;
    document.getElementById('quantityModal').classList.add('active');
}

function closeQuantityModal() {
    document.getElementById('quantityModal').classList.remove('active');
    selectedProduct = null;
}

function incrementQuantity() {
    const input = document.getElementById('quantityInput');
    input.value = parseInt(input.value) + 1;
}

function decrementQuantity() {
    const input = document.getElementById('quantityInput');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

function confirmAddToCart() {
    const quantity = parseInt(document.getElementById('quantityInput').value);
    
    const existingItem = cart.find(item => item.id === selectedProduct.id);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            quantity: quantity
        });
    }

    renderCart();
    closeQuantityModal();
    // persist cart for checkout page
    try { localStorage.setItem('pos_cart', JSON.stringify(cart)); } catch (e) { }
}

function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Cart is empty</div>';
        return;
    }

    cart.forEach(item => {
        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'cart-item';

        cartItemDiv.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">PHP ${item.price} × ${item.quantity}</div>
            </div>
            <div class="cart-item-quantity">
                <div class="cart-item-qty">PHP ${item.price * item.quantity}</div>
                <button class="remove-btn" data-product-id="${item.id}">Remove</button>
            </div>
        `;

        cartContainer.appendChild(cartItemDiv);
    });

    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-product-id'));
            removeFromCart(productId);
        });
    });
    try { localStorage.setItem('pos_cart', JSON.stringify(cart)); } catch (e) { }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    renderCart();
    try { localStorage.setItem('pos_cart', JSON.stringify(cart)); } catch (e) { }
}

function proceedOrder() {
    // When user clicks Proceed, go to the checkout page so they can enter address/payment
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    // ensure cart is persisted for the checkout page
    try { localStorage.setItem('pos_cart', JSON.stringify(cart)); } catch (e) { }

    // navigate to checkout (same folder)
    window.location.href = 'CheckOut.html';
}

function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    console.log('Searching for:', searchTerm);

}

document.addEventListener('DOMContentLoaded', function() {
    // load products from API (falls back to sample data)
    loadProducts();
    renderCart();

    const el = id => document.getElementById(id);
    const searchEl = el('searchInput'); if (searchEl) searchEl.addEventListener('input', searchProducts);

    const inc = el('incrementBtn'); if (inc) inc.addEventListener('click', incrementQuantity);
    const dec = el('decrementBtn'); if (dec) dec.addEventListener('click', decrementQuantity);
    const confirmAdd = el('confirmAddBtn'); if (confirmAdd) confirmAdd.addEventListener('click', confirmAddToCart);
    const cancelQty = el('cancelQuantityBtn'); if (cancelQty) cancelQty.addEventListener('click', closeQuantityModal);

    const confirmEdit = el('confirmEditBtn'); if (confirmEdit) confirmEdit.addEventListener('click', confirmEditName);
    const cancelEdit = el('cancelEditBtn'); if (cancelEdit) cancelEdit.addEventListener('click', closeEditNameModal);

    const proceed = el('proceedBtn'); if (proceed) proceed.addEventListener('click', proceedOrder);

    // Menu navigation using data-target attributes
    document.querySelectorAll('.menu-item').forEach(item => {
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
});
