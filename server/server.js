const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { poolPromise, sql } = require('./db');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Input validators
function ensureInt(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error('Value must be an integer');
  return n;
}

function ensureDecimal(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  if (!Number.isFinite(n)) throw new Error('Value must be a number');
  return n;
}

function ensureString(val) {
  if (val === null || val === undefined) return null;
  return String(val);
}

function generateBatchId() {
  const ts = Date.now();
  const rnd = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `B-${ts}-${rnd}`;
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/inventory/add', async (req, res) => {
  const { name, description, price, quantity, imageBase64, imageFileName, performedBy, batchId, expiration } = req.body;
  // validate numeric inputs
  try {
    if (price !== undefined && price !== null) ensureDecimal(price);
    if (quantity !== undefined && quantity !== null) ensureInt(quantity);
    if (performedBy !== undefined && performedBy !== null) ensureInt(performedBy);
  } catch (vErr) {
    return res.status(400).json({ ok: false, error: 'Invalid input: ' + vErr.message });
  }
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
  // validate inputs
  try {
    ensureInt(productId);
    if (quantity !== undefined && quantity !== null) ensureInt(quantity);
    if (stockLevel !== undefined && stockLevel !== null) ensureInt(stockLevel);
    if (performedBy !== undefined && performedBy !== null) ensureInt(performedBy);
    if (adjustmentType && !['add','subtract','set'].includes(adjustmentType)) throw new Error('Invalid adjustmentType');
  } catch (vErr) {
    return res.status(400).json({ ok: false, error: 'Invalid input: ' + vErr.message });
  }
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
  // validate inputs
  try {
    ensureInt(productId);
    ensureInt(quantity);
    if (performedBy !== undefined && performedBy !== null) ensureInt(performedBy);
  } catch (vErr) {
    return res.status(400).json({ ok: false, error: 'Invalid input: ' + vErr.message });
  }
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
  // validate inputs
  try {
    ensureInt(productId);
    ensureInt(quantity);
    if (performedBy !== undefined && performedBy !== null) ensureInt(performedBy);
  } catch (vErr) {
    return res.status(400).json({ ok: false, error: 'Invalid input: ' + vErr.message });
  }
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
  // validate inputs
  try {
    if (orderId !== undefined && orderId !== null) ensureInt(orderId);
    if (processedBy !== undefined && processedBy !== null) ensureInt(processedBy);
    if (amountPaid !== undefined && amountPaid !== null) ensureDecimal(amountPaid);
    if (paymentMethod !== undefined && paymentMethod !== null) ensureString(paymentMethod);
  } catch (vErr) {
    return res.status(400).json({ ok: false, error: 'Invalid input: ' + vErr.message });
  }
  try {
    const pool = await poolPromise;
    // Use a transaction to ensure Order and TransactionLog are created atomically
    const tx = pool.transaction();
    await tx.begin();

    let finalOrderId = orderId;
    // If no orderId provided, create an Orders row first so TransactionLogs.OrderId (NOT NULL) can reference it
    if (!finalOrderId) {
      const orderReq = tx.request();
      orderReq.input('UserId', sql.Int, processedBy || null);
      // generate a simple unique order number
      const orderNumber = `ORD-${Date.now()}`;
      orderReq.input('OrderNumber', sql.NVarChar(50), orderNumber);
      orderReq.input('TotalAmount', sql.Decimal(18,2), amountPaid || 0.00);
      const insertOrderSql = `INSERT INTO dbo.Orders (UserId, OrderNumber, OrderStatus, TotalAmount, PlacedAt)
        OUTPUT INSERTED.OrderId
        VALUES (@UserId, @OrderNumber, 'Completed', @TotalAmount, SYSUTCDATETIME());`;
      const orderRes = await orderReq.query(insertOrderSql);
      finalOrderId = orderRes.recordset && orderRes.recordset[0] ? orderRes.recordset[0].OrderId : null;
    }

    const tReq = tx.request();
    tReq.input('OrderId', sql.Int, finalOrderId);
    tReq.input('ProcessedByUserId', sql.Int, processedBy || null);
    tReq.input('PaymentMethod', sql.NVarChar(100), paymentMethod || 'Cash');
    tReq.input('AmountPaid', sql.Decimal(18,2), amountPaid || 0.00);
    tReq.input('Notes', sql.NVarChar(1000), notes || null);
    await tReq.query(`INSERT INTO dbo.TransactionLogs (OrderId, ProcessedByUserId, PaymentMethod, AmountPaid, TransactionDate, Notes)
      VALUES (@OrderId, @ProcessedByUserId, @PaymentMethod, @AmountPaid, SYSUTCDATETIME(), @Notes);`);

    // If notes contains cart items, insert OrderItems and decrement product quantities
    try {
      let cart = [];
      if (notes) {
        try {
          const parsed = JSON.parse(notes);
          if (parsed && Array.isArray(parsed.cart)) cart = parsed.cart;
        } catch (e) { /* ignore parse errors */ }
      }

      const allocations = []; // collect batch allocations to return to client
      if (cart && cart.length) {
        for (const it of cart) {
          const prodId = parseInt(it.id);
          let qty = parseInt(it.quantity) || 0;
          const unitPrice = typeof it.price !== 'undefined' && it.price !== null ? Number(it.price) : 0;
          if (!isNaN(prodId) && qty > 0) {
            // Insert the order item record (one per product)
            const oiReq = tx.request();
            oiReq.input('OrderId', sql.Int, finalOrderId);
            oiReq.input('ProductId', sql.Int, prodId);
            oiReq.input('Quantity', sql.Int, qty);
            oiReq.input('UnitPrice', sql.Decimal(18,2), unitPrice);
            await oiReq.query(`INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice) VALUES (@OrderId, @ProductId, @Quantity, @UnitPrice);`);

            // Allocate from batches FIFO by DateAdded (oldest first)
            const alloc = { productId: prodId, requested: qty, batches: [] };
            const batchReq = tx.request();
            batchReq.input('ProductId', sql.Int, prodId);
            const batchRes = await batchReq.query(`SELECT BatchId, QuantityOnHand FROM dbo.Batches WHERE ProductId = @ProductId AND QuantityOnHand > 0 ORDER BY DateAdded ASC, CreatedAt ASC`);

            let remaining = qty;
            if (batchRes.recordset && batchRes.recordset.length) {
              for (const b of batchRes.recordset) {
                if (remaining <= 0) break;
                const available = Number(b.QuantityOnHand || 0);
                if (available <= 0) continue;
                const take = Math.min(remaining, available);

                // decrement batch quantity
                const updBatchReq = tx.request();
                updBatchReq.input('BatchId', sql.NVarChar(100), b.BatchId);
                updBatchReq.input('ProductId', sql.Int, prodId);
                updBatchReq.input('NewBatchQty', sql.Int, available - take);
                await updBatchReq.query('UPDATE dbo.Batches SET QuantityOnHand = @NewBatchQty, UpdatedAt = SYSUTCDATETIME() WHERE BatchId = @BatchId AND ProductId = @ProductId');

                // record inventory history per batch
                const histReq = tx.request();
                histReq.input('ProductId', sql.Int, prodId);
                histReq.input('PerformedByUserId', sql.Int, processedBy || null);
                histReq.input('BatchId', sql.NVarChar(100), b.BatchId || null);
                histReq.input('ActionType', sql.NVarChar(50), 'Sold');
                histReq.input('QuantityChange', sql.Int, -Math.abs(take));
                histReq.input('Note', sql.NVarChar(1000), `Sold via OrderId ${finalOrderId}`);
                await histReq.query(`INSERT INTO dbo.InventoryHistory (ProductId, PerformedByUserId, BatchId, ActionType, QuantityChange, Note, CreatedAt)
                  VALUES (@ProductId, @PerformedByUserId, @BatchId, @ActionType, @QuantityChange, @Note, SYSUTCDATETIME());`);

                alloc.batches.push({ batchId: b.BatchId, quantity: take, unitPrice });
                remaining -= take;
              }
            }

            // If still remaining (no batches or insufficient), decrement Products table and log with null batch
            if (remaining > 0) {
              // Decrement remaining from Products.QuantityOnHand (clamp at zero)
              const updReq = tx.request();
              updReq.input('ProductId', sql.Int, prodId);
              updReq.input('QtyChange', sql.Int, remaining);
              await updReq.query(`UPDATE dbo.Products SET QuantityOnHand = CASE WHEN QuantityOnHand - @QtyChange < 0 THEN 0 ELSE QuantityOnHand - @QtyChange END, UpdatedAt = SYSUTCDATETIME() WHERE ProductId = @ProductId;`);

              const histReq2 = tx.request();
              histReq2.input('ProductId', sql.Int, prodId);
              histReq2.input('PerformedByUserId', sql.Int, processedBy || null);
              histReq2.input('BatchId', sql.NVarChar(100), null);
              histReq2.input('ActionType', sql.NVarChar(50), 'Sold');
              histReq2.input('QuantityChange', sql.Int, -Math.abs(remaining));
              histReq2.input('Note', sql.NVarChar(1000), `Sold via OrderId ${finalOrderId} (unbatched)`);
              await histReq2.query(`INSERT INTO dbo.InventoryHistory (ProductId, PerformedByUserId, BatchId, ActionType, QuantityChange, Note, CreatedAt)
                VALUES (@ProductId, @PerformedByUserId, @BatchId, @ActionType, @QuantityChange, @Note, SYSUTCDATETIME());`);

              alloc.batches.push({ batchId: null, quantity: remaining, unitPrice });
              remaining = 0;
            } else {
              // also decrement the overall Products.QuantityOnHand by qty (already decremented via batches), ensure product total updated
              const updReq2 = tx.request();
              updReq2.input('ProductId', sql.Int, prodId);
              updReq2.input('QtyChange', sql.Int, qty);
              await updReq2.query(`UPDATE dbo.Products SET QuantityOnHand = CASE WHEN QuantityOnHand - @QtyChange < 0 THEN 0 ELSE QuantityOnHand - @QtyChange END, UpdatedAt = SYSUTCDATETIME() WHERE ProductId = @ProductId;`);
            }

            allocations.push(alloc);
          }
        }
      }
    } catch(e) {
      console.warn('Failed to insert order items or update stock', e);
    }

  await tx.commit();
  // return allocation details and processing metadata so client can print batch codes and who processed
  const processedAt = new Date();
  res.json({ ok: true, orderId: finalOrderId, processedAt: processedAt.toISOString(), processedBy: processedBy || null, allocations });
  } catch (err) {
    console.error(err);
    try { if (tx && tx.rollback) await tx.rollback(); } catch(e){}
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
    let productId;
    try { productId = ensureInt(req.query.productId); } catch(e){ return res.status(400).json({ ok:false, error: 'Invalid productId' }); }
    if (productId === null) return res.status(400).json({ ok: false, error: 'productId required' });
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

// Delete a product and related data (images, batches, history)
app.delete('/api/products/:id', async (req, res) => {
  const productId = parseInt(req.params.id);
  if (isNaN(productId)) return res.status(400).json({ ok: false, error: 'Invalid product id' });
  try {
    const pool = await poolPromise;
    const tx = pool.transaction();
    await tx.begin();

    const reqDel = tx.request();
    reqDel.input('ProductId', sql.Int, productId);

    // Remove images
    await reqDel.query('DELETE FROM dbo.ProductImages WHERE ProductId = @ProductId');

    // Remove batches
    await reqDel.query('DELETE FROM dbo.Batches WHERE ProductId = @ProductId');

    // Remove inventory history
    await reqDel.query('DELETE FROM dbo.InventoryHistory WHERE ProductId = @ProductId');

    // Finally remove product
    await reqDel.query('DELETE FROM dbo.Products WHERE ProductId = @ProductId');

    await tx.commit();
    res.json({ ok: true, productId });
  } catch (err) {
    console.error('Failed to delete product', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const pool = await poolPromise;


    const result = await pool.request().query(`SELECT TOP (1000)
      o.OrderId,
      o.OrderNumber,
      NULL AS CustomerName,
      ISNULL((SELECT SUM(Quantity) FROM dbo.OrderItems oi WHERE oi.OrderId = o.OrderId), 0) AS TotalItems,
      o.TotalAmount AS TotalPrice,
      (SELECT TOP 1 tl.PaymentMethod FROM dbo.TransactionLogs tl WHERE tl.OrderId = o.OrderId ORDER BY tl.TransactionDate DESC) AS PaymentMethod,
      o.OrderStatus AS Status,
      NULL AS ShippingAddress,
      o.PlacedAt AS OrderDate
      FROM dbo.Orders o ORDER BY o.PlacedAt DESC`);
    res.json({ ok: true, rows: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Detailed order endpoint: returns order metadata, latest transaction (payment, notes) and order items
app.get('/api/orders/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const pool = await poolPromise;

    // determine whether identifier is numeric OrderId or an OrderNumber string
    let orderQuery = null;
    let orderReq = pool.request();
    const maybeId = parseInt(identifier);
    if (!isNaN(maybeId) && String(maybeId) === identifier) {
      orderReq.input('OrderId', sql.Int, maybeId);
      orderQuery = 'SELECT * FROM dbo.Orders WHERE OrderId = @OrderId';
    } else {
      orderReq.input('OrderNumber', sql.NVarChar(50), identifier);
      orderQuery = 'SELECT * FROM dbo.Orders WHERE OrderNumber = @OrderNumber';
    }

    const orderRes = await orderReq.query(orderQuery);
    if (!orderRes.recordset || orderRes.recordset.length === 0) return res.status(404).json({ ok: false, error: 'Order not found' });
    const order = orderRes.recordset[0];

    // get latest transaction log for the order
    const tlReq = pool.request();
    tlReq.input('OrderId', sql.Int, order.OrderId);
    const tlRes = await tlReq.query(`SELECT TOP 1 * FROM dbo.TransactionLogs WHERE OrderId = @OrderId ORDER BY TransactionDate DESC`);
    const txLog = (tlRes.recordset && tlRes.recordset[0]) ? tlRes.recordset[0] : null;

    // parse notes JSON if present
    let parsedNotes = null;
    if (txLog && txLog.Notes) {
      try { parsedNotes = JSON.parse(txLog.Notes); } catch(e) { parsedNotes = null; }
    }

    // fetch order items with product metadata
    const oiReq = pool.request();
    oiReq.input('OrderId', sql.Int, order.OrderId);
    const oiRes = await oiReq.query(`SELECT oi.OrderItemId, oi.OrderId, oi.ProductId, oi.Quantity, oi.UnitPrice, p.Name AS ProductName
      FROM dbo.OrderItems oi
      LEFT JOIN dbo.Products p ON p.ProductId = oi.ProductId
      WHERE oi.OrderId = @OrderId`);

    const items = (oiRes.recordset || []).map(r => ({
      orderItemId: r.OrderItemId,
      productId: r.ProductId,
      name: r.ProductName || ('Product ' + r.ProductId),
      quantity: r.Quantity,
      unitPrice: Number(r.UnitPrice || 0),
      lineTotal: Number((r.Quantity || 0) * (Number(r.UnitPrice || 0)))
    }));

    const out = {
      order: {
        orderId: order.OrderId,
        orderNumber: order.OrderNumber,
        orderStatus: order.OrderStatus,
        totalAmount: Number(order.TotalAmount || 0),
        placedAt: order.PlacedAt,
        updatedAt: order.UpdatedAt
      },
      transaction: txLog ? {
        paymentMethod: txLog.PaymentMethod,
        amountPaid: Number(txLog.AmountPaid || 0),
        notes: parsedNotes
      } : null,
      items
    };

    return res.json({ ok: true, data: out });
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
  // validate performedBy if provided
  try { if (performedBy !== undefined && performedBy !== null) ensureInt(performedBy); } catch(vErr){ return res.status(400).json({ ok:false, error: 'Invalid input: ' + vErr.message }); }
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
  let userIdParam;
  try { userIdParam = ensureInt(req.params.id); } catch(e) { return res.status(400).json({ ok:false, error: 'Invalid user id' }); }
  if (userIdParam === null) return res.status(400).json({ ok:false, error: 'user id required' });
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
      // UpdatedAt column may not exist in older schemas; avoid updating it to prevent SQL errors
      await u.query(`UPDATE dbo.Users SET FullName = @FullName, Email = @Email, Role = @Role, Username = @Username, PasswordHash = @PasswordHash WHERE UserId = @UserId`);
    } else {
      // Do not attempt to update UpdatedAt if the column is absent in the database schema
      await u.query(`UPDATE dbo.Users SET FullName = @FullName, Email = @Email, Role = @Role, Username = @Username WHERE UserId = @UserId`);
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
