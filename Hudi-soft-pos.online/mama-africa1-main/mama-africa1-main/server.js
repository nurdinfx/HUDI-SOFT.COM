// backend/server.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { licenseCheck } from './middleware/licenseCheck.js';
import { initDatabase } from './db/index.js';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Optional Cloudinary support for persistent image storage
const cloudinaryEnabled = Boolean(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET)
);

if (cloudinaryEnabled) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config(process.env.CLOUDINARY_URL);
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }
  console.log('✅ Cloudinary enabled for uploads');
} else {
  console.log('ℹ️ Cloudinary not configured; falling back to local uploads');
}

// Create HTTP server FIRST
const server = createServer(app);

// Then create Socket.io instance
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "https://mama-africa1.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Enhanced Middleware - CORS configuration
const frontendUrls = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
const allowedOrigins = [
  ...frontendUrls,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://mama-africa1.vercel.app',
  process.env.PRODUCTION_FRONTEND_URL
].filter(Boolean).map(url => url.trim());

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
// Use a persistent path outside the project directory to prevent data loss on updates
// On Render, set PERSISTENT_STORAGE_PATH en var to the mount point (e.g. /var/data/ or /opt/render/project/.data) or use Cloudinary
const homeDir = process.env.HOME || process.env.USERPROFILE;
const baseStart = process.env.PERSISTENT_STORAGE_PATH || homeDir;
const storageBaseDir = process.env.PERSISTENT_STORAGE_PATH ? baseStart : path.join(baseStart, 'mama-africa-storage');
const uploadsDir = path.join(storageBaseDir, 'uploads');
const productImagesDir = path.join(uploadsDir, 'products');

// Create directories if they don't exist
try {
  if (!fs.existsSync(storageBaseDir)) {
    fs.mkdirSync(storageBaseDir, { recursive: true });
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(productImagesDir)) {
    fs.mkdirSync(productImagesDir, { recursive: true });
    console.log('✅ Created persistent upload directories at:', uploadsDir);
  } else {
    console.log('✅ Using persistent upload directories at:', uploadsDir);
  }
} catch (err) {
  console.error('❌ Failed to create upload directories:', err);
  console.log('ℹ️ Falling back to local temp storage');
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

// Socket.io middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Import and use real routes
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import tableRoutes from './routes/tables.js';
import expenseRoutes from './routes/expenses.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';

// ADD PURCHASE ROUTES
import purchaseRoutes from './routes/purchases.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import supplierRoutes from './routes/suppliers.js';

// ADD FINANCE AND REPORTS ROUTES
import financeRoutes from './routes/finance.js';
import reportRoutes from './routes/reports.js';
import inventoryRoutes from './routes/inventory.js';
import syncRoutes from './routes/sync.js';

// Simple File Upload Setup (without sharp)
import multer from 'multer';

// Configure multer for product image uploads
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = file.originalname.replace(/\s+/g, '-');
    cb(null, 'product-' + uniqueSuffix + path.extname(originalName));
  }
});

const upload = multer({
  storage: productStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Simple Image Upload Endpoint
app.post('/api/v1/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    let imageData;

    if (cloudinaryEnabled) {
      const folder = `rms/restaurants/${req.user?.branch?._id || 'public'}/products`;

      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder
      });

      // Remove local temp file after uploading to Cloudinary
      fs.unlink(req.file.path, () => { });

      imageData = {
        url: uploadResult.secure_url,
        fullUrl: uploadResult.secure_url,
        path: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        provider: 'cloudinary'
      };
    } else {
      imageData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/products/${req.file.filename}`,
        fullUrl: `${req.protocol}://${req.get('host')}/uploads/products/${req.file.filename}`,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        provider: 'local'
      };
    }

    res.json({
      success: true,
      data: imageData,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// Multiple Image Upload Endpoint
app.post('/api/v1/upload/multiple', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const uploadedImages = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/products/${file.filename}`,
      fullUrl: `${req.protocol}://${req.get('host')}/uploads/products/${file.filename}`,
      size: file.size
    }));

    res.json({
      success: true,
      data: uploadedImages,
      message: `${uploadedImages.length} images uploaded successfully`
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images'
    });
  }
});

// Delete Image Endpoint
app.delete('/api/v1/upload/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(productImagesDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
});

// Get Uploaded Images Endpoint
app.get('/api/v1/uploads', (req, res) => {
  try {
    const images = fs.readdirSync(productImagesDir)
      .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.webp'))
      .map(file => ({
        filename: file,
        url: `/uploads/products/${file}`,
        path: `/api/uploads/products/${file}`,
        fullUrl: `${req.protocol}://${req.get('host')}/uploads/products/${file}`
      }));

    res.json({
      success: true,
      data: images,
      total: images.length
    });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images'
    });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/settings', settingsRoutes);

// ADD PURCHASE ROUTES AFTER EXISTING ROUTES
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/suppliers', supplierRoutes);

// ADD FINANCE AND REPORTS ROUTES
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
// Batch sync endpoint for offline clients
app.use('/api/v1/sync', syncRoutes);

import licenseRoutes from './routes/license.js';
app.use('/api/v1/license', licenseRoutes);

// Protect all other routes with license check
// Excluding health and license routes themselves
app.use(['/api/v1/orders', '/api/v1/products', '/api/v1/customers', '/api/v1/tables', '/api/v1/expenses', '/api/v1/dashboard', '/api/v1/users', '/api/v1/settings', '/api/v1/purchases', '/api/v1/purchase-orders', '/api/v1/suppliers', '/api/v1/finance', '/api/v1/reports', '/api/v1/inventory'], licenseCheck);

// Health check endpoints (both /api/health and /api/v1/health)
const healthHandler = (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'Connected (SQLite)',
    environment: process.env.NODE_ENV || 'development',
    uploads: {
      directory: uploadsDir,
      exists: fs.existsSync(uploadsDir),
      productImages: fs.existsSync(productImagesDir) ?
        fs.readdirSync(productImagesDir).length : 0
    }
  };

  res.json(health);
};

app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'HUDI-SOFT Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/v1/auth',
      orders: '/api/v1/orders',
      products: '/api/v1/products',
      customers: '/api/v1/customers',
      tables: '/api/v1/tables',
      dashboard: '/api/v1/dashboard',
      expenses: '/api/v1/expenses',
      users: '/api/v1/users',
      purchases: '/api/v1/purchases',
      purchaseOrders: '/api/v1/purchase-orders',
      suppliers: '/api/v1/suppliers',
      upload: '/api/v1/upload',
      health: '/api/health'
    }
  });
});

// Serve product images with caching
app.get('/uploads/products/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(productImagesDir, filename);

  if (fs.existsSync(filePath)) {
    // Set caching headers for images
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Expires', new Date(Date.now() + 86400000).toUTCString());
    res.sendFile(filePath);
  } else {
    res.status(404).json({
      success: false,
      message: 'Image not found'
    });
  }
});

// Enhanced Socket.io connection handling with customer events
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  console.log('🕒 Connection time:', new Date().toISOString());

  socket.on('join-branch', (branchId) => {
    socket.join(`branch-${branchId}`);
    console.log(`📍 Socket ${socket.id} joined branch ${branchId} at ${new Date().toISOString()}`);
  });

  socket.on('join-kitchen', (branchId) => {
    socket.join(`kitchen-${branchId}`);
    console.log(`👨‍🍳 Socket ${socket.id} joined kitchen ${branchId} at ${new Date().toISOString()}`);
  });

  socket.on('join-pos', (branchId) => {
    socket.join(`pos-${branchId}`);
    console.log(`💻 Socket ${socket.id} joined POS ${branchId} at ${new Date().toISOString()}`);
  });

  socket.on('join-customers', (branchId) => {
    socket.join(`customers-${branchId}`);
    console.log(`👥 Socket ${socket.id} joined customers room ${branchId} at ${new Date().toISOString()}`);
  });

  // ADD PURCHASE SOCKET EVENTS
  socket.on('join-purchases', (branchId) => {
    socket.join(`purchases-${branchId}`);
    console.log(`🛒 Socket ${socket.id} joined purchases room ${branchId} at ${new Date().toISOString()}`);
  });

  // Real-time product updates
  socket.on('product-created', (productData) => {
    socket.to(`branch-${productData.branch}`).emit('new-product', productData);
    socket.to(`pos-${productData.branch}`).emit('product-added', productData);
    console.log(`🆕 Product created in branch ${productData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('product-updated', (productData) => {
    socket.to(`branch-${productData.branch}`).emit('product-modified', productData);
    socket.to(`pos-${productData.branch}`).emit('product-updated', productData);
    console.log(`✏️ Product updated in branch ${productData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('product-deleted', (productData) => {
    socket.to(`branch-${productData.branch}`).emit('product-removed', productData);
    socket.to(`pos-${productData.branch}`).emit('product-deleted', productData);
    console.log(`🗑️ Product deleted in branch ${productData.branch} at ${new Date().toISOString()}`);
  });

  // Real-time order events
  socket.on('create-order', (orderData) => {
    socket.to(`branch-${orderData.branch}`).emit('new-order', orderData);
    socket.to(`kitchen-${orderData.branch}`).emit('order-received', orderData);
    console.log(`📦 New order created in branch ${orderData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('update-order-status', (data) => {
    socket.to(`branch-${data.branch}`).emit('order-status-updated', data);
    if (data.status === 'ready') {
      socket.to(`branch-${data.branch}`).emit('order-ready', data);
    }
    console.log(`🔄 Order status updated to ${data.status} in branch ${data.branch} at ${new Date().toISOString()}`);
  });

  socket.on('stock-updated', (data) => {
    socket.to(`branch-${data.branch}`).emit('inventory-updated', data);
    socket.to(`pos-${data.branch}`).emit('stock-changed', data);
    console.log(`📊 Stock updated in branch ${data.branch} at ${new Date().toISOString()}`);
  });

  // NEW: Real-time customer events for ledger management
  socket.on('customer-created', (customerData) => {
    socket.to(`branch-${customerData.branch}`).emit('new-customer', customerData);
    socket.to(`customers-${customerData.branch}`).emit('customer-added', customerData);
    console.log(`👤 New customer created in branch ${customerData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('customer-updated', (customerData) => {
    socket.to(`branch-${customerData.branch}`).emit('customer-modified', customerData);
    socket.to(`customers-${customerData.branch}`).emit('customer-updated', customerData);
    console.log(`✏️ Customer updated in branch ${customerData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('customer-deleted', (customerData) => {
    socket.to(`branch-${customerData.branch}`).emit('customer-removed', customerData);
    socket.to(`customers-${customerData.branch}`).emit('customer-deleted', customerData);
    console.log(`🗑️ Customer deleted in branch ${customerData.branch} at ${new Date().toISOString()}`);
  });

  // NEW: Real-time ledger transaction events
  socket.on('ledger-transaction-added', (transactionData) => {
    socket.to(`branch-${transactionData.branch}`).emit('new-ledger-transaction', transactionData);
    socket.to(`customers-${transactionData.branch}`).emit('transaction-added', transactionData);
    console.log(`💰 Ledger transaction added for customer in branch ${transactionData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('customer-balance-updated', (customerData) => {
    socket.to(`branch-${customerData.branch}`).emit('balance-changed', customerData);
    socket.to(`customers-${customerData.branch}`).emit('customer-balance-updated', customerData);
    console.log(`⚖️ Customer balance updated in branch ${customerData.branch} at ${new Date().toISOString()}`);
  });

  // ADD PURCHASE REAL-TIME EVENTS
  socket.on('purchase-created', (purchaseData) => {
    socket.to(`branch-${purchaseData.branch}`).emit('new-purchase', purchaseData);
    socket.to(`purchases-${purchaseData.branch}`).emit('purchase-added', purchaseData);
    console.log(`🛒 Purchase created in branch ${purchaseData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('purchase-updated', (purchaseData) => {
    socket.to(`branch-${purchaseData.branch}`).emit('purchase-modified', purchaseData);
    socket.to(`purchases-${purchaseData.branch}`).emit('purchase-updated', purchaseData);
    console.log(`✏️ Purchase updated in branch ${purchaseData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('purchase-order-created', (poData) => {
    socket.to(`branch-${poData.branch}`).emit('new-purchase-order', poData);
    socket.to(`purchases-${poData.branch}`).emit('purchase-order-added', poData);
    console.log(`📋 Purchase order created in branch ${poData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('purchase-order-updated', (poData) => {
    socket.to(`branch-${poData.branch}`).emit('purchase-order-modified', poData);
    socket.to(`purchases-${poData.branch}`).emit('purchase-order-updated', poData);
    console.log(`✏️ Purchase order updated in branch ${poData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('supplier-created', (supplierData) => {
    socket.to(`branch-${supplierData.branch}`).emit('new-supplier', supplierData);
    socket.to(`purchases-${supplierData.branch}`).emit('supplier-added', supplierData);
    console.log(`🏢 Supplier created in branch ${supplierData.branch} at ${new Date().toISOString()}`);
  });

  socket.on('supplier-updated', (supplierData) => {
    socket.to(`branch-${supplierData.branch}`).emit('supplier-modified', supplierData);
    socket.to(`purchases-${supplierData.branch}`).emit('supplier-updated', supplierData);
    console.log(`✏️ Supplier updated in branch ${supplierData.branch} at ${new Date().toISOString()}`);
  });

  // NEW: Ledger print events
  socket.on('ledger-printed', (printData) => {
    socket.to(`branch-${printData.branch}`).emit('ledger-print-completed', printData);
    console.log(`🖨️ Ledger printed for customer ${printData.customerName} in branch ${printData.branch} at ${new Date().toISOString()}`);
  });

  // NEW: Customer search events
  socket.on('customer-search', (searchData) => {
    console.log(`🔍 Customer search performed in branch ${searchData.branch} at ${new Date().toISOString()}`);
  });

  // NEW: Ledger export events
  socket.on('ledger-exported', (exportData) => {
    socket.to(`branch-${exportData.branch}`).emit('ledger-export-completed', exportData);
    console.log(`📤 Ledger exported for customer ${exportData.customerName} in branch ${exportData.branch} at ${new Date().toISOString()}`);
  });

  // Connection monitoring
  socket.on('get-connection-status', () => {
    socket.emit('connection-status', {
      connected: true,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      rooms: Array.from(socket.rooms)
    });
  });

  // Ping-pong for connection health check
  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString()
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 User disconnected:', socket.id);
    console.log('🕒 Disconnection time:', new Date().toISOString());
    console.log('📋 Disconnect reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
    console.error('🕒 Error time:', new Date().toISOString());
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error Stack:', err.stack);
  console.error('❌ Error Details:', err);
  console.error('🕒 Error time:', new Date().toISOString());

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB.',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected field in file upload.',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message),
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      timestamp: new Date().toISOString()
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Function to start the server after database initialization
const startServer = async () => {
  try {
    // Initialize SQLite database (fully offline)
    await initDatabase();
    console.log('🗄️  Database Mode: SQLITE (Fully Offline)');

    // Start the HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api/v1`);
      console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      if (process.env.PERSISTENT_STORAGE_PATH) {
        console.log(`💾 Persistent Path: ${process.env.PERSISTENT_STORAGE_PATH}`);
      }
      console.log(`🕒 Server start time: ${new Date().toISOString()}`);
      console.log('👥 Customer ledger system: ✅ ACTIVE');
      console.log('💰 Real-time balance tracking: ✅ ACTIVE');
      console.log('🖨️ Ledger print functionality: ✅ ACTIVE');
      console.log('🛒 Purchase management system: ✅ ACTIVE');
      console.log('📋 Purchase orders: ✅ ACTIVE');
      console.log('🏢 Supplier management: ✅ ACTIVE');
    });

    // SQLite-only mode - no connectivity monitoring needed

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        console.log('💡 Try one of these solutions:');
        console.log(`1. Change PORT in .env file to something else (e.g., 5001)`);
        console.log(`2. Kill the process using port ${PORT}:`);
        console.log(`   Windows: netstat -ano | findstr :${PORT} then taskkill /PID <PID> /F`);
        console.log(`   Mac/Linux: lsof -i :${PORT} then kill -9 <PID>`);
        console.log(`3. Wait a few seconds and try again`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  const now = new Date().toISOString();
  console.log('\n🛑 Shutting down server gracefully...');
  console.log('🕒 Shutdown initiated at:', now);

  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed.');
    console.log('🕒 Shutdown completed at:', now);
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('🕒 Exception time:', new Date().toISOString());
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('🕒 Rejection time:', new Date().toISOString());
  process.exit(1);
});

// Start the server
startServer();
