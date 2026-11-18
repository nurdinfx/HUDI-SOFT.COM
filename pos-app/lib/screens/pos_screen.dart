import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/pos_provider.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import '../widgets/app_sidebar.dart';
import '../widgets/app_header.dart';
import '../config/api_config.dart';

// ─────────────────────────────────────────────────────────────
// POS Screen — exact clone of pos.jsx + pos.css
// Split layout: Products (left) + Cart (right)
// ─────────────────────────────────────────────────────────────

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey();
  bool _cartVisible = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PosProvider>().loadPosData();
    });
  }

  @override
  Widget build(BuildContext context) {
    final pos  = context.watch<PosProvider>();
    final auth = context.watch<AuthProvider>();
    final w    = MediaQuery.of(context).size.width;
    final isMobile = w < 768;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: Drawer(
        child: AppSidebar(
          currentRoute: '/pos',
          onClose: () => _scaffoldKey.currentState?.closeDrawer(),
        ),
      ),
      body: Column(
        children: [
          // ── Header ────────────────────────────────────────
          AppHeader(
            pageTitle: 'Point of Sale',
            isPos: true,
            onMenuTap: () => _scaffoldKey.currentState?.openDrawer(),
            onLogout: () async {
              await auth.logout();
              if (mounted) Navigator.pushReplacementNamed(context, '/login');
            },
            centerContent: _PosHeaderTotals(pos: pos),
          ),

          // ── Search bar ────────────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: TextField(
              onChanged: pos.setSearchQuery,
              decoration: InputDecoration(
                hintText: 'Search by Name or Barcode',
                hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8), size: 20),
                filled: true,
                fillColor: AppColors.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.primary, width: 2),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
            ),
          ),

          // ── Categories bar ────────────────────────────────
          Container(
            height: 44,
            color: Colors.white,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              itemCount: pos.categories.length,
              itemBuilder: (_, i) {
                final cat = pos.categories[i];
                final active = pos.selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: () => pos.setCategory(cat),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      decoration: BoxDecoration(
                        color: active ? AppColors.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: active ? AppColors.primary : AppColors.border,
                        ),
                      ),
                      child: Text(cat,
                          style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w600,
                            color: active ? Colors.white : AppColors.textSecondary,
                          )),
                    ),
                  ),
                );
              },
            ),
          ),

          // ── View Mode Toggle ──────────────────────────────
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                _ViewModeBtn(
                  label: 'Thumbnail View',
                  icon: Icons.grid_view,
                  active: pos.viewMode == 'thumbnail',
                  onTap: () => pos.setViewMode('thumbnail'),
                ),
                const SizedBox(width: 8),
                _ViewModeBtn(
                  label: 'List View',
                  icon: Icons.list,
                  active: pos.viewMode == 'list',
                  onTap: () => pos.setViewMode('list'),
                ),
                const Spacer(),
                // Cart toggle (mobile)
                if (isMobile)
                  GestureDetector(
                    onTap: () => setState(() => _cartVisible = !_cartVisible),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                      ),
                      child: Row(children: [
                        Icon(Icons.shopping_cart, size: 14, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text(pos.cartCount.toString(),
                            style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w700)),
                      ]),
                    ),
                  ),
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // ── Main Split Layout ─────────────────────────────
          Expanded(
            child: isMobile
                ? _cartVisible
                    ? _CartPanel()
                    : _ProductsPanel()
                : Row(
                    children: [
                      // Products
                      Expanded(child: _ProductsPanel()),
                      // Divider
                      Container(width: 1, color: AppColors.border),
                      // Cart (fixed width like PWA)
                      SizedBox(width: 420, child: _CartPanel()),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

// ── POS Header Totals (center of header bar) ─────────────────
class _PosHeaderTotals extends StatelessWidget {
  final PosProvider pos;
  const _PosHeaderTotals({required this.pos});

  @override
  Widget build(BuildContext context) {
    final sym = pos.settings?.currencySymbol ?? '\$';
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _TotalChip(label: 'Vat', value: pos.vatEnabled ? '${pos.vatRate.toInt()}%' : '0%'),
        const SizedBox(width: 8),
        _TotalChip(label: 'Total (Local)', value: pos.cartCount.toString()),
        const SizedBox(width: 8),
        _TotalChip(label: 'Sub-Total (USD)', value: '$sym${pos.subtotal.toStringAsFixed(2)}'),
        const SizedBox(width: 8),
        _TotalChip(label: 'Total (USD)', value: '$sym${pos.total.toStringAsFixed(2)}'),
        const SizedBox(width: 8),
        _HideCartButton(),
        const SizedBox(width: 8),
        _OrdersButton(),
        const SizedBox(width: 8),
        _BTPairButton(),
      ],
    );
  }
}

class _TotalChip extends StatelessWidget {
  final String label, value;
  const _TotalChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(label,
            style: const TextStyle(fontSize: 8, color: Color(0xAABFDBFE), fontWeight: FontWeight.w600)),
        Text(value,
            style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700)),
      ],
    );
  }
}

class _HideCartButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Text('Hide Cart',
          style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w600)),
    );
  }
}

class _OrdersButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/orders'),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Text('Orders',
            style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _BTPairButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/settings'),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(6),
        ),
        child: const Text('BT Pair',
            style: TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w700)),
      ),
    );
  }
}

class _ViewModeBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool active;
  final VoidCallback onTap;

  const _ViewModeBtn({required this.label, required this.icon, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: active ? AppColors.primary : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Row(children: [
          Icon(icon, size: 14, color: active ? AppColors.primary : AppColors.textMuted),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w500,
                color: active ? AppColors.primary : AppColors.textMuted,
              )),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Products Panel
// ─────────────────────────────────────────────────────────────
class _ProductsPanel extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final pos = context.watch<PosProvider>();
    final products = pos.filteredProducts;

    if (pos.isLoading && products.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (products.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inventory_2_outlined, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 8),
            Text('No products found',
                style: TextStyle(color: AppColors.textMuted, fontSize: 14)),
          ],
        ),
      );
    }

    if (pos.viewMode == 'list') {
      return ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: products.length,
        itemBuilder: (_, i) => _ProductListTile(product: products[i]),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 160,
        childAspectRatio: 0.78,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: products.length,
      itemBuilder: (_, i) => _ProductCard(product: products[i]),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    final pos = context.read<PosProvider>();
    final sym = pos.settings?.currencySymbol ?? '\$';

    return GestureDetector(
      onTap: () => pos.addToCart(product),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 4),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Product image
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
                child: product.image != null
                    ? Image.network(
                        product.image!.startsWith('http')
                            ? product.image!
                            : '${ApiConfig.backendUrl}${product.image}',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _PlaceholderImage(),
                      )
                    : _PlaceholderImage(),
              ),
            ),
            // Name + price
            Padding(
              padding: const EdgeInsets.all(6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name,
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w600,
                          color: AppColors.textDark)),
                  const SizedBox(height: 2),
                  Text('$sym${product.price.toStringAsFixed(2)}',
                      style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w700,
                          color: AppColors.primary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductListTile extends StatelessWidget {
  final Product product;
  const _ProductListTile({required this.product});

  @override
  Widget build(BuildContext context) {
    final pos = context.read<PosProvider>();
    final sym = pos.settings?.currencySymbol ?? '\$';

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        onTap: () => pos.addToCart(product),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: product.image != null
              ? Image.network(
                  product.image!.startsWith('http')
                      ? product.image!
                      : '${ApiConfig.backendUrl}${product.image}',
                  width: 48, height: 48, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _PlaceholderImage(size: 48),
                )
              : _PlaceholderImage(size: 48),
        ),
        title: Text(product.name,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        subtitle: Text(product.category,
            style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
        trailing: Text('$sym${product.price.toStringAsFixed(2)}',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                color: AppColors.primary)),
      ),
    );
  }
}

class _PlaceholderImage extends StatelessWidget {
  final double? size;
  const _PlaceholderImage({this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size, height: size,
      color: const Color(0xFFF1F5F9),
      child: const Icon(Icons.image_outlined, color: Color(0xFFCBD5E1)),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Cart Panel — right-side order panel
// ─────────────────────────────────────────────────────────────
class _CartPanel extends StatefulWidget {
  @override
  State<_CartPanel> createState() => _CartPanelState();
}

class _CartPanelState extends State<_CartPanel>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.cartBg,
      child: Column(
        children: [
          // ── Tab bar: Cart Products / Stock ─────────────────
          Container(
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              tabs: const [
                Tab(text: 'Cart Products'),
                Tab(text: 'Stock'),
              ],
            ),
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _CartProductsTab(),
                _StockTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Cart Products Tab ─────────────────────────────────────────
class _CartProductsTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final pos = context.watch<PosProvider>();
    final sym = pos.settings?.currencySymbol ?? '\$';

    return Column(
      children: [
        // Table headers
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(
            children: const [
              Expanded(flex: 4, child: Text('PRODUCT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              SizedBox(width: 8),
              Expanded(flex: 2, child: Text('PRICE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted))),
              Expanded(flex: 2, child: Text('QTY', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.center)),
              Expanded(flex: 2, child: Text('SUBTOTAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted), textAlign: TextAlign.right)),
            ],
          ),
        ),
        const Divider(height: 1, color: AppColors.border),

        // Cart items
        Expanded(
          child: pos.cart.isEmpty
              ? Center(
                  child: Text('Cart is empty',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                )
              : ListView.builder(
                  itemCount: pos.cart.length,
                  itemBuilder: (_, i) {
                    final item = pos.cart[i];
                    return _CartItemRow(item: item, symbol: sym);
                  },
                ),
        ),

        const Divider(height: 1, color: AppColors.border),

        // ── Order Details fields ─────────────────────────────
        _OrderDetailsForm(),

        // ── Totals + Actions ─────────────────────────────────
        _CartTotals(),
      ],
    );
  }
}

class _CartItemRow extends StatelessWidget {
  final CartItem item;
  final String symbol;

  const _CartItemRow({required this.item, required this.symbol});

  @override
  Widget build(BuildContext context) {
    final pos = context.read<PosProvider>();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.border, width: 0.5)),
      ),
      child: Row(
        children: [
          // Name
          Expanded(flex: 4,
            child: Text(item.name,
                maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500))),
          const SizedBox(width: 8),
          // Price
          Expanded(flex: 2,
            child: Text('$symbol${item.price.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary))),
          // Qty controls
          Expanded(flex: 2,
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              _QtyBtn(icon: Icons.remove, onTap: () => pos.decrementItem(item.id)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Text(item.quantity.toString(),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              ),
              _QtyBtn(icon: Icons.add, onTap: () => pos.incrementItem(item.id)),
            ])),
          // Total
          Expanded(flex: 2,
            child: Text('$symbol${item.total.toStringAsFixed(2)}',
                textAlign: TextAlign.right,
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w700,
                    color: AppColors.primary))),
        ],
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _QtyBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 22, height: 22,
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: AppColors.border),
        ),
        child: Icon(icon, size: 12, color: AppColors.textSecondary),
      ),
    );
  }
}

// ── Order Details Form (dropdowns under cart items) ───────────
class _OrderDetailsForm extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final pos = context.watch<PosProvider>();

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(10),
      child: Column(
        children: [
          // Row 1: Booked Room + Select Table
          Row(children: [
            Expanded(child: _DropdownField<String>(
              value: pos.bookedRoom,
              hint: 'Booked Room',
              items: const [],
              onChanged: (v) => pos.setBookedRoom(v),
            )),
            const SizedBox(width: 8),
            Expanded(child: _DropdownField<PosTable>(
              value: pos.selectedTable,
              hint: 'Select Table: None',
              items: pos.tables
                  .map((t) => DropdownMenuItem(value: t, child: Text('Table ${t.number}')))
                  .toList(),
              onChanged: (v) => pos.setSelectedTable(v),
            )),
          ]),
          const SizedBox(height: 6),
          // Row 2: Date + Served By
          Row(children: [
            Expanded(child: GestureDetector(
              onTap: () async {
                final d = await showDatePicker(
                  context: context,
                  initialDate: pos.orderDate,
                  firstDate: DateTime(2020),
                  lastDate: DateTime(2030),
                );
                if (d != null) pos.setOrderDate(d);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.border),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_today, size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Text(
                    '${pos.orderDate.month.toString().padLeft(2,'0')}/${pos.orderDate.day.toString().padLeft(2,'0')}/${pos.orderDate.year}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textDark),
                  ),
                ]),
              ),
            )),
            const SizedBox(width: 8),
            Expanded(child: _DropdownField<AppUser>(
              value: pos.servedBy,
              hint: 'Served By',
              items: pos.users
                  .map((u) => DropdownMenuItem(value: u, child: Text(u.name)))
                  .toList(),
              onChanged: (v) => pos.setServedBy(v),
            )),
          ]),
          const SizedBox(height: 6),
          // Row 3: Customer + Payment
          Row(children: [
            Expanded(child: _DropdownField<Customer>(
              value: pos.selectedCustomer,
              hint: 'Customer (Optional)',
              items: pos.customers
                  .map((c) => DropdownMenuItem(value: c, child: Text(c.name)))
                  .toList(),
              onChanged: (v) => pos.setSelectedCustomer(v),
            )),
            const SizedBox(width: 8),
            Expanded(child: _DropdownField<String>(
              value: pos.paymentMethod,
              hint: 'Payment',
              items: const [
                DropdownMenuItem(value: 'cash',    child: Row(children: [Icon(Icons.money, size: 14), SizedBox(width: 4), Text('Cash')])),
                DropdownMenuItem(value: 'card',    child: Row(children: [Icon(Icons.credit_card, size: 14), SizedBox(width: 4), Text('Card')])),
                DropdownMenuItem(value: 'mobile',  child: Row(children: [Icon(Icons.phone_android, size: 14), SizedBox(width: 4), Text('Mobile')])),
                DropdownMenuItem(value: 'credit',  child: Row(children: [Icon(Icons.account_balance_wallet, size: 14), SizedBox(width: 4), Text('Credit')])),
                DropdownMenuItem(value: 'zaad',    child: Text('ZAAD')),
                DropdownMenuItem(value: 'sahal',   child: Text('SAHAL')),
                DropdownMenuItem(value: 'edahab',  child: Text('EDAHAB')),
              ],
              onChanged: (v) { if (v != null) pos.setPaymentMethod(v); },
            )),
          ]),
          const SizedBox(height: 6),
          // Remarks
          TextField(
            onChanged: pos.setRemarks,
            maxLines: 1,
            decoration: const InputDecoration(
              hintText: 'Remarks',
              hintStyle: TextStyle(fontSize: 12, color: AppColors.textMuted),
              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            ),
          ),
        ],
      ),
    );
  }
}

class _DropdownField<T> extends StatelessWidget {
  final T? value;
  final String hint;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  const _DropdownField({
    required this.value,
    required this.hint,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 36,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(6),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          hint: Text(hint, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          isExpanded: true,
          style: const TextStyle(fontSize: 12, color: AppColors.textDark),
          items: items,
          onChanged: onChanged,
          isDense: true,
        ),
      ),
    );
  }
}

// ── Cart Totals & Actions ─────────────────────────────────────
class _CartTotals extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final pos = context.watch<PosProvider>();
    final sym = pos.settings?.currencySymbol ?? '\$';

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Subtotal
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Subtotal', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              Text('$sym${pos.subtotal.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 4),

          // Total line
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('TOTAL', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.textDark)),
                Text('Local (×12,000)',
                    style: TextStyle(fontSize: 9, color: AppColors.textMuted)),
              ]),
              Text('$sym${pos.total.toStringAsFixed(2)}',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900,
                      color: AppColors.primary)),
            ],
          ),
          const SizedBox(height: 8),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 10),

          // Action row: Clear | VAT toggle | Discount | Create Order
          Row(children: [
            // Clear button
            Expanded(
              child: ElevatedButton(
                onPressed: pos.clearCart,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                child: const Text('Clear', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(width: 8),

            // VAT toggle
            Column(children: [
              Text('Vat ${pos.vatRate.toInt()}%',
                  style: const TextStyle(fontSize: 9, color: AppColors.textMuted)),
              Switch(
                value: pos.vatEnabled,
                onChanged: pos.setVatEnabled,
                activeColor: AppColors.primary,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ]),
            const SizedBox(width: 8),

            // Discount button
            OutlinedButton(
              onPressed: () => _showDiscountDialog(context, pos),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.textDark,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              child: const Text('Discount', style: TextStyle(fontSize: 12)),
            ),
            const SizedBox(width: 8),

            // Create Order
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: pos.cart.isEmpty ? null : () => _createOrder(context, pos),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF16A34A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                child: pos.isCreatingOrder
                    ? const SizedBox(width: 16, height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Create Order',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              ),
            ),
          ]),

          // Error/Success messages
          if (pos.error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: Text(pos.error!,
                    style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626))),
              ),
            ),

          if (pos.successMessage != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF86EFAC)),
                ),
                child: Text(pos.successMessage!,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF16A34A))),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _createOrder(BuildContext context, PosProvider pos) async {
    final order = await pos.createOrder();
    if (order != null && context.mounted) {
      // Show success and offer to clear cart
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Order Created!'),
          content: Text('Order ${order.orderNumber} has been placed.\nTotal: ${pos.settings?.currencySymbol ?? '\$'}${order.finalTotal.toStringAsFixed(2)}'),
          actions: [
            TextButton(
              onPressed: () { Navigator.pop(context); pos.clearCart(); },
              child: const Text('Clear & New Order'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Keep Cart'),
            ),
          ],
        ),
      );
    }
  }

  void _showDiscountDialog(BuildContext context, PosProvider pos) {
    final ctrl = TextEditingController(text: pos.discount.toString());
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Apply Discount'),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Discount %',
            suffix: Text('%'),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              pos.setDiscount(double.tryParse(ctrl.text) ?? 0);
              Navigator.pop(context);
            },
            child: const Text('Apply'),
          ),
        ],
      ),
    );
  }
}

// ── Stock Tab ─────────────────────────────────────────────────
class _StockTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final pos = context.watch<PosProvider>();

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: pos.products.length,
      itemBuilder: (_, i) {
        final p = pos.products[i];
        final isLow = p.stock <= p.minStock;
        return Card(
          margin: const EdgeInsets.only(bottom: 6),
          child: ListTile(
            dense: true,
            title: Text(p.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            subtitle: Text(p.category, style: const TextStyle(fontSize: 11)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: isLow ? const Color(0xFFFEE2E2) : const Color(0xFFDCFCE7),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text('${p.stock}',
                  style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w700,
                      color: isLow ? AppColors.error : AppColors.success)),
            ),
          ),
        );
      },
    );
  }
}
