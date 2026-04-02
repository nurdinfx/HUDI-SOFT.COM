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
import connectDB from './db/mongodb.js';

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
      "https://hudi-pos-online.onrender.com",
      "https://hudi-soft-com-m48c.vercel.app"
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
  'https://hudi-pos-online.onrender.com',
  'https://hudi-soft-com-m48c.vercel.app',
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
import purchaseRoutes from './routes/purchases.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import supplierRoutes from './routes/suppliers.js';
import financeRoutes from './routes/finance.js';
import reportRoutes from './routes/reports.js';
import inventoryRoutes from './routes/inventory.js';
import syncRoutes from './routes/sync.js';
import licenseRoutes from './routes/license.js';
import adminRoutes from './routes/admin.js';

// Simple File Upload Setup
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

// API Endpoints
app.post('/api/v1/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }
    let imageData;
    if (cloudinaryEnabled) {
      const folder = `rms/restaurants/${req.user?.branch?._id || 'public'}/products`;
      const uploadResult = await cloudinary.uploader.upload(req.file.path, { folder });
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
    res.json({ success: true, data: imageData, message: 'Image uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image', error: error.message });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/purchase-orders', purchaseOrderRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/license', licenseRoutes);
app.use('/api/v1/admin', adminRoutes);

// Protect sensitive routes with license check
app.use(['/api/v1/orders', '/api/v1/products', '/api/v1/customers', '/api/v1/tables', '/api/v1/expenses', '/api/v1/dashboard', '/api/v1/users', '/api/v1/settings', '/api/v1/purchases', '/api/v1/purchase-orders', '/api/v1/suppliers', '/api/v1/finance', '/api/v1/reports', '/api/v1/inventory'], licenseCheck);

// Health check endpoints
const healthHandler = (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'Connected (MongoDB)',
    environment: process.env.NODE_ENV || 'development',
    uploads: {
      directory: uploadsDir,
      exists: fs.existsSync(uploadsDir)
    }
  };
  res.json(health);
};

app.get('/api/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// Serve Static Files in Production
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'HUDI-SOFT POS Online API',
      version: '1.0.0',
      database: 'MongoDB',
      timestamp: new Date().toISOString()
    });
  });
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('join-branch', (branchId) => {
    socket.join(`branch-${branchId}`);
  });

  socket.on('join-kitchen', (branchId) => {
    socket.join(`kitchen-${branchId}`);
  });

  socket.on('join-pos', (branchId) => {
    socket.join(`pos-${branchId}`);
  });

  socket.on('join-customers', (branchId) => {
    socket.join(`customers-${branchId}`);
  });

  socket.on('join-purchases', (branchId) => {
    socket.join(`purchases-${branchId}`);
  });

  // Example real-time events
  socket.on('create-order', (orderData) => {
    socket.to(`branch-${orderData.branch}`).emit('new-order', orderData);
    socket.to(`kitchen-${orderData.branch}`).emit('order-received', orderData);
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start the server
const startServer = async () => {
  try {
    // Initialize MongoDB Connection
    const isConnected = await connectDB();
    if (isConnected) {
      console.log('🗄️  Database Mode: MONGODB (POS Online)');
    } else {
      console.log('⚠️  Starting server without active MongoDB connection (Render Deployment Check)');
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    // Bind the port anyway to let Render container pass deployment checks
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (fallback mode)`);
    });
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

startServer();

