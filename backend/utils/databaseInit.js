
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

  // Read and execute migration SQL with better error handling
  try {
    const migration = fs.readFileSync(path.join(__dirname, '../migrations/init.sql'), 'utf8');
    
    // Split into individual statements
    const statements = migration.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement
    statements.forEach(statement => {
      if (statement.trim()) {
        db.run(statement, function(err) {
          if (err) {
            console.error('Error executing migration statement:', err);
          }
        });
      }
    });
  } catch (err) {
    console.error('Error reading or executing init.sql:', err);
    console.log('Will create essential tables directly');
    
    // Create minimal tables if init.sql failed
    createEssentialTables(db);
  }
  
  // Execute auth migrations with better error handling
  try {
    const authMigration = fs.readFileSync(path.join(__dirname, '../migrations/auth.sql'), 'utf8');
    const authStatements = authMigration.split(';').filter(stmt => stmt.trim());
    
    authStatements.forEach(statement => {
      if (statement.trim()) {
        db.run(statement, function(err) {
          if (err && !err.message.includes('duplicate column')) {
            console.error('Error executing auth migration statement:', err);
          }
        });
      }
    });
  } catch (err) {
    console.error('Error reading or executing auth.sql:', err);
    
    // Create essential auth tables if auth.sql failed
    createEssentialAuthTables(db);
  }
  
  // Ensure critical tables and fields exist with a reconciliation approach
  ensureCriticalTablesAndFields(db);
}

function createEssentialTables(db) {
  const createTables = [
    `CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip_address TEXT,
      username TEXT,
      password TEXT,
      type TEXT DEFAULT 'ip',
      status TEXT DEFAULT 'offline',
      last_seen TEXT,
      rtsp_url TEXT,
      http_url TEXT,
      recording_enabled INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      camera_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      file_path TEXT,
      file_size INTEGER,
      duration INTEGER,
      has_motion INTEGER DEFAULT 0,
      status TEXT DEFAULT 'recording',
      FOREIGN KEY (camera_id) REFERENCES cameras(id)
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT,
      severity TEXT DEFAULT 'info',
      camera_id TEXT,
      acknowledged INTEGER DEFAULT 0
    )`
  ];
  
  createTables.forEach(statement => {
    db.run(statement, function(err) {
      if (err) {
        console.error('Error creating essential table:', err);
      }
    });
  });
}

function createEssentialAuthTables(db) {
  const createAuthTables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      last_login TEXT,
      last_login_ip TEXT,
      login_attempts INTEGER DEFAULT 0,
      lockout_until TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      ssl_enabled INTEGER DEFAULT 0,
      ssl_cert_path TEXT,
      ssl_key_path TEXT,
      storage_location TEXT DEFAULT '/var/visionhub/recordings',
      backup_enabled INTEGER DEFAULT 0,
      backup_path TEXT,
      backup_schedule TEXT DEFAULT 'daily',
      alert_email TEXT,
      alert_on_motion INTEGER DEFAULT 0,
      alert_on_offline INTEGER DEFAULT 0
    )`
  ];
  
  createAuthTables.forEach(statement => {
    db.run(statement, function(err) {
      if (err) {
        console.error('Error creating essential auth table:', err);
      }
    });
  });
  
  // Create initial admin user if not exists
  createDefaultAdminUser(db);
}

function createDefaultAdminUser(db) {
  const adminUser = {
    id: 'admin',
    username: 'admin',
    password: '$2b$10$mD0vNALVAXY3lI5.zYtJTeQwzrOSp7Jh4lfGI0f80SSrz0N2cRiqK', // Admin123!
    email: 'admin@visionhub.local',
    role: 'admin',
    created_at: new Date().toISOString()
  };
  
  db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err);
      return;
    }
    
    if (!row) {
      db.run(
        `INSERT INTO users (id, username, password, email, role, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [adminUser.id, adminUser.username, adminUser.password, adminUser.email, 
         adminUser.role, adminUser.created_at, adminUser.created_at],
        function(err) {
          if (err) {
            console.error('Error inserting admin user:', err);
          } else {
            console.log('Created default admin user');
          }
        }
      );
    }
  });
}

function ensureCriticalTablesAndFields(db) {
  // Schema reconciliation for settings table
  db.get("PRAGMA table_info(settings)", [], (err, rows) => {
    if (err) {
      console.error('Error checking settings table schema:', err);
      return;
    }
    
    // If settings table exists but doesn't have storage_location column
    db.run("ALTER TABLE settings ADD COLUMN IF NOT EXISTS storage_location TEXT DEFAULT '/var/visionhub/recordings'", (err) => {
      if (err) {
        // Ignore "duplicate column" errors, but log others
        if (!err.message.includes('duplicate column')) {
          console.error('Error adding storage_location column:', err);
        }
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
          `INSERT INTO settings (id, storage_location) VALUES (?, ?)`,
          ['1', '/var/visionhub/recordings'],
          function(err) {
            if (err) {
              console.error('Error inserting default settings:', err);
            } else {
              console.log('Created default settings');
            }
          }
        );
      }
    });
  });
  
  // Check if users table has updated_at column
  db.get("PRAGMA table_info(users)", [], (err, rows) => {
    if (err) {
      console.error('Error checking users table schema:', err);
      return;
    }
    
    // Add updated_at column if it doesn't exist
    db.run("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TEXT", (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding updated_at column:', err);
      } else {
        // Update existing records with current timestamp
        db.run("UPDATE users SET updated_at = datetime('now') WHERE updated_at IS NULL", (err) => {
          if (err) {
            console.error('Error updating records with timestamp:', err);
          }
        });
      }
    });
  });
}

module.exports = { initializeDatabase };
