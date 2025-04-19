
const fs = require('fs');
const path = require('path');

function initializeDatabase(db) {
  // Create the directory structure if it doesn't exist
  const dbPath = db.filename;
  const dbDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory at ${dbDir}`);
    } catch (err) {
      console.error(`Failed to create database directory at ${dbDir}:`, err);
    }
  }

  // Read and execute migration SQL
  const migration = fs.readFileSync(path.join(__dirname, '../migrations/init.sql'), 'utf8');
  
  // Split into individual statements
  const statements = migration.split(';').filter(stmt => stmt.trim());
  
  // Execute each statement
  statements.forEach(statement => {
    if (statement.trim()) {
      db.run(statement, function(err) {
        if (err) {
          console.error('Error executing migration:', err);
          console.error('Statement:', statement);
        }
      });
    }
  });
  
  // Execute auth migrations
  const authMigration = fs.readFileSync(path.join(__dirname, '../migrations/auth.sql'), 'utf8');
  const authStatements = authMigration.split(';').filter(stmt => stmt.trim());
  
  authStatements.forEach(statement => {
    if (statement.trim()) {
      db.run(statement, function(err) {
        if (err) {
          console.error('Error executing auth migration:', err);
          console.error('Statement:', statement);
        }
      });
    }
  });
  
  // Check if updated_at column exists and add it if not
  db.get("PRAGMA table_info(users)", [], (err, rows) => {
    if (err) {
      console.error('Error checking table schema:', err);
      return;
    }
    
    // Check if updated_at column exists
    const hasUpdatedAt = rows && rows.some(row => row.name === 'updated_at');
    
    if (!hasUpdatedAt) {
      db.run("ALTER TABLE users ADD COLUMN updated_at TEXT", (err) => {
        if (err) {
          console.error('Error adding updated_at column:', err);
        } else {
          console.log('Added updated_at column to users table');
          
          // Update existing records with current timestamp
          db.run("UPDATE users SET updated_at = datetime('now') WHERE updated_at IS NULL", (err) => {
            if (err) {
              console.error('Error updating records with timestamp:', err);
            }
          });
        }
      });
    }
  });
  
  // Insert default settings if not exists
  db.get('SELECT id FROM settings WHERE id = ?', ['1'], (err, row) => {
    if (err) {
      console.error('Error checking settings:', err);
      return;
    }
    
    if (!row) {
      db.run(
        `INSERT INTO settings (id) VALUES (?)`,
        ['1'],
        function(err) {
          if (err) {
            console.error('Error inserting default settings:', err);
          }
        }
      );
    }
  });
}

module.exports = { initializeDatabase };
