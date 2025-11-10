-- Run these statements in SSMS or sqlcmd as an admin to create a test login/user for the app.
-- Replace the password with a stronger one before running in any environment.

CREATE LOGIN [Inven] WITH PASSWORD = '123';
USE [INVENTORY_SYSTEM_DB];
CREATE USER [Inven] FOR LOGIN [Inven];
ALTER ROLE db_datareader ADD MEMBER [Inven];
ALTER ROLE db_datawriter ADD MEMBER [Inven];
