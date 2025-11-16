Mini_Capstone - API README

This small Express API connects the front-end to the SQL Server schema in `db/schema.sql`.

Quick start (local, Windows + SSMS):

1) Ensure the database exists and the schema has been applied in SSMS.
   - Open `db/schema.sql` in SSMS and run the script (you may comment out the CREATE DATABASE block if you already have the DB).

2) Configure environment variables (recommended) or edit `server/db.js` for local testing:
   - DB_USER (default: sa)
   - DB_PASSWORD (default shown in db.js - change it!)
   - DB_SERVER (default: localhost)
  - DB_NAME (default: INVENTORY_SYSTEM_DB)

3) Install dependencies and run the server (PowerShell):

```powershell
cd "d:\Games\mini capstone\Mini_Capstone\server"
npm install
npm run start
```

4) Server endpoints (JSON):
- POST /api/inventory/add
  body: { name, description, price, quantity, imageBase64, imageFileName, performedBy }
- POST /api/inventory/adjust
  body: { productId, adjustmentType: 'add'|'subtract'|'set', quantity, stockLevel, performedBy }
- POST /api/inventory/restock
  body: { productId, quantity, expiration, performedBy, batchId }
- POST /api/inventory/dispose
  body: { productId, batchId, quantity, reason, notes, performedBy }
- POST /api/audit
  body: { performedBy, actionType, details }
- POST /api/transaction
  body: { orderId, processedBy, paymentMethod, amountPaid, notes }
- GET /api/logs/inventory
- GET /api/logs/audit
- GET /api/logs/transactions

Notes:
- Authentication is not implemented. In production, protect these endpoints.
- Images are stored as VARBINARY(MAX) when provided as base64 in `imageBase64`.
- If you prefer FILESTREAM, change the schema and adjust file handling accordingly.

If you want, I can:
- Add a small Node endpoint to serve static front-end files and demonstrate a full flow.
- Add CORS restrictions or token-based auth.
