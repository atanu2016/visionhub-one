
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
  
  // Initialize database tables with additional error handling
  try {
    console.log("Initializing database schema...");
    initializeDatabase(db);
    
    // Add a basic health check method to the db object
    db.healthCheck = function(callback) {
      this.get("SELECT 1 AS health", (err, row) => {
        if (err) {
          console.error("Database health check failed:", err);
          callback(false, err);
        } else {
          callback(true);
        }
      });
    };
    
    console.log("Database initialization complete");
  } catch (dbErr) {
    console.error('Database initialization error:', dbErr);
    
    // Attempt recovery by creating minimal required tables
    console.log("Attempting database recovery with minimal schema...");
    try {
      db.serialize(() => {
        // Create minimal tables for basic functionality
        db.run("CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, value TEXT)");
        db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, email TEXT)");
      });
    } catch (recoveryErr) {
      console.error("Database recovery failed:", recoveryErr);
    }
  }

  return (req, res, next) => {
    req.db = db;
    next();
  };
}

module.exports = databaseMiddleware;
