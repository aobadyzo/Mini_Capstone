/*
SQL Server schema for Mini_Capstone (SSMS-ready)
- Place this file in SSMS and execute to create the database and tables.
- Adjust file paths, sizes, and options to match your environment.

Image storage options included:
  1) VARBINARY(MAX) in table (simple, works out-of-the-box)
  2) FILESTREAM (recommended for many/large files) - requires server config and filegroup setup (instructions included)

Notes:
- Run this script as a user with sufficient privileges.
- If you already have a database, skip the CREATE DATABASE block and USE the existing DB.
*/

-- =========================
-- 1) Create database (optional)
-- =========================
IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = N'INVENTORY_SYSTEM_DB')
BEGIN
    CREATE DATABASE INVENTORY_SYSTEM_DB;
    PRINT 'Database INVENTORY_SYSTEM_DB created.';
END
GO

USE INVENTORY_SYSTEM_DB;
GO

-- =========================
-- 2) Core tables
-- =========================

-- Users: basic user account profile
CREATE TABLE dbo.Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(512) NOT NULL,
    FullName NVARCHAR(255) NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'user',
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsActive BIT NOT NULL DEFAULT 1
);

-- Products / Inventory
CREATE TABLE dbo.Products (
    ProductId INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Price DECIMAL(18,2) NOT NULL DEFAULT(0.00),
    QuantityOnHand INT NOT NULL DEFAULT 0,
    ReorderLevel INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL
);

-- ProductImages: store image metadata and binary (or file path)
CREATE TABLE dbo.ProductImages (
    ImageId INT IDENTITY(1,1) PRIMARY KEY,
    ProductId INT NOT NULL REFERENCES dbo.Products(ProductId) ON DELETE CASCADE,
    FileName NVARCHAR(260) NULL,
    ContentType NVARCHAR(100) NULL,
    -- Option A: store binary directly
    ImageData VARBINARY(MAX) NULL,
    -- Option B: store path to image on server / blob store - choose one approach
    FilePath NVARCHAR(500) NULL,
    IsPrimary BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_ProductImages_ProductId ON dbo.ProductImages(ProductId);

-- Orders
CREATE TABLE dbo.Orders (
    OrderId INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NULL REFERENCES dbo.Users(UserId),
    OrderNumber NVARCHAR(50) NOT NULL UNIQUE,
    OrderStatus NVARCHAR(50) NOT NULL DEFAULT 'Pending',
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    PlacedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL
);

-- OrderItems: line items for orders
CREATE TABLE dbo.OrderItems (
    OrderItemId INT IDENTITY(1,1) PRIMARY KEY,
    OrderId INT NOT NULL REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE,
    ProductId INT NOT NULL REFERENCES dbo.Products(ProductId),
    Quantity INT NOT NULL DEFAULT 1,
    UnitPrice DECIMAL(18,2) NOT NULL,
    LineTotal AS (Quantity * UnitPrice) PERSISTED
);
CREATE INDEX IX_OrderItems_OrderId ON dbo.OrderItems(OrderId);

-- InventoryHistory: keeps track of inventory changes / history
-- InventoryHistory: keeps track of inventory changes / history
-- Tracks actions like stock adjustment, add product, restock, disposed product, archived product
CREATE TABLE dbo.InventoryHistory (
    HistoryId INT IDENTITY(1,1) PRIMARY KEY,
    ProductId INT NOT NULL REFERENCES dbo.Products(ProductId),
    PerformedByUserId INT NULL REFERENCES dbo.Users(UserId),
    BatchId NVARCHAR(100) NULL,
    ActionType NVARCHAR(50) NOT NULL CONSTRAINT CK_InventoryHistory_ActionType CHECK (ActionType IN ('StockAdjustment','AddProduct','Restock','DisposedProduct','ArchivedProduct')),
    QuantityChange INT NOT NULL,
    Note NVARCHAR(1000) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_InventoryHistory_ProductId ON dbo.InventoryHistory(ProductId);
CREATE INDEX IX_InventoryHistory_PerformedBy ON dbo.InventoryHistory(PerformedByUserId);

-- AuditLogs: system-level audit of user/account actions (add user, edit user, changed password, etc.)
CREATE TABLE dbo.AuditLogs (
    AuditLogId INT IDENTITY(1,1) PRIMARY KEY,
    PerformedByUserId INT NULL REFERENCES dbo.Users(UserId),
    ActionType NVARCHAR(100) NOT NULL CONSTRAINT CK_AuditLogs_ActionType CHECK (ActionType IN ('AddUser','EditUser','ChangedPassword','DeleteUser','Login','Logout')),
    Details NVARCHAR(MAX) NULL,
    EventTime DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_AuditLogs_PerformedBy ON dbo.AuditLogs(PerformedByUserId);

-- TransactionLogs: payment/transaction records related to orders
CREATE TABLE dbo.TransactionLogs (
    TransactionLogId INT IDENTITY(1,1) PRIMARY KEY,
    OrderId INT NOT NULL REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE,
    ProcessedByUserId INT NULL REFERENCES dbo.Users(UserId),
    PaymentMethod NVARCHAR(100) NOT NULL, -- e.g., 'Cash','Card','Online'
    AmountPaid DECIMAL(18,2) NOT NULL,
    TransactionDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Notes NVARCHAR(1000) NULL
);
CREATE INDEX IX_TransactionLogs_OrderId ON dbo.TransactionLogs(OrderId);
CREATE INDEX IX_TransactionLogs_ProcessedBy ON dbo.TransactionLogs(ProcessedByUserId);

-- AnalyticsEvents: general events for analytics (simple event log)
CREATE TABLE dbo.AnalyticsEvents (
    EventId INT IDENTITY(1,1) PRIMARY KEY,
    EventType NVARCHAR(100) NOT NULL,
    UserId INT NULL REFERENCES dbo.Users(UserId),
    Metadata NVARCHAR(MAX) NULL, -- JSON if you want to store structured data
    EventTime DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_AnalyticsEvents_EventType ON dbo.AnalyticsEvents(EventType);

GO

-- =========================
-- 3) Sample helper objects (views / stored procs)
-- =========================
-- Example view: product with primary image path or flag
IF OBJECT_ID('dbo.v_ProductWithPrimaryImage', 'V') IS NOT NULL
    DROP VIEW dbo.v_ProductWithPrimaryImage;
GO

CREATE VIEW dbo.v_ProductWithPrimaryImage
AS
SELECT p.ProductId, p.Name, p.Description, p.Price, p.QuantityOnHand,
    pi.ImageId, pi.FileName, pi.ContentType, pi.FilePath, pi.IsPrimary
FROM dbo.Products p
LEFT JOIN dbo.ProductImages pi
    ON p.ProductId = pi.ProductId AND pi.IsPrimary = 1;
GO

-- Example stored procedure: add product with optional binary image (ImageData VARBINARY)
IF OBJECT_ID('dbo.AddProductWithImage', 'P') IS NOT NULL
    DROP PROCEDURE dbo.AddProductWithImage;
GO
CREATE PROCEDURE dbo.AddProductWithImage
    @Name NVARCHAR(255),
    @Description NVARCHAR(MAX) = NULL,
    @Price DECIMAL(18,2) = 0.00,
    @QuantityOnHand INT = 0,
    @ImageFileName NVARCHAR(260) = NULL,
    @ImageContentType NVARCHAR(100) = NULL,
    @ImageData VARBINARY(MAX) = NULL -- if NULL, no binary saved
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
    INSERT INTO dbo.Products (Name, Description, Price, QuantityOnHand, CreatedAt)
    VALUES (@Name, @Description, @Price, @QuantityOnHand, SYSUTCDATETIME());

        DECLARE @ProductId INT = SCOPE_IDENTITY();

        IF @ImageData IS NOT NULL OR @ImageFileName IS NOT NULL
        BEGIN
            INSERT INTO dbo.ProductImages (ProductId, FileName, ContentType, ImageData, FilePath, IsPrimary)
            VALUES (@ProductId, @ImageFileName, @ImageContentType, @ImageData, NULL, 1);
        END

        SELECT @ProductId AS ProductId;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

-- =========================
-- 4) Sample INSERT of image from filesystem using OPENROWSET (SSMS)
-- NOTE: You may need to enable Ad Hoc Distributed Queries if disabled.
-- EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
-- EXEC sp_configure 'Ad Hoc Distributed Queries', 1; RECONFIGURE;
--
-- Example:
-- INSERT INTO dbo.ProductImages(ProductId, FileName, ContentType, ImageData, IsPrimary)
-- SELECT 1, 'photo.jpg', 'image/jpeg', BulkColumn, 1
-- FROM OPENROWSET(BULK N'C:\path\to\photo.jpg', SINGLE_BLOB) AS img;

-- =========================
-- 5) FILESTREAM (advanced) - optional
-- If you expect many large images, consider FILESTREAM. High-level steps:
--  1) Enable FILESTREAM at SQL Server level (SQL Server Configuration Manager and sp_configure).
--  2) Create a database with a FILESTREAM filegroup and file. Example skeleton (do not run unless you configured FILESTREAM):
--
-- CREATE DATABASE INVENTORY_SYSTEM_DB_FS
-- ON PRIMARY
-- ( NAME = N'INVENTORY_SYSTEM_DB_FS_data', FILENAME = N'C:\SQLData\INVENTORY_SYSTEM_DB_FS.mdf'),
-- FILEGROUP FileStreamGroup CONTAINS FILESTREAM( NAME = N'INVENTORY_SYSTEM_DB_FS', FILENAME = N'C:\SQLFileStream\INVENTORY_SYSTEM_DB_FS')
-- LOG ON ( NAME = N'INVENTORY_SYSTEM_DB_FS_log', FILENAME = N'C:\SQLLogs\INVENTORY_SYSTEM_DB_FS.ldf' );
--
-- After creating, you can add a VARBINARY(MAX) FILESTREAM column instead of ImageData VARBINARY(MAX):
--    ImageData VARBINARY(MAX) FILESTREAM NULL
-- and use Win32 file APIs or SqlFileStream to manage large binary data efficiently.

-- =========================
-- 6) Quick test queries
-- =========================
-- 1) List products with primary image info:
-- SELECT * FROM dbo.v_ProductWithPrimaryImage;

-- 2) Insert sample user
-- INSERT INTO dbo.Users(Username, Email, PasswordHash, FullName, Role)
-- VALUES('admin','admin@example.local','<hash>','Administrator','admin');

-- 3) Create an order (simple example)
-- DECLARE @oid INT;
-- INSERT INTO dbo.Orders(UserId, OrderNumber, OrderStatus, TotalAmount)
-- VALUES (1, 'ORD-0001', 'Pending', 100.00);
-- SET @oid = SCOPE_IDENTITY();
-- INSERT INTO dbo.OrderItems(OrderId, ProductId, Quantity, UnitPrice)
-- VALUES (@oid, 1, 2, 50.00);

-- =========================
-- End of script
-- =========================
