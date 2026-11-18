import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { productRepo, Product, Category } from '@/db/repositories/productRepo';
import { customerRepo, Customer } from '@/db/repositories/customerRepo';
import { orderRepo } from '@/db/repositories/orderRepo';
import { useCartStore, CartItem } from '@/store/cartStore';
import { usePrinterStore } from '@/store/printerStore';
import { useAuthStore } from '@/store/authStore';
import { BluetoothManager } from '@/printing/BluetoothManager';
import { COLORS } from '@/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export default function POSScreen() {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [products, setProducts] = useState<Product[]>([]);
  
  // Order Configuration (matches web POS)
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate] = useState(4); // default 4%, matches settings
  const [discount, setDiscount] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);

  // Modals & Scanners
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  // Customer List
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Checkout inputs
  const [cashAmount, setCashAmount] = useState('');

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  const {
    items,
    customer,
    paymentMethod,
    orderDiscount,
    addToCart,
    removeFromCart,
    updateQty,
    setOrderDiscount,
    setCustomer,
    setPaymentMethod,
    clearCart,
    getSubtotal,
    getTax,
    getTotal,
  } = useCartStore();

  const { user } = useAuthStore();
  const { isConnected } = usePrinterStore();

  // Load catalog data
  const loadCatalog = () => {
    try {
      const cats = productRepo.getCategories();
      setCategories([{ id: 'all', name: 'All' }, ...cats]);

      const prods = productRepo.getProducts(search, selectedCategory);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [search, selectedCategory]);

  useEffect(() => {
    if (isCustomerModalOpen) {
      setCustomers(customerRepo.getCustomers(customerSearch));
    }
  }, [customerSearch, isCustomerModalOpen]);

  // Barcode scanned callback
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setIsScannerOpen(false);
    if (!data) return;

    const matched = productRepo.getProducts().find(p => p.barcode === data);
    if (matched) {
      addToCart(matched);
      Alert.alert('Scanned', `Added ${matched.name} to cart.`);
    } else {
      Alert.alert('Not Found', `Product with barcode "${data}" was not found.`);
    }
  };

  // Trigger camera scanner
  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to scan barcodes.');
        return;
      }
    }
    setIsScannerOpen(true);
  };

  // Compute totals with VAT + tip + discount (matches web pos calculateTotals)
  const computeTotals = () => {
    const subtotal = getSubtotal();
    const vatAmount = vatEnabled ? subtotal * (vatRate / 100) : 0;
    const discountAmt = discount;
    const tip = tipAmount;
    const total = subtotal + vatAmount - discountAmt + tip;
    return { subtotal, vatAmount, discountAmt, tip, total };
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to checkout.');
      return;
    }
    if (paymentMethod === 'credit' && !customer) {
      Alert.alert('Customer Required', 'Please select a customer for credit payments.');
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const submitOrder = async () => {
    const { subtotal, vatAmount, discountAmt, tip, total } = computeTotals();

    // If cash method, validate cash paid is sufficient
    if (paymentMethod === 'cash') {
      const cashVal = parseFloat(cashAmount) || 0;
      if (cashVal < total) {
        Alert.alert('Insufficient Cash', `Cash received must cover order total of $${total.toFixed(2)}`);
        return;
      }
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newOrder = {
      id: orderId,
      items: items.map(i => ({
        productId: i.product.id,
        name: i.product.name,
        qty: i.qty,
        price: i.product.price,
        discount: i.discount,
      })),
      orderType,
      tableId: selectedTable?.id || undefined,
      tableNumber: selectedTable?.number || undefined,
      subtotal,
      taxAmount: vatAmount,
      tax: vatAmount,
      discount: discountAmt,
      tip,
      total,
      status: 'pending',
      payment_method: paymentMethod,
      customer_id: customer?.id || undefined,
      cashier_id: user?._id || undefined,
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Create order in local DB
      orderRepo.createOrderOffline(newOrder);

      // 2. Open Success/Receipt dialog
      setCurrentOrder(newOrder);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);

      // 3. Auto-print if default printer is configured
      if (isConnected) {
        await BluetoothManager.printReceipt(newOrder.items, newOrder);
      }
    } catch (err: any) {
      Alert.alert('Order Failed', err.message || 'An error occurred during checkout.');
    }
  };

  const handlePrint = async () => {
    if (!currentOrder) return;
    const printed = await BluetoothManager.printReceipt(currentOrder.items, currentOrder);
    if (printed) {
      Alert.alert('Success', 'Receipt sent to printer.');
    } else {
      Alert.alert('Printer Offline', 'Check your printer connection in Settings.');
    }
  };

  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
    clearCart();
    setCashAmount('');
    setCurrentOrder(null);
    setDiscount(0);
    setTipAmount(0);
    setSelectedTable(null);
    loadCatalog(); // Refresh stocks
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by name or SKU..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.scannerButton} onPress={openScanner}>
          <Ionicons name="barcode-outline" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* ─── Order Type Tabs (matches web POS) ─── */}
      <View style={styles.orderTypeTabs}>
        {([
          { key: 'dine-in',  label: '🍽 Dine-in',  icon: 'restaurant-outline' },
          { key: 'takeaway', label: '🛍 Takeaway', icon: 'bag-handle-outline' },
          { key: 'delivery', label: '🚴 Delivery', icon: 'bicycle-outline' },
        ] as const).map((ot) => (
          <TouchableOpacity
            key={ot.key}
            style={[styles.orderTypeTab, orderType === ot.key && styles.orderTypeTabActive]}
            onPress={() => { setOrderType(ot.key); if (ot.key !== 'dine-in') setSelectedTable(null); }}
          >
            <Text style={[styles.orderTypeTabText, orderType === ot.key && styles.orderTypeTabTextActive]}>
              {ot.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Categories Chips */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                selectedCategory === cat.name && styles.activeChip,
              ]}
              onPress={() => setSelectedCategory(cat.name)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategory === cat.name && styles.activeChipText,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Catalog Grid */}
      <View style={styles.catalogContainer}>
        <FlashList
          data={products}
          keyExtractor={(item) => item.id}
          estimatedItemSize={90}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => addToCart(item)}
              activeOpacity={0.7}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
              </View>
              <View style={styles.stockBadge}>
                <Text style={[styles.stockText, item.stock <= 5 && { color: COLORS.danger }]}>
                  Stock: {item.stock}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Bottom Actions Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cartToggleButton} onPress={() => setIsCartOpen(true)}>
          <View style={styles.cartIconWrapper}>
            <Ionicons name="cart" size={24} color={COLORS.white} />
            {items.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{items.reduce((sum, i) => sum + i.qty, 0)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.cartToggleText}>View Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.checkoutBtn, items.length === 0 && styles.disabledBtn]}
          onPress={handleCheckout}
          disabled={items.length === 0}
        >
          <Text style={styles.checkoutBtnText}>Checkout (${getTotal().toFixed(2)})</Text>
          <Ionicons name="arrow-forward-outline" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Cart Modal */}
      <Modal visible={isCartOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cartDrawer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shopping Cart</Text>
              <TouchableOpacity onPress={() => setIsCartOpen(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={64} color={COLORS.textMuted} />
                <Text style={styles.emptyCartText}>Your cart is empty.</Text>
              </View>
            ) : (
              <ScrollView style={styles.cartItemsList}>
                {items.map((item) => (
                  <View key={item.product.id} style={styles.cartRow}>
                    <View style={styles.cartItemDetails}>
                      <Text style={styles.cartItemName}>{item.product.name}</Text>
                      <Text style={styles.cartItemPrice}>${item.product.price.toFixed(2)} each</Text>
                    </View>

                    <View style={styles.qtyControl}>
                      <TouchableOpacity onPress={() => updateQty(item.product.id, item.qty - 1)}>
                        <Ionicons name="remove-circle-outline" size={24} color={COLORS.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.qty}</Text>
                      <TouchableOpacity onPress={() => updateQty(item.product.id, item.qty + 1)}>
                        <Ionicons name="add-circle-outline" size={24} color={COLORS.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.cartSummary}>
              {/* Order Type badge in cart */}
              <View style={styles.cartOrderTypeBadge}>
                <Text style={styles.cartOrderTypeLabel}>
                  {orderType === 'dine-in' ? '🍽 Dine-in' : orderType === 'takeaway' ? '🛍 Takeaway' : '🚴 Delivery'}
                </Text>
                {selectedTable && (
                  <Text style={styles.cartTableLabel}>• Table {selectedTable.name || selectedTable.number}</Text>
                )}
              </View>

              {/* Table Selector (only for dine-in) */}
              {orderType === 'dine-in' && (
                <TouchableOpacity
                  style={styles.selectorRow}
                  onPress={() => setIsTableModalOpen(true)}
                >
                  <Ionicons name="grid-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.selectorText}>
                    {selectedTable ? `Table: ${selectedTable.name || selectedTable.number || '?'}` : 'Select Table (Optional)'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}

              {/* Customer Row */}
              <TouchableOpacity
                style={styles.customerRow}
                onPress={() => setIsCustomerModalOpen(true)}
              >
                <Ionicons name="person-outline" size={16} color={COLORS.accent} />
                <Text style={styles.customerText}>
                  {customer ? `Customer: ${customer.name}` : 'Select Customer (Optional)'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Subtotal */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${getSubtotal().toFixed(2)}</Text>
              </View>

              {/* VAT Toggle */}
              <View style={styles.summaryRow}>
                <TouchableOpacity
                  style={styles.vatToggleRow}
                  onPress={() => setVatEnabled(!vatEnabled)}
                >
                  <View style={[styles.toggleDot, vatEnabled && styles.toggleDotActive]} />
                  <Text style={[styles.summaryLabel, vatEnabled && { color: COLORS.primary }]}>
                    VAT ({vatRate}%)
                  </Text>
                </TouchableOpacity>
                <Text style={styles.summaryValue}>
                  ${vatEnabled ? (getSubtotal() * vatRate / 100).toFixed(2) : '0.00'}
                </Text>
              </View>

              {/* Discount */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>🏷️ Discount ($)</Text>
                <TextInput
                  style={styles.summaryDiscountInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={discount > 0 ? String(discount) : ''}
                  onChangeText={(val) => setDiscount(parseFloat(val) || 0)}
                />
              </View>

              {/* Tip */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>💰 Tip ($)</Text>
                <TextInput
                  style={styles.summaryDiscountInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={tipAmount > 0 ? String(tipAmount) : ''}
                  onChangeText={(val) => setTipAmount(parseFloat(val) || 0)}
                />
              </View>

              {/* Grand Total */}
              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${computeTotals().total.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtnLarge, items.length === 0 && styles.disabledBtn]}
                onPress={handleCheckout}
                disabled={items.length === 0}
              >
                <Text style={styles.checkoutBtnLargeText}>Process Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Checkout Payment Modal */}
      <Modal visible={isCheckoutOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.checkoutCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity onPress={() => setIsCheckoutOpen(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Payment Methods — matches web POS: Cash, Card, Mobile Money, Credit */}
            <View style={styles.paymentMethods}>
              {([
                { key: 'cash',         icon: 'cash-outline',            label: 'Cash' },
                { key: 'card',         icon: 'card-outline',            label: 'Card' },
                { key: 'mobile_money', icon: 'phone-portrait-outline',  label: 'Mobile' },
                { key: 'credit',       icon: 'person-circle-outline',   label: 'Credit' },
              ] as const).map((method) => (
                <TouchableOpacity
                  key={method.key}
                  style={[
                    styles.paymentMethodCard,
                    paymentMethod === method.key && styles.activePaymentMethodCard,
                  ]}
                  onPress={() => setPaymentMethod(method.key)}
                >
                  <Ionicons
                    name={method.icon}
                    size={24}
                    color={paymentMethod === method.key ? COLORS.white : COLORS.textMuted}
                  />
                  <Text style={[
                    styles.paymentMethodLabel,
                    paymentMethod === method.key && styles.activePaymentMethodLabel,
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Credit customer warning */}
            {paymentMethod === 'credit' && !customer && (
              <View style={styles.creditWarning}>
                <Ionicons name="warning-outline" size={16} color="#d97706" />
                <Text style={styles.creditWarningText}>Select a customer for credit payment</Text>
              </View>
            )}

            {paymentMethod === 'cash' && (
              <View style={styles.cashReceivedContainer}>
                <Text style={styles.cashReceivedLabel}>Cash Received Amount</Text>
                <TextInput
                  style={styles.cashInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={cashAmount}
                  onChangeText={setCashAmount}
                  autoFocus
                />
                {parseFloat(cashAmount) >= computeTotals().total && (
                  <Text style={styles.changeLabel}>
                    Change: ${(parseFloat(cashAmount) - computeTotals().total).toFixed(2)}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.checkoutDetailsCard}>
              <Text style={styles.checkoutDetailsTitle}>Order Review</Text>
              <Text style={styles.checkoutDetailsText}>Order Type: {orderType}</Text>
              {selectedTable && <Text style={styles.checkoutDetailsText}>Table: {selectedTable.name || selectedTable.number}</Text>}
              {customer && <Text style={styles.checkoutDetailsText}>Customer: {customer.name}</Text>}
              <Text style={styles.checkoutDetailsText}>Items: {items.length} • Subtotal: ${getSubtotal().toFixed(2)}</Text>
              <Text style={styles.checkoutDetailsTotal}>Total Due: ${computeTotals().total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.confirmCheckoutBtn} onPress={submitOrder}>
              <Text style={styles.confirmCheckoutBtnText}>Complete Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Barcode Camera Scanner Modal */}
      <Modal visible={isScannerOpen} animationType="slide">
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'upc_a', 'code128'],
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerGuideText}>Center the barcode within the frame</Text>
            <View style={styles.scannerFrame} />
            <TouchableOpacity style={styles.closeScannerButton} onPress={() => setIsScannerOpen(false)}>
              <Text style={styles.closeScannerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal visible={isCustomerModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.customerDrawer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setIsCustomerModalOpen(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.customerSearchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor={COLORS.textMuted}
              value={customerSearch}
              onChangeText={setCustomerSearch}
            />

            <ScrollView style={styles.customerScroll}>
              <TouchableOpacity
                style={styles.customerItem}
                onPress={() => {
                  setCustomer(null);
                  setIsCustomerModalOpen(false);
                }}
              >
                <Text style={styles.customerNameText}>Anonymous Walk-In</Text>
              </TouchableOpacity>

              {customers.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.customerItem}
                  onPress={() => {
                    setCustomer(c);
                    setIsCustomerModalOpen(false);
                  }}
                >
                  <Text style={styles.customerNameText}>{c.name}</Text>
                  {c.phone ? <Text style={styles.customerPhoneText}>{c.phone}</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success & Receipt Dialog */}
      <Modal visible={isReceiptOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCard}>
            <View style={styles.successIconWrapper}>
              <Ionicons name="checkmark-circle" size={60} color={COLORS.success} />
            </View>
            <Text style={styles.receiptTitle}>Payment Successful!</Text>
            <Text style={styles.receiptMessage}>Order has been created successfully.</Text>

            <View style={styles.receiptActionContainer}>
              <TouchableOpacity style={styles.receiptPrintButton} onPress={handlePrint}>
                <Ionicons name="print-outline" size={20} color={COLORS.white} />
                <Text style={styles.receiptActionText}>Print Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.receiptCloseButton} onPress={handleCloseReceipt}>
                <Text style={styles.receiptCloseText}>New Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
  },
  searchBar: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    marginLeft: 8,
    fontSize: 14,
  },
  scannerButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  categoryContainer: {
    backgroundColor: COLORS.surface,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  activeChipText: {
    color: COLORS.white,
  },
  catalogContainer: {
    flex: 1,
    padding: 8,
  },
  productCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  productPrice: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  stockBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  stockText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  cartToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cartIconWrapper: {
    position: 'relative',
  },
  badgeCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.danger,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  cartToggleText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  checkoutBtn: {
    flex: 1,
    marginLeft: 16,
    height: 48,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: COLORS.cardBorder,
    opacity: 0.5,
  },
  checkoutBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  cartDrawer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyCart: {
    padding: 60,
    alignItems: 'center',
  },
  emptyCartText: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: 12,
  },
  cartItemsList: {
    padding: 16,
    maxHeight: 250,
  },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  cartItemPrice: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginHorizontal: 12,
  },
  cartSummary: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  customerText: {
    flex: 1,
    color: COLORS.text,
    marginLeft: 8,
    fontSize: 13,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  summaryDiscountInput: {
    width: 80,
    height: 30,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    textAlign: 'right',
    paddingHorizontal: 8,
    fontSize: 13,
  },
  grandTotalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  checkoutBtnLarge: {
    height: 52,
    backgroundColor: COLORS.success,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutBtnLargeText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkoutCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  paymentMethodCard: {
    width: '30%',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  activePaymentMethodCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentMethodLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
  },
  activePaymentMethodLabel: {
    color: COLORS.white,
  },
  cashReceivedContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cashReceivedLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  cashInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    borderBottomWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: 4,
  },
  changeLabel: {
    color: COLORS.success,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 12,
  },
  checkoutDetailsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  checkoutDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  checkoutDetailsText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  checkoutDetailsTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 8,
  },
  confirmCheckoutBtn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCheckoutBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  scannerGuideText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  closeScannerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 24,
  },
  closeScannerText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  customerDrawer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  customerSearchInput: {
    margin: 16,
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    color: COLORS.text,
    paddingHorizontal: 16,
  },
  customerScroll: {
    paddingHorizontal: 16,
  },
  customerItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  customerNameText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  customerPhoneText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  receiptCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    margin: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  successIconWrapper: {
    marginBottom: 16,
  },
  receiptTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  receiptMessage: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  receiptActionContainer: {
    width: '100%',
  },
  receiptPrintButton: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptActionText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  receiptCloseButton: {
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptCloseText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  // ── Order Type Tabs ──────────────────────────────────────
  orderTypeTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  orderTypeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  orderTypeTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  orderTypeTabText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  orderTypeTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  // ── Cart Order Type Badge ─────────────────────────────────
  cartOrderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${COLORS.primary}18`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  cartOrderTypeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cartTableLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // ── Selector Row (Table Picker) ───────────────────────────
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  selectorText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  // ── VAT Toggle ───────────────────────────────────────────
  vatToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  toggleDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  // ── Credit Warning ───────────────────────────────────────
  creditWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  creditWarningText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
    flex: 1,
  },
});
