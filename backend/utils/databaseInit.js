
const fs = require('fs');
const path = require('path');

function initializeDatabase(db) {
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
