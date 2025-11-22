document.addEventListener('DOMContentLoaded', function() {
  // Data
  const analyticsData = {
    customers: 1247,
    sales: 89450.75,
    bestSellers: [
      { name: 'Chocolate Cake', sold: 156, revenue: 15600 },
      { name: 'Croissant', sold: 142, revenue: 7100 },
      { name: 'Espresso', sold: 128, revenue: 6400 },
      { name: 'Blueberry Muffin', sold: 98, revenue: 4900 },
      { name: 'Cinnamon Roll', sold: 87, revenue: 4350 },
    ],
    fastMoving: [
      { name: 'Espresso', velocity: 'Very High', trend: '+23%' },
      { name: 'Croissant', velocity: 'High', trend: '+18%' },
      { name: 'Latte', velocity: 'High', trend: '+15%' },
    ],
    slowMoving: [
      { name: 'Fruit Tart', velocity: 'Low', trend: '-8%' },
      { name: 'Baguette', velocity: 'Low', trend: '-5%' },
      { name: 'Rye Bread', velocity: 'Very Low', trend: '-12%' },
    ],
    barChart: [
      { label: 'Mon', current: 85, previous: 65 },
      { label: 'Tue', current: 72, previous: 80 },
      { label: 'Wed', current: 90, previous: 70 },
      { label: 'Thu', current: 65, previous: 55 },
      { label: 'Fri', current: 95, previous: 75 },
      { label: 'Sat', current: 100, previous: 85 },
      { label: 'Sun', current: 78, previous: 60 },
    ]
  };

  // Menu Navigation
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      menuItems.forEach(mi => mi.classList.remove('active'));
      this.classList.add('active');
      console.log('Navigated to:', this.dataset.page);
    });
  });

  // Date Range Picker
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');
  const displayFrom = document.getElementById('display-from');
  const displayTo = document.getElementById('display-to');

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  function updateDateDisplay() {
    displayFrom.textContent = formatDate(dateFrom.value);
    displayTo.textContent = formatDate(dateTo.value);
    // In real app, fetch new data based on date range
    console.log('Date range changed:', dateFrom.value, 'to', dateTo.value);
  }

  dateFrom.addEventListener('change', updateDateDisplay);
  dateTo.addEventListener('change', updateDateDisplay);

  // Render Bar Chart
  function renderBarChart() {
    const container = document.getElementById('bar-chart');
    container.innerHTML = '';

    analyticsData.barChart.forEach(day => {
      const group = document.createElement('div');
      group.className = 'bar-group';

      const bars = document.createElement('div');
      bars.className = 'bars';

      // Previous bar
      const prevBar = document.createElement('div');
      prevBar.className = 'bar previous bar-hover';
      prevBar.style.height = `${day.previous * 2}px`;
      const prevTooltip = document.createElement('div');
      prevTooltip.className = 'bar-tooltip';
      prevTooltip.textContent = `₱${(day.previous * 120).toLocaleString()}`;
      prevBar.appendChild(prevTooltip);

      // Current bar
      const currBar = document.createElement('div');
      currBar.className = 'bar current bar-hover';
      currBar.style.height = `${day.current * 2}px`;
      const currTooltip = document.createElement('div');
      currTooltip.className = 'bar-tooltip';
      currTooltip.textContent = `₱${(day.current * 150).toLocaleString()}`;
      currBar.appendChild(currTooltip);

      bars.appendChild(prevBar);
      bars.appendChild(currBar);

      const label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = day.label;

      group.appendChild(bars);
      group.appendChild(label);
      container.appendChild(group);
    });
  }

  // Render Best Sellers
  function renderBestSellers() {
    const container = document.getElementById('best-sellers');
    container.innerHTML = '';

    analyticsData.bestSellers.forEach((item, index) => {
      const listItem = document.createElement('div');
      listItem.className = 'list-item bestseller stat-item-hover';

      const rankClass = index < 3 ? `rank-${index + 1}` : 'rank-default';

      listItem.innerHTML = `
        <div class="item-left">
          <span class="rank-badge ${rankClass} float-animation">${index + 1}</span>
          <span class="item-name">${item.name}</span>
        </div>
        <div class="item-right">
          <span class="item-sold">${item.sold} sold</span>
          <span class="item-revenue">₱${item.revenue.toLocaleString()}</span>
        </div>
      `;

      container.appendChild(listItem);
    });
  }

  // Render Fast Moving
  function renderFastMoving() {
    const container = document.getElementById('fast-moving');
    container.innerHTML = '';

    analyticsData.fastMoving.forEach(item => {
      const listItem = document.createElement('div');
      listItem.className = 'list-item fast stat-item-hover';

      listItem.innerHTML = `
        <div class="item-left">
          <span class="material-icons trend-icon positive icon-hover">arrow_upward</span>
          <span class="item-name">${item.name}</span>
        </div>
        <div class="item-right">
          <span class="velocity-badge fast">${item.velocity}</span>
          <span class="trend-value positive">${item.trend}</span>
        </div>
      `;

      container.appendChild(listItem);
    });
  }

  // Render Slow Moving
  function renderSlowMoving() {
    const container = document.getElementById('slow-moving');
    container.innerHTML = '';

    analyticsData.slowMoving.forEach(item => {
      const listItem = document.createElement('div');
      listItem.className = 'list-item slow stat-item-hover';

      listItem.innerHTML = `
        <div class="item-left">
          <span class="material-icons trend-icon negative icon-hover">arrow_downward</span>
          <span class="item-name">${item.name}</span>
        </div>
        <div class="item-right">
          <span class="velocity-badge slow">${item.velocity}</span>
          <span class="trend-value negative">${item.trend}</span>
        </div>
      `;

      container.appendChild(listItem);
    });
  }

  // Update Stats
  function updateStats() {
    document.getElementById('customers-count').textContent = 
      analyticsData.customers.toLocaleString();
    document.getElementById('sales-total').textContent = 
      `₱${analyticsData.sales.toLocaleString()}`;
  }

  // Fetch data from API (simulated)
  async function fetchAnalyticsData() {
    try {
      // In real app, uncomment and use actual API endpoints
      /*
      const [txRes, ordersRes, productsRes] = await Promise.all([
        fetch('http://localhost:3001/api/logs/transactions'),
        fetch('http://localhost:3001/api/orders'),
        fetch('http://localhost:3001/api/products')
      ]);
      
      const txJson = await txRes.json().catch(() => ({ ok: false }));
      const ordersJson = await ordersRes.json().catch(() => ({ ok: false }));
      const productsJson = await productsRes.json().catch(() => ({ ok: false }));

      // Process data...
      if (txJson.ok && Array.isArray(txJson.rows)) {
        const today = new Date().toDateString();
        const todaySales = txJson.rows.reduce((sum, row) => {
          const d = new Date(row.TransactionDate);
          if (d.toDateString() === today) {
            return sum + (parseFloat(row.AmountPaid) || 0);
          }
          return sum;
        }, 0);
        analyticsData.sales = todaySales;
      }
      */

      console.log('Analytics data loaded');
    } catch (error) {
      console.warn('Analytics API not available:', error);
    }
  }

  // Initialize
  function init() {
    fetchAnalyticsData();
    updateStats();
    renderBarChart();
    renderBestSellers();
    renderFastMoving();
    renderSlowMoving();
  }

  init();
});