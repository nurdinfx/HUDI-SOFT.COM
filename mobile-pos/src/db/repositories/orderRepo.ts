import { getDB } from '../database';
import { productRepo } from './productRepo';

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  discount?: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  payment_method: string;
  customer_id?: string;
  cashier_id?: string;
  created_at: string;
  synced?: number; // 0 = offline, 1 = synced
}

export interface SyncQueueItem {
  id: number;
  action: string;
  payload_json: string;
  created_at: string;
}

export const orderRepo = {
  // Bulk save order history (read-only from cloud sync)
  saveOrders(orders: Order[]) {
    const db = getDB();
    db.withTransactionSync(() => {
      const stmt = db.prepareSync(`
        INSERT OR REPLACE INTO orders (id, items_json, subtotal, tax, discount, total, status, payment_method, customer_id, cashier_id, created_at, synced)
        VALUES ($id, $items_json, $subtotal, $tax, $discount, $total, $status, $payment_method, $customer_id, $cashier_id, $created_at, 1)
      `);
      try {
        for (const o of orders) {
          stmt.executeSync({
            $id: o.id,
            $items_json: JSON.stringify(o.items),
            $subtotal: o.subtotal,
            $tax: o.tax,
            $discount: o.discount,
            $total: o.total,
            $status: o.status || 'completed',
            $payment_method: o.payment_method,
            $customer_id: o.customer_id || '',
            $cashier_id: o.cashier_id || '',
            $created_at: o.created_at || new Date().toISOString(),
          });
        }
      } finally {
        stmt.finalizeSync();
      }
    });
  },

  // Save new order created on mobile device offline
  createOrderOffline(order: Order): void {
    const db = getDB();
    db.withTransactionSync(() => {
      // 1. Insert order to local db
      db.runSync(`
        INSERT INTO orders (id, items_json, subtotal, tax, discount, total, status, payment_method, customer_id, cashier_id, created_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        order.id,
        JSON.stringify(order.items),
        order.subtotal,
        order.tax,
        order.discount,
        order.total,
        order.status,
        order.payment_method,
        order.customer_id || '',
        order.cashier_id || '',
        order.created_at,
      ]);

      // 2. Adjust local inventory stocks
      for (const item of order.items) {
        productRepo.updateProductStock(item.productId, item.qty);
      }

      // 3. Add to sync queue
      db.runSync(`
        INSERT INTO sync_queue (action, payload_json, created_at)
        VALUES (?, ?, ?)
      `, [
        'create_order',
        JSON.stringify(order),
        new Date().toISOString()
      ]);
    });
  },

  // Fetch local orders
  getOrders(limit = 100): Order[] {
    const db = getDB();
    const rows = db.getAllSync<any>(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(row => ({
      id: row.id,
      items: JSON.parse(row.items_json),
      subtotal: row.subtotal,
      tax: row.tax,
      discount: row.discount,
      total: row.total,
      status: row.status,
      payment_method: row.payment_method,
      customer_id: row.customer_id,
      cashier_id: row.cashier_id,
      created_at: row.created_at,
      synced: row.synced,
    }));
  },

  // Mark an offline order as synced
  markOrderSynced(orderId: string) {
    const db = getDB();
    db.runSync('UPDATE orders SET synced = 1 WHERE id = ?', [orderId]);
  },

  // Get all items pending sync
  getPendingSyncQueue(): SyncQueueItem[] {
    const db = getDB();
    return db.getAllSync<SyncQueueItem>('SELECT * FROM sync_queue ORDER BY id ASC');
  },

  // Delete item from queue when sync completes
  deleteSyncQueueItem(id: number) {
    const db = getDB();
    db.runSync('DELETE FROM sync_queue WHERE id = ?', [id]);
  },

  clearAll() {
    const db = getDB();
    db.execSync('DELETE FROM orders; DELETE FROM sync_queue;');
  }
};
