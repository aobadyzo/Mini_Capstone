const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { poolPromise, sql } = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Add product endpoint
app.post('/api/inventory/add', async (req, res) => {
  const { name, description, price, quantity, imageBase64, imageFileName, performedBy } = req.body;
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();
    const request = tx.request();
    request.input('Name', sql.NVarChar(255), name);
    request.input('Description', sql.NVarChar(sql.MAX), description);
    request.input('Price', sql.Decimal(18,2), price || 0.00);
    request.input('QuantityOnHand', sql.Int, quantity || 0);

    const insertProduct = `INSERT INTO dbo.Products (Name, Description, Price, QuantityOnHand, CreatedAt)
      OUTPUT INSERTED.ProductId
      VALUES (@Name, @Description, @Price, @QuantityOnHand, SYSUTCDATETIME());`;

    const result = await request.query(insertProduct);
    const productId = result.recordset[0].ProductId;

    // If an image was provided as data URL or base64, store as VARBINARY(MAX)
    if (imageBase64) {
      // imageBase64 may be data URL like 'data:image/png;base64,...' or raw base64
      let base64 = imageBase64;
      const commaIndex = base64.indexOf(',');
      if (commaIndex >= 0) base64 = base64.slice(commaIndex + 1);
      const buffer = Buffer.from(base64, 'base64');

      const imgReq = tx.request();
      imgReq.input('ProductId', sql.Int, productId);
      imgReq.input('FileName', sql.NVarChar(260), imageFileName || null);
      imgReq.input('ContentType', sql.NVarChar(100), null);
      imgReq.input('ImageData', sql.VarBinary(sql.MAX), buffer);
      imgReq.input('IsPrimary', sql.Bit, 1);
      await imgReq.query(`INSERT INTO dbo.ProductImages (ProductId, FileName, ContentType, ImageData, FilePath, IsPrimary, CreatedAt)
        VALUES (@ProductId, @FileName, @ContentType, @ImageData, NULL, @IsPrimary, SYSUTCDATETIME());`);
    }

    // Insert inventory history record
    const histReq = tx.request();
    histReq.input('ProductId', sql.Int, productId);
    histReq.input('PerformedByUserId', sql.Int, performedBy || null);
    histReq.input('BatchId', sql.NVarChar(100), null);
    histReq.input('ActionType', sql.NVarChar(50), 'AddProduct');
    histReq.input('QuantityChange', sql.Int, quantity || 0);
    histReq.input('Note', sql.NVarChar(1000), 'Added product via API');
    await histReq.query(`INSERT INTO dbo.InventoryHistory (ProductId, PerformedByUserId, BatchId, ActionType, QuantityChange, Note, CreatedAt)
      VALUES (@ProductId, @PerformedByUserId, @BatchId, @ActionType, @QuantityChange, @Note, SYSUTCDATETIME());`);

    await tx.commit();
    res.json({ ok: true, productId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Adjust stock
app.post('/api/inventory/adjust', async (req, res) => {
  const { productId, adjustmentType, quantity, stockLevel, performedBy } = req.body;
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();

    const getReq = tx.request();
    getReq.input('ProductId', sql.Int, productId);
    const productRes = await getReq.query('SELECT QuantityOnHand FROM dbo.Products WHERE ProductId = @ProductId');
    if (productRes.recordset.length === 0) throw new Error('Product not found');

    let currentQty = productRes.recordset[0].QuantityOnHand;
    let newQty = currentQty;
    if (adjustmentType === 'add') newQty = currentQty + parseInt(quantity);
    else if (adjustmentType === 'subtract') newQty = Math.max(0, currentQty - parseInt(quantity));
    else if (adjustmentType === 'set') newQty = parseInt(quantity);

    const updReq = tx.request();
    updReq.input('ProductId', sql.Int, productId);
    updReq.input('NewQty', sql.Int, newQty);
    await updReq.query('UPDATE dbo.Products SET QuantityOnHand = @NewQty, UpdatedAt = SYSUTCDATETIME() WHERE ProductId = @ProductId');

    // Insert history
    const histReq = tx.request();
    histReq.input('ProductId', sql.Int, productId);
    histReq.input('PerformedByUserId', sql.Int, performedBy || null);
    histReq.input('BatchId', sql.NVarChar(100), null);
    histReq.input('ActionType', sql.NVarChar(50), 'StockAdjustment');
    histReq.input('QuantityChange', sql.Int, newQty - currentQty);
    histReq.input('Note', sql.NVarChar(1000), `Adjusted via API (type=${adjustmentType})`);
    await histReq.query(`INSERT INTO dbo.InventoryHistory (ProductId, PerformedByUserId, BatchId, ActionType, QuantityChange, Note, CreatedAt)
      VALUES (@ProductId, @PerformedByUserId, @BatchId, @ActionType, @QuantityChange, @Note, SYSUTCDATETIME());`);

    await tx.commit();
    res.json({ ok: true, productId, previous: currentQty, updated: newQty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Restock
app.post('/api/inventory/restock', async (req, res) => {
  const { productId, quantity, expiration, performedBy, batchId } = req.body;
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();

    const getReq = tx.request();
    getReq.input('ProductId', sql.Int, productId);
    const productRes = await getReq.query('SELECT QuantityOnHand FROM dbo.Products WHERE ProductId = @ProductId');
    if (productRes.recordset.length === 0) throw new Error('Product not found');

    const currentQty = productRes.recordset[0].QuantityOnHand;
    const newQty = currentQty + parseInt(quantity);

    const updReq = tx.request();
    updReq.input('ProductId', sql.Int, productId);
    updReq.input('NewQty', sql.Int, newQty);
    await updReq.query('UPDATE dbo.Products SET QuantityOnHand = @NewQty, UpdatedAt = SYSUTCDATETIME() WHERE ProductId = @ProductId');

    const histReq = tx.request();
    histReq.input('ProductId', sql.Int, productId);
    histReq.input('PerformedByUserId', sql.Int, performedBy || null);
    histReq.input('BatchId', sql.NVarChar(100), batchId || null);
    histReq.input('ActionType', sql.NVarChar(50), 'Restock');
    histReq.input('QuantityChange', sql.Int, parseInt(quantity));
    histReq.input('Note', sql.NVarChar(1000), `Restocked via API; expiration: ${expiration || ''}`);
    await histReq.query(`INSERT INTO dbo.InventoryHistory (ProductId, PerformedByUserId, BatchId, ActionType, QuantityChange, Note, CreatedAt)
      VALUES (@ProductId, @PerformedByUserId, @BatchId, @ActionType, @QuantityChange, @Note, SYSUTCDATETIME());`);

    await tx.commit();
    res.json({ ok: true, productId, previous: currentQty, updated: newQty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Dispose product
app.post('/api/inventory/dispose', async (req, res) => {
  const { productId, batchId, quantity, reason, notes, performedBy } = req.body;
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();

    const getReq = tx.request();
    getReq.input('ProductId', sql.Int, productId);
    const productRes = await getReq.query('SELECT QuantityOnHand FROM dbo.Products WHERE ProductId = @ProductId');
    if (productRes.recordset.length === 0) throw new Error('Product not found');

    const currentQty = productRes.recordset[0].QuantityOnHand;
    if (parseInt(quantity) > currentQty) throw new Error('Insufficient quantity to dispose');

    const newQty = currentQty - parseInt(quantity);
    const updReq = tx.request();
    updReq.input('ProductId', sql.Int, productId);
    updReq.input('NewQty', sql.Int, newQty);
    await updReq.query('UPDATE dbo.Products SET QuantityOnHand = @NewQty, UpdatedAt = SYSUTCDATETIME() WHERE ProductId = @ProductId');

    const histReq = tx.request();
    histReq.input('ProductId', sql.Int, productId);
    histReq.input('PerformedByUserId', sql.Int, performedBy || null);
    histReq.input('BatchId', sql.NVarChar(100), batchId || null);
    histReq.input('ActionType', sql.NVarChar(50), 'DisposedProduct');
    histReq.input('QuantityChange', sql.Int, -Math.abs(parseInt(quantity)));
    histReq.input('Note', sql.NVarChar(1000), `${reason || ''} ${notes || ''}`);
    await histReq.query(`INSERT INTO dbo.InventoryHistory (ProductId, PerformedByUserId, BatchId, ActionType, QuantityChange, Note, CreatedAt)
      VALUES (@ProductId, @PerformedByUserId, @BatchId, @ActionType, @QuantityChange, @Note, SYSUTCDATETIME());`);

    await tx.commit();
    res.json({ ok: true, productId, previous: currentQty, updated: newQty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Audit log endpoint
app.post('/api/audit', async (req, res) => {
  const { performedBy, actionType, details } = req.body;
  try {
    const pool = await poolPromise;
    const r = pool.request();
    r.input('PerformedByUserId', sql.Int, performedBy || null);
    r.input('ActionType', sql.NVarChar(100), actionType);
    r.input('Details', sql.NVarChar(sql.MAX), details || null);
    await r.query(`INSERT INTO dbo.AuditLogs (PerformedByUserId, ActionType, Details, EventTime)
      VALUES (@PerformedByUserId, @ActionType, @Details, SYSUTCDATETIME());`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Transaction log endpoint
app.post('/api/transaction', async (req, res) => {
  const { orderId, processedBy, paymentMethod, amountPaid, notes } = req.body;
  try {
    const pool = await poolPromise;
    const r = pool.request();
    r.input('OrderId', sql.Int, orderId);
    r.input('ProcessedByUserId', sql.Int, processedBy || null);
    r.input('PaymentMethod', sql.NVarChar(100), paymentMethod);
    r.input('AmountPaid', sql.Decimal(18,2), amountPaid);
    r.input('Notes', sql.NVarChar(1000), notes || null);
    await r.query(`INSERT INTO dbo.TransactionLogs (OrderId, ProcessedByUserId, PaymentMethod, AmountPaid, TransactionDate, Notes)
      VALUES (@OrderId, @ProcessedByUserId, @PaymentMethod, @AmountPaid, SYSUTCDATETIME(), @Notes);`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Simple fetch logs endpoints for History page
app.get('/api/logs/inventory', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP (1000) * FROM dbo.InventoryHistory ORDER BY CreatedAt DESC');
    res.json({ ok: true, rows: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/logs/audit', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP (1000) * FROM dbo.AuditLogs ORDER BY EventTime DESC');
    res.json({ ok: true, rows: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/logs/transactions', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP (1000) * FROM dbo.TransactionLogs ORDER BY TransactionDate DESC');
    res.json({ ok: true, rows: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get products (for Inventory frontend)
app.get('/api/products', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT ProductId, Name, Description, Price, QuantityOnHand, CreatedAt, UpdatedAt FROM dbo.Products ORDER BY CreatedAt DESC`);
    res.json({ ok: true, rows: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get orders (for Orders frontend)
app.get('/api/orders', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT TOP (1000) OrderId, OrderNumber, CustomerName, TotalItems, TotalPrice, PaymentMethod, Status, ShippingAddress, OrderDate FROM dbo.Orders ORDER BY OrderDate DESC`);
    res.json({ ok: true, rows: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get users (for Settings/Login admin views)
app.get('/api/users', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT UserId, Username, FirstName, LastName, Email, Role, PasswordHash, CreatedAt FROM dbo.Users ORDER BY CreatedAt DESC`);
    res.json({ ok: true, rows: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API server listening on port ${port}`));
