const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { poolPromise, sql } = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
function generateBatchId() {
  const ts = Date.now();
  const rnd = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `B-${ts}-${rnd}`;
}
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.post('/api/inventory/add', async (req, res) => {
  const { name, description, price, quantity, imageBase64, imageFileName, performedBy, batchId, expiration } = req.body;
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();
    const request = tx.request();
    request.input('Name', sql.NVarChar(255), name);
    request.input('Description', sql.NVarChar(sql.MAX), description);
    request.input('Price', sql.Decimal(18,2), price || 0.00);
    request.input('QuantityOnHand', sql.Int, quantity || 0);
    const batchVal = (batchId && String(batchId).trim()) ? batchId : generateBatchId();
    request.input('BatchId', sql.NVarChar(100), batchVal);
    request.input('Expiration', sql.NVarChar(50), expiration || null);

    const insertProduct = `INSERT INTO dbo.Products (Name, Description, Price, QuantityOnHand, BatchId, Expiration, CreatedAt)
      OUTPUT INSERTED.ProductId
      VALUES (@Name, @Description, @Price, @QuantityOnHand, @BatchId, @Expiration, SYSUTCDATETIME());`;

    const result = await request.query(insertProduct);
    const productId = result.recordset[0].ProductId;
    if (imageBase64) {
      let base64 = imageBase64;
      let contentType = null;
      const commaIndex = base64.indexOf(',');
      if (commaIndex >= 0) {
        const meta = base64.slice(0, commaIndex);
        base64 = base64.slice(commaIndex + 1);
        const m = meta.match(/^data:\s*([^;]+);base64/i);
        if (m) contentType = m[1];
      }
      const buffer = Buffer.from(base64, 'base64');

      const imgReq = tx.request();
      imgReq.input('ProductId', sql.Int, productId);
      imgReq.input('FileName', sql.NVarChar(260), imageFileName || null);
      imgReq.input('ContentType', sql.NVarChar(100), contentType || 'application/octet-stream');
      imgReq.input('ImageData', sql.VarBinary(sql.MAX), buffer);
      imgReq.input('IsPrimary', sql.Bit, 1);
      await imgReq.query(`INSERT INTO dbo.ProductImages (ProductId, FileName, ContentType, ImageData, FilePath, IsPrimary, CreatedAt)
        VALUES (@ProductId, @FileName, @ContentType, @ImageData, NULL, @IsPrimary, SYSUTCDATETIME());`);
    }
    const histReq = tx.request();
    histReq.input('ProductId', sql.Int, productId);
    histReq.input('PerformedByUserId', sql.Int, performedBy || null);
    histReq.input('BatchId', sql.NVarChar(100), batchVal || null);
    histReq.input('Expiration', sql.NVarChar(50), expiration || '');
    histReq.input('ActionType', sql.NVarChar(50), 'AddProduct');
    histReq.input('QuantityChange', sql.Int, quantity || 0);
    histReq.input('Note', sql.NVarChar(1000), 'Added product via API');
    await histReq.query(`INSERT INTO dbo.InventoryHistory (ProductId, PerformedByUserId, BatchId, Expiration, ActionType, QuantityChange, Note, CreatedAt)
      VALUES (@ProductId, @PerformedByUserId, @BatchId, @Expiration, @ActionType, @QuantityChange, @Note, SYSUTCDATETIME());`);

    await tx.commit();
    res.json({ ok: true, productId, batchId: batchVal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
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
    const batchVal = (batchId && String(batchId).trim()) ? batchId : generateBatchId();
    const batchReq = tx.request();
    batchReq.input('BatchId', sql.NVarChar(100), batchVal);
    batchReq.input('ProductId', sql.Int, productId);
    batchReq.input('QuantityReceived', sql.Int, parseInt(quantity));
    batchReq.input('QuantityOnHand', sql.Int, parseInt(quantity));
    batchReq.input('Expiration', sql.NVarChar(50), expiration || null);
    await batchReq.query(`INSERT INTO dbo.Batches (BatchId, ProductId, QuantityReceived, QuantityOnHand, Expiration, DateAdded, CreatedAt)
      VALUES (@BatchId, @ProductId, @QuantityReceived, @QuantityOnHand, @Expiration, SYSUTCDATETIME(), SYSUTCDATETIME());`);
    const updReq = tx.request();
    updReq.input('ProductId', sql.Int, productId);
    updReq.input('NewQty', sql.Int, newQty);
    await updReq.query('UPDATE dbo.Products SET QuantityOnHand = @NewQty, UpdatedAt = SYSUTCDATETIME() WHERE ProductId = @ProductId');

    const histReq = tx.request();
    histReq.input('ProductId', sql.Int, productId);
    histReq.input('PerformedByUserId', sql.Int, performedBy || null);
  histReq.input('BatchId', sql.NVarChar(100), batchVal || null);
    histReq.input('Expiration', sql.NVarChar(50), expiration || '');
    histReq.input('ActionType', sql.NVarChar(50), 'Restock');
    histReq.input('QuantityChange', sql.Int, parseInt(quantity));
    histReq.input('Note', sql.NVarChar(1000), `Restocked via API; expiration: ${expiration || ''}`);
    await histReq.query(`INSERT INTO dbo.InventoryHistory (ProductId, PerformedByUserId, BatchId, Expiration, ActionType, QuantityChange, Note, CreatedAt)
      VALUES (@ProductId, @PerformedByUserId, @BatchId, @Expiration, @ActionType, @QuantityChange, @Note, SYSUTCDATETIME());`);

    await tx.commit();
    res.json({ ok: true, productId, previous: currentQty, updated: newQty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
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
    if (parseInt(quantity) > currentQty) throw new Error('Insufficient total product quantity to dispose');
    if (batchId && String(batchId).trim()) {
      const bReq = tx.request();
      bReq.input('BatchId', sql.NVarChar(100), batchId);
      bReq.input('ProductId', sql.Int, productId);
      const bRes = await bReq.query('SELECT QuantityOnHand FROM dbo.Batches WHERE BatchId = @BatchId AND ProductId = @ProductId');
      if (bRes.recordset.length === 0) throw new Error('Batch not found for product');
      const batchQty = bRes.recordset[0].QuantityOnHand;
      if (parseInt(quantity) > batchQty) throw new Error('Insufficient quantity in selected batch to dispose');

      const newBatchQty = batchQty - parseInt(quantity);
      const updBatchReq = tx.request();
      updBatchReq.input('BatchId', sql.NVarChar(100), batchId);
      updBatchReq.input('ProductId', sql.Int, productId);
      updBatchReq.input('NewBatchQty', sql.Int, newBatchQty);
      await updBatchReq.query('UPDATE dbo.Batches SET QuantityOnHand = @NewBatchQty, UpdatedAt = SYSUTCDATETIME() WHERE BatchId = @BatchId AND ProductId = @ProductId');
    }

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
app.get('/api/batches', async (req, res) => {
  try {
    const productId = parseInt(req.query.productId);
    if (isNaN(productId)) return res.status(400).json({ ok: false, error: 'productId required' });
    const pool = await poolPromise;
    const r = pool.request();
    r.input('ProductId', sql.Int, productId);
    const result = await r.query(`SELECT BatchId, ProductId, QuantityReceived, QuantityOnHand, Expiration, DateAdded, CreatedAt, UpdatedAt
      FROM dbo.Batches WHERE ProductId = @ProductId ORDER BY Expiration ASC, DateAdded DESC`);
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
app.get('/api/products', async (req, res) => {
  try {
    const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT p.ProductId, p.Name, p.Description, p.Price, p.QuantityOnHand, p.BatchId, p.Expiration, p.CreatedAt, p.UpdatedAt,
           pi.FileName AS ImageFileName, pi.ContentType AS ImageContentType, pi.ImageData
    FROM dbo.Products p
    LEFT JOIN dbo.ProductImages pi ON pi.ProductId = p.ProductId AND pi.IsPrimary = 1
    ORDER BY p.CreatedAt DESC
  `);
    const rows = result.recordset.map(r => {
      const out = Object.assign({}, r);
      try {
        if (r.ImageData) {
          const contentType = r.ImageContentType || 'image/png';
          const b64 = Buffer.from(r.ImageData).toString('base64');
          out.ImageData = `data:${contentType};base64,${b64}`;
        } else {
          out.ImageData = null;
        }
      } catch (e) {
        out.ImageData = null;
      }
      return out;
    });

    res.json({ ok: true, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.get('/api/orders', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT TOP (1000) 
      OrderId,
      OrderNumber,
      NULL AS CustomerName,
      0 AS TotalItems,
      TotalAmount AS TotalPrice,
      NULL AS PaymentMethod,
      OrderStatus AS Status,
      NULL AS ShippingAddress,
      PlacedAt AS OrderDate
      FROM dbo.Orders ORDER BY PlacedAt DESC`);
    res.json({ ok: true, rows: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.get('/api/users', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT UserId, Username, FullName, Email, Role, PasswordHash, CreatedAt FROM dbo.Users ORDER BY CreatedAt DESC`);
    const rows = result.recordset.map(r => {
      const full = r.FullName || '';
      const parts = full.trim().split(/\s+/);
      return Object.assign({}, r, {
        FirstName: parts.length ? parts[0] : '',
        LastName: parts.length > 1 ? parts.slice(1).join(' ') : ''
      });
    });
    res.json({ ok: true, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post('/api/users', async (req, res) => {
  let { username, firstName, lastName, email, role, performedBy, password } = req.body;
  try {
    const pool = await poolPromise;
    const fullName = `${(firstName||'').toString().trim()} ${(lastName||'').toString().trim()}`.trim();
    if (!username || !String(username).trim()) username = (firstName || '').toString().trim();
    if (!password) {
      const rrole = (role || '').toString().toLowerCase();
      if (rrole === 'admin') password = 'admin123';
      else if (rrole === 'cashier') password = 'cashier123';
      else password = 'password123';
    }

    const r = pool.request();
    r.input('Username', sql.NVarChar(100), username || null);
    r.input('FullName', sql.NVarChar(255), fullName || null);
    r.input('Email', sql.NVarChar(255), email || null);
    r.input('Role', sql.NVarChar(50), role || null);
    r.input('PasswordHash', sql.NVarChar(sql.MAX), password || null);
    const insert = `INSERT INTO dbo.Users (Username, FullName, Email, Role, PasswordHash, CreatedAt)
      OUTPUT INSERTED.UserId
      VALUES (@Username, @FullName, @Email, @Role, @PasswordHash, SYSUTCDATETIME());`;
    const result = await r.query(insert);
    const userId = result.recordset[0].UserId;
    try {
      const a = pool.request();
      a.input('PerformedByUserId', sql.Int, performedBy || null);
      a.input('ActionType', sql.NVarChar(100), 'AddUser');
      a.input('Details', sql.NVarChar(sql.MAX), `Created user ${username || fullName} (id=${userId})`);
      await a.query(`INSERT INTO dbo.AuditLogs (PerformedByUserId, ActionType, Details, EventTime) VALUES (@PerformedByUserId, @ActionType, @Details, SYSUTCDATETIME());`);
    } catch(e){ console.warn('Audit insert failed', e); }

    res.json({ ok: true, userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.put('/api/users/:id', async (req, res) => {
  const userIdParam = parseInt(req.params.id);
  const { firstName, lastName, email, role, performedBy, username, newPassword } = req.body;
  try {
    const pool = await poolPromise;
    const fullName = `${(firstName||'').toString().trim()} ${(lastName||'').toString().trim()}`.trim();
    const u = pool.request();
    u.input('UserId', sql.Int, userIdParam);
    u.input('FullName', sql.NVarChar(255), fullName || null);
    u.input('Email', sql.NVarChar(255), email || null);
    u.input('Role', sql.NVarChar(50), role || null);
    u.input('Username', sql.NVarChar(100), username || null);
    if (newPassword) {
      u.input('PasswordHash', sql.NVarChar(sql.MAX), newPassword);
      await u.query(`UPDATE dbo.Users SET FullName = @FullName, Email = @Email, Role = @Role, Username = @Username, PasswordHash = @PasswordHash, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @UserId`);
    } else {
      await u.query(`UPDATE dbo.Users SET FullName = @FullName, Email = @Email, Role = @Role, Username = @Username, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @UserId`);
    }
    try {
      const a = pool.request();
      a.input('PerformedByUserId', sql.Int, performedBy || null);
      a.input('ActionType', sql.NVarChar(100), 'EditUser');
      a.input('Details', sql.NVarChar(sql.MAX), `Updated user id=${userIdParam} (${fullName})`);
      await a.query(`INSERT INTO dbo.AuditLogs (PerformedByUserId, ActionType, Details, EventTime) VALUES (@PerformedByUserId, @ActionType, @Details, SYSUTCDATETIME());`);
    } catch(e){ console.warn('Audit insert failed', e); }

    res.json({ ok: true, userId: userIdParam });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API server listening on port ${port}`));
