

document.addEventListener('DOMContentLoaded', async function() {
  const menuItems = document.querySelectorAll('.menu-item');
  
  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const menuText = this.querySelector('span:last-child').textContent;
      console.log('Clicked:', menuText);
      menuItems.forEach(mi => mi.classList.remove('active'));
      this.classList.add('active');
    });
  });
  const statCards = document.querySelectorAll('.stat-card');
  
  statCards.forEach(card => {
    card.addEventListener('click', function() {
      console.log('Stat card clicked:', this.textContent);
    });
  });
  try {
    const [txRes, ordersRes, productsRes] = await Promise.all([
      fetch('http://localhost:3001/api/logs/transactions'),
      fetch('http://localhost:3001/api/orders'),
      fetch('http://localhost:3001/api/products')
    ]);
    const txJson = await txRes.json().catch(()=>({ok:false}));
    const ordersJson = await ordersRes.json().catch(()=>({ok:false}));
    const productsJson = await productsRes.json().catch(()=>({ok:false}));
    const stats = document.querySelectorAll('.stat-card');
    if (stats && stats.length) {
      let todaySales = 0;
      if (txJson.ok && Array.isArray(txJson.rows)) {
        const today = new Date().toDateString();
        todaySales = txJson.rows.reduce((s, r) => {
          const d = new Date(r.TransactionDate || r.TransactionDate || r.TransactionDate);
          if (d.toDateString() === today) return s + (parseFloat(r.AmountPaid)||0);
          return s;
        }, 0);
      }

      stats[0].textContent = `Today's sales: ${todaySales ? '₱' + todaySales.toFixed(2) : '₱0.00'}`;
      stats[1].textContent = `This week's sales: ${ordersJson.ok && Array.isArray(ordersJson.rows) ? ordersJson.rows.length : 'N/A'}`;
      stats[2].textContent = `Products: ${productsJson.ok && Array.isArray(productsJson.rows) ? productsJson.rows.length : 'N/A'}`;
      stats[3].textContent = `Transactions: ${txJson.ok && Array.isArray(txJson.rows) ? txJson.rows.length : 'N/A'}`;
    }
  } catch (e) {
    console.warn('Analytics API not available', e);
  }
});