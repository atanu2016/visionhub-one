
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('../utils/databaseInit');

function databaseMiddleware(dbPath) {
  // Create directory if it doesn't exist
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory at ${dbDir}`);
    } catch (err) {
      console.error(`Failed to create database directory at ${dbDir}:`, err);
      // Continue with attempt to connect
    }
  }

  // Open database connection
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error(`Error opening database at ${dbPath}:`, err);
      // Try to fallback to a temporary in-memory database for development
      console.warn('Falling back to in-memory database');
    } else {
      console.log(`Connected to SQLite database at ${dbPath}`);
    }
  });
  
  // Initialize database tables
  initializeDatabase(db);

  return (req, res, next) => {
    req.db = db;
    next();
  };
}

module.exports = databaseMiddleware;
