
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

  // First check if database file is accessible
  let useInMemory = false;
  try {
    if (fs.existsSync(dbPath)) {
      // Check if we have write permission by trying to open it
      const fd = fs.openSync(dbPath, 'r+');
      fs.closeSync(fd);
    } else {
      // Try to create the file to check write permission
      fs.writeFileSync(dbPath, '', { flag: 'wx' });
    }
  } catch (err) {
    console.error(`Database file at ${dbPath} is not writable:`, err);
    useInMemory = true;
  }

  // Open database connection
  let db;
  if (useInMemory) {
    console.warn('Using in-memory database due to file access issues');
    db = new sqlite3.Database(':memory:');
  } else {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`Error opening database at ${dbPath}:`, err);
        // We'll continue with the database instance anyway, which will be in-memory in this case
      } else {
        console.log(`Connected to SQLite database at ${dbPath}`);
      }
    });
  }
  
  // Set PRAGMA for better reliability
  db.run("PRAGMA journal_mode = WAL;"); // Write-Ahead Logging for better concurrency
  db.run("PRAGMA foreign_keys = ON;"); // Enforce foreign key constraints
  
  // Initialize database tables
  try {
    initializeDatabase(db);
  } catch (dbErr) {
    console.error('Database initialization error:', dbErr);
  }

  return (req, res, next) => {
    req.db = db;
    next();
  };
}

module.exports = databaseMiddleware;
