import * as SQLite from 'expo-sqlite';

// Open database synchronously
let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDB = (): SQLite.SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('hudipos.db');
  }
  return dbInstance;
};

export const initDatabase = (): void => {
  const db = getDB();

  // Create tables in a transaction
  db.withTransactionSync(() => {
    // 1. Categories table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT
      );
    `);

    // 2. Products table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT,
        stock INTEGER NOT NULL,
        image_url TEXT,
        barcode TEXT,
        synced_at TEXT
      );
    `);

    // 3. Orders table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        items_json TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL NOT NULL,
        discount REAL NOT NULL,
        total REAL NOT NULL,
        status TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        customer_id TEXT,
        cashier_id TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

    // 4. Customers table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        balance REAL DEFAULT 0,
        loyalty_points INTEGER DEFAULT 0,
        synced_at TEXT
      );
    `);

    // 5. Sync queue table for offline order/customer changes
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // 6. Metadata or config table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  });
};
