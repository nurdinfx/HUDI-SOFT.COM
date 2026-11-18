// Models — Product, Category, Table, Customer, User, Order, Settings

// ───────────────────────────────────────────────────────
// Product
// ───────────────────────────────────────────────────────
class Product {
  final String id;
  final String name;
  final String? description;
  final double price;
  final double cost;
  final String category;
  final int stock;
  final int minStock;
  final bool isAvailable;
  final bool active;
  final String? image;
  final String? sku;
  final String? barcode;

  Product({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.cost = 0,
    required this.category,
    this.stock = 0,
    this.minStock = 10,
    this.isAvailable = true,
    this.active = true,
    this.image,
    this.sku,
    this.barcode,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
    id:          json['_id'] ?? json['id'] ?? '',
    name:        json['name'] ?? '',
    description: json['description'],
    price:       (json['price'] ?? 0).toDouble(),
    cost:        (json['cost'] ?? 0).toDouble(),
    category:    json['category'] ?? '',
    stock:       json['stock'] ?? 0,
    minStock:    json['minStock'] ?? 10,
    isAvailable: json['isAvailable'] ?? true,
    active:      json['active'] ?? true,
    image:       json['image'],
    sku:         json['sku'],
    barcode:     json['barcode'],
  );

  Map<String, dynamic> toJson() => {
    '_id':         id,
    'name':        name,
    'description': description,
    'price':       price,
    'cost':        cost,
    'category':    category,
    'stock':       stock,
    'minStock':    minStock,
    'isAvailable': isAvailable,
    'active':      active,
    'image':       image,
    'sku':         sku,
    'barcode':     barcode,
  };
}

// ───────────────────────────────────────────────────────
// Cart Item
// ───────────────────────────────────────────────────────
class CartItem {
  final String id;
  final String name;
  final double price;
  int quantity;
  final String? image;
  String? notes;

  CartItem({
    required this.id,
    required this.name,
    required this.price,
    this.quantity = 1,
    this.image,
    this.notes,
  });

  double get total => price * quantity;

  CartItem copyWith({int? quantity, String? notes}) => CartItem(
    id:       id,
    name:     name,
    price:    price,
    quantity: quantity ?? this.quantity,
    image:    image,
    notes:    notes ?? this.notes,
  );

  Map<String, dynamic> toOrderItem() => {
    'product':      id,
    'product_name': name,
    'quantity':     quantity,
    'price':        price,
    'total':        total,
    'notes':        notes,
  };
}

// ───────────────────────────────────────────────────────
// Table
// ───────────────────────────────────────────────────────
class PosTable {
  final String id;
  final String number;
  final String? name;
  final String status; // available, occupied, reserved, cleaning
  final int capacity;
  final String? section;

  PosTable({
    required this.id,
    required this.number,
    this.name,
    this.status = 'available',
    this.capacity = 4,
    this.section,
  });

  factory PosTable.fromJson(Map<String, dynamic> json) => PosTable(
    id:       json['_id'] ?? json['id'] ?? '',
    number:   json['number']?.toString() ?? '',
    name:     json['name'],
    status:   json['status'] ?? 'available',
    capacity: json['capacity'] ?? 4,
    section:  json['section'],
  );
}

// ───────────────────────────────────────────────────────
// Customer
// ───────────────────────────────────────────────────────
class Customer {
  final String id;
  final String name;
  final String? phone;
  final String? email;
  final double balance;

  Customer({
    required this.id,
    required this.name,
    this.phone,
    this.email,
    this.balance = 0,
  });

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
    id:      json['_id'] ?? json['id'] ?? '',
    name:    json['name'] ?? '',
    phone:   json['phone'],
    email:   json['email'],
    balance: (json['balance'] ?? 0).toDouble(),
  );
}

// ───────────────────────────────────────────────────────
// User / Staff
// ───────────────────────────────────────────────────────
class AppUser {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? token;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.token,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id:    json['_id'] ?? json['id'] ?? '',
    name:  json['name'] ?? '',
    email: json['email'] ?? '',
    role:  json['role'] ?? 'cashier',
    token: json['token'],
  );

  bool get isAdmin   => role == 'admin';
  bool get isManager => role == 'admin' || role == 'manager';
  bool get isCashier => role == 'admin' || role == 'manager' || role == 'cashier';
  bool get isWaiter  => role == 'admin' || role == 'manager' || role == 'waiter';
}

// ───────────────────────────────────────────────────────
// Order
// ───────────────────────────────────────────────────────
class Order {
  final String id;
  final String orderNumber;
  final String orderType;
  final String status;
  final String paymentMethod;
  final String paymentStatus;
  final double subtotal;
  final double tax;
  final double discount;
  final double finalTotal;
  final String? customerName;
  final String? tableNumber;
  final String? cashierName;
  final String? servedByName;
  final String? remarks;
  final List<OrderItem> items;
  final DateTime createdAt;

  Order({
    required this.id,
    required this.orderNumber,
    required this.orderType,
    required this.status,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.subtotal,
    required this.tax,
    required this.discount,
    required this.finalTotal,
    this.customerName,
    this.tableNumber,
    this.cashierName,
    this.servedByName,
    this.remarks,
    required this.items,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
    id:           json['_id'] ?? json['id'] ?? '',
    orderNumber:  json['orderNumber'] ?? '#0000',
    orderType:    json['orderType'] ?? 'dine-in',
    status:       json['status'] ?? 'pending',
    paymentMethod:json['paymentMethod'] ?? 'cash',
    paymentStatus:json['paymentStatus'] ?? 'pending',
    subtotal:     (json['subtotal'] ?? 0).toDouble(),
    tax:          (json['tax'] ?? 0).toDouble(),
    discount:     (json['discount'] ?? 0).toDouble(),
    finalTotal:   (json['finalTotal'] ?? 0).toDouble(),
    customerName: json['customerName'] ?? json['customer']?['name'],
    tableNumber:  json['tableNumber'] ?? json['tableId']?['number']?.toString(),
    cashierName:  json['cashier']?['name'],
    servedByName: json['servedBy']?['name'],
    remarks:      json['specialInstructions'] ?? json['kitchenNotes'],
    items:        (json['items'] as List<dynamic>? ?? [])
        .map((i) => OrderItem.fromJson(i))
        .toList(),
    createdAt:    DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
  );
}

class OrderItem {
  final String? productId;
  final String name;
  final int quantity;
  final double price;
  final double total;

  OrderItem({
    this.productId,
    required this.name,
    required this.quantity,
    required this.price,
    required this.total,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
    productId: json['product']?['_id'] ?? json['product'],
    name:      json['product_name'] ?? json['productName'] ?? json['name'] ?? 'Item',
    quantity:  json['quantity'] ?? 1,
    price:     (json['price'] ?? 0).toDouble(),
    total:     (json['total'] ?? 0).toDouble(),
  );
}

// ───────────────────────────────────────────────────────
// App Settings
// ───────────────────────────────────────────────────────
class AppSettings {
  final String restaurantName;
  final String? tagline;
  final String? logoUrl;
  final String currency;
  final String currencySymbol;
  final double vatRate;
  final bool vatEnabled;
  final String? address;
  final String? phone;
  final String? footer;

  AppSettings({
    required this.restaurantName,
    this.tagline,
    this.logoUrl,
    required this.currency,
    required this.currencySymbol,
    required this.vatRate,
    required this.vatEnabled,
    this.address,
    this.phone,
    this.footer,
  });

  factory AppSettings.fromJson(Map<String, dynamic> json) => AppSettings(
    restaurantName: json['restaurantName'] ?? 'HUDI-SOFT POS',
    tagline:        json['tagline'],
    logoUrl:        json['logoUrl'],
    currency:       json['currency'] ?? 'USD',
    currencySymbol: json['currencySymbol'] ?? '\$',
    vatRate:        (json['vatRate'] ?? 10).toDouble(),
    vatEnabled:     json['vatEnabled'] ?? true,
    address:        json['address'],
    phone:          json['phone'],
    footer:         json['receiptFooter'] ?? json['footer'],
  );

  static AppSettings get defaults => AppSettings(
    restaurantName: 'HUDI-SOFT POS',
    tagline:        'POS Online',
    currency:       'USD',
    currencySymbol: '\$',
    vatRate:        10,
    vatEnabled:     true,
  );
}

// ───────────────────────────────────────────────────────
// Finance Transaction (income / expense)
// ───────────────────────────────────────────────────────
class FinanceTransaction {
  final String id;
  final String type;   // 'income' | 'expense'
  final String source; // 'order' | 'purchase' | 'expense' | 'manual'
  final double amount;
  final DateTime date;
  final String description;
  final String paymentMethod;
  final String reference;

  FinanceTransaction({
    required this.id,
    required this.type,
    required this.source,
    required this.amount,
    required this.date,
    required this.description,
    required this.paymentMethod,
    required this.reference,
  });

  factory FinanceTransaction.fromJson(Map<String, dynamic> json) =>
      FinanceTransaction(
        id:            json['_id'] ?? json['id'] ?? '',
        type:          json['type'] ?? 'income',
        source:        json['source'] ?? 'manual',
        amount:        (json['amount'] ?? 0).toDouble(),
        date:          DateTime.tryParse(json['date'] ?? '') ?? DateTime.now(),
        description:   json['description'] ?? '',
        paymentMethod: json['paymentMethod'] ?? 'cash',
        reference:     json['reference'] ?? '',
      );
}

// ───────────────────────────────────────────────────────
// Employee
// ───────────────────────────────────────────────────────
class Employee {
  final String id;
  final String name;
  final String? email;
  final String role;
  final double salary;
  final String? phone;
  final String? status;

  Employee({
    required this.id,
    required this.name,
    this.email,
    required this.role,
    this.salary = 0,
    this.phone,
    this.status,
  });

  factory Employee.fromJson(Map<String, dynamic> json) => Employee(
        id:     json['_id'] ?? json['id'] ?? '',
        name:   json['name'] ?? '',
        email:  json['email'],
        role:   json['role'] ?? 'cashier',
        salary: (json['salary'] ?? 0).toDouble(),
        phone:  json['phone'],
        status: json['status'],
      );
}

// ───────────────────────────────────────────────────────
// Attendance Log
// ───────────────────────────────────────────────────────
class AttendanceLog {
  final String id;
  final String? employeeName;
  final String? shiftName;
  final String? checkIn;
  final String? checkOut;
  final String? status;

  AttendanceLog({
    required this.id,
    this.employeeName,
    this.shiftName,
    this.checkIn,
    this.checkOut,
    this.status,
  });

  factory AttendanceLog.fromJson(Map<String, dynamic> json) {
    final emp   = json['employee'];
    final shift = json['shift'];
    return AttendanceLog(
      id:           json['_id'] ?? json['id'] ?? '',
      employeeName: emp is Map ? emp['name'] : (json['employeeName'] ?? ''),
      shiftName:    shift is Map ? shift['name'] : (json['shiftName'] ?? ''),
      checkIn:      json['checkIn'],
      checkOut:     json['checkOut'],
      status:       json['status'],
    );
  }
}

// ───────────────────────────────────────────────────────
// Waiter Request
// ───────────────────────────────────────────────────────
class WaiterRequest {
  final String id;
  final String? tableNumber;
  final String status; // 'pending' | 'resolved'
  final DateTime createdAt;

  WaiterRequest({
    required this.id,
    this.tableNumber,
    required this.status,
    required this.createdAt,
  });

  factory WaiterRequest.fromJson(Map<String, dynamic> json) {
    final tableId  = json['tableId'];
    final tableNum = tableId is Map
        ? (tableId['number'] ?? tableId['tableNumber'])?.toString()
        : json['tableNumber']?.toString();
    return WaiterRequest(
      id:          json['_id'] ?? json['id'] ?? '',
      tableNumber: tableNum,
      status:      json['status'] ?? 'pending',
      createdAt:   DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}

// ───────────────────────────────────────────────────────
// Purchase Invoice
// ───────────────────────────────────────────────────────
class PurchaseInvoice {
  final String id;
  final String? supplierName;
  final String? invoiceNumber;
  final double totalAmount;
  final String status;
  final DateTime createdAt;

  PurchaseInvoice({
    required this.id,
    this.supplierName,
    this.invoiceNumber,
    required this.totalAmount,
    this.status = 'pending',
    required this.createdAt,
  });

  factory PurchaseInvoice.fromJson(Map<String, dynamic> json) {
    final sup     = json['supplier'];
    final supName = sup is Map ? sup['name'] : json['supplierName'];
    return PurchaseInvoice(
      id:            json['_id'] ?? json['id'] ?? '',
      supplierName:  supName?.toString(),
      invoiceNumber: json['purchaseNumber'] ?? json['invoiceNumber'],
      totalAmount:   (json['grandTotal'] ?? json['totalAmount'] ?? 0).toDouble(),
      status:        json['status'] ?? 'pending',
      createdAt:     DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}

// ───────────────────────────────────────────────────────
// Supplier
// ───────────────────────────────────────────────────────
class Supplier {
  final String id;
  final String name;
  final String? phone;
  final String? email;

  Supplier({
    required this.id,
    required this.name,
    this.phone,
    this.email,
  });

  factory Supplier.fromJson(Map<String, dynamic> json) => Supplier(
        id:    json['_id'] ?? json['id'] ?? '',
        name:  json['name'] ?? '',
        phone: json['phone'],
        email: json['email'],
      );
}
