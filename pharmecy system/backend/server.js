const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Mount routers
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/branches', require('./routes/branchRoutes'));
app.use('/api/v1/categories', require('./routes/categoryRoutes'));
app.use('/api/v1/medicines', require('./routes/medicineRoutes'));
app.use('/api/v1/sales', require('./routes/saleRoutes'));
app.use('/api/v1/finance', require('./routes/financeRoutes'));
app.use('/api/v1/shareholders', require('./routes/shareholderRoutes'));
app.use('/api/v1/superadmin', require('./routes/superAdminRoutes'));
app.use('/api/v1/tenant', require('./routes/tenantRoutes'));

app.get('/', (req, res) => {
  res.send('Pharmacy System API is running...');
});

// Error Middleware
// app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
