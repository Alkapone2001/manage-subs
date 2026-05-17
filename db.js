const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'subscriptions.db');
const db = new sqlite3.Database(dbPath);

const init = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        birthday TEXT NOT NULL,
        discordTag TEXT NOT NULL,
        phoneNumber TEXT,
        email TEXT NOT NULL,
        registeredAt TEXT NOT NULL,
        planMonths INTEGER NOT NULL,
        expiresAt TEXT NOT NULL,
        lastNotificationAt TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('notificationWindowDays', '7'), ('adminEmail', '')`);

    db.all(`PRAGMA table_info(clients)`, [], (err, columns) => {
      if (!err && columns) {
        if (!columns.find((column) => column.name === 'phoneNumber')) {
          db.run(`ALTER TABLE clients ADD COLUMN phoneNumber TEXT`);
        }
      }
    });
  });
};

const getSetting = (key, callback) => {
  db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
    if (err) return callback(err);
    callback(null, row ? row.value : null);
  });
};

const setSetting = (key, value, callback) => {
  db.run(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
    callback
  );
};

const getAllSettings = (callback) => {
  db.all(`SELECT key, value FROM settings`, [], (err, rows) => {
    if (err) return callback(err);
    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    callback(null, settings);
  });
};

module.exports = {
  db,
  init,
  getSetting,
  setSetting,
  getAllSettings,
};
