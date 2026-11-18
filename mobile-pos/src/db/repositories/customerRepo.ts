import { getDB } from '../database';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  balance?: number;
  loyalty_points?: number;
  synced_at?: string;
}

export const customerRepo = {
  // Bulk save customers from sync
  saveCustomers(customers: Customer[]) {
    const db = getDB();
    db.withTransactionSync(() => {
      const stmt = db.prepareSync(`
        INSERT OR REPLACE INTO customers (id, name, phone, balance, loyalty_points, synced_at)
        VALUES ($id, $name, $phone, $balance, $loyalty_points, $synced_at)
      `);
      try {
        for (const c of customers) {
          stmt.executeSync({
            $id: c.id,
            $name: c.name,
            $phone: c.phone || '',
            $balance: c.balance || 0,
            $loyalty_points: c.loyalty_points || 0,
            $synced_at: c.synced_at || new Date().toISOString(),
          });
        }
      } finally {
        stmt.finalizeSync();
      }
    });
  },

  // Query customers with search by name/phone
  getCustomers(search?: string): Customer[] {
    const db = getDB();
    let query = 'SELECT * FROM customers';
    const params: any = {};

    if (search) {
      query += ' WHERE name LIKE $search OR phone LIKE $search';
      params['$search'] = `%${search}%`;
    }

    query += ' ORDER BY name ASC';
    return db.getAllSync<Customer>(query, params);
  },

  getCustomerById(id: string): Customer | null {
    const db = getDB();
    return db.getFirstSync<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
  },

  // Create a customer offline
  createCustomerOffline(customer: Customer) {
    const db = getDB();
    db.withTransactionSync(() => {
      // 1. Save to local DB
      db.runSync(
        'INSERT INTO customers (id, name, phone, balance, loyalty_points, synced_at) VALUES (?, ?, ?, ?, ?, ?)',
        [customer.id, customer.name, customer.phone || '', customer.balance || 0, customer.loyalty_points || 0, new Date().toISOString()]
      );

      // 2. Queue for server sync
      db.runSync(
        'INSERT INTO sync_queue (action, payload_json, created_at) VALUES (?, ?, ?)',
        [
          'create_customer',
          JSON.stringify(customer),
          new Date().toISOString(),
        ]
      );
    });
  },

  updateCustomerBalance(customerId: string, balanceChange: number, loyaltyPointsChange: number) {
    const db = getDB();
    db.runSync(
      'UPDATE customers SET balance = balance + ?, loyalty_points = loyalty_points + ? WHERE id = ?',
      [balanceChange, loyaltyPointsChange, customerId]
    );
  },

  clearAll() {
    const db = getDB();
    db.execSync('DELETE FROM customers');
  }
};
