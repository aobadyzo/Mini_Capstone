
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});
document.querySelectorAll('.bar').forEach(bar => {
    bar.addEventListener('mouseenter', function(e) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = this.getAttribute('title');
        tooltip.style.cssText = 'position: absolute; background: #333; color: white; padding: 5px 10px; border-radius: 5px; font-size: 12px; pointer-events: none; z-index: 1000;';
        document.body.appendChild(tooltip);
        const moveTooltip = (event) => {
            tooltip.style.left = event.pageX + 10 + 'px';
            tooltip.style.top = event.pageY - 30 + 'px';
        };
        this.addEventListener('mousemove', moveTooltip);
        this.addEventListener('mouseleave', function() {
            tooltip.remove();
            this.removeEventListener('mousemove', moveTooltip);
        }, { once: true });
    });
});
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
document.querySelectorAll('.stat-card').forEach(card => {
    observer.observe(card);
});
document.querySelector('.user-profile').addEventListener('click', function() {
    console.log('User profile clicked');
});
function handleSearch(query) {
    console.log('Searching for:', query);
}
function updateStats(sales, revenue, orders, customers) {
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues[0]) statValues[0].textContent = sales;
    if (statValues[1]) statValues[1].textContent = revenue;
    if (statValues[2]) statValues[2].textContent = orders;
    if (statValues[3]) statValues[3].textContent = customers;
}
document.querySelectorAll('.table-row').forEach(row => {
    row.addEventListener('click', function() {
        console.log('Order clicked:', this.children[0].textContent);
    });
});
(function () {
    const API_BASE = 'http://localhost:3001/api';
    async function apiGet(path) {
        try {
            const res = await fetch(API_BASE + path);
            if (!res.ok) throw new Error('Network error: ' + res.status);
            return await res.json();
        } catch (err) {
            console.warn('API request failed', path, err);
            return { ok: false, rows: [] };
        }
    }

    function formatCurrency(v) {
        try { return '$' + Number(v).toFixed(2); } catch(e){ return '$0.00'; }
    }

    function attachBarTooltip(bar) {
        bar.addEventListener('mouseenter', function(e) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('title') || '';
            tooltip.style.cssText = 'position: absolute; background: #333; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; pointer-events: none; z-index: 1000;';
            document.body.appendChild(tooltip);
            const move = (ev) => {
                tooltip.style.left = (ev.pageX + 10) + 'px';
                tooltip.style.top = (ev.pageY - 30) + 'px';
            };
            this.addEventListener('mousemove', move);
            this.addEventListener('mouseleave', function() { tooltip.remove(); this.removeEventListener('mousemove', move); }, { once: true });
        });
    }

    function renderWeeklyChart(orders) {
        const container = document.getElementById('chart-bars');
        if (!container) return;
        const days = [];
        const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            days.push({ date: d, label: labels[d.getDay()], count: 0 });
        }
        orders.forEach(o => {
            const od = o.OrderDate || o.PlacedAt || o.OrderDateTime || o.OrderedAt || null;
            if (!od) return;
            const dt = new Date(od);
            if (isNaN(dt)) return;
            for (const d of days) {
                if (d.date.toDateString() === dt.toDateString()) { d.count++; break; }
            }
        });

        const max = Math.max(...days.map(d=>d.count), 1);
        container.innerHTML = '';
        days.forEach(d => {
            const pct = Math.round((d.count / max) * 100);
            const height = (d.count === 0) ? 6 : Math.max(6, pct);

            const barContainer = document.createElement('div');
            barContainer.className = 'bar-container';

            const barWrapper = document.createElement('div');
            barWrapper.className = 'bar-wrapper';

            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = height + '%';
            bar.setAttribute('title', `${d.label}: ${d.count}`);
            attachBarTooltip(bar);

            barWrapper.appendChild(bar);
            const label = document.createElement('div');
            label.className = 'day-label';
            label.textContent = d.label;

            barContainer.appendChild(barWrapper);
            barContainer.appendChild(label);
            container.appendChild(barContainer);
        });
    }

    function renderTotalStock(products) {
        const el = document.getElementById('total-stock');
        if (!el) return;
        const total = (products || []).reduce((s,p)=> s + (parseInt(p.QuantityOnHand||0)), 0);
        el.textContent = total;
    }

    function renderOrdersTable(orders) {
        const body = document.getElementById('orders-body');
        if (!body) return;
        body.innerHTML = '';
        orders.forEach(o => {
            const row = document.createElement('div');
            row.className = 'table-row';

            const orderId = document.createElement('div');
            orderId.textContent = o.OrderNumber || ('#' + (o.OrderId || ''));

            const customer = document.createElement('div');
            customer.textContent = o.CustomerName || o.Customer || '—';

            const item = document.createElement('div');
            item.textContent = (o.TotalItems && o.TotalItems > 0) ? `${o.TotalItems} items` : (o.Item || '—');

            const total = document.createElement('div');
            total.textContent = formatCurrency(o.TotalPrice || o.TotalAmount || 0);

            const status = document.createElement('div');
            status.textContent = o.Status || o.OrderStatus || '—';

            row.appendChild(orderId);
            row.appendChild(customer);
            row.appendChild(item);
            row.appendChild(total);
            row.appendChild(status);

            row.addEventListener('click', () => { console.log('Order clicked', o); });
            body.appendChild(row);
        });
    }

    async function init() {
        const [prodRes, ordRes] = await Promise.all([apiGet('/products'), apiGet('/orders')]);
        const products = (prodRes && prodRes.rows) ? prodRes.rows : [];
        const orders = (ordRes && ordRes.rows) ? ordRes.rows : [];

        renderTotalStock(products);
        renderWeeklyChart(orders);
        renderOrdersTable(orders);
        try {
            const sales = orders.length;
            const revenue = orders.reduce((s,o) => s + (parseFloat(o.TotalPrice||o.TotalAmount||0)||0), 0);
            const customers = new Set(orders.map(o => (o.CustomerName||o.Customer||'')).filter(Boolean)).size;
            updateStats(sales, revenue, orders.length, customers);
        } catch(e){  }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();