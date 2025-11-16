-- Migration: create Batches table (run once)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Batches]') AND type in (N'U'))
BEGIN
    CREATE TABLE dbo.Batches (
        BatchId NVARCHAR(100) NOT NULL PRIMARY KEY,
        ProductId INT NOT NULL,
        QuantityReceived INT NOT NULL DEFAULT 0,
        QuantityOnHand INT NOT NULL DEFAULT 0,
        Expiration NVARCHAR(50) NULL,
        DateAdded DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NULL
    );
END
