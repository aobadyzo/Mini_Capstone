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
    }
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

// Initial render
renderInventory();