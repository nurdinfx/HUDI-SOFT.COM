type CategoryRow = {
  id: string;
  name: string;
  color?: string;
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image_url?: string;
  barcode?: string;
  synced_at?: string;
};

type OrderRow = {
  id: string;
  items_json: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  payment_method: string;
  customer_id?: string;
  cashier_id?: string;
  created_at: string;
  synced: number;
};

type CustomerRow = {
  id: string;
  name: string;
  phone?: string;
  balance: number;
  loyalty_points: number;
  synced_at?: string;
};

type SyncQueueRow = {
  id: number;
  action: string;
  payload_json: string;
  created_at: string;
};

type StatementParams = Record<string, any>;

export type SQLiteDatabase = {
  withTransactionSync: (callback: () => void) => void;
  execSync: (sql: string) => void;
  prepareSync: (sql: string) => {
    executeSync: (params: StatementParams) => void;
    finalizeSync: () => void;
  };
  getAllSync: <T>(query: string, params?: any) => T[];
  getFirstSync: <T>(query: string, params?: any[]) => T | null;
  runSync: (query: string, params?: any[]) => void;
};

const state = {
  categories: [] as CategoryRow[],
  products: [] as ProductRow[],
  orders: [] as OrderRow[],
  customers: [] as CustomerRow[],
  syncQueue: [] as SyncQueueRow[],
  nextSyncQueueId: 1,
};

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toUpperCase();

const upsertById = <T extends { id: string }>(list: T[], row: T) => {
  const index = list.findIndex((item) => item.id === row.id);
  if (index >= 0) {
    list[index] = { ...list[index], ...row };
  } else {
    list.push(row);
  }
};

const db: SQLiteDatabase = {
  withTransactionSync(callback) {
    callback();
  },

  execSync(sql) {
    const normalized = normalize(sql);

    if (normalized.includes('DELETE FROM PRODUCTS')) {
      state.products = [];
    }
    if (normalized.includes('DELETE FROM CATEGORIES')) {
      state.categories = [];
    }
    if (normalized.includes('DELETE FROM ORDERS')) {
      state.orders = [];
    }
    if (normalized.includes('DELETE FROM CUSTOMERS')) {
      state.customers = [];
    }
    if (normalized.includes('DELETE FROM SYNC_QUEUE')) {
      state.syncQueue = [];
    }
  },

  prepareSync(sql) {
    const normalized = normalize(sql);

    return {
      executeSync(params: StatementParams) {
        if (normalized.includes('INSERT OR REPLACE INTO PRODUCTS')) {
          upsertById(state.products, {
            id: String(params.$id),
            name: String(params.$name),
            price: Number(params.$price ?? 0),
            category: String(params.$category ?? ''),
            stock: Number(params.$stock ?? 0),
            image_url: String(params.$image_url ?? ''),
            barcode: String(params.$barcode ?? ''),
            synced_at: String(params.$synced_at ?? ''),
          });
          return;
        }

        if (normalized.includes('INSERT OR REPLACE INTO CATEGORIES')) {
          upsertById(state.categories, {
            id: String(params.$id),
            name: String(params.$name),
            color: String(params.$color ?? '#4f46e5'),
          });
          return;
        }

        if (normalized.includes('INSERT OR REPLACE INTO CUSTOMERS')) {
          upsertById(state.customers, {
            id: String(params.$id),
            name: String(params.$name),
            phone: String(params.$phone ?? ''),
            balance: Number(params.$balance ?? 0),
            loyalty_points: Number(params.$loyalty_points ?? 0),
            synced_at: String(params.$synced_at ?? ''),
          });
          return;
        }

        if (normalized.includes('INSERT OR REPLACE INTO ORDERS')) {
          upsertById(state.orders, {
            id: String(params.$id),
            items_json: String(params.$items_json ?? '[]'),
            subtotal: Number(params.$subtotal ?? 0),
            tax: Number(params.$tax ?? 0),
            discount: Number(params.$discount ?? 0),
            total: Number(params.$total ?? 0),
            status: String(params.$status ?? 'completed'),
            payment_method: String(params.$payment_method ?? 'cash'),
            customer_id: String(params.$customer_id ?? ''),
            cashier_id: String(params.$cashier_id ?? ''),
            created_at: String(params.$created_at ?? new Date().toISOString()),
            synced: 1,
          });
        }
      },
      finalizeSync() {},
    };
  },

  getAllSync<T>(query: string, params?: any): T[] {
    const normalized = normalize(query);

    if (normalized.startsWith('SELECT * FROM PRODUCTS')) {
      let rows = [...state.products];
      const search = params?.$search ? String(params.$search).replace(/%/g, '').toLowerCase() : '';
      const barcodeSearch = params?.$barcodeSearch ? String(params.$barcodeSearch) : '';
      const categoryName = params?.$categoryName ? String(params.$categoryName) : '';

      if (search) {
        rows = rows.filter(
          (item) =>
            item.name.toLowerCase().includes(search) ||
            item.barcode === barcodeSearch
        );
      }

      if (categoryName) {
        rows = rows.filter((item) => item.category === categoryName);
      }

      rows.sort((a, b) => a.name.localeCompare(b.name));
      return rows as T[];
    }

    if (normalized.startsWith('SELECT * FROM CATEGORIES')) {
      return [...state.categories].sort((a, b) => a.name.localeCompare(b.name)) as T[];
    }

    if (normalized.startsWith('SELECT * FROM CUSTOMERS')) {
      let rows = [...state.customers];
      const search = params?.$search ? String(params.$search).replace(/%/g, '').toLowerCase() : '';

      if (search) {
        rows = rows.filter(
          (item) =>
            item.name.toLowerCase().includes(search) ||
            String(item.phone ?? '').toLowerCase().includes(search)
        );
      }

      rows.sort((a, b) => a.name.localeCompare(b.name));
      return rows as T[];
    }

    if (normalized.startsWith('SELECT * FROM ORDERS')) {
      const limit = Array.isArray(params) ? Number(params[0] ?? 100) : 100;
      return [...state.orders]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit) as T[];
    }

    if (normalized.startsWith('SELECT * FROM SYNC_QUEUE')) {
      return [...state.syncQueue].sort((a, b) => a.id - b.id) as T[];
    }

    return [];
  },

  getFirstSync<T>(query: string, params?: any[]): T | null {
    const normalized = normalize(query);

    if (normalized.startsWith('SELECT * FROM CUSTOMERS WHERE ID = ?')) {
      const id = String(params?.[0] ?? '');
      return (state.customers.find((item) => item.id === id) as T) ?? null;
    }

    return null;
  },

  runSync(query: string, params?: any[]) {
    const normalized = normalize(query);

    if (normalized.startsWith('UPDATE PRODUCTS SET STOCK = STOCK - ? WHERE ID = ?')) {
      const qtySold = Number(params?.[0] ?? 0);
      const id = String(params?.[1] ?? '');
      const item = state.products.find((product) => product.id === id);
      if (item) {
        item.stock = Math.max(0, item.stock - qtySold);
      }
      return;
    }

    if (normalized.startsWith('INSERT INTO ORDERS')) {
      const row: OrderRow = {
        id: String(params?.[0] ?? ''),
        items_json: String(params?.[1] ?? '[]'),
        subtotal: Number(params?.[2] ?? 0),
        tax: Number(params?.[3] ?? 0),
        discount: Number(params?.[4] ?? 0),
        total: Number(params?.[5] ?? 0),
        status: String(params?.[6] ?? 'completed'),
        payment_method: String(params?.[7] ?? 'cash'),
        customer_id: String(params?.[8] ?? ''),
        cashier_id: String(params?.[9] ?? ''),
        created_at: String(params?.[10] ?? new Date().toISOString()),
        synced: 0,
      };
      upsertById(state.orders, row);
      return;
    }

    if (normalized.startsWith('INSERT INTO SYNC_QUEUE')) {
      state.syncQueue.push({
        id: state.nextSyncQueueId++,
        action: String(params?.[0] ?? ''),
        payload_json: String(params?.[1] ?? '{}'),
        created_at: String(params?.[2] ?? new Date().toISOString()),
      });
      return;
    }

    if (normalized.startsWith('UPDATE ORDERS SET SYNCED = 1 WHERE ID = ?')) {
      const id = String(params?.[0] ?? '');
      const item = state.orders.find((order) => order.id === id);
      if (item) {
        item.synced = 1;
      }
      return;
    }

    if (normalized.startsWith('DELETE FROM SYNC_QUEUE WHERE ID = ?')) {
      const id = Number(params?.[0] ?? 0);
      state.syncQueue = state.syncQueue.filter((item) => item.id !== id);
      return;
    }

    if (normalized.startsWith('INSERT INTO CUSTOMERS')) {
      const row: CustomerRow = {
        id: String(params?.[0] ?? ''),
        name: String(params?.[1] ?? ''),
        phone: String(params?.[2] ?? ''),
        balance: Number(params?.[3] ?? 0),
        loyalty_points: Number(params?.[4] ?? 0),
        synced_at: String(params?.[5] ?? new Date().toISOString()),
      };
      upsertById(state.customers, row);
      return;
    }

    if (normalized.startsWith('UPDATE CUSTOMERS SET BALANCE = BALANCE + ?, LOYALTY_POINTS = LOYALTY_POINTS + ? WHERE ID = ?')) {
      const balanceChange = Number(params?.[0] ?? 0);
      const loyaltyPointsChange = Number(params?.[1] ?? 0);
      const id = String(params?.[2] ?? '');
      const item = state.customers.find((customer) => customer.id === id);

      if (item) {
        item.balance += balanceChange;
        item.loyalty_points += loyaltyPointsChange;
      }
    }
  },
};

let dbInstance: SQLiteDatabase | null = null;

export const getDB = (): SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = db;
  }
  return dbInstance;
};

export const initDatabase = (): void => {
  getDB();
  console.log('Using in-memory web database fallback');
};
