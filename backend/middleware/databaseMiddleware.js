
const sqlite3 = require('sqlite3').verbose();

function databaseMiddleware(dbPath) {
  const db = new sqlite3.Database(dbPath);
  console.log(`Connected to SQLite database at ${dbPath}`);

  return (req, res, next) => {
    req.db = db;
    next();
  };
}

module.exports = databaseMiddleware;

