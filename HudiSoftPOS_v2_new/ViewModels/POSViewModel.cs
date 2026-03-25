using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using HudiSoftPOS.Data;
using HudiSoftPOS.Models;
using HudiSoftPOS.Services;
using Microsoft.EntityFrameworkCore;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Threading;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace HudiSoftPOS.ViewModels
{
    public partial class POSViewModel : ObservableObject
    {
        private List<Product> _allProducts = new();
        private readonly DispatcherTimer _clock;

        [ObservableProperty] private ObservableCollection<Product> products = new();
        [ObservableProperty] private ObservableCollection<CartItemViewModel> cartItems = new();
        [ObservableProperty] private string searchQuery = string.Empty;
        [ObservableProperty] private string barcodeQuery = string.Empty;
        [ObservableProperty] private string selectedCategory = "All";

        [ObservableProperty] private decimal subtotal;
        [ObservableProperty] private decimal vat;
        [ObservableProperty] private decimal total;
        [ObservableProperty] private decimal localAmount = 368160m;
        [ObservableProperty] private decimal discountAmount = 0m;

        [ObservableProperty] private string discountPercent = string.Empty;
        [ObservableProperty] private bool isDiscountPercent = true;
        [ObservableProperty] private bool isVatEnabled = true;
        /// <summary>Toggle visibility: when true, the discount % input row is visible.</summary>
        [ObservableProperty] private bool isDiscountSectionVisible = false;
        partial void OnIsVatEnabledChanged(bool value) => UpdateTotals();
        partial void OnDiscountPercentChanged(string value) => UpdateTotals();

        [ObservableProperty] private string currentDateTime = DateTime.Now.ToString("ddd, MMM dd, yyyy  hh:mm tt");

        // Rooms, Tables, Customers
        [ObservableProperty] private ObservableCollection<string> rooms = new()
        { "Booked Room", "Main Hall", "Private Room", "VIP Lounge", "Outdoor" };
        [ObservableProperty] private string selectedRoom = "Booked Room";

        [ObservableProperty] private ObservableCollection<string> tablesList = new();
        [ObservableProperty] private string selectedTable = "Table: None";

        [ObservableProperty] private ObservableCollection<string> customers = new();
        [ObservableProperty] private string selectedCustomer = "Walking Customer";

        [ObservableProperty] private ObservableCollection<string> servers = new();
        [ObservableProperty] private string selectedServer = "Staff";

        public ObservableCollection<string> Categories { get; } = new()
        { "All", "BREAKFAST & SNACKS", "LUNCH", "DINNER", "DRINKS", "OTHERS" };

        public ObservableCollection<string> Tables => TablesList;

        public POSViewModel()
        {
            _clock = new DispatcherTimer { Interval = TimeSpan.FromSeconds(30) };
            _clock.Tick += (_, _) => CurrentDateTime = DateTime.Now.ToString("ddd, MMM dd, yyyy  hh:mm tt");
            _clock.Start();

            LoadData();
        }

        private async void LoadData()
        {
            try
            {
                using (var context = new AppDbContext())
                {
                    _allProducts = await context.Products.ToListAsync();
                    var tables = await context.Tables.Select(t => t.Name).ToListAsync();
                    var dbCustomers = await context.Customers.Select(c => c.Name).ToListAsync();
                    var userList = await context.Users.Where(u => u.Status == "Active").ToListAsync();
                    var serverDisplayNames = userList.Select(u => string.IsNullOrWhiteSpace(u.FullName) ? u.Username : u.FullName).Distinct().ToList();
                    
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        TablesList.Clear();
                        TablesList.Add("Table: None");
                        foreach (var t in tables) TablesList.Add(t);

                        Customers.Clear();
                        Customers.Add("Walking Customer");
                        foreach (var c in dbCustomers) if (!Customers.Contains(c)) Customers.Add(c);

                        Servers.Clear();
                        Servers.Add("Staff");
                        foreach (var name in serverDisplayNames.OrderBy(x => x)) if (!Servers.Contains(name)) Servers.Add(name);
                        
                        var current = Services.SecurityService.CurrentUser;
                        SelectedServer = current != null ? (string.IsNullOrWhiteSpace(current.FullName) ? current.Username : current.FullName) : "Staff";
                    });
                }
                FilterProducts();
            }
            catch { }
        }

        partial void OnSearchQueryChanged(string value) => FilterProducts();
        partial void OnSelectedCategoryChanged(string value) => FilterProducts();
        partial void OnBarcodeQueryChanged(string value) => FilterByBarcode(value);

        private void FilterProducts()
        {
            var filtered = _allProducts.AsEnumerable();
            if (!string.IsNullOrEmpty(SearchQuery))
                filtered = filtered.Where(p => p.Name.Contains(SearchQuery, StringComparison.OrdinalIgnoreCase));
            if (SelectedCategory != "All")
                filtered = filtered.Where(p => p.Category == SelectedCategory);

            Application.Current.Dispatcher.Invoke(() => Products = new ObservableCollection<Product>(filtered));
        }

        private void FilterByBarcode(string query)
        {
            if (string.IsNullOrEmpty(query)) { FilterProducts(); return; }
            var filtered = _allProducts.Where(p => p.Name.Contains(query, StringComparison.OrdinalIgnoreCase));
            Application.Current.Dispatcher.Invoke(() => Products = new ObservableCollection<Product>(filtered));
        }

        [RelayCommand]
        public void SelectCategory(string category) => SelectedCategory = category;

        [RelayCommand]
        public void AddToCart(Product product)
        {
            var existing = CartItems.FirstOrDefault(i => i.ProductId == product.Id);
            if (existing != null) existing.Quantity++;
            else CartItems.Add(new CartItemViewModel(product, this));
            UpdateTotals();
        }

        [RelayCommand]
        public void RemoveFromCart(CartItemViewModel item)
        {
            if (item != null)
            {
                CartItems.Remove(item);
                UpdateTotals();
            }
        }

        public void UpdateTotals()
        {
            decimal rawSum = CartItems.Sum(i => i.Subtotal);
            
            // Calculate Discount
            decimal currentDiscount = 0;
            if (decimal.TryParse(DiscountPercent, out var val) && val > 0)
            {
                if (IsDiscountPercent) currentDiscount = rawSum * val / 100m;
                else currentDiscount = val;
            }
            DiscountAmount = currentDiscount;

            // Final Subtotal
            Subtotal = rawSum - DiscountAmount;
            if (Subtotal < 0) Subtotal = 0;

            // REAL WORLD VAT: 4% (0.04) based on screenshot examples (1.90 on 47.50)
            Vat = IsVatEnabled ? Subtotal * 0.04m : 0m;

            // Total
            Total = Subtotal + Vat;
            
            LocalAmount = 368160; 
        }

        [RelayCommand]
        public void ClearCart()
        {
            CartItems.Clear();
            DiscountAmount = 0;
            DiscountPercent = string.Empty;
            UpdateTotals();
        }

        [RelayCommand]
        public void ApplyDiscount() => UpdateTotals();

        [ObservableProperty] private int currentOrderId = 0; // 0 means new order

        [RelayCommand]
        public async Task CreateOrder()
        {
            if (CartItems.Count == 0) return;
            try
            {
                Order order;
                using (var context = new AppDbContext())
                {
                    int servedByUserId = ResolveServerToUserId(context, SelectedServer);
                    
                    if (CurrentOrderId > 0)
                    {
                        // Update Existing
                        order = await context.Orders.Include(o => o.OrderItems).FirstOrDefaultAsync(o => o.Id == CurrentOrderId);
                        if (order == null) return;
                        
                        context.OrderItems.RemoveRange(order.OrderItems);
                        order.TotalAmount = Total;
                        order.OrderTime = DateTime.Now;
                        order.UserId = servedByUserId;
                        order.CustomerName = SelectedCustomer ?? "Walking Customer";
                        order.TableName = SelectedTable ?? string.Empty;
                        order.Room = SelectedRoom ?? "Main Hall";
                    }
                    else
                    {
                        order = new Order
                        {
                            OrderTime = DateTime.Now,
                            TotalAmount = Total,
                            Status = "Pending",
                            UserId = servedByUserId,
                            CustomerName = SelectedCustomer ?? "Walking Customer",
                            TableName = SelectedTable ?? string.Empty,
                            Room = SelectedRoom ?? "Main Hall"
                        };
                        context.Orders.Add(order);
                    }

                    await context.SaveChangesAsync();

                    foreach (var item in CartItems)
                    {
                        context.OrderItems.Add(new OrderItem { OrderId = order.Id, ProductId = item.ProductId, Quantity = item.Quantity, SubTotal = item.Subtotal });
                        var p = await context.Products.FindAsync(item.ProductId);
                        if (p != null) p.StockQuantity -= item.Quantity; // Note: In a real system, you'd handle stock reversal for edits
                    }
                    await context.SaveChangesAsync();
                }
                
                // Auto-print kitchen receipt (no window opening)
                await AutoPrintReceipt(order);

                MessageBox.Show(CurrentOrderId > 0 ? "Order updated successfully!" : "Order created successfully!", "POS", MessageBoxButton.OK, MessageBoxImage.Information);
                
                bool wasUpdate = CurrentOrderId > 0;
                ClearCart();
                CurrentOrderId = 0;

                if (wasUpdate && Application.Current.MainWindow.DataContext is MainViewModel mainVM)
                {
                    mainVM.NavigateToOrders();
                }
            }
            catch (Exception ex) { MessageBox.Show(ex.Message); }
        }

        /// <summary>Resolve POS "Served by" selection to UserId so Orders page shows the correct server.</summary>
        private static int ResolveServerToUserId(AppDbContext context, string selectedServer)
        {
            if (string.IsNullOrWhiteSpace(selectedServer) || selectedServer == "Staff")
                return Services.SecurityService.CurrentUser?.Id ?? 1;
            
            var user = context.Users.AsEnumerable().FirstOrDefault(u =>
                (string.IsNullOrWhiteSpace(u.FullName) ? u.Username : u.FullName) == selectedServer);
            return user?.Id ?? Services.SecurityService.CurrentUser?.Id ?? 1;
        }

        public void LoadOrder(Order order)
        {
            if (order == null) return;
            
            CurrentOrderId = order.Id;
            CartItems.Clear();
            
            if (order.OrderItems != null)
            {
                foreach (var item in order.OrderItems)
                {
                    if (item.Product != null)
                    {
                        var cartItem = new CartItemViewModel(item.Product, this)
                        {
                            Quantity = item.Quantity
                        };
                        CartItems.Add(cartItem);
                    }
                }
            }
            
            if (order.User != null)
                SelectedServer = string.IsNullOrWhiteSpace(order.User.FullName) ? order.User.Username : order.User.FullName;
            else if (!string.IsNullOrEmpty(SelectedServer) && !Servers.Contains(SelectedServer))
                SelectedServer = Servers.FirstOrDefault() ?? "Staff";

            SelectedCustomer = string.IsNullOrEmpty(order.CustomerName) ? "Walking Customer" : order.CustomerName;
            if (!Customers.Contains(SelectedCustomer)) Customers.Add(SelectedCustomer);
            SelectedTable = string.IsNullOrEmpty(order.TableName) ? "Table: None" : order.TableName;
            SelectedRoom = string.IsNullOrEmpty(order.Room) ? "Main Hall" : order.Room;
            if (!Rooms.Contains(SelectedRoom)) Rooms.Add(SelectedRoom);
            
            UpdateTotals();
        }

        /// <summary>Auto-print POS kitchen receipt to default printer (no file association needed).</summary>
        private async Task AutoPrintReceipt(Order order)
        {
            try
            {
                string html = GenerateReceiptHtml(order);
                await ReceiptPrintService.PrintHtmlAsync(html);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Auto-print failed: {ex.Message}");
            }
        }

        /// <summary>POS kitchen receipt: items + quantities only, no prices (separate from Orders page receipt).</summary>
        private string GenerateReceiptHtml(Order order)
        {
            string servedBy = SelectedServer ?? "—";
            string customer = SelectedCustomer ?? "Walking Customer";
            string dateStr = order.OrderTime.ToString("dd/MM/yyyy HH:mm");

            var itemsHtml = string.Join("", CartItems.Select(item =>
                $"<div class='item-row'><span class='item-name'>{System.Net.WebUtility.HtmlEncode(item.Name)} ()</span><span class='item-qty'>{item.Quantity}</span></div>"));

            return $@"
<html>
<head>
    <meta charset='utf-8'/>
    <style>
        body {{ font-family: Arial, sans-serif; width: 190px; margin: 0; color: #000; padding: 4px; background: #fff; font-size: 10px; }}
        .restaurant-name {{ font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }}
        .restaurant-sub {{ font-size: 11px; text-align: center; margin-bottom: 4px; }}
        .info {{ font-size: 9px; text-align: center; margin-bottom: 2px; }}
        .field {{ font-size: 10px; font-weight: bold; margin-bottom: 2px; display: flex; justify-content: space-between; }}
        .field .val {{ font-weight: normal; }}
        .divider {{ border-top: 1px dashed #000; margin: 4px 0; }}
        .item-header {{ display: flex; justify-content: space-between; font-weight: bold; font-size: 10px; margin-bottom: 4px; border-bottom: 1px dashed #000; padding-bottom: 2px; }}
        .item-row {{ display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; }}
        .item-name {{ flex: 1; }}
        .item-qty {{ text-align: right; font-weight: bold; }}
        @media print {{ body {{ width: 190px; }} @page {{ margin: 0; }} }}
    </style>
</head>
<body>
    <div class='restaurant-name'>Mamma Africa</div>
    <div class='restaurant-sub'>Restaurant</div>
    <div class='info'>ZAAD: 515735 - SAHAL: 523080-</div>
    <div class='info'>E-DAHAB:742298 - MyCash:931539</div>
    <div class='divider'></div>
    <div class='field'>Receipt Number : <span class='val'>{order.Id}</span></div>
    <div class='field'>Served By : <span class='val'>{System.Net.WebUtility.HtmlEncode(servedBy)}</span></div>
    <div class='field'>Customer : <span class='val'>{System.Net.WebUtility.HtmlEncode(customer)}</span></div>
    <div class='field'>Date : <span class='val'>{dateStr}</span></div>
    <div class='divider'></div>
    <div class='item-header'><span>Item.</span><span>No.</span></div>
    {itemsHtml}
</body>
</html>";
        }
    }

    public partial class CartItemViewModel : ObservableObject
    {
        private readonly POSViewModel _parent;
        public int ProductId { get; }
        public string Name { get; }
        public decimal Price { get; }

        [ObservableProperty] private int quantity;
        public decimal Subtotal => Price * Quantity;

        public CartItemViewModel(Product product, POSViewModel parent)
        {
            _parent = parent;
            ProductId = product.Id;
            Name = product.Name;
            Price = product.Price;
            Quantity = 1;
        }

        partial void OnQuantityChanged(int value) { OnPropertyChanged(nameof(Subtotal)); _parent.UpdateTotals(); }
    }
}
