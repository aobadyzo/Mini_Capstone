// Smooth scroll effect for header
window.addEventListener('scroll', function() {
  const header = document.getElementById('header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Form submission handler
document.querySelector('.settings-form').addEventListener('submit', function(e) {
  e.preventDefault();
  alert('Settings saved successfully!');
});