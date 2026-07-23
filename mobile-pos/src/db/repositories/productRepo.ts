import { getDB } from '../database';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  image_url?: string;
  barcode?: string;
  synced_at?: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export const productRepo = {
  // Bulk save products from API sync
  saveProducts(products: Product[]) {
    const db = getDB();
    db.withTransactionSync(() => {
      // Create a statement for inserting or replacing
      const stmt = db.prepareSync(`
        INSERT OR REPLACE INTO products (id, name, price, category, stock, image_url, barcode, synced_at)
        VALUES ($id, $name, $price, $category, $stock, $image_url, $barcode, $synced_at)
      `);
      try {
        for (const p of products) {
          stmt.executeSync({
            $id: p.id,
            $name: p.name,
            $price: p.price,
            $category: p.category || '',
            $stock: p.stock || 0,
            $image_url: p.image_url || '',
            $barcode: p.barcode || '',
            $synced_at: p.synced_at || new Date().toISOString(),
          });
        }
      } finally {
        stmt.finalizeSync();
      }
    });
  },

  // Bulk save categories
  saveCategories(categories: Category[]) {
    const db = getDB();
    db.withTransactionSync(() => {
      const stmt = db.prepareSync(`
        INSERT OR REPLACE INTO categories (id, name, color)
        VALUES ($id, $name, $color)
      `);
      try {
        for (const c of categories) {
          stmt.executeSync({
            $id: c.id,
            $name: c.name,
            $color: c.color || '#4f46e5',
          });
        }
      } finally {
        stmt.finalizeSync();
      }
    });
  },

  // Query products with search and category filters
  getProducts(search?: string, categoryName?: string): Product[] {
    const db = getDB();
    let query = 'SELECT * FROM products';
    const params: any = {};

    const clauses: string[] = [];
    if (search) {
      clauses.push('(name LIKE $search OR barcode = $barcodeSearch)');
      params['$search'] = `%${search}%`;
      params['$barcodeSearch'] = search;
    }
    if (categoryName && categoryName !== 'All') {
      clauses.push('category = $categoryName');
      params['$categoryName'] = categoryName;
    }

    if (clauses.length > 0) {
      query += ' WHERE ' + clauses.join(' AND ');
    }

    query += ' ORDER BY name ASC';

    return db.getAllSync<Product>(query, params);
  },

  // Get all categories
  getCategories(): Category[] {
    const db = getDB();
    return db.getAllSync<Category>('SELECT * FROM categories ORDER BY name ASC');
  },

  // Update stock when an order is made offline
  updateProductStock(id: string, qtySold: number) {
    const db = getDB();
    db.runSync(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [qtySold, id]
    );
  },

  // Update stock directly (e.g. inventory adjustments)
  updateStockDirect(id: string, newStock: number) {
    const db = getDB();
    db.runSync(
      'UPDATE products SET stock = ? WHERE id = ?',
      [newStock, id]
    );
  },

  // Clear products table
  clearAll() {
    const db = getDB();
    db.execSync('DELETE FROM products; DELETE FROM categories;');
  }
};
