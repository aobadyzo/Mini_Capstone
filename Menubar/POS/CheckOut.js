
const menuItems = document.querySelectorAll('.menu-item');

menuItems.forEach(item => {
  item.addEventListener('click', function() {
    const id = this.getAttribute('data-id');
    console.log('Clicked:', id);
    switch(id) {
      case 'create':
        console.log('Navigate to Create Order');
        break;
      case 'orders':
        console.log('Navigate to Orders');
        break;
      case 'settings':
        console.log('Navigate to Settings');
        break;
      case 'logout':
        console.log('Logout user');
        break;
    }
  });
});
const checkoutButton = document.querySelector('.checkout-button');
checkoutButton.addEventListener('click', function() {
  console.log('Checkout clicked');
  const address = document.querySelector('.address-section input').value;
  const contact = document.querySelector('.contact-section input').value;
  const deliveryCheckboxes = document.querySelectorAll('.delivery-options input[type="checkbox"]');
  let deliveryOption = '';
  deliveryCheckboxes.forEach(checkbox => {
    if (checkbox.checked) {
      deliveryOption = checkbox.parentElement.textContent.trim();
    }
  });
  const paymentCheckboxes = document.querySelectorAll('.payment-method input[type="checkbox"]');
  let paymentMethod = '';
  paymentCheckboxes.forEach(checkbox => {
    if (checkbox.checked) {
      paymentMethod = checkbox.parentElement.textContent.trim().replace(':', '').trim();
    }
  });
  if (!address) {
    alert('Please enter an address');
    return;
  }
  
  if (!contact) {
    alert('Please enter a contact number');
    return;
  }
  
  if (!deliveryOption) {
    alert('Please select a delivery option');
    return;
  }
  
  if (!paymentMethod) {
    alert('Please select a payment method');
    return;
  }
  console.log('Order Details:', {
    address,
    contact,
    deliveryOption,
    paymentMethod
  });
  alert('Order placed successfully!');
});
const deliveryCheckboxes = document.querySelectorAll('.delivery-options input[type="checkbox"]');
deliveryCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', function() {
    if (this.checked) {
      deliveryCheckboxes.forEach(cb => {
        if (cb !== this) cb.checked = false;
      });
    }
  });
});
const paymentCheckboxes = document.querySelectorAll('.payment-method input[type="checkbox"]');
paymentCheckboxes.forEach(checkbox => {
  checkbox.addEventListener('change', function() {
    if (this.checked) {
      paymentCheckboxes.forEach(cb => {
        if (cb !== this) cb.checked = false;
      });
    }
  });
});