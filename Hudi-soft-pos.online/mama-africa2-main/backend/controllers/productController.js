// MongoDB product controller
import Product from '../models/Product.js';

// Helper to format product response
const formatProduct = (product) => {
  if (!product) return null;
  const p = product.toObject ? product.toObject() : product;
  return {
    _id: p._id.toString(),
    id: p._id.toString(),
    name: p.name,
    description: p.description || '',
    price: p.price,
    cost: p.cost || 0,
    category: p.category,
    stock: p.stock || 0,
    minStock: p.minStock || 10,
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

// Get all products - MongoDB
export const getProducts = async (req, res) => {
  try {
    const { category, lowStock, search, page = 1, limit = 20 } = req.query;
    const branchId = req.user.branch._id || req.user.branch.id;

    const query = { branch: branchId };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (lowStock === 'true') {
      query.stock = { $lte: 10 };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        products: products.map(formatProduct),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
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
    const branchId = req.user.branch._id || req.user.branch.id;

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
    const branchId = req.user.branch._id || req.user.branch.id;

    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, and category are required'
      });
    }

    const cleanCategory = category.toString().trim();
    if (!cleanCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category cannot be empty'
      });
    }

    const product = await Product.create({
      name: name.toString().trim(),
      description: description ? description.toString().trim() : '',
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : 0,
      category: cleanCategory,
      stock: stock ? parseInt(stock) : 0,
      minStock: minStock ? parseInt(minStock) : 10,
      isAvailable: isAvailable !== false,
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
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
};

// Update product - MongoDB
export const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const branchId = req.user.branch._id || req.user.branch.id;
    const updateData = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: productId, branch: branchId },
      { $set: updateData },
      { new: true }
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
    const branchId = req.user.branch._id || req.user.branch.id;

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
    const branchId = req.user.branch._id || req.user.branch.id;
    const { stock } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: productId, branch: branchId },
      { $set: { stock: parseInt(stock) } },
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

// Get categories - MongoDB
export const getCategories = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;

    const categories = await Product.distinct('category', { branch: branchId });
    const filteredCategories = categories.filter(cat => cat && cat.trim()).sort();

    res.json({
      success: true,
      data: filteredCategories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Get low stock products - MongoDB
export const getLowStockProducts = async (req, res) => {
  try {
    const branchId = req.user.branch._id || req.user.branch.id;

    const products = await Product.find({ 
      branch: branchId, 
      stock: { $lte: 10 } 
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

