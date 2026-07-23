import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants';
import { productsApi, ordersApi, customersApi } from '@/api';
import { productRepo } from '@/db/repositories/productRepo';
import { customerRepo } from '@/db/repositories/customerRepo';
import { orderRepo } from '@/db/repositories/orderRepo';
import { useSyncStore } from '@/store/syncStore';
import { useAuthStore } from '@/store/authStore';

let socketInstance: Socket | null = null;
let syncTimer: NodeJS.Timeout | null = null;

export const SyncManager = {
  // ─── Initialize sync engine & WebSocket connection ───────────────────────────
  init() {
    const user = useAuthStore.getState().user;
    const branchId = user?.branch?._id || (user?.branch as any);

    if (!branchId) {
      console.log('No branch ID available, skipping WebSocket init');
      return;
    }

    // Connect WebSocket
    if (socketInstance) {
      socketInstance.disconnect();
    }

    socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: true,
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected. Joining branch:', branchId);
      socketInstance?.emit('join-branch', branchId);
    });

    // Handle real-time product additions/updates
    socketInstance.on('product-created', (prod: any) => {
      console.log('Real-time: product-created', prod.name);
      productRepo.saveProducts([{
        id: prod.id || prod._id,
        name: prod.name,
        price: prod.price,
        category: prod.category,
        stock: prod.stock,
        image_url: prod.image,
        barcode: prod.barcode,
        synced_at: prod.updatedAt || new Date().toISOString()
      }]);
    });

    socketInstance.on('product-updated', (prod: any) => {
      console.log('Real-time: product-updated', prod.name);
      productRepo.saveProducts([{
        id: prod.id || prod._id,
        name: prod.name,
        price: prod.price,
        category: prod.category,
        stock: prod.stock,
        image_url: prod.image,
        barcode: prod.barcode,
        synced_at: prod.updatedAt || new Date().toISOString()
      }]);
    });

    socketInstance.on('stock-updated', (data: any) => {
      console.log('Real-time: stock-updated', data.productId, data.stock);
      const db = productRepo;
      // We can update the stock directly in the database
      const products = db.getProducts();
      const existing = products.find(p => p.id === data.productId);
      if (existing) {
        db.saveProducts([{
          ...existing,
          stock: data.stock,
        }]);
      }
    });

    socketInstance.on('product-deleted', (prod: any) => {
      console.log('Real-time: product-deleted', prod.id || prod._id);
      const prodId = prod.id || prod._id;
      // Re-fetch remaining or delete
      // To keep it simple, we delete it from products list if we had a delete function
      // (We can clear categories and reload or pull products)
      SyncManager.pullProducts().catch(() => {});
    });

    // Start auto sync interval (every 30 seconds)
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      SyncManager.syncAll().catch(() => {});
    }, 30_000);

    // Run first sync
    SyncManager.syncAll().catch(() => {});
  },

  // ─── Destroy WebSocket connection & timer ───────────────────────────────────
  destroy() {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  },

  // ─── Push Offline Queue to server ──────────────────────────────────────────
  async pushOfflineQueue() {
    const queue = orderRepo.getPendingSyncQueue();
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} offline actions...`);

    for (const item of queue) {
      try {
        const payload = JSON.parse(item.payload_json);

        if (item.action === 'create_order') {
          // Format payload as expected by backend orderController.js
          const serverOrderPayload = {
            items: payload.items.map((i: any) => ({
              product: i.productId,
              quantity: i.qty,
              price: i.price,
              notes: '',
            })),
            orderType: 'takeaway',
            paymentMethod: payload.payment_method,
            tax: payload.tax,
            finalTotal: payload.total,
            customerId: payload.customer_id || undefined,
          };

          await ordersApi.create(serverOrderPayload);
          orderRepo.markOrderSynced(payload.id);
        } else if (item.action === 'create_customer') {
          await customersApi.create({
            name: payload.name,
            phone: payload.phone,
          });
        }

        // Delete from offline queue
        orderRepo.deleteSyncQueueItem(item.id);
      } catch (err: any) {
        console.error(`Offline sync item ${item.id} failed:`, err.message);
        // If it's a validation error (400), we might want to delete it so it doesn't block the queue.
        // Otherwise, stop processing and try again on next sync.
        if (err.response?.status === 400) {
          orderRepo.deleteSyncQueueItem(item.id);
        } else {
          throw err;
        }
      }
    }
  },

  // ─── Pull products and categories ──────────────────────────────────────────
  async pullProducts() {
    console.log('Pulling products from cloud...');
    const prodRes = await productsApi.getAll({ limit: 100000 });
    const products: any[] = prodRes.products?.length
      ? prodRes.products
      : prodRes.data?.products || [];

    const localProducts = products.map((p: any) => ({
      id: p.id || p._id,
      name: p.name,
      price: p.price,
      category: p.category,
      stock: p.stock,
      image_url: p.image,
      barcode: p.barcode,
      synced_at: p.updatedAt || new Date().toISOString(),
    }));

    productRepo.saveProducts(localProducts);

    // Categories
    console.log('Pulling categories...');
    const catRes = await productsApi.getCategories();
    const categories: string[] = Array.isArray(catRes.data) ? catRes.data : [];

    const localCategories = categories.map((cat: string, index: number) => ({
      id: `cat_${index}_${cat.replace(/\s+/g, '_')}`,
      name: cat,
      color: '#4f46e5',
    }));

    productRepo.saveCategories(localCategories);
  },

  // ─── Pull customers ────────────────────────────────────────────────────────
  async pullCustomers() {
    console.log('Pulling customers from cloud...');
    const custRes = await customersApi.getAll({ limit: 100000 });
    const customers: any[] = custRes.customers?.length
      ? custRes.customers
      : custRes.data?.customers || [];

    const localCustomers = customers.map((c: any) => ({
      id: c.id || c._id,
      name: c.name,
      phone: c.phone,
      balance: c.currentBalance || c.balance || 0,
      loyalty_points: c.loyalty_points || 0,
      synced_at: c.updatedAt || new Date().toISOString(),
    }));

    customerRepo.saveCustomers(localCustomers);
  },

  // ─── Pull historical orders ────────────────────────────────────────────────
  async pullOrders() {
    console.log('Pulling recent orders from cloud...');
    const orderRes = await ordersApi.getAll({ limit: 100 });
    const orders: any[] = orderRes.orders?.length
      ? orderRes.orders
      : orderRes.data?.orders || [];

    const localOrders = orders.map((o: any) => {
      // Map server order items structure
      const items = (o.items || []).map((i: any) => ({
        productId: i.product?._id || i.product || '',
        name: i.product_name || i.name || '',
        qty: i.quantity || i.qty || 1,
        price: i.price || 0,
        discount: i.discount || 0,
      }));

      return {
        id: o.id || o._id,
        items,
        subtotal: o.subTotal || o.subtotal || 0,
        tax: o.tax || 0,
        discount: o.discount || 0,
        total: o.finalTotal || o.total || 0,
        status: o.status || 'completed',
        payment_method: o.paymentMethod || o.payment_method || 'cash',
        customer_id: o.customer || '',
        cashier_id: o.cashier || '',
        created_at: o.createdAt || new Date().toISOString(),
        synced: 1,
      };
    });

    orderRepo.saveOrders(localOrders);
  },

  // ─── Sync All (bi-directional orchestration) ────────────────────────────────
  async syncAll(): Promise<void> {
    const store = useSyncStore.getState();
    const isAuthed = useAuthStore.getState().token;

    if (!isAuthed) return;
    if (store.isSyncing) return;

    store.setSyncing(true);

    try {
      // 1. Push locally queued items first
      await SyncManager.pushOfflineQueue();

      // 2. Pull down updates
      await SyncManager.pullProducts();
      await SyncManager.pullCustomers();
      await SyncManager.pullOrders();

      store.setLastSyncTime(new Date().toISOString());
    } catch (err: any) {
      console.error('Bidirectional sync failed:', err.message);
      store.setError(err.message || 'Sync failed');
    } finally {
      store.setSyncing(false);
    }
  },
};
