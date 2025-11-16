// Order Summary Page JavaScript

// Header scroll effect
const header = document.querySelector('.header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 50) {
    header.style.height = '80px';
    header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
  } else {
    header.style.height = '100px';
    header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
  }
  
  lastScroll = currentScroll;
});

// Profile navigation items
const navItems = document.querySelectorAll('.profile-nav-item');

navItems.forEach(item => {
  item.addEventListener('click', function(e) {
    // Remove active class from all items
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // Add active class to clicked item
    this.classList.add('active');
  });
});

// Close button functionality
const closeBtn = document.querySelector('.close-btn');

closeBtn.addEventListener('click', () => {
  // Add animation before closing/redirecting
  const orderSummary = document.querySelector('.order-summary-section');
  orderSummary.style.transform = 'scale(0.95)';
  orderSummary.style.opacity = '0';
  
  setTimeout(() => {
    // Redirect to orders page or close modal
    window.location.href = '#orders';
    // or: window.history.back();
  }, 300);
});

// Logout button functionality
const logoutBtn = document.querySelector('.logout-btn');

logoutBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to log out?')) {
    // Add your logout logic here
    console.log('Logging out...');
    // Example: window.location.href = '/logout';
  }
});

// Product card click functionality
const productCards = document.querySelectorAll('.product-card');

productCards.forEach(card => {
  card.addEventListener('click', function() {
    // Add a pulse animation on click
    this.style.transform = 'scale(0.98)';
    
    setTimeout(() => {
      this.style.transform = '';
    }, 150);
    
    // You can add more functionality here like opening a modal
    console.log('Product card clicked');
  });
});

// Smooth scroll for navigation links
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

// Add loading animation when page loads
window.addEventListener('load', () => {
  const main = document.querySelector('main');
  main.style.opacity = '0';
  
  setTimeout(() => {
    main.style.transition = 'opacity 0.5s ease';
    main.style.opacity = '1';
  }, 100);
});

// Optional: Add confirmation before leaving page with unsaved changes
let hasUnsavedChanges = false;

window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

// Info card interactions - add ripple effect on click
const infoCards = document.querySelectorAll('.info-card');

infoCards.forEach(card => {
  card.addEventListener('click', function(e) {
    // Create ripple effect
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

// Add CSS for ripple animation dynamically
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

// Console log for development
console.log('Order Summary page loaded successfully!');