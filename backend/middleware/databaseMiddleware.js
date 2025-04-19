
const sqlite3 = require('sqlite3').verbose();
const { initializeDatabase } = require('../utils/databaseInit');

function databaseMiddleware(dbPath) {
  const db = new sqlite3.Database(dbPath);
  console.log(`Connected to SQLite database at ${dbPath}`);
  
  // Initialize database tables
  initializeDatabase(db);

  return (req, res, next) => {
    req.db = db;
    next();
  };
}

module.exports = databaseMiddleware;
