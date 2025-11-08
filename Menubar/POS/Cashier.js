// Sample products data
let products = [
    { id: 1, name: 'Product 1', price: 150, image: '' },
    { id: 2, name: 'Product 2', price: 250, image: '' },
    { id: 3, name: 'Product 3', price: 350, image: '' },
    { id: 4, name: 'Product 4', price: 450, image: '' },
    { id: 5, name: 'Product 5', price: 550, image: '' },
    { id: 6, name: 'Product 6', price: 650, image: '' }
];

let cart = [];
let selectedProduct = null;
let editingProductId = null;

// Render products to the grid
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

    // Add event listeners to all product price buttons
    document.querySelectorAll('.product-price-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-product-id'));
            openQuantityModal(productId);
        });
    });
}

// Edit product name
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

// Quantity modal functions
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
}

// Render cart items
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

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-product-id'));
            removeFromCart(productId);
        });
    });
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    renderCart();
}

function proceedOrder() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    alert(`Order Total: PHP ${total}\n\nOrder has been processed!`);
    
    cart = [];
    renderCart();
}

function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    console.log('Searching for:', searchTerm);
    // You can implement filtering logic here
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize
    renderProducts();
    renderCart();

    // Search input
    document.getElementById('searchInput').addEventListener('input', searchProducts);

    // Quantity modal buttons
    document.getElementById('incrementBtn').addEventListener('click', incrementQuantity);
    document.getElementById('decrementBtn').addEventListener('click', decrementQuantity);
    document.getElementById('confirmAddBtn').addEventListener('click', confirmAddToCart);
    document.getElementById('cancelQuantityBtn').addEventListener('click', closeQuantityModal);

    // Edit name modal buttons
    document.getElementById('confirmEditBtn').addEventListener('click', confirmEditName);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditNameModal);

    // Proceed button
    document.getElementById('proceedBtn').addEventListener('click', proceedOrder);

    // Menu items (you can add navigation logic here)
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const menuClass = this.classList[1]; // Get the specific menu class
            console.log('Clicked:', menuClass);
            // Add your navigation logic here
        });
    });
});