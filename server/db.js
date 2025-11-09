const sql = require('mssql');

// Configuration: use environment variables in production. For local testing, replace with your values.
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourStrong!Passw0rd',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'INVENTORY_SYSTEM_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to SQL Server');
    return pool;
  })
  .catch(err => console.error('Database Connection Failed!', err));

module.exports = {
  sql, poolPromise
};
