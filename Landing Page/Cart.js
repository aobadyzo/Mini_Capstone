// Header scroll effect
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Quantity controls
document.addEventListener('DOMContentLoaded', () => {
  const cartItems = document.querySelectorAll('.cart-item');
  
  cartItems.forEach(item => {
    const decreaseBtn = item.querySelector('.qty-btn:first-child');
    const increaseBtn = item.querySelector('.qty-btn:nth-child(3)');
    const deleteBtn = item.querySelector('.delete-btn');
    const qtyDisplay = item.querySelector('.qty-display');
    
    // Decrease quantity
    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let currentQty = parseInt(qtyDisplay.textContent);
        if (currentQty > 1) {
          qtyDisplay.textContent = currentQty - 1;
          updateOrderSummary();
        }
      });
    }
    
    // Increase quantity
    if (increaseBtn) {
      increaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let currentQty = parseInt(qtyDisplay.textContent);
        qtyDisplay.textContent = currentQty + 1;
        updateOrderSummary();
      });
    }
    
    // Delete item
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Add animation before removing
        item.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
          item.remove();
          updateOrderSummary();
          checkEmptyCart();
        }, 300);
      });
    }
  });
});

// Update order summary calculations
function updateOrderSummary() {
  const cartItems = document.querySelectorAll('.cart-item');
  let totalItems = 0;
  let subtotal = 0;
  
  cartItems.forEach(item => {
    const qty = parseInt(item.querySelector('.qty-display').textContent);
    const priceText = item.querySelector('.product-price').textContent;
    const price = parseInt(priceText.replace(/[^0-9]/g, ''));
    
    totalItems += qty;
    subtotal += price * qty;
  });
  
  const deliveryFee = 50;
  const total = subtotal + deliveryFee;
  
  // Update summary display
  document.querySelector('.product-count').textContent = totalItems;
  document.querySelectorAll('.summary-value')[0].textContent = `Php ${subtotal}`;
  document.querySelectorAll('.summary-value')[1].textContent = `Php ${subtotal}`;
  document.querySelectorAll('.summary-value')[2].textContent = `Php ${deliveryFee}`;
  document.querySelector('.summary-row.total .summary-value').textContent = `Php ${total}`;
}

// Check if cart is empty
function checkEmptyCart() {
  const cartItems = document.querySelectorAll('.cart-item');
  if (cartItems.length === 0) {
    const cartItemsContainer = document.querySelector('.cart-items');
    cartItemsContainer.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined" style="font-size: 80px; color: #e0e0e0;">shopping_cart</span>
        <h3>Your cart is empty</h3>
        <p>Add some delicious products from our menu!</p>
      </div>
    `;
  }
}

// Checkout button
const checkoutBtn = document.querySelector('.btn-primary');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', () => {
    alert('Proceeding to checkout...');
    // Add your checkout logic here
  });
}

// Continue shopping button
const continueBtn = document.querySelector('.btn-secondary');
if (continueBtn) {
  continueBtn.addEventListener('click', () => {
    window.location.href = '#menu';
    // Or: window.location.href = 'menu.html';
  });
}

// Add fade out animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-20px);
    }
  }
`;
document.head.appendChild(style);