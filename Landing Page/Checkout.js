// Header scroll effect
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Form validation and submission
document.addEventListener('DOMContentLoaded', () => {
  const checkoutForm = document.getElementById('checkout-form');
  const checkoutBtn = document.querySelector('.btn-checkout');
  
  // Handle form submission
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Get form values
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
      
      // Basic validation
      if (!formData.name || !formData.email || !formData.phone) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }
      
      if (!formData.reference) {
        showNotification('Please enter your reference number', 'error');
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
      }
      
      // Phone validation (Philippine format)
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        showNotification('Please enter a valid phone number (09XXXXXXXXX)', 'error');
        return;
      }
      
      // If all validations pass
      console.log('Order submitted:', formData);
      showNotification('Order placed successfully! 🎉', 'success');
      
      // Simulate redirect after 2 seconds
      setTimeout(() => {
        // window.location.href = 'order-confirmation.html';
        console.log('Redirecting to confirmation page...');
      }, 2000);
    });
  }
  
  // Shipping method change handler
  const shippingRadios = document.querySelectorAll('input[name="shipping-method"]');
  shippingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const deliveryInfo = document.querySelector('.delivery-info');
      if (e.target.value === 'pickup') {
        deliveryInfo.innerHTML = '<p class="section-title">Pickup Location: 148 BRGY.MANGIN, Dagupan City</p>';
        updateDeliveryFee(0);
      } else {
        deliveryInfo.innerHTML = '<p class="section-title">Delivery Courier: LBC</p>';
        updateDeliveryFee(50);
      }
    });
  });
  
  // Payment method change handler
  const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      console.log('Payment method changed to:', e.target.value);
      // You can add specific logic for different payment methods here
    });
  });
  
  // Add input animations
  const formInputs = document.querySelectorAll('.form-input');
  formInputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.style.transform = 'translateX(5px)';
    });
    
    input.addEventListener('blur', () => {
      input.parentElement.style.transform = 'translateX(0)';
    });
  });
  
  // Reference number formatting (optional)
  const referenceInput = document.getElementById('reference');
  if (referenceInput) {
    referenceInput.addEventListener('input', (e) => {
      // Convert to uppercase
      e.target.value = e.target.value.toUpperCase();
    });
  }
  
  // Phone number formatting
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      // Remove non-numeric characters
      e.target.value = e.target.value.replace(/\D/g, '');
      
      // Limit to 11 digits
      if (e.target.value.length > 11) {
        e.target.value = e.target.value.slice(0, 11);
      }
    });
  }
});

// Update delivery fee in order summary
function updateDeliveryFee(fee) {
  const deliveryValue = document.querySelectorAll('.summary-value')[2];
  const subtotalValue = document.querySelectorAll('.summary-value')[1];
  const totalValue = document.querySelector('.summary-row.total .summary-value');
  
  if (deliveryValue && subtotalValue && totalValue) {
    const subtotal = parseInt(subtotalValue.textContent.replace(/[^0-9]/g, ''));
    const newTotal = subtotal + fee;
    
    deliveryValue.textContent = `Php ${fee}`;
    totalValue.textContent = `Php ${newTotal}`;
    
    // Add animation
    deliveryValue.style.transform = 'scale(1.2)';
    totalValue.style.transform = 'scale(1.2)';
    
    setTimeout(() => {
      deliveryValue.style.transform = 'scale(1)';
      totalValue.style.transform = 'scale(1)';
    }, 300);
  }
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
    <span>${message}</span>
  `;
  
  // Add styles
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
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Add animation styles
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

// Smooth scroll to top when page loads
window.scrollTo({ top: 0, behavior: 'smooth' });

// Add keyboard navigation for radio buttons
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.type === 'radio') {
    document.activeElement.click();
  }
});

// Auto-save form data to sessionStorage (optional)
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

// Load saved form data (optional)
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

// Auto-save every 2 seconds when user types
let saveTimeout;
document.querySelectorAll('.form-input').forEach(input => {
  input.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(autoSaveForm, 2000);
  });
});

// Load saved data when page loads
window.addEventListener('load', loadSavedForm);