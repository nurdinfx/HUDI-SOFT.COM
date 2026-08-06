/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          ENTERPRISE MIGRATION CONNECTOR SERVICE                             ║
 * ║  Modular plug-in architecture: add new ERP connectors without touching      ║
 * ║  existing migration engine logic.                                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ─── Migration Connector Interface ────────────────────────────────────────────
// Each connector must implement this interface
// {
//   id: string            - unique connector identifier
//   name: string          - display name
//   description: string   - short description  
//   icon: string          - emoji or icon class
//   category: string      - 'file' | 'erp' | 'cloud'
//   available: boolean    - is this connector ready to use?
//   fileTypes?: string[]  - accepted file extensions (for file connectors)
//   parse(data): Promise<ParseResult>   - parse raw input into normalized records
//   validate(records): ValidationResult - validate parsed records
// }

// ─── Standard Field Map (Target Schema) ────────────────────────────────────────
export const TARGET_FIELDS = {
  // Product fields
  product_name: { label: 'Product Name', required: true, type: 'string', entity: 'product' },
  product_barcode: { label: 'Barcode / SKU', required: false, type: 'string', entity: 'product' },
  product_cost: { label: 'Cost Price', required: false, type: 'number', entity: 'product' },
  product_price: { label: 'Selling Price', required: false, type: 'number', entity: 'product' },
  product_stock: { label: 'Stock Quantity', required: false, type: 'number', entity: 'product' },
  product_category: { label: 'Category', required: false, type: 'string', entity: 'product' },
  product_unit: { label: 'Unit', required: false, type: 'string', entity: 'product' },
  product_brand: { label: 'Brand', required: false, type: 'string', entity: 'product' },
  product_description: { label: 'Description', required: false, type: 'string', entity: 'product' },
  product_tax: { label: 'Tax Rate (%)', required: false, type: 'number', entity: 'product' },
  product_reorder: { label: 'Reorder Level', required: false, type: 'number', entity: 'product' },
  // Customer fields
  customer_name: { label: 'Customer Name', required: true, type: 'string', entity: 'customer' },
  customer_phone: { label: 'Phone', required: false, type: 'string', entity: 'customer' },
  customer_email: { label: 'Email', required: false, type: 'string', entity: 'customer' },
  customer_address: { label: 'Address', required: false, type: 'string', entity: 'customer' },
  customer_balance: { label: 'Opening Balance', required: false, type: 'number', entity: 'customer' },
  // Supplier fields
  supplier_name: { label: 'Supplier Name', required: true, type: 'string', entity: 'supplier' },
  supplier_phone: { label: 'Phone', required: false, type: 'string', entity: 'supplier' },
  supplier_email: { label: 'Email', required: false, type: 'string', entity: 'supplier' },
  supplier_address: { label: 'Address', required: false, type: 'string', entity: 'supplier' },
  // Employee fields
  employee_name: { label: 'Employee Name', required: true, type: 'string', entity: 'employee' },
  employee_position: { label: 'Position', required: false, type: 'string', entity: 'employee' },
  employee_salary: { label: 'Salary', required: false, type: 'number', entity: 'employee' },
  employee_phone: { label: 'Phone', required: false, type: 'string', entity: 'employee' },
};

// ─── Auto-Match Dictionary ─────────────────────────────────────────────────────
const AUTO_MATCH_DICT = {
  product_name: ['name', 'itemname', 'productname', 'item name', 'product name', 'title', 'item', 'product', 'description', 'article', 'item description', 'prod name'],
  product_barcode: ['barcode', 'upc', 'ean', 'sku', 'code', 'itemcode', 'barcodevalue', 'item code', 'product code', 'barcode no', 'stockcode'],
  product_cost: ['cost', 'costprice', 'purchaseprice', 'buyprice', 'buyrate', 'unitcost', 'cost price', 'purchase price', 'buy price', 'unit cost'],
  product_price: ['price', 'sellingprice', 'unitprice', 'retailprice', 'salesprice', 'selling price', 'unit price', 'retail price', 'rate', 'amount', 'sale price'],
  product_stock: ['stock', 'qty', 'quantity', 'stockqty', 'onhand', 'inventory', 'quantityonhand', 'stock qty', 'quantity on hand', 'available', 'balance qty'],
  product_category: ['category', 'group', 'type', 'itemcategory', 'department', 'item category', 'item group', 'product group', 'cat', 'class'],
  product_unit: ['unit', 'uom', 'unitofmeasure', 'unit of measure', 'measure', 'pack', 'packing'],
  product_brand: ['brand', 'manufacturer', 'make', 'company', 'vendor', 'mfg'],
  customer_name: ['customername', 'client', 'clientname', 'customer name', 'customer', 'fullname', 'full name', 'account name', 'debtor'],
  customer_phone: ['phone', 'phoneno', 'mobile', 'telephone', 'contact', 'cell', 'phone number', 'mobile no', 'tel', 'contact no'],
  customer_email: ['email', 'emailaddress', 'mail', 'email address', 'e-mail'],
  customer_address: ['address', 'address1', 'street', 'city', 'location', 'addr', 'postal'],
  customer_balance: ['balance', 'openingbalance', 'opening balance', 'debit balance', 'credit balance', 'amount due'],
  supplier_name: ['suppliername', 'vendor', 'vendorname', 'supplier name', 'supplier', 'creditor', 'creditor name'],
  supplier_phone: ['phone', 'phoneno', 'mobile', 'telephone', 'contact no'],
  supplier_email: ['email', 'emailaddress', 'mail'],
  supplier_address: ['address', 'address1', 'street', 'location'],
  employee_name: ['employeename', 'staff', 'staffname', 'employee name', 'employee', 'worker', 'fullname'],
  employee_position: ['position', 'designation', 'role', 'job title', 'jobtitle', 'rank', 'dept'],
  employee_salary: ['salary', 'wage', 'pay', 'basic salary', 'basic pay', 'monthly salary'],
  employee_phone: ['phone', 'phoneno', 'mobile', 'contact'],
};

/**
 * Intelligent Auto-Field Mapper
 * Given file column headers, returns best-guess mapping to target fields
 */
export const autoMapFields = (headers) => {
  const mappings = {};

  headers.forEach((header) => {
    const clean = header.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    let bestMatch = null;

    for (const [targetField, aliases] of Object.entries(AUTO_MATCH_DICT)) {
      if (aliases.includes(clean)) {
        bestMatch = targetField;
        break;
      }
    }
    // Fuzzy partial match fallback
    if (!bestMatch) {
      for (const [targetField, aliases] of Object.entries(AUTO_MATCH_DICT)) {
        if (aliases.some(alias => clean.includes(alias) || alias.includes(clean))) {
          bestMatch = targetField;
          break;
        }
      }
    }

    if (bestMatch) {
      mappings[header] = bestMatch;
    }
  });

  return mappings;
};

/**
 * Apply field mappings to raw rows to produce normalized records
 */
export const applyFieldMappings = (rows, fieldMappings) => {
  return rows.map(row => {
    const normalized = {};
    Object.entries(fieldMappings).forEach(([sourceHeader, targetField]) => {
      if (row[sourceHeader] !== undefined && row[sourceHeader] !== null && row[sourceHeader] !== '') {
        normalized[targetField] = row[sourceHeader];
      }
    });
    return { _original: row, ...normalized };
  });
};

/**
 * Validate a batch of normalized records — fully client-side dry-run
 */
export const validateRecords = (records, entityType = 'product') => {
  const errors = [];
  const warnings = [];
  const duplicates = [];
  const seenBarcodes = new Set();
  const seenNames = new Set();
  const seenPhones = new Set();

  let validCount = 0;
  let invalidCount = 0;

  records.forEach((record, idx) => {
    const rowNum = idx + 2; // human-readable row number
    let isValid = true;

    // Name is always required
    const nameField = `${entityType}_name`;
    const name = record[nameField];
    if (!name || String(name).trim() === '') {
      errors.push({ row: rowNum, field: 'name', message: `Row ${rowNum}: Missing required name field` });
      isValid = false;
    }

    // Barcode duplicate detection (products)
    if (entityType === 'product') {
      const barcode = record.product_barcode;
      if (barcode) {
        if (seenBarcodes.has(String(barcode))) {
          duplicates.push({ row: rowNum, field: 'barcode', value: barcode, message: `Row ${rowNum}: Duplicate barcode "${barcode}"` });
        }
        seenBarcodes.add(String(barcode));
      }

      // Price validation
      if (record.product_price !== undefined) {
        const price = parseFloat(record.product_price);
        if (isNaN(price) || price < 0) {
          warnings.push({ row: rowNum, field: 'price', message: `Row ${rowNum}: Invalid price value "${record.product_price}"` });
        }
      }

      // Stock validation
      if (record.product_stock !== undefined) {
        const stock = parseInt(record.product_stock);
        if (isNaN(stock) || stock < 0) {
          warnings.push({ row: rowNum, field: 'stock', message: `Row ${rowNum}: Invalid stock value "${record.product_stock}"` });
        }
      }
    }

    // Phone validation (customers/suppliers/employees)
    const phoneField = `${entityType}_phone`;
    if (record[phoneField]) {
      const phone = String(record[phoneField]).replace(/\D/g, '');
      if (phone.length < 7 || phone.length > 15) {
        warnings.push({ row: rowNum, field: 'phone', message: `Row ${rowNum}: Potentially invalid phone "${record[phoneField]}"` });
      }
      if (seenPhones.has(phone)) {
        duplicates.push({ row: rowNum, field: 'phone', value: phone, message: `Row ${rowNum}: Duplicate phone number` });
      }
      seenPhones.add(phone);
    }

    // Email validation
    const emailField = `${entityType}_email`;
    if (record[emailField]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(record[emailField])) {
        warnings.push({ row: rowNum, field: 'email', message: `Row ${rowNum}: Invalid email format "${record[emailField]}"` });
      }
    }

    if (isValid) validCount++;
    else invalidCount++;
  });

  const totalRecords = records.length;
  const score = totalRecords > 0
    ? Math.max(0, Math.round(((totalRecords - invalidCount - duplicates.length) / totalRecords) * 100))
    : 0;

  const estimatedMinutes = Math.max(1, Math.ceil(totalRecords / 1000));

  return {
    totalRecords,
    validRecords: validCount,
    invalidRecords: invalidCount,
    duplicateRecords: duplicates.length,
    errors,
    warnings,
    duplicates,
    score,
    estimatedTime: estimatedMinutes === 1 ? '< 1 Minute' : `${estimatedMinutes} Minutes`,
    isReadyToImport: invalidCount === 0 && errors.length === 0,
  };
};

/**
 * Parse CSV text into row objects
 */
export const parseCSV = (text) => {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Handle quoted CSV properly
  const parseRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = parseRow(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });

  return { headers, rows };
};

/**
 * Parse XLSX ArrayBuffer using SheetJS (if available) or fallback mock
 */
export const parseXLSX = async (arrayBuffer) => {
  try {
    // Dynamically load SheetJS if available
    if (typeof window !== 'undefined' && window.XLSX) {
      const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (jsonData.length < 2) return { headers: [], rows: [] };

      const headers = jsonData[0].map(h => String(h).trim());
      const rows = jsonData.slice(1)
        .filter(row => row.some(cell => cell !== ''))
        .map(row => {
          const obj = {};
          headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
          return obj;
        });

      return { headers, rows };
    }

    // Fallback: treat as CSV
    const text = new TextDecoder().decode(arrayBuffer);
    return parseCSV(text);
  } catch (err) {
    console.error('XLSX parse error:', err);
    return { headers: [], rows: [] };
  }
};

/**
 * Parse JSON backup file
 */
export const parseJSON = (text) => {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      const headers = data.length > 0 ? Object.keys(data[0]) : [];
      return { headers, rows: data };
    }
    // Handle nested JSON structures
    const firstArray = Object.values(data).find(v => Array.isArray(v));
    if (firstArray && firstArray.length > 0) {
      const headers = Object.keys(firstArray[0]);
      return { headers, rows: firstArray };
    }
    return { headers: [], rows: [] };
  } catch {
    return { headers: [], rows: [] };
  }
};

// ─── CONNECTOR DEFINITIONS ────────────────────────────────────────────────────

export const MIGRATION_CONNECTORS = [
  {
    id: 'excel',
    name: 'Excel Workbook',
    description: 'Import from Microsoft Excel (.xlsx, .xls) spreadsheets',
    icon: '📊',
    category: 'file',
    available: true,
    fileTypes: ['.xlsx', '.xls'],
    acceptString: '.xlsx,.xls',
    color: 'from-green-600 to-emerald-700',
  },
  {
    id: 'csv',
    name: 'CSV File',
    description: 'Import from comma-separated values text files',
    icon: '📄',
    category: 'file',
    available: true,
    fileTypes: ['.csv'],
    acceptString: '.csv',
    color: 'from-blue-600 to-cyan-700',
  },
  {
    id: 'json',
    name: 'JSON Backup',
    description: 'Import from JSON data backup or export files',
    icon: '🗂️',
    category: 'file',
    available: true,
    fileTypes: ['.json'],
    acceptString: '.json',
    color: 'from-amber-600 to-orange-700',
  },
  {
    id: 'sql',
    name: 'SQL Dump',
    description: 'Import from MySQL / PostgreSQL / SQLite database dumps',
    icon: '🗄️',
    category: 'file',
    available: true,
    fileTypes: ['.sql', '.db', '.sqlite'],
    acceptString: '.sql,.db,.sqlite',
    color: 'from-slate-600 to-gray-700',
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Connect and import data directly from QuickBooks Online or Desktop',
    icon: '⚡',
    category: 'erp',
    available: false,
    comingSoon: true,
    color: 'from-green-700 to-teal-800',
  },
  {
    id: 'odoo',
    name: 'Odoo',
    description: 'Import from Odoo ERP using CSV or XML export',
    icon: '🌐',
    category: 'erp',
    available: false,
    comingSoon: true,
    color: 'from-purple-700 to-indigo-800',
  },
  {
    id: 'zoho',
    name: 'Zoho Books',
    description: 'Import from Zoho Books accounting system',
    icon: '📘',
    category: 'cloud',
    available: false,
    comingSoon: true,
    color: 'from-red-700 to-rose-800',
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Import from Sage Business Cloud or Sage 50',
    icon: '🌿',
    category: 'erp',
    available: false,
    comingSoon: true,
    color: 'from-lime-700 to-green-800',
  },
  {
    id: 'erpnext',
    name: 'ERPNext',
    description: 'Import from ERPNext / Frappe Framework exports',
    icon: '🔧',
    category: 'erp',
    available: false,
    comingSoon: true,
    color: 'from-blue-800 to-indigo-900',
  },
  {
    id: 'dynamics',
    name: 'Microsoft Dynamics',
    description: 'Import from Microsoft Dynamics 365 Business Central',
    icon: '🪟',
    category: 'erp',
    available: false,
    comingSoon: true,
    color: 'from-sky-700 to-blue-800',
  },
  {
    id: 'sap',
    name: 'SAP Business One',
    description: 'Import from SAP Business One ERP system',
    icon: '🏢',
    category: 'erp',
    available: false,
    comingSoon: true,
    color: 'from-cyan-700 to-teal-800',
  },
  {
    id: 'adoo',
    name: 'ADOO POS',
    description: 'Import directly from ADOO Point of Sale system',
    icon: '🛒',
    category: 'erp',
    available: false,
    comingSoon: true,
    color: 'from-violet-700 to-purple-800',
  },
];

// ─── MAPPING TEMPLATES ────────────────────────────────────────────────────────
export const MAPPING_TEMPLATES = {
  quickbooks: {
    name: 'QuickBooks Template',
    icon: '⚡',
    mappings: {
      'Name': 'product_name',
      'Sales Price': 'product_price',
      'Purchase Cost': 'product_cost',
      'Qty On Hand': 'product_stock',
      'Income Account': 'product_category',
    },
  },
  pharmacy: {
    name: 'Excel Pharmacy Template',
    icon: '💊',
    mappings: {
      'Drug Name': 'product_name',
      'Pack': 'product_unit',
      'Batch No': 'product_barcode',
      'Cost': 'product_cost',
      'MRP': 'product_price',
      'Stock': 'product_stock',
      'Category': 'product_category',
    },
  },
  supermarket: {
    name: 'Supermarket Template',
    icon: '🛒',
    mappings: {
      'Item Name': 'product_name',
      'Barcode': 'product_barcode',
      'Buying Price': 'product_cost',
      'Selling Price': 'product_price',
      'Stock Qty': 'product_stock',
      'Category': 'product_category',
      'Brand': 'product_brand',
    },
  },
  restaurant: {
    name: 'Restaurant Template',
    icon: '🍽️',
    mappings: {
      'Menu Item': 'product_name',
      'Category': 'product_category',
      'Price': 'product_price',
      'Cost': 'product_cost',
    },
  },
};

export default {
  MIGRATION_CONNECTORS,
  TARGET_FIELDS,
  MAPPING_TEMPLATES,
  autoMapFields,
  applyFieldMappings,
  validateRecords,
  parseCSV,
  parseXLSX,
  parseJSON,
};
