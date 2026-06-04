// MongoDB product controller
import Product from '../models/Product.js';
import Category from '../models/Category.js';

// Real-world default categories for initial setup
const DEFAULT_CATEGORIES = [
  'Food & Beverages',
  'Electronics',
  'Clothing & Apparel',
  'Health & Beauty',
  'Home & Kitchen',
  'Office Supplies',
  'Sports & Outdoors',
  'Toys & Games',
  'Automotive',
  'Books & Stationery',
  'Grocery',
  'Furniture',
  'Cleaning Supplies',
  'Pet Supplies',
  'Hardware & Tools',
  'Jewelry & Accessories',
  'Baby & Kids',
  'Garden & Outdoor',
  'Pharmacy & Medical',
  'General Merchandise'
];

// Helper to format product response
const formatProduct = (product) => {
  if (!product) return null;
  const p = product.toObject ? product.toObject() : product;
  return {
    _id: p._id.toString(),
    id: p._id.toString(),
    name: p.name || '',
    description: p.description || '',
    price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
    cost: typeof p.cost === 'number' ? p.cost : parseFloat(p.cost) || 0,
    category: p.category || 'General Merchandise',
    stock: typeof p.stock === 'number' ? p.stock : parseInt(p.stock) || 0,
    minStock: typeof p.minStock === 'number' ? p.minStock : parseInt(p.minStock) || 10,
    isAvailable: !!p.isAvailable,
    active: !!p.active,
    image: p.image || '',
    sku: p.sku || '',
    barcode: p.barcode || '',
    branch: p.branch ? p.branch.toString() : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
};

// Safe branch ID extraction helper
const getBranchId = (user) => {
  if (!user || !user.branch) return null;
  return user.branch._id || user.branch.id || user.branch;
};

// Get all products - MongoDB
export const getProducts = async (req, res) => {
  try {
    const { category, lowStock, search, page = 1, limit } = req.query;
    const branchId = getBranchId(req.user);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch information is required'
      });
    }

    const query = { branch: branchId };

    if (category && category !== 'all' && category.trim()) {
      query.category = category.trim();
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    
    const parsedLimit = limit ? parseInt(limit) : 100000;
    const skip = (parseInt(page) - 1) * parsedLimit;
    const products = await Product.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parsedLimit);

    res.json({
      success: true,
      data: {
        products: products.map(formatProduct),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parsedLimit),
          totalItems: total,
          itemsPerPage: parsedLimit
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

// Get single product - MongoDB
export const getProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const branchId = getBranchId(req.user);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch information is required'
      });
    }

    const product = await Product.findOne({ _id: productId, branch: branchId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: formatProduct(product)
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};

// Create product - MongoDB
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, cost, category, stock, minStock, isAvailable, image } = req.body;
    const branchId = getBranchId(req.user);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch information is required'
      });
    }

    // Validate required fields
    if (!name || !name.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (!category || !category.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid price is required (must be 0 or greater)'
      });
    }

    const cleanName = name.toString().trim();
    const cleanCategory = category.toString().trim();
    const parsedCost = cost ? parseFloat(cost) : 0;
    const parsedStock = stock ? parseInt(stock) : 0;
    const parsedMinStock = minStock ? parseInt(minStock) : 10;

    const product = await Product.create({
      name: cleanName,
      description: description ? description.toString().trim() : '',
      price: parsedPrice,
      cost: isNaN(parsedCost) ? 0 : parsedCost,
      category: cleanCategory,
      stock: isNaN(parsedStock) ? 0 : parsedStock,
      minStock: isNaN(parsedMinStock) ? 10 : parsedMinStock,
      isAvailable: isAvailable !== false && isAvailable !== 'false',
      active: true,
      image: image || '',
      branch: branchId
    });

    const formattedProduct = formatProduct(product);

    // Emit real-time event
    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('product-created', formattedProduct);
      req.io.to(`pos-${branchId}`).emit('product-added', formattedProduct);
    }

    res.status(201).json({
      success: true,
      data: formattedProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A product with this name already exists'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create product. Please try again.'
    });
  }
};

// Update product - MongoDB
export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const branchId = getBranchId(req.user);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch information is required'
      });
    }

    const updateData = { ...req.body };
    
    // Clean and validate update data
    if (updateData.name !== undefined) {
      updateData.name = updateData.name.toString().trim();
      if (!updateData.name) {
        return res.status(400).json({
          success: false,
          message: 'Product name cannot be empty'
        });
      }
    }
    
    if (updateData.category !== undefined) {
      updateData.category = updateData.category.toString().trim();
      if (!updateData.category) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be empty'
        });
      }
    }
    
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
      if (isNaN(updateData.price) || updateData.price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid number (0 or greater)'
        });
      }
    }
    
    if (updateData.cost !== undefined) {
      updateData.cost = parseFloat(updateData.cost);
      if (isNaN(updateData.cost)) updateData.cost = 0;
    }
    
    if (updateData.stock !== undefined) {
      updateData.stock = parseInt(updateData.stock);
      if (isNaN(updateData.stock)) updateData.stock = 0;
    }
    
    if (updateData.minStock !== undefined) {
      updateData.minStock = parseInt(updateData.minStock);
      if (isNaN(updateData.minStock)) updateData.minStock = 10;
    }

    if (updateData.isAvailable !== undefined) {
      updateData.isAvailable = updateData.isAvailable !== false && updateData.isAvailable !== 'false';
    }

    if (updateData.description !== undefined) {
      updateData.description = updateData.description.toString().trim();
    }

    const product = await Product.findOneAndUpdate(
      { _id: productId, branch: branchId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const formattedProduct = formatProduct(product);

    // Emit real-time event
    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('product-updated', formattedProduct);
      req.io.to(`pos-${branchId}`).emit('product-modified', formattedProduct);
    }

    res.json({
      success: true,
      data: formattedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
};

// Delete product - MongoDB
export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const branchId = getBranchId(req.user);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch information is required'
      });
    }

    const product = await Product.findOneAndDelete({ _id: productId, branch: branchId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const formattedProduct = formatProduct(product);

    // Emit real-time event
    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('product-deleted', formattedProduct);
      req.io.to(`pos-${branchId}`).emit('product-removed', formattedProduct);
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
};

// Update stock - MongoDB
export const updateStock = async (req, res) => {
  try {
    const productId = req.params.id;
    const branchId = getBranchId(req.user);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch information is required'
      });
    }

    const { stock } = req.body;
    const parsedStock = parseInt(stock);

    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be a valid number (0 or greater)'
      });
    }

    const product = await Product.findOneAndUpdate(
      { _id: productId, branch: branchId },
      { $set: { stock: parsedStock } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Emit real-time event
    if (req.io) {
      req.io.to(`branch-${branchId}`).emit('stock-updated', {
        productId: product._id.toString(),
        stock: product.stock,
        branch: branchId.toString()
      });
    }

    res.json({
      success: true,
      data: formatProduct(product),
      message: 'Stock updated successfully'
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock'
    });
  }
};

// Get categories - MongoDB (returns product categories + defaults)
export const getCategories = async (req, res) => {
  try {
    const branchId = getBranchId(req.user);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch information is required'
      });
    }

    // Get categories from existing products
    const productCategories = await Product.distinct('category', { branch: branchId });
    const validProductCats = productCategories.filter(cat => cat && cat.toString().trim());

    // Also try to get categories from the Category model
    let savedCategories = [];
    try {
      const catDocs = await Category.find({ branch: branchId }).select('name');
      savedCategories = catDocs.map(c => c.name).filter(Boolean);
    } catch (e) {
      // Category model might not exist in all setups, that's OK
    }

    // Merge all categories: defaults + saved + product categories
    const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...validProductCats, ...savedCategories])];
    const sortedCategories = allCategories.sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      data: sortedCategories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    // On error, still return defaults so frontend isn't broken
    res.json({
      success: true,
      data: [...DEFAULT_CATEGORIES].sort()
    });
  }
};

// Get low stock products - MongoDB
export const getLowStockProducts = async (req, res) => {
  try {
    const branchId = getBranchId(req.user);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch information is required'
      });
    }

    const products = await Product.find({ 
      branch: branchId, 
      $expr: { $lte: ['$stock', '$minStock'] }
    }).sort({ stock: 1 });

    res.json({
      success: true,
      data: products.map(formatProduct)
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products'
    });
  }
};
