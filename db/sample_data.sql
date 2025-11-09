-- Sample data for INVENTORY_SYSTEM_DB
-- Run this file in SSMS after creating the schema. Adjust IDs if your DB already contains rows.

SET NOCOUNT ON;

-- -------- Users --------
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'admin')
BEGIN
    INSERT INTO dbo.Users (Username, Email, PasswordHash, FullName, Role, IsActive)
    VALUES ('admin', 'admin@example.local', 'REPLACE_WITH_BCRYPT_HASH', 'Administrator', 'admin', 1);
END

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'cashier')
BEGIN
    INSERT INTO dbo.Users (Username, Email, PasswordHash, FullName, Role, IsActive)
    VALUES ('cashier', 'cashier@example.local', 'REPLACE_WITH_BCRYPT_HASH', 'Cashier User', 'cashier', 1);
END

-- -------- Products (explicit IDs for predictable references) --------
SET IDENTITY_INSERT dbo.Products ON;
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE ProductId = 1)
BEGIN
    INSERT INTO dbo.Products (ProductId, Name, Description, Price, QuantityOnHand, ReorderLevel, CreatedAt)
    VALUES (1, 'Fresh Fish', 'Farm-fresh whole fish', 250.00, 12, 5, SYSUTCDATETIME());
END
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE ProductId = 2)
BEGIN
    INSERT INTO dbo.Products (ProductId, Name, Description, Price, QuantityOnHand, ReorderLevel, CreatedAt)
    VALUES (2, 'Chicken Breast', 'Boneless skinless', 180.00, 45, 10, SYSUTCDATETIME());
END
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE ProductId = 3)
BEGIN
    INSERT INTO dbo.Products (ProductId, Name, Description, Price, QuantityOnHand, ReorderLevel, CreatedAt)
    VALUES (3, 'Ground Beef', 'Premium ground beef', 320.00, 78, 20, SYSUTCDATETIME());
END
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE ProductId = 4)
BEGIN
    INSERT INTO dbo.Products (ProductId, Name, Description, Price, QuantityOnHand, ReorderLevel, CreatedAt)
    VALUES (4, 'Salmon Fillet', 'Fresh Atlantic salmon', 420.00, 8, 5, SYSUTCDATETIME());
END
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE ProductId = 5)
BEGIN
    INSERT INTO dbo.Products (ProductId, Name, Description, Price, QuantityOnHand, ReorderLevel, CreatedAt)
    VALUES (5, 'Tilapia Fillet', 'Fresh tilapia fillet', 150.00, 30, 10, SYSUTCDATETIME());
END
SET IDENTITY_INSERT dbo.Products OFF;

-- -------- ProductImages (no binary, just metadata/filepath example) --------
IF NOT EXISTS (SELECT 1 FROM dbo.ProductImages WHERE ProductId = 1)
BEGIN
    INSERT INTO dbo.ProductImages (ProductId, FileName, ContentType, ImageData, FilePath, IsPrimary)
    VALUES (1, 'fresh_fish.jpg', 'image/jpeg', NULL, '/images/products/fresh_fish.jpg', 1);
END

-- -------- Orders & OrderItems --------
IF NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE OrderNumber = 'ORD-0001')
BEGIN
    INSERT INTO dbo.Orders (UserId, OrderNumber, OrderStatus, TotalAmount, PlacedAt)
    VALUES ((SELECT UserId FROM dbo.Users WHERE Username = 'admin'), 'ORD-0001', 'Completed', 500.00, SYSUTCDATETIME());
    DECLARE @oid INT = SCOPE_IDENTITY();
    INSERT INTO dbo.OrderItems (OrderId, ProductId, Quantity, UnitPrice)
    VALUES (@oid, 1, 2, 250.00);
END

-- -------- InventoryHistory sample --------
INSERT INTO dbo.InventoryHistory (ProductId, PerformedByUserId, BatchId, ActionType, QuantityChange, Note)
VALUES
    (1, (SELECT UserId FROM dbo.Users WHERE Username='admin'), 'BATCH-001', 'AddProduct', 12, 'Initial stock load'),
    (2, (SELECT UserId FROM dbo.Users WHERE Username='admin'), 'BATCH-002', 'AddProduct', 45, 'Initial stock load'),
    (4, (SELECT UserId FROM dbo.Users WHERE Username='admin'), 'BATCH-003', 'Restock', 8, 'Restocked for weekend');

-- -------- AuditLogs sample --------
INSERT INTO dbo.AuditLogs (PerformedByUserId, ActionType, Details)
VALUES
    ((SELECT UserId FROM dbo.Users WHERE Username='admin'), 'AddUser', 'Created initial admin account'),
    ((SELECT UserId FROM dbo.Users WHERE Username='admin'), 'Login', 'Admin test login');

-- -------- TransactionLogs sample --------
INSERT INTO dbo.TransactionLogs (OrderId, ProcessedByUserId, PaymentMethod, AmountPaid, Notes)
VALUES
    ((SELECT OrderId FROM dbo.Orders WHERE OrderNumber='ORD-0001'), (SELECT UserId FROM dbo.Users WHERE Username='admin'), 'Cash', 500.00, 'POS test transaction');

-- -------- AnalyticsEvents sample --------
INSERT INTO dbo.AnalyticsEvents (EventType, UserId, Metadata)
VALUES
    ('product_view', (SELECT UserId FROM dbo.Users WHERE Username='admin'), '{"productId":1}'),
    ('order_placed', (SELECT UserId FROM dbo.Users WHERE Username='admin'), '{"orderNumber":"ORD-0001"}');

PRINT 'Sample data inserted. Please replace PasswordHash placeholders with bcrypt hashes generated from the included helper script.';
GO
