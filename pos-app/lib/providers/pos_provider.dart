import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/api_service.dart';

// ─────────────────────────────────────────────────────────────
// POS Provider — mirrors all the useState hooks in pos.jsx
// Manages: products, categories, cart, table, customer,
//          payment, VAT, discount, order creation
// ─────────────────────────────────────────────────────────────
class PosProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  // ── Data ──────────────────────────────────────────────
  List<Product>   _products   = [];
  List<String>    _categories = ['All'];
  List<PosTable>  _tables     = [];
  List<Customer>  _customers  = [];
  List<AppUser>   _users      = [];
  AppSettings?    _settings;

  // ── POS State ─────────────────────────────────────────
  String          _selectedCategory = 'All';
  List<CartItem>  _cart             = [];
  PosTable?       _selectedTable;
  Customer?       _selectedCustomer;
  AppUser?        _servedBy;
  String          _orderType        = 'dine-in'; // dine-in | takeaway | delivery
  String          _paymentMethod    = 'cash';
  String          _searchQuery      = '';
  String          _viewMode         = 'thumbnail'; // thumbnail | list

  // ── Financial ─────────────────────────────────────────
  double  _discount    = 0;
  bool    _vatEnabled  = true;
  double  _tipAmount   = 0;
  String? _remarks;
  String? _bookedRoom;
  DateTime _orderDate  = DateTime.now();

  // ── UI State ──────────────────────────────────────────
  bool _isLoading       = false;
  bool _isCreatingOrder = false;
  String? _error;
  String? _successMessage;

  Timer? _refreshTimer;

  // ── Getters ───────────────────────────────────────────
  List<Product>  get products          => _products;
  List<String>   get categories        => _categories;
  List<PosTable> get tables            => _tables;
  List<Customer> get customers         => _customers;
  List<AppUser>  get users             => _users;
  AppSettings?   get settings          => _settings;
  String         get selectedCategory  => _selectedCategory;
  List<CartItem> get cart              => _cart;
  PosTable?      get selectedTable     => _selectedTable;
  Customer?      get selectedCustomer  => _selectedCustomer;
  AppUser?       get servedBy          => _servedBy;
  String         get orderType         => _orderType;
  String         get paymentMethod     => _paymentMethod;
  String         get searchQuery       => _searchQuery;
  String         get viewMode          => _viewMode;
  double         get discount          => _discount;
  bool           get vatEnabled        => _vatEnabled;
  double         get tipAmount         => _tipAmount;
  String?        get remarks           => _remarks;
  String?        get bookedRoom        => _bookedRoom;
  DateTime       get orderDate         => _orderDate;
  bool           get isLoading         => _isLoading;
  bool           get isCreatingOrder   => _isCreatingOrder;
  String?        get error             => _error;
  String?        get successMessage    => _successMessage;

  // ── Computed Values ───────────────────────────────────
  double get subtotal => _cart.fold(0, (sum, item) => sum + item.total);

  double get vatRate    => _settings?.vatRate ?? 10;
  double get vatAmount  => _vatEnabled ? subtotal * (vatRate / 100) : 0;
  double get discountAmount => subtotal * (_discount / 100);
  double get total      => subtotal - discountAmount + vatAmount + _tipAmount;
  int    get cartCount  => _cart.fold(0, (sum, item) => sum + item.quantity);

  List<Product> get filteredProducts {
    var result = _products.where((p) => p.isAvailable && p.active).toList();
    if (_selectedCategory != 'All') {
      result = result.where((p) => p.category == _selectedCategory).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      result = result.where((p) =>
        p.name.toLowerCase().contains(q) ||
        (p.barcode?.contains(q) ?? false) ||
        (p.sku?.toLowerCase().contains(q) ?? false)
      ).toList();
    }
    return result;
  }

  // ── Initialization ────────────────────────────────────
  Future<void> loadPosData() async {
    _isLoading = true;
    notifyListeners();

    await Future.wait([
      _loadProducts(),
      _loadCategories(),
      _loadTables(),
      _loadCustomers(),
      _loadUsers(),
      _loadSettings(),
    ]);

    _isLoading = false;
    notifyListeners();

    // Refresh every 15 seconds like the PWA
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _loadProducts();
      _loadSettings();
    });
  }

  Future<void> _loadProducts() async {
    final list = await _api.getProducts();
    if (list.isNotEmpty) {
      _products = list;
      notifyListeners();
    }
  }

  Future<void> _loadCategories() async {
    final list = await _api.getCategories();
    _categories = list;
    notifyListeners();
  }

  Future<void> _loadTables() async {
    final list = await _api.getTables();
    _tables = list;
    notifyListeners();
  }

  Future<void> _loadCustomers() async {
    final list = await _api.getCustomers();
    _customers = list;
    notifyListeners();
  }

  Future<void> _loadUsers() async {
    final list = await _api.getUsers();
    _users = list;
    notifyListeners();
  }

  Future<void> _loadSettings() async {
    final s = await _api.getSettings();
    if (s != null) {
      _settings = s;
      notifyListeners();
    }
  }

  // ── Cart Actions ──────────────────────────────────────
  void addToCart(Product product) {
    final idx = _cart.indexWhere((i) => i.id == product.id);
    if (idx >= 0) {
      _cart[idx] = _cart[idx].copyWith(quantity: _cart[idx].quantity + 1);
    } else {
      _cart.add(CartItem(
        id:    product.id,
        name:  product.name,
        price: product.price,
        image: product.image,
      ));
    }
    notifyListeners();
  }

  void incrementItem(String id) {
    final idx = _cart.indexWhere((i) => i.id == id);
    if (idx >= 0) {
      _cart[idx] = _cart[idx].copyWith(quantity: _cart[idx].quantity + 1);
      notifyListeners();
    }
  }

  void decrementItem(String id) {
    final idx = _cart.indexWhere((i) => i.id == id);
    if (idx >= 0) {
      if (_cart[idx].quantity > 1) {
        _cart[idx] = _cart[idx].copyWith(quantity: _cart[idx].quantity - 1);
      } else {
        _cart.removeAt(idx);
      }
      notifyListeners();
    }
  }

  void removeFromCart(String id) {
    _cart.removeWhere((i) => i.id == id);
    notifyListeners();
  }

  void clearCart() {
    _cart = [];
    _selectedTable   = null;
    _selectedCustomer = null;
    _servedBy        = null;
    _discount        = 0;
    _tipAmount       = 0;
    _remarks         = null;
    _bookedRoom      = null;
    _orderDate       = DateTime.now();
    _orderType       = 'dine-in';
    _paymentMethod   = 'cash';
    _vatEnabled      = true;
    _error           = null;
    _successMessage  = null;
    notifyListeners();
  }

  // ── Setters ───────────────────────────────────────────
  void setCategory(String c)         { _selectedCategory = c; notifyListeners(); }
  void setSearchQuery(String q)      { _searchQuery = q;      notifyListeners(); }
  void setViewMode(String m)         { _viewMode = m;         notifyListeners(); }
  void setSelectedTable(PosTable? t) { _selectedTable = t;    notifyListeners(); }
  void setSelectedCustomer(Customer? c) { _selectedCustomer = c; notifyListeners(); }
  void setServedBy(AppUser? u)       { _servedBy = u;         notifyListeners(); }
  void setOrderType(String t)        { _orderType = t;        notifyListeners(); }
  void setPaymentMethod(String m)    { _paymentMethod = m;    notifyListeners(); }
  void setDiscount(double d)         { _discount = d;         notifyListeners(); }
  void setVatEnabled(bool v)         { _vatEnabled = v;       notifyListeners(); }
  void setTipAmount(double t)        { _tipAmount = t;        notifyListeners(); }
  void setRemarks(String? r)         { _remarks = r;          notifyListeners(); }
  void setBookedRoom(String? r)      { _bookedRoom = r;       notifyListeners(); }
  void setOrderDate(DateTime d)      { _orderDate = d;        notifyListeners(); }
  void clearError()  { _error = null;          notifyListeners(); }
  void clearSuccess(){ _successMessage = null; notifyListeners(); }

  // ── Create Order ──────────────────────────────────────
  Future<Order?> createOrder() async {
    if (_cart.isEmpty) {
      _error = 'Cart is empty. Add items before creating an order.';
      notifyListeners();
      return null;
    }

    _isCreatingOrder = true;
    _error = null;
    notifyListeners();

    final orderData = {
      'orderType':     _orderType,
      'paymentMethod': _paymentMethod,
      'items':         _cart.map((i) => i.toOrderItem()).toList(),
      'subtotal':      subtotal,
      'tax':           vatAmount,
      'discount':      discountAmount,
      'finalTotal':    total,
      if (_selectedTable != null)    'tableId':      _selectedTable!.id,
      if (_selectedTable != null)    'tableNumber':  _selectedTable!.number,
      if (_selectedCustomer != null) 'customer':     _selectedCustomer!.id,
      if (_selectedCustomer != null) 'customerName': _selectedCustomer!.name,
      if (_servedBy != null)         'servedBy':     _servedBy!.id,
      if (_remarks != null)          'specialInstructions': _remarks,
    };

    final res = await _api.createOrder(orderData);
    _isCreatingOrder = false;

    if (res['success'] == true) {
      final data  = res['data'] ?? res['order'] ?? res;
      final order = Order.fromJson(data);
      _successMessage = 'Order ${order.orderNumber} created successfully!';
      notifyListeners();
      return order;
    }

    _error = res['message'] ?? 'Failed to create order.';
    notifyListeners();
    return null;
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
