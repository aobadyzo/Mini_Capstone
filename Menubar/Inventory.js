// Inventory Data
let inventory = [
    { id: '123', name: 'Fresh Fish', quantity: 12, stockLevel: 'low', expiration: '12-2026', dateAdded: '10-2024', image: null },
    { id: '124', name: 'Chicken Breast', quantity: 45, stockLevel: 'medium', expiration: '06-2025', dateAdded: '10-2024', image: null },
    { id: '125', name: 'Ground Beef', quantity: 78, stockLevel: 'high', expiration: '08-2025', dateAdded: '10-2024', image: null },
    { id: '126', name: 'Salmon Fillet', quantity: 8, stockLevel: 'low', expiration: '11-2024', dateAdded: '10-2024', image: null }
];

let disposalHistory = [];
let currentProductImage = null;

function renderInventory(items = inventory) {
    const list = document.getElementById('inventoryList');
    list.innerHTML = items.map((item, index) => `
        <div class="table-row" style="animation-delay: ${0.9 + index * 0.1}s">
            <div class="product-image-cell">
                ${item.image ? `<img src="${item.image}" alt="${item.name}">` : '<span class="material-icons">image</span>'}
            </div>
            <div>${item.name}</div>
            <div>${item.id}</div>
            <div>${item.quantity}</div>
            <div><span class="stock-level stock-${item.stockLevel}">${item.stockLevel}</span></div>
            <div>${item.expiration}</div>
            <div>${item.dateAdded}</div>
            <div>
                <button class="delete-btn" onclick="deleteItem('${item.id}')">×</button>
            </div>
        </div>
    `).join('');
}

// Delete Item
function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        inventory = inventory.filter(item => item.id !== id);
        renderInventory();
    }
}

// Open Add Product Modal
function openAddModal() {
    document.getElementById('addModal').classList.add('active');
}

// Open Adjust Stock Modal
function openAdjustModal() {
    const select = document.getElementById('adjustProductSelect');
    select.innerHTML = '<option value="">Select a product</option>' + 
        inventory.map(item => `<option value="${item.id}">${item.name} (${item.id}) - Current: ${item.quantity}</option>`).join('');
    document.getElementById('adjustModal').classList.add('active');
}

// Open Restock Modal
function openRestockModal() {
    const select = document.getElementById('restockProductSelect');
    select.innerHTML = '<option value="">Select a product</option>' + 
        inventory.map(item => `<option value="${item.id}">${item.name} (${item.id}) - Current: ${item.quantity}</option>`).join('');
    document.getElementById('restockModal').classList.add('active');
}

// Open Disposal Modal
function openDisposalModal() {
    const select = document.getElementById('disposalProductId');
    select.innerHTML = '<option value="">Select a product</option>' + 
        inventory.map(item => `<option value="${item.id}">${item.name} (${item.id}) - Available: ${item.quantity}</option>`).join('');
    document.getElementById('disposalModal').classList.add('active');
}

// Close Modal
function closeModal() {
    document.getElementById('addModal').classList.remove('active');
    document.getElementById('adjustModal').classList.remove('active');
    document.getElementById('restockModal').classList.remove('active');
    document.getElementById('disposalModal').classList.remove('active');
}

// Add Product
function addProduct() {
    const name = document.getElementById('productName').value;
    const id = document.getElementById('productId').value;
    const quantity = document.getElementById('productQuantity').value;
    const stockLevel = document.getElementById('stockLevel').value;
    const expiration = document.getElementById('expirationDate').value;
    
    if (name && id && quantity && expiration) {
        const today = new Date();
        const dateAdded = `${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
        
        inventory.push({
            id, 
            name, 
            quantity: parseInt(quantity), 
            stockLevel, 
            expiration, 
            dateAdded,
            image: currentProductImage
        });
        
        renderInventory();
        closeModal();
        
        // Clear form
        document.getElementById('productName').value = '';
        document.getElementById('productId').value = '';
        document.getElementById('productQuantity').value = '';
        document.getElementById('expirationDate').value = '';
        currentProductImage = null;
        resetImagePreview();
        
        alert('Product added successfully!');
        // Send to backend API (if running)
        fetch('http://localhost:3001/api/inventory/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                    name,
                    description: '',
                    price: 0.00,
                    quantity: parseInt(quantity),
                    imageBase64: currentProductImage,
                    imageFileName: null,
                    performedBy: null
                })
        }).then(r => r.json()).then(j => console.log('API addProduct', j)).catch(e => console.warn('API not available', e));

        // Also create an audit log entry (best-effort)
        sendAudit(null, 'AddUser', `AddProduct: ${id} - ${name}`);
    } else {
        alert('Please fill in all fields');
    }
}

// Adjust Stock
function adjustStock() {
    const id = document.getElementById('adjustProductSelect').value;
    const quantity = parseInt(document.getElementById('adjustQuantity').value);
    const stockLevel = document.getElementById('adjustStockLevel').value;
    const adjustmentType = document.getElementById('adjustmentType').value;
    
    if (!id) {
        alert('Please select a product');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    const item = inventory.find(i => i.id === id);
    if (item) {
        // Apply quantity adjustment based on type
        if (adjustmentType === 'add') {
            item.quantity += quantity;
        } else if (adjustmentType === 'subtract') {
            item.quantity = Math.max(0, item.quantity - quantity);
        } else if (adjustmentType === 'set') {
            item.quantity = quantity;
        }
        
        // Update stock level if changed
        if (stockLevel) {
            item.stockLevel = stockLevel;
        }
        
        renderInventory();
        closeModal();
        
        // Clear form
        document.getElementById('adjustQuantity').value = '';
        
        alert('Stock adjusted successfully!');

        // Notify backend
        fetch('http://localhost:3001/api/inventory/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, adjustmentType: adjustmentType, quantity: parseInt(quantity), stockLevel, performedBy: null })
        }).then(r => r.json()).then(j => console.log('API adjustStock', j)).catch(e => console.warn('API not available', e));
        // Audit
        sendAudit(null, 'ChangedPassword', `StockAdjustment: ${id} ${adjustmentType} ${quantity}`);
    }
}

// Restock Product
function restockProduct() {
    const id = document.getElementById('restockProductSelect').value;
    const quantity = parseInt(document.getElementById('restockQuantity').value);
    const expiration = document.getElementById('restockExpiration').value;
    
    if (!id) {
        alert('Please select a product');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
    }
    
    const item = inventory.find(i => i.id === id);
    if (item) {
        item.quantity += quantity;
        
        // Update expiration date if provided
        if (expiration && expiration.trim()) {
            item.expiration = expiration;
        }
        
        // Auto-update stock level based on new quantity
        if (item.quantity < 20) {
            item.stockLevel = 'low';
        } else if (item.quantity < 50) {
            item.stockLevel = 'medium';
        } else {
            item.stockLevel = 'high';
        }
        
        renderInventory();
        closeModal();
        
        // Clear form
        document.getElementById('restockQuantity').value = '';
        document.getElementById('restockExpiration').value = '';
        
        alert(`Successfully restocked ${quantity} units of ${item.name}`);

        // Notify backend
        fetch('http://localhost:3001/api/inventory/restock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: id, quantity: parseInt(quantity), expiration: expiration, performedBy: null, batchId: null })
        }).then(r => r.json()).then(j => console.log('API restock', j)).catch(e => console.warn('API not available', e));
        // Audit
        sendAudit(null, 'EditUser', `Restock: ${id} +${quantity} (exp:${expiration || 'n/a'})`);
    }
}

// Dispose Product
function disposeProduct() {
    const id = document.getElementById('disposalProductId').value;
    const batchNumber = document.getElementById('disposalBatchNumber').value;
    const quantity = parseInt(document.getElementById('disposalQuantity').value);
    const reason = document.getElementById('disposalReason').value;
    const otherReason = document.getElementById('disposalOtherReason').value;
    const notes = document.getElementById('disposalNotes').value;
    
    if (!id) {
        alert('Please select a product');
        return;
    }
    
    if (!batchNumber || !batchNumber.trim()) {
        alert('Please enter a batch number');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        alert('Please enter a valid quantity to dispose');
        return;
    }
    
    if (!reason) {
        alert('Please select a reason for disposal');
        return;
    }
    
    if (reason === 'other' && (!otherReason || !otherReason.trim())) {
        alert('Please specify the reason for disposal');
        return;
    }
    
    const item = inventory.find(i => i.id === id);
    if (item) {
        if (quantity > item.quantity) {
            alert(`Cannot dispose ${quantity} units. Only ${item.quantity} available.`);
            return;
        }
        
        // Record disposal in history
        const disposalRecord = {
            productId: id,
            productName: item.name,
            batchNumber: batchNumber,
            quantity: quantity,
            reason: reason === 'other' ? otherReason : reason,
            notes: notes,
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toISOString()
        };
        
        disposalHistory.push(disposalRecord);
        
        // Reduce inventory quantity
        item.quantity -= quantity;
        
        // Update stock level
        if (item.quantity < 20) {
            item.stockLevel = 'low';
        } else if (item.quantity < 50) {
            item.stockLevel = 'medium';
        } else {
            item.stockLevel = 'high';
        }
        
        renderInventory();
        closeModal();
        
        // Clear form
        document.getElementById('disposalBatchNumber').value = '';
        document.getElementById('disposalQuantity').value = '';
        document.getElementById('disposalReason').value = '';
        document.getElementById('disposalOtherReason').value = '';
        document.getElementById('disposalNotes').value = '';
        
        alert(`Successfully disposed ${quantity} units of ${item.name}\nBatch: ${batchNumber}\nReason: ${disposalRecord.reason}`);
        
        console.log('Disposal History:', disposalHistory);

        // Notify backend
        fetch('http://localhost:3001/api/inventory/dispose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: id, batchId: batchNumber, quantity: quantity, reason: disposalRecord.reason, notes: notes, performedBy: null })
        }).then(r => r.json()).then(j => console.log('API dispose', j)).catch(e => console.warn('API not available', e));
        // Audit
        sendAudit(null, 'ChangedPassword', `Dispose: ${id} -${quantity} (batch:${batchNumber})`);
    }
}

// --- Navigation and audit helper ---
// Map nav label -> filename
const navMap = {
    'Dashboard': '../Home Page/index.html',
    'User': 'User.html',
    'Orders': 'Orders.html',
    'Analytics': 'Analytics.html',
    'Inventory': 'Inventory.html',
    'History': 'History.html',
    'Settings': 'Settings.html'
};
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        const label = this.textContent.trim();
        const target = navMap[label];
        if (target) window.location.href = target;
    });
});

function sendAudit(performedBy, actionType, details) {
    fetch('http://localhost:3001/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performedBy: performedBy || null, actionType, details })
    }).then(r => r.json()).then(j => console.log('Audit:', j)).catch(e => {/* ignore */});
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const filtered = inventory.filter(item => 
        item.name.toLowerCase().includes(search) ||
        item.id.toLowerCase().includes(search)
    );
    renderInventory(filtered);
});

// Show/hide other reason field based on disposal reason selection
document.getElementById('disposalReason').addEventListener('change', (e) => {
    const otherReasonGroup = document.getElementById('otherReasonGroup');
    if (e.target.value === 'other') {
        otherReasonGroup.style.display = 'block';
    } else {
        otherReasonGroup.style.display = 'none';
    }
});

// Image upload handling
document.getElementById('productImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            currentProductImage = event.target.result;
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<img src="${event.target.result}" alt="Product Preview">`;
            preview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    }
});

function resetImagePreview() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `
        <span class="material-icons">add_photo_alternate</span>
        <span>Click to upload image</span>
    `;
    preview.classList.remove('has-image');
    document.getElementById('productImage').value = '';
}

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
});

// Initial render: try fetching from backend API first, fall back to local data
(async function initInventory() {
    try {
        const res = await fetch('http://localhost:3001/api/products');
        const json = await res.json();
        if (json && json.ok && Array.isArray(json.rows)) {
            // Map DB products to inventory shape used by UI
            inventory = json.rows.map(p => ({
                id: p.ProductId || String(p.ProductId),
                name: p.Name || 'Product',
                quantity: p.QuantityOnHand || 0,
                stockLevel: (p.QuantityOnHand < 20) ? 'low' : (p.QuantityOnHand < 50) ? 'medium' : 'high',
                expiration: null,
                dateAdded: p.CreatedAt ? new Date(p.CreatedAt).toLocaleDateString() : '',
                image: null
            }));
            renderInventory(inventory);
            return;
        }
    } catch (e) {
        console.warn('Products API not available', e);
    }

    // fallback
    renderInventory();
})();