import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import Employee from '../models/Employee.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import Purchase from '../models/Purchase.js';
import MigrationLog from '../models/MigrationLog.js';
import MigrationBackup from '../models/MigrationBackup.js';
import mongoose from 'mongoose';

/**
 * ─── 1. DASHBOARD STATISTICS ────────────────────────────────────────────────
 */
export const getDashboardStats = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;

    // Fetch entity totals for branch
    const productsCount = await Product.countDocuments({ branch: branchId });
    const customersCount = await Customer.countDocuments({ branch: branchId });
    const suppliersCount = await Supplier.countDocuments({ branch: branchId });
    const employeesCount = await Employee.countDocuments({ branch: branchId });
    const salesCount = await Order.countDocuments({ branch: branchId });
    const purchasesCount = await Purchase.countDocuments({ branch: branchId });

    // Last migration log
    const lastLog = await MigrationLog.findOne({ branch: branchId })
      .sort({ createdAt: -1 })
      .populate('user', 'name');

    res.json({
      success: true,
      data: {
        importedProducts: productsCount,
        importedCustomers: customersCount,
        importedSuppliers: suppliersCount,
        importedEmployees: employeesCount,
        importedSales: salesCount,
        importedPurchases: purchasesCount,
        lastMigrationDate: lastLog ? lastLog.createdAt : null,
        migrationStatus: lastLog ? lastLog.status : 'Healthy',
        lastMigration: lastLog || null
      }
    });
  } catch (error) {
    console.error('Get migration stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch migration statistics' });
  }
};

/**
 * ─── 2. FILE PREVIEW & AUTO FIELD MAPPING DETECTOR ──────────────────────────
 */
export const parseAndPreview = async (req, res) => {
  try {
    const { rows, source, fileName } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid data rows provided' });
    }

    const sampleRows = rows.slice(0, 100);
    const totalRecords = rows.length;

    // Detect column headers from first row keys
    const headers = Object.keys(rows[0] || {});

    // Intelligent Field Matcher
    const defaultMappings = {};
    const fieldDict = {
      name: ['name', 'itemname', 'productname', 'title', 'description', 'customername', 'suppliername', 'fullname'],
      price: ['price', 'sellingprice', 'unitprice', 'retailprice', 'amount', 'rate', 'salesprice'],
      cost: ['cost', 'costprice', 'purchaseprice', 'buyprice', 'buyrate', 'unitcost'],
      stock: ['stock', 'qty', 'quantity', 'stockqty', 'onhand', 'inventory', 'quantityonhand'],
      barcode: ['barcode', 'upc', 'ean', 'sku', 'code', 'itemcode', 'barcodevalue'],
      category: ['category', 'group', 'type', 'itemcategory', 'department'],
      phone: ['phone', 'phoneno', 'mobile', 'telephone', 'contact', 'cell', 'phone_number'],
      email: ['email', 'emailaddress', 'mail'],
      address: ['address', 'address1', 'street', 'city', 'location']
    };

    headers.forEach(header => {
      const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [targetField, aliases] of Object.entries(fieldDict)) {
        if (aliases.includes(cleanHeader)) {
          defaultMappings[header] = targetField;
          break;
        }
      }
    });

    // Validate sample records for quality metrics
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    const seenBarcodes = new Set();

    rows.forEach(row => {
      let isValid = true;
      const barcode = row.barcode || row.Barcode || row.SKU || row.sku;

      if (barcode) {
        if (seenBarcodes.has(barcode)) {
          duplicateCount++;
        }
        seenBarcodes.add(barcode);
      }

      // Basic validity check: must have at least one name or identifier
      const hasName = row.name || row.ItemName || row.ProductName || row.CustomerName || row.Name || row.Title;
      if (!hasName) {
        isValid = false;
      }

      if (isValid) validCount++;
      else invalidCount++;
    });

    res.json({
      success: true,
      data: {
        totalRecords,
        validRecords: validCount,
        invalidRecords: invalidCount,
        duplicateRecords: duplicateCount,
        headers,
        sampleRows,
        suggestedMappings: defaultMappings
      }
    });
  } catch (error) {
    console.error('Parse preview error:', error);
    res.status(500).json({ success: false, message: 'Failed to process file preview' });
  }
};

/**
 * ─── 3. EXECUTE MIGRATION WITH AUTO BACKUP SNAPSHOT ─────────────────────────
 */
export const executeMigration = async (req, res) => {
  const startTime = Date.now();
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const userId = req.user._id || req.user.id;
    const { source, fileName, rows, fieldMappings, options } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No data rows provided for import' });
    }

    // 1. CREATE AUTOMATIC BACKUP SNAPSHOT BEFORE IMPORT
    const existingProducts = await Product.find({ branch: branchId }).lean();
    const existingCustomers = await Customer.find({ branch: branchId }).lean();
    const existingSuppliers = await Supplier.find({ branch: branchId }).lean();
    const existingCategories = await Category.find({ branch: branchId }).lean();
    const existingEmployees = await Employee.find({ branch: branchId }).lean();

    const backup = await MigrationBackup.create({
      branch: branchId,
      user: userId,
      note: `Auto backup before importing ${rows.length} records from ${source || 'File'}`,
      snapshotData: {
        products: existingProducts,
        customers: existingCustomers,
        suppliers: existingSuppliers,
        categories: existingCategories,
        employees: existingEmployees
      }
    });

    // Tracking counters
    let productsImported = 0;
    let customersImported = 0;
    let suppliersImported = 0;
    let employeesImported = 0;
    let categoriesImported = 0;
    let duplicatesSkipped = 0;
    let errorsFound = 0;
    let warningsCount = 0;

    // Helper map to get value based on user field mappings
    const getMappedValue = (row, targetField) => {
      for (const [sourceHeader, mappedTarget] of Object.entries(fieldMappings || {})) {
        if (mappedTarget === targetField && row[sourceHeader] !== undefined) {
          return row[sourceHeader];
        }
      }
      // Fallback direct match
      return row[targetField] || row[targetField.toLowerCase()] || row[targetField.toUpperCase()];
    };

    // Category Cache map to reduce DB queries
    const categoryMap = new Map();
    const allCategories = await Category.find({ branch: branchId });
    allCategories.forEach(cat => categoryMap.set(cat.name.toLowerCase(), cat._id));

    // Chunk size for batch performance (processes in groups of 500)
    const CHUNK_SIZE = 500;

    // A. IMPORT CATEGORIES & PRODUCTS
    if (options.importProducts || options.importCategories) {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);

        for (const row of chunk) {
          try {
            const name = getMappedValue(row, 'name') || row.ItemName || row.ProductName || row.name;
            if (!name) {
              errorsFound++;
              continue;
            }

            const barcode = getMappedValue(row, 'barcode') || row.Barcode || row.SKU || row.barcode || `BC-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            const cost = parseFloat(getMappedValue(row, 'cost') || row.Cost || row.cost || 0);
            const price = parseFloat(getMappedValue(row, 'price') || row.SellingPrice || row.price || 0);
            const stock = parseInt(getMappedValue(row, 'stock') || row.StockQty || row.stock || 0, 10);
            const categoryName = getMappedValue(row, 'category') || row.Category || 'General';

            // Check / Create Category
            let categoryId = categoryMap.get(categoryName.toLowerCase());
            if (!categoryId && options.importCategories) {
              const newCat = await Category.create({ name: categoryName, branch: branchId });
              categoryId = newCat._id;
              categoryMap.set(categoryName.toLowerCase(), categoryId);
              categoriesImported++;
            }

            if (options.importProducts) {
              // Check duplicate barcode in branch
              const existingProd = await Product.findOne({ barcode, branch: branchId });
              if (existingProd) {
                duplicatesSkipped++;
                continue;
              }

              await Product.create({
                name,
                barcode,
                costPrice: isNaN(cost) ? 0 : cost,
                sellingPrice: isNaN(price) ? 0 : price,
                stockQuantity: isNaN(stock) ? 0 : stock,
                category: categoryId || allCategories[0]?._id,
                branch: branchId,
                status: 'active'
              });

              productsImported++;
            }
          } catch (err) {
            errorsFound++;
          }
        }
      }
    }

    // B. IMPORT CUSTOMERS
    if (options.importCustomers) {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        for (const row of chunk) {
          try {
            const name = getMappedValue(row, 'name') || row.CustomerName || row.name;
            const phone = getMappedValue(row, 'phone') || row.PhoneNo || row.phone;
            const email = getMappedValue(row, 'email') || row.EmailAddress || row.email || '';
            const address = getMappedValue(row, 'address') || row.Address || row.address || '';

            if (!name) continue;

            if (phone) {
              const existingCust = await Customer.findOne({ phone, branch: branchId });
              if (existingCust) {
                duplicatesSkipped++;
                continue;
              }
            }

            await Customer.create({
              name,
              phone: phone || `000-${Math.floor(Math.random()*1000000)}`,
              email,
              address,
              branch: branchId
            });

            customersImported++;
          } catch (err) {
            errorsFound++;
          }
        }
      }
    }

    // C. IMPORT SUPPLIERS
    if (options.importSuppliers) {
      for (const row of rows) {
        try {
          const name = getMappedValue(row, 'name') || row.SupplierName || row.name;
          const phone = getMappedValue(row, 'phone') || row.PhoneNo || row.phone;
          const email = getMappedValue(row, 'email') || row.email || '';

          if (!name) continue;

          await Supplier.create({
            name,
            phone: phone || '',
            email,
            branch: branchId
          });

          suppliersImported++;
        } catch (err) {
          errorsFound++;
        }
      }
    }

    // D. IMPORT EMPLOYEES
    if (options.importEmployees) {
      for (const row of rows) {
        try {
          const name = getMappedValue(row, 'name') || row.EmployeeName || row.name;
          const position = row.Position || row.position || 'Staff';
          const salary = parseFloat(row.Salary || row.salary || 500);

          if (!name) continue;

          await Employee.create({
            name,
            position,
            salary: isNaN(salary) ? 500 : salary,
            branch: branchId,
            status: 'active'
          });

          employeesImported++;
        } catch (err) {
          errorsFound++;
        }
      }
    }

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    const totalImported = productsImported + customersImported + suppliersImported + employeesImported + categoriesImported;

    // Create Migration Audit Log
    const log = await MigrationLog.create({
      branch: branchId,
      user: userId,
      userName: req.user.name || 'Administrator',
      source: source || 'File Import',
      fileName: fileName || 'Import_File',
      recordsCount: {
        products: productsImported,
        customers: customersImported,
        suppliers: suppliersImported,
        employees: employeesImported,
        categories: categoriesImported,
        total: totalImported
      },
      duplicatesSkipped,
      errorsCount: errorsFound,
      warningsCount,
      durationSeconds,
      status: 'Completed',
      backupId: backup._id,
      reportData: {
        productsImported,
        customersImported,
        suppliersImported,
        employeesImported,
        categoriesImported,
        duplicatesSkipped,
        errorsFound,
        warningsCount,
        durationSeconds,
        healthStatus: 'Healthy'
      }
    });

    res.json({
      success: true,
      message: 'Data migration completed successfully!',
      data: {
        logId: log._id,
        backupId: backup._id,
        summary: {
          productsImported,
          customersImported,
          suppliersImported,
          employeesImported,
          categoriesImported,
          totalImported,
          duplicatesSkipped,
          errorsFound,
          warningsCount,
          durationSeconds,
          databaseStatus: 'Healthy'
        }
      }
    });
  } catch (error) {
    console.error('Execute migration error:', error);
    res.status(500).json({ success: false, message: error.message || 'Data migration failed' });
  }
};

/**
 * ─── 4. MIGRATION AUDIT HISTORY LOGS ────────────────────────────────────────
 */
export const getLogs = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const logs = await MigrationLog.find({ branch: branchId })
      .populate('user', 'name')
      .populate('backupId', 'createdAt note isRestored')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Get migration logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch migration logs' });
  }
};

/**
 * ─── 5. ROLLBACK PREVIOUS MIGRATION SNAPSHOT ─────────────────────────────────
 */
export const rollbackBackup = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;
    const { backupId } = req.params;

    const backup = await MigrationBackup.findOne({ _id: backupId, branch: branchId });
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup snapshot not found' });
    }

    if (backup.isRestored) {
      return res.status(400).json({ success: false, message: 'This backup snapshot has already been restored.' });
    }

    const { snapshotData } = backup;

    // Revert Products
    await Product.deleteMany({ branch: branchId });
    if (snapshotData.products && snapshotData.products.length > 0) {
      await Product.insertMany(snapshotData.products);
    }

    // Revert Customers
    await Customer.deleteMany({ branch: branchId });
    if (snapshotData.customers && snapshotData.customers.length > 0) {
      await Customer.insertMany(snapshotData.customers);
    }

    // Revert Suppliers
    await Supplier.deleteMany({ branch: branchId });
    if (snapshotData.suppliers && snapshotData.suppliers.length > 0) {
      await Supplier.insertMany(snapshotData.suppliers);
    }

    // Revert Categories
    await Category.deleteMany({ branch: branchId });
    if (snapshotData.categories && snapshotData.categories.length > 0) {
      await Category.insertMany(snapshotData.categories);
    }

    // Update backup & migration log status
    backup.isRestored = true;
    backup.restoredAt = new Date();
    await backup.save();

    await MigrationLog.updateMany({ backupId: backup._id }, { $set: { status: 'Rolled Back' } });

    res.json({
      success: true,
      message: 'Database backup snapshot successfully restored! Migration has been rolled back.'
    });
  } catch (error) {
    console.error('Rollback backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore database backup snapshot' });
  }
};
