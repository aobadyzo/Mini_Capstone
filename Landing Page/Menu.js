// Header scroll effect
const header = document.getElementById('header');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Add to cart functionality
const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');

addToCartButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    e.preventDefault();
    const productCard = button.closest('.product-card');
    const productName = productCard.querySelector('.product-name').textContent;
    
    // Visual feedback
    button.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">check</span>Added!';
    button.style.background = 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
    
    setTimeout(() => {
      button.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">add_shopping_cart</span>Add to Cart';
      button.style.background = 'linear-gradient(135deg, #f34141 0%, #ff6b6b 100%)';
    }, 2000);
    
    console.log(`Added ${productName} to cart`);
  });
});

// Search functionality (optional enhancement)
const searchInput = document.querySelector('.search-input');
const productCards = document.querySelectorAll('.product-card');

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    productCards.forEach(card => {
      const productName = card.querySelector('.product-name').textContent.toLowerCase();
      const productDescription = card.querySelector('.product-description').textContent.toLowerCase();
      
      if (productName.includes(searchTerm) || productDescription.includes(searchTerm)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
}