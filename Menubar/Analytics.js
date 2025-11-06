// Analytics Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Menu item click handlers
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const menuText = this.querySelector('span:last-child').textContent;
      console.log('Clicked:', menuText);
      
      // Optional: Handle active state
      // Remove active class from all items
      menuItems.forEach(mi => mi.classList.remove('active'));
      // Add active class to clicked item
      this.classList.add('active');
    });
  });

  // Stat card click handlers
  const statCards = document.querySelectorAll('.stat-card');
  
  statCards.forEach(card => {
    card.addEventListener('click', function() {
      console.log('Stat card clicked:', this.textContent);
      // Add your stat card functionality here
    });
  });
});