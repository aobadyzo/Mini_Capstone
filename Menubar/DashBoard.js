// Add click handlers for sidebar items
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        // Remove active class from all items
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        // Add active class to clicked item
        this.classList.add('active');
    });
});

// Add tooltip on hover for chart bars
document.querySelectorAll('.bar').forEach(bar => {
    bar.addEventListener('mouseenter', function(e) {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = this.getAttribute('title');
        tooltip.style.cssText = 'position: absolute; background: #333; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; pointer-events: none; z-index: 1000;';
        document.body.appendChild(tooltip);
        
        // Function to move tooltip with mouse
        const moveTooltip = (event) => {
            tooltip.style.left = event.pageX + 10 + 'px';
            tooltip.style.top = event.pageY - 30 + 'px';
        };
        
        // Add mousemove listener
        this.addEventListener('mousemove', moveTooltip);
        
        // Remove tooltip on mouse leave
        this.addEventListener('mouseleave', function() {
            tooltip.remove();
            this.removeEventListener('mousemove', moveTooltip);
        }, { once: true });
    });
});

// Optional: Add animation for stat cards on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all stat cards
document.querySelectorAll('.stat-card').forEach(card => {
    observer.observe(card);
});

// Optional: Add click handler for user profile
document.querySelector('.user-profile').addEventListener('click', function() {
    console.log('User profile clicked');
    // You can add dropdown menu or profile modal here
});

// Optional: Add search functionality (if you add a search input later)
function handleSearch(query) {
    console.log('Searching for:', query);
    // Implement search logic here
}

// Optional: Update stats dynamically
function updateStats(sales, revenue, orders, customers) {
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues[0]) statValues[0].textContent = sales;
    if (statValues[1]) statValues[1].textContent = revenue;
    if (statValues[2]) statValues[2].textContent = orders;
    if (statValues[3]) statValues[3].textContent = customers;
}

// Example usage:
// updateStats(45, 52, 38, 42);

// Optional: Add table row click handler
document.querySelectorAll('.table-row').forEach(row => {
    row.addEventListener('click', function() {
        console.log('Order clicked:', this.children[0].textContent);
        // You can add order details modal here
    });
});